/**
 * LunaCore — Music Sync Worker (Cloudflare Worker)
 * ──────────────────────────────────────────────────
 * Lists R2 objects under music_player/ and upserts them
 * into the Supabase music_library table.
 *
 * DEPLOY:
 *   1. Install Wrangler: npm install -g wrangler
 *   2. cd into this directory
 *   3. wrangler login
 *   4. Set secrets:
 *        wrangler secret put SUPABASE_URL
 *        wrangler secret put SUPABASE_SERVICE_KEY
 *   5. wrangler deploy
 *
 * ADD TO .env:
 *   VITE_MUSIC_SYNC_WORKER_URL=https://music-sync.<your-subdomain>.workers.dev
 *
 * BIND R2 BUCKET in wrangler.toml:
 *   [[r2_buckets]]
 *   binding = "R2_BUCKET"
 *   bucket_name = "<your-bucket-name>"
 */

const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];

function isAudioFile(key) {
  const lower = key.toLowerCase();
  return AUDIO_EXTS.some(ext => lower.endsWith(ext));
}

function filenameToTitle(key) {
  const parts = key.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

function folderNameFromKey(key) {
  // "music_player/english_songs/song.mp3" → "english_songs"
  const parts = key.split('/');
  return parts.length >= 3 ? parts[1] : 'unknown';
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url     = new URL(request.url);
    const userId  = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response('Missing userId parameter', { status: 400 });
    }

    const prefix  = url.searchParams.get('prefix') || `vault/${userId}/documents-music-folders/`;
    const folderId = url.searchParams.get('folderId') || null;

    // ── 1. List R2 objects ──────────────────────────────────────────
    const listed = await env.R2_BUCKET.list({ prefix, limit: 1000 });
    const audioObjects = listed.objects.filter(obj => isAudioFile(obj.key));

    if (audioObjects.length === 0) {
      return jsonResponse({ message: 'No audio files found under ' + prefix, synced: 0 });
    }

    // ── 2. Fetch existing folder IDs from Supabase ──────────────────
    const folderRes = await supabaseFetch(env, 'GET', '/rest/v1/vault_collections?select=id,name,key_prefix');
    const folders   = await folderRes.json();

    // Build a map: key_prefix → folder.id
    const folderMap = {};
    for (const f of folders) {
      if (f.key_prefix) folderMap[f.key_prefix] = f.id;
    }

    // ── 3. Format tracks ─────────────────────────────────────────────
    const now    = new Date().toISOString();
    const tracks = [];

    for (const obj of audioObjects) {
      // folderName extraction needs to be adjusted based on the deeper path: vault/<userId>/documents-music-folders/<folderName>
      const parts = obj.key.split('/');
      // Expected: vault (0) / userId (1) / documents-music-folders (2) / folderName (3) / filename.mp3 (4)
      const folderName = parts.length > 4 ? parts[3] : 'unknown';
      const r2Prefix   = `vault/${userId}/documents-music-folders/${folderName}/`;
      let   fid        = folderMap[r2Prefix];

      // Auto-create folder row if it doesn't exist
      if (!fid) {
        const newFolder = {
          id:           `FLD-${Math.random().toString(36).substr(2, 8)}`,
          name:         folderName,
          key_prefix:   r2Prefix,
          type:         'documents',
          created_at:   now,
          user_id:      userId
        };
        await supabaseFetch(env, 'POST', '/rest/v1/vault_collections', newFolder);
        fid = newFolder.id;
        folderMap[r2Prefix] = fid;
      }

      tracks.push({
        // Use a stable ID derived from the R2 key
        id:              `R2-${btoa(obj.key).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`,
        title:           filenameToTitle(obj.key),
        artist:          'Unknown',
        album:           'Unknown',
        r2_key:          obj.key,
        file_size_mb:    (obj.size / 1048576).toFixed(2),
        folder_id:       fid,
        last_played_time: 0,
        updated_at:      now,
      });
    }

    // ── 4. Upsert into Supabase in batches of 100 ───────────────────
    const CHUNK = 100;
    let synced  = 0;

    for (let i = 0; i < tracks.length; i += CHUNK) {
      const chunk = tracks.slice(i, i + CHUNK);
      const res   = await supabaseFetch(env, 'POST', '/rest/v1/music_library', chunk, {
        'Prefer': 'resolution=merge-duplicates',
      });
      if (!res.ok) {
        const body = await res.text();
        return jsonResponse({ message: 'Supabase upsert failed: ' + body, synced }, 500);
      }
      synced += chunk.length;
    }

    return jsonResponse({
      message: `Synced ${synced} tracks from R2.`,
      synced,
      prefix,
    });
  },
};

// ── Supabase fetch helper ─────────────────────────────────────────────
async function supabaseFetch(env, method, path, body = null, extraHeaders = {}) {
  const url = env.SUPABASE_URL + path;
  const headers = {
    'apikey':        env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
    ...extraHeaders,
  };
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
