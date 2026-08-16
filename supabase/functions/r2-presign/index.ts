import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Module-level singleton: reused across warm invocations ────────
let _r2Client: S3Client | null = null;
let _bucket: string | null = null;

function getR2Client(): { client: S3Client; bucket: string } {
  if (_r2Client && _bucket) return { client: _r2Client, bucket: _bucket };
  const endpoint = Deno.env.get("R2_ENDPOINT");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET_NAME");
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 credentials not configured in Edge Function secrets.");
  }
  _r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // Disable unnecessary checks for faster signing
    forcePathStyle: false,
  });
  _bucket = bucket;
  return { client: _r2Client, bucket: _bucket };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { client, bucket } = getR2Client();
    const url = new URL(req.url);
    const op = url.searchParams.get("op");

    // LIST
    if (op === "list") {
      const prefix = url.searchParams.get("prefix") || "";
      const delimiter = url.searchParams.get("delimiter") || undefined;
      const continuationToken = url.searchParams.get("token") || undefined;
      const pageSize = parseInt(url.searchParams.get("page_size") || "200");
      
      const command = new ListObjectsV2Command({
        Bucket: bucket, 
        Prefix: prefix, 
        MaxKeys: pageSize, 
        ContinuationToken: continuationToken,
        ...(delimiter ? { Delimiter: delimiter } : {})
      });
      
      const response = await client.send(command);
      
      const objects = (response.Contents || []).map((obj) => ({
        key: obj.Key, size: obj.Size, lastModified: obj.LastModified?.toISOString(),
      }));
      
      const prefixes = (response.CommonPrefixes || []).map(p => p.Prefix);

      return new Response(
        JSON.stringify({ 
          objects, 
          prefixes,
          nextToken: response.NextContinuationToken || null, 
          isTruncated: response.IsTruncated || false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT presigned
    if (op === "put") {
      const key = url.searchParams.get("key");
      const contentType = url.searchParams.get("content_type") || "application/octet-stream";
      if (!key) throw new Error("Missing 'key' parameter.");
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });
      return new Response(JSON.stringify({ url: presignedUrl, key }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET presigned
    if (op === "get") {
      const key = url.searchParams.get("key");
      if (!key) throw new Error("Missing 'key' parameter.");
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: 7200 });
      return new Response(JSON.stringify({ url: presignedUrl, key }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // BATCH GET presigned (up to 100 keys at once)
    if (op === "batch_get") {
      const body = await req.json();
      const keys: string[] = body.keys || [];
      if (!keys.length) throw new Error("No keys provided.");
      if (keys.length > 100) throw new Error("Max 100 keys per batch.");
      const urls: Record<string, string> = {};
      await Promise.all(keys.map(async (key) => {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        urls[key] = await getSignedUrl(client, command, { expiresIn: 7200 });
      }));
      return new Response(JSON.stringify({ urls }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Tell the browser to cache batch responses for 10 minutes
          "Cache-Control": "private, max-age=600",
        }
      });
    }

    // DELETE single object
    if (op === "delete") {
      const key = url.searchParams.get("key");
      if (!key) throw new Error("Missing 'key' parameter.");
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      await client.send(command);
      return new Response(JSON.stringify({ success: true, key }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE PREFIX (for deleting collections)
    if (op === "delete_prefix") {
      const prefix = url.searchParams.get("prefix");
      if (!prefix) throw new Error("Missing 'prefix' parameter.");
      
      // List all objects with this prefix
      let isTruncated = true;
      let continuationToken = undefined;
      let deletedCount = 0;

      while (isTruncated) {
        const listCommand = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken });
        const listRes = await client.send(listCommand);
        
        const objects = listRes.Contents || [];
        if (objects.length > 0) {
          await Promise.all(objects.map(async (obj) => {
            if (obj.Key) {
              await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
              deletedCount++;
            }
          }));
        }

        isTruncated = listRes.IsTruncated || false;
        continuationToken = listRes.NextContinuationToken;
      }
      
      return new Response(JSON.stringify({ success: true, prefix, deletedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // COPY object (for moving to trash)
    if (op === "copy") {
      const sourceKey = url.searchParams.get("source_key");
      const destKey = url.searchParams.get("dest_key");
      if (!sourceKey || !destKey) throw new Error("Missing 'source_key' or 'dest_key' parameter.");
      
      // Copy the object
      const copyCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `/${bucket}/${sourceKey}`,
        Key: destKey,
      });
      await client.send(copyCommand);
      
      // Delete the original
      const deleteCommand = new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey });
      await client.send(deleteCommand);
      
      return new Response(JSON.stringify({ success: true, sourceKey, destKey }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown op: '${op}'. Use 'put', 'get', 'batch_get', 'list', 'delete', 'delete_prefix', or 'copy'.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
