import { requestDriveAccess } from './googleAuth'; // kept for Music Player — Drive removed from Vault
import { supabase } from './supabaseClient';
import { decode } from 'base64-arraybuffer';
export { supabase };





// â”€â”€â”€ Initialization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const initializeApp = async () => {
    // Supabase initialization is handled by createClient
    return { success: true };
};



// â”€â”€â”€ Journal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getEntries = async (params = {}) => {
    let query = supabase.from('journal').select('*').neq('status', 'deleted').order('date', { ascending: false });
    if (params.limit) query = query.limit(params.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const getEntryById = async (entry_id) => {
    const { data, error } = await supabase.from('journal').select('*').eq('entry_id', entry_id).single();
    if (error) throw error;
    return data;
};

export const createEntry = async (params) => {
    const { data, error } = await supabase.from('journal').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const updateEntry = async (params) => {
    const { entry_id, ...updates } = params;
    updates.time_modified = new Date().toISOString();
    const { data, error } = await supabase.from('journal').update(updates).eq('entry_id', entry_id).select();
    if (error) throw error;
    return data[0];
};

export const deleteEntry = async (entry_id) => {
    const { error } = await supabase.from('journal').update({ status: 'deleted', time_modified: new Date().toISOString() }).eq('entry_id', entry_id);
    if (error) throw error;
};

// â”€â”€â”€ Todos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getTodos = async (params = {}) => {
    let query = supabase.from('todos').select('*');
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const createTodo = async (params) => {
    // Explicitly pick fields that match the schema to avoid "extra column" errors
    const todoData = {
        todo_id: params.todo_id || `TD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: params.title || '',
        description: params.description || '',
        priority: params.priority || 'medium',
        category: params.category || '',
        due_date: params.due_date || getLocalDate(),
        status: params.status || 'pending',
        is_recurring: String(params.is_recurring ?? 'false'),
        recur_freq: params.recur_freq || null,
        notes: params.notes || '',
        rollover_count: String(params.rollover_count || '0'),
        date_created: getLocalDate(),
        time_created: new Date().toLocaleTimeString()
    };
    
    const { data, error } = await supabase.from('todos').insert([todoData]).select();
    if (error) {
        console.error('Supabase Todo Insert Error:', error);
        throw error;
    }
    return data[0];
};

export const updateTodo = async (params) => {
    const { todo_id, ...updates } = params;
    const { data, error } = await supabase.from('todos').update(updates).eq('todo_id', todo_id).select();
    if (error) throw error;
    return data[0];
};

export const completeTodo = async (params) => {
    const { todo_id, conclusion_remarks, final_outcome, learning } = params;
    
    const updateData = { 
        status: 'completed', 
        completion_date: getLocalDate(),
        completion_time: new Date().toLocaleTimeString(),
        notes: conclusion_remarks || '',
        outcome_status: final_outcome || 'completed', // 'partial', 'delegated', 'blocked'
        learning: learning || ''
    };

    const { data, error } = await supabase.from('todos').update(updateData).eq('todo_id', todo_id).select();
    if (error) throw error;

    // Sync with Delegation table
    const delegationId = `DLG-TD-${todo_id}`;
    if (final_outcome === 'delegated') {
        try {
            await saveDelegationItem({
                id: delegationId,
                title: data[0].title,
                source: 'Todo',
                link: '',
                category: data[0].category || 'Task',
                importance: 'Medium',
                note: conclusion_remarks,
                added_at: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to auto-delegate todo', e);
        }
    } else {
        // If it was previously delegated but now it's something else, remove it from delegation
        try {
            await deleteDelegationItem(delegationId);
        } catch (e) {
            // It might not exist, which is fine
        }
    }

    return data[0];
};

export const rolloverTodos = async () => {
    // Basic rollover: increment rollover_count for pending tasks from previous days
    const today = getLocalDate();
    const { data: overdue, error: fetchErr } = await supabase
        .from('todos')
        .select('*')
        .eq('status', 'pending')
        .lt('due_date', today);
    
    if (fetchErr) throw fetchErr;
    
    for (const todo of overdue) {
        const newCount = (parseInt(todo.rollover_count) || 0) + 1;
        await supabase.from('todos')
            .update({ rollover_count: String(newCount) })
            .eq('todo_id', todo.todo_id);
    }
    
    return getTodos();
};

export const snoozeTodo = async (params) => {
    const { todo_id, due_date } = params;
    const { data, error } = await supabase.from('todos').update({ due_date }).eq('todo_id', todo_id).select();
    if (error) throw error;
    return data[0];
};

export const deleteTodo = async (todo_id) => {
    const { error } = await supabase.from('todos').delete().eq('todo_id', todo_id);
    if (error) throw error;
};

// ─── Insights ────────────────────────────────────────────────
export const getInsights = async (params = {}) => {
    const { data, error } = await supabase.from('insights').select('*');
    if (error) throw error;
    return data;
};

export const createInsight = async (params) => {
    const { data, error } = await supabase.from('insights').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const updateInsight = async (params) => {
    const { id, ...updates } = params;
    const { data, error } = await supabase.from('insights').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const linkInsightToTodo = async (params) => {
    const { insight_id, todo_id } = params;
    const { data, error } = await supabase.from('insights').update({ related_todo_id: todo_id }).eq('id', insight_id).select();
    if (error) throw error;
    return data[0];
};

// ─── Habits ──────────────────────────────────────────────────
export const getHabits = async (params = {}) => {
    const { data, error } = await supabase.from('habits').select('*');
    if (error) throw error;
    return data;
};

export const createHabit = async (params) => {
    const { data, error } = await supabase.from('habits').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const updateHabit = async (params) => {
    const { id, ...updates } = params;
    const { data, error } = await supabase.from('habits').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const archiveHabit = async (habit_id) => {
    const { data, error } = await supabase.from('habits').update({ archived: true }).eq('id', habit_id).select();
    if (error) throw error;
    return data[0];
};

export const logHabit = async (params) => {
    const { data, error } = await supabase.from('habit_logs').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const getHabitLogs = async (params = {}) => {
    let query = supabase.from('habit_logs').select('*');
    if (params.habit_id) query = query.eq('habit_id', params.habit_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const calculateStreaks = async () => {
    // This was complex logic in Code.gs. 
    // We will handle this in the frontend for now by fetching logs.
    return { success: true };
};

// ─── Vault R2 — Collections ─────────────────────────────────

export const getVaultCollections = async () => {
    const { data, error } = await supabase.from('vault_collections').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const createVaultCollection = async ({ name, type = 'gallery', key_prefix }) => {
    const prefix = key_prefix || `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`;
    
    // 1. Register in Database
    const { data, error } = await supabase.from('vault_collections').insert([{
        name,
        type,
        key_prefix: prefix,
    }]).select();
    if (error) throw error;

    // 2. Automatically create the visual "folder" in R2 by uploading a 0-byte object
    try {
        const { url: putUrl } = await getR2PresignedPut(prefix, 'application/x-directory');
        await fetch(putUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/x-directory' },
            body: new Blob([]) // 0-byte file
        });
    } catch (e) {
        console.warn('Failed to auto-create R2 folder marker, but collection was created.', e);
    }

    return data[0];
};

export const updateVaultCollection = async (id, updates) => {
    const { data, error } = await supabase.from('vault_collections').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const deleteVaultCollection = async (id) => {
    const { error } = await supabase.from('vault_collections').delete().eq('id', id);
    if (error) throw error;
};


// ─── Vault R2 — Files ────────────────────────────────────────

/**
 * Paginated file listing for a collection.
 * @param {string} collectionId
 * @param {number} page - 1-indexed page number
 * @param {number} pageSize - items per page (default 50)
 */
export const getVaultFiles = async (collectionId, page = 1, pageSize = 50) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
        .from('vault_files')
        .select('*', { count: 'exact' })
        .eq('collection_id', collectionId)
        .order('uploaded_at', { ascending: false })
        .range(from, to);
    if (error) throw error;
    return { files: data, total: count, page, pageSize, hasMore: to < count - 1 };
};

export const insertVaultFile = async (params) => {
    const { data, error } = await supabase.from('vault_files').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteVaultFile = async (id) => {
    const { error } = await supabase.from('vault_files').delete().eq('id', id);
    if (error) throw error;
};


// ─── Vault R2 — Presigned URLs (via Edge Function) ───────────

const R2_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign`;

async function r2EdgeFetch(queryParams, body = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const qs = new URLSearchParams(queryParams).toString();
    const res = await fetch(`${R2_EDGE_URL}?${qs}`, {
        method: body ? 'POST' : 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `r2-presign edge function error ${res.status}`);
    }
    return res.json();
}

/** Generate a presigned PUT URL for direct client-to-R2 upload. Expires in 5 min. */
export const getR2PresignedPut = async (key, mimeType = 'application/octet-stream') => {
    return r2EdgeFetch({ op: 'put', key, content_type: mimeType });
};

/** Generate a presigned GET URL for viewing/downloading a single R2 object. Expires in 15 min. */
export const getR2PresignedGet = async (key) => {
    const pubUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (pubUrl && !key.startsWith('private/')) {
        const encodedKey = key.split('/').map(encodeURIComponent).join('/');
        return { url: `${pubUrl}/${encodedKey}` };
    }
    return r2EdgeFetch({ op: 'get', key });
};

/** Batch presigned GET URLs — up to 100 keys at once. Returns { urls: { [key]: url } } */
export const getR2PresignedBatch = async (keys) => {
    if (!keys || keys.length === 0) return { urls: {} };
    
    const pubUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (pubUrl) {
        const urls = {};
        const edgeKeys = [];
        keys.forEach(k => {
            if (!k.startsWith('private/')) {
                const encodedKey = k.split('/').map(encodeURIComponent).join('/');
                urls[k] = `${pubUrl}/${encodedKey}`;
            } else {
                edgeKeys.push(k);
            }
        });
        
        if (edgeKeys.length > 0) {
            const res = await r2EdgeFetch({ op: 'batch_get' }, { keys: edgeKeys });
            Object.assign(urls, res.urls);
        }
        return { urls };
    }

    return r2EdgeFetch({ op: 'batch_get' }, { keys });
};

/** List R2 objects under a prefix (for sync). Returns paginated { objects, nextToken, isTruncated } */
export const listR2Objects = async (prefix, token = null, pageSize = 200) => {
    const params = { op: 'list', prefix, page_size: pageSize };
    if (token) params.token = token;
    return r2EdgeFetch(params);
};


// ─── Vault R2 — Sync (rclone/bulk upload → index) ───────────

/**
 * Scans all R2 objects under the collection's key_prefix,
 * diffs against existing vault_files rows, and inserts new ones.
 * Supports delta sync — only adds new objects not yet in DB.
 * Returns { added, skipped, total }.
 */
export const syncVaultCollection = async (collectionId) => {
    // 1. Load collection metadata
    const { data: col, error: colErr } = await supabase
        .from('vault_collections').select('*').eq('id', collectionId).single();
    if (colErr) throw colErr;

    // 2. Get all R2 keys under the prefix (paginated)
    let allObjects = [];
    let nextToken = null;
    do {
        const res = await listR2Objects(col.key_prefix, nextToken, 200);
        allObjects = allObjects.concat(res.objects || []);
        nextToken = res.nextToken || null;
    } while (nextToken);

    if (allObjects.length === 0) return { added: 0, skipped: 0, total: 0 };

    // 3. Get existing r2_keys in DB for this collection
    const { data: existingRows } = await supabase
        .from('vault_files').select('r2_key').eq('collection_id', collectionId);
    const existingKeys = new Set((existingRows || []).map(r => r.r2_key));

    // 4. Insert only new objects
    const newObjects = allObjects.filter(obj => !existingKeys.has(obj.key));
    let added = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < newObjects.length; i += BATCH_SIZE) {
        const batch = newObjects.slice(i, i + BATCH_SIZE).map(obj => {
            const filename = obj.key.split('/').pop() || obj.key;
            const ext = filename.split('.').pop()?.toLowerCase();
            const mimeMap = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4',
                mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4',
                wav: 'audio/wav', pdf: 'application/pdf',
                txt: 'text/plain', js: 'text/javascript', ts: 'text/typescript',
            };
            return {
                collection_id: collectionId,
                r2_key: obj.key,
                filename,
                size_bytes: obj.size || 0,
                mime_type: mimeMap[ext] || 'application/octet-stream',
                uploaded_at: obj.lastModified || new Date().toISOString()
            };
        });
        const { error: insertErr } = await supabase.from('vault_files').insert(batch);
        if (insertErr) console.error('Sync insert batch error:', insertErr);
        else added += batch.length;
    }

    // 5. Update collection stats
    const totalSizeBytes = allObjects.reduce((sum, o) => sum + (o.size || 0), 0);
    await supabase.from('vault_collections').update({
        file_count: allObjects.length,
        size_bytes: totalSizeBytes
    }).eq('id', collectionId);

    // 6. Log sync
    await supabase.from('vault_sync_log').upsert({
        collection_id: collectionId,
        last_synced_at: new Date().toISOString(),
        files_added: added
    }, { onConflict: 'collection_id' });

    return { added, skipped: allObjects.length - newObjects.length, total: allObjects.length };
};


// ─── Vault R2 — In-App Upload ────────────────────────────────

/**
 * Upload a single File object directly to R2 via presigned PUT URL,
 * then register it in vault_files. Returns the new file row.
 * @param {File} file - browser File object
 * @param {string} collectionId
 * @param {(progress: number) => void} onProgress - progress callback (0-100)
 */
export const uploadFileToR2 = async (file, collectionId, onProgress) => {
    // 1. Get the collection's key prefix
    const { data: col, error: colErr } = await supabase
        .from('vault_collections').select('key_prefix').eq('id', collectionId).single();
    if (colErr) throw colErr;

    // 2. Build a unique R2 key
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `${col.key_prefix}${Date.now()}-${safeFilename}`;

    // 2.5 Generate Thumbnail (if image)
    let thumbnailB64 = null;
    if (file.type && file.type.startsWith('image/')) {
        try {
            thumbnailB64 = await resizeImageToWebP(file, 400);
        } catch (e) {
            console.warn('Failed to generate local thumbnail', e);
        }
    }

    // 3. Get presigned PUT URL
    if (onProgress) onProgress(5);
    const { url: putUrl } = await getR2PresignedPut(r2Key, file.type || 'application/octet-stream');

    // 4. Upload directly to R2 (XMLHttpRequest for progress)
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', putUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(5 + Math.round((e.loaded / e.total) * 85));
            };
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(file);
    });

    // 5. Register in vault_files
    if (onProgress) onProgress(95);
    const fileRow = await insertVaultFile({
        collection_id: collectionId,
        r2_key: r2Key,
        thumbnail_key: thumbnailB64, // local base64 thumbnail
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
    });

    // 6. Update collection stats
    await supabase.rpc('increment_collection_stats', {
        p_collection_id: collectionId,
        p_file_delta: 1,
        p_size_delta: file.size || 0
    }).then(() => {}).catch(() => {}); // non-fatal if RPC not deployed yet

    if (onProgress) onProgress(100);
    return fileRow;
};


// ─── Vault R2 — Liked Files ──────────────────────────────────

export const getLikedVaultFiles = async () => {
    const { data, error } = await supabase
        .from('vault_liked_files')
        .select('*, vault_files(*)')
        .order('liked_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
        likeId: row.id,
        likedAt: row.liked_at,
        ...row.vault_files
    }));
};

export const toggleLikedVaultFile = async (fileId, isLiked) => {
    if (isLiked) {
        const { data, error } = await supabase
            .from('vault_liked_files')
            .upsert([{ file_id: fileId }], { onConflict: 'file_id' })
            .select();
        if (error) throw error;
        return data[0];
    } else {
        const { error } = await supabase
            .from('vault_liked_files').delete().eq('file_id', fileId);
        if (error) throw error;
    }
};


// ─── Vault R2 — Face Groups ──────────────────────────────────

export const getVaultFaceGroups = async (collectionId) => {
    const { data, error } = await supabase
        .from('vault_face_groups')
        .select('*, vault_files(*)') // join to get cover file r2_key
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });
    if (error) return [];
    return data;
};

export const saveVaultFaceGroup = async (params) => {
    const { id, ...rest } = params;
    if (id) {
        const { data, error } = await supabase
            .from('vault_face_groups').update(rest).eq('id', id).select();
        if (error) throw error;
        return data[0];
    } else {
        const { data, error } = await supabase
            .from('vault_face_groups').insert([rest]).select();
        if (error) throw error;
        return data[0];
    }
};

export const deleteVaultFaceGroup = async (id) => {
    const { error } = await supabase.from('vault_face_groups').delete().eq('id', id);
    if (error) throw error;
};


// ─── Vault R2 — Text Content (R2 objects) ────────────────────

/**
 * Fetch text content of a file stored in R2.
 * Gets a presigned GET URL then fetches the body as text.
 */
export const getFileTextContent = async (r2Key) => {
    try {
        const { url } = await getR2PresignedGet(r2Key);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return { content: await res.text() };
    } catch (err) {
        console.error('getFileTextContent error:', err);
        return { content: `// Could not load content: ${err.message}` };
    }
};


// ─── Media ───────────────────────────────────────────────────────────────────
//
// Storage strategy:
//   NEW items  → uploaded directly to R2 via presigned PUT URL.
//               r2_key + r2_public_url are stored in the media row.
//               drive_link is set to r2_public_url for display (no signed URL needed).
//               _isR2 = true marks them so renderers skip blob/signed-URL logic.
//
//   OLD items  → have storage_path (Supabase Storage bucket) → still get signed URLs.
//               Backward compatible: injectSignedUrls still runs for these.
//
//   LEGACY     → have drive_link already (Google Drive) → left as-is.

// ─── R2 Public Domain ───────────────────────────────────────────────────────
// Set this to your R2 bucket's public domain once you enable public access
// in the Cloudflare dashboard (Bucket → Settings → Public Access → Enable).
// Example: 'https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev'
// If not set, the code falls back to presigned GET URLs automatically.
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_URL || '';

// ─── Helper: resolve drive_link for a batch of media rows ─────────────────
// - R2 items  → use r2_public_url directly (or fallback to presigned GET)
// - Supabase Storage items → generate signed URLs (existing path)
// - Drive/other items → already have drive_link, no-op
const resolveMediaUrls = async (mediaItems) => {
    if (!mediaItems) return mediaItems;
    const isArray = Array.isArray(mediaItems);
    const items = isArray ? mediaItems : [mediaItems];

    // ── 1. R2 items ─────────────────────────────────────────────────────────
    const r2Items = items.filter(m => m.r2_key && !m.drive_link);
    for (const m of r2Items) {
        if (m.r2_public_url) {
            // Public URL — no async cost, just attach
            m.drive_link = m.r2_public_url;
            m._isR2 = true;
        } else if (R2_PUBLIC_DOMAIN && m.r2_key) {
            // Derive from public domain if stored URL is missing
            m.drive_link = `${R2_PUBLIC_DOMAIN}/${m.r2_key}`;
            m._isR2 = true;
        } else if (m.r2_key) {
            // Fallback: presigned GET (bucket is private)
            try {
                const { url } = await getR2PresignedGet(m.r2_key);
                m.drive_link = url;
                m._isR2 = true;
            } catch (e) {
                console.warn('Failed to get presigned URL for', m.r2_key, e);
            }
        }
    }

    // ── 2. Supabase Storage items (old uploads) ──────────────────────────────
    const supabasePaths = items.filter(m => m.storage_path && !m.drive_link).map(m => m.storage_path);
    if (supabasePaths.length > 0) {
        const cacheBust = Date.now();
        try {
            const { data: signedUrls, error } = await supabase.storage
                .from('media')
                .createSignedUrls(supabasePaths, 600); // 10 min
            if (!error && signedUrls) {
                const urlMap = {};
                signedUrls.forEach((su, i) => {
                    if (!su.error) urlMap[supabasePaths[i]] = su.signedUrl + '&_t=' + cacheBust;
                });
                items.forEach(m => {
                    if (m.storage_path && urlMap[m.storage_path]) {
                        m.drive_link = urlMap[m.storage_path];
                        m._isSupabaseStorage = true;
                        m._expiresAt = Date.now() + 600_000;
                    }
                });
            }
        } catch (err) {
            console.error('Failed to generate Supabase signed URLs:', err);
        }
    }

    return isArray ? items : items[0];
};

// Kept for backward compatibility — useSecureUrl.js imports this for old items.
export const getFreshSignedUrl = async (storagePath) => {
    if (!storagePath) return null;
    const cacheBust = Date.now();
    const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(storagePath, 600);
    if (error || !data) throw error || new Error('Failed to generate fresh signed URL');
    return data.signedUrl + '&_t=' + cacheBust;
};

/**
 * Upload a file to R2 (new path) or Supabase Storage (legacy base64 path).
 *
 * New callers: pass { file: File, media_type, uploaded_from, source_id }, onProgress
 * Legacy callers (StudyNotes, GridNode, etc.): keep passing { base64data, filename, mime_type, ... }
 *   — these still go to Supabase Storage, fully backward compatible.
 */
export const uploadMedia = async (params, onProgress) => {
    const mediaId = params.media_id || ('MED-' + Math.random().toString(36).substr(2, 9).toUpperCase());

    // ── NEW PATH: raw File object → R2 ──────────────────────────────────────
    if (params.file instanceof File) {
        const file = params.file;
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const r2Key = `media-library/${params.uploaded_from || 'general'}/${Date.now()}-${safeFilename}`;

        // 1. Get presigned PUT URL
        if (onProgress) onProgress(5);
        const { url: putUrl } = await getR2PresignedPut(r2Key, file.type || 'application/octet-stream');

        // 2. Upload directly to R2 with real XHR progress
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', putUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            if (onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) onProgress(5 + Math.round((e.loaded / e.total) * 88));
                };
            }
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT failed: ${xhr.status}`)));
            xhr.onerror = () => reject(new Error('Upload network error'));
            xhr.send(file);
        });

        // 3. Derive public URL
        const r2PublicUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${r2Key}` : '';

        // 4. Insert media row
        if (onProgress) onProgress(95);
        const row = {
            media_id: mediaId,
            media_type: params.media_type || 'file',
            mime_type: file.type || 'application/octet-stream',
            filename: file.name,
            display_name: params.display_name || file.name,
            file_size_kb: String(Math.round(file.size / 1024)),
            date_uploaded: new Date().toISOString().split('T')[0],
            time_uploaded: new Date().toLocaleTimeString(),
            uploaded_from: params.uploaded_from || 'media_library',
            source_id: params.source_id || null,
            r2_key: r2Key,
            r2_public_url: r2PublicUrl,
            // drive_link stays empty — resolveMediaUrls fills it at read time
            drive_link: r2PublicUrl || '',
            status: 'active',
        };
        const { data, error } = await supabase.from('media').insert([row]).select();
        if (error) throw error;
        if (onProgress) onProgress(100);

        // Return with _isR2 flag already set
        const result = data[0];
        result.drive_link = r2PublicUrl || result.drive_link;
        result._isR2 = true;
        return result;
    }

    // ── LEGACY PATH: base64data → Supabase Storage ──────────────────────────
    // Keeps all StudyNotes / GridNode / MediaAttachmentsPanel callers working unchanged.
    if (params.base64data) {
        try {
            const bucketName = 'media';
            const base64Clean = params.base64data.includes(',') ? params.base64data.split(',')[1] : params.base64data;
            const arrayBuffer = decode(base64Clean);

            const fileExt = params.filename ? params.filename.split('.').pop() : 'bin';
            const filePath = (params.uploaded_from || 'misc') + '/' + Date.now() + '-' + Math.random().toString(36).substr(2, 5) + '.' + fileExt;

            const { error: storageError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, arrayBuffer, {
                    contentType: params.mime_type || 'application/octet-stream',
                    upsert: true
                });
            if (storageError) throw storageError;

            params.drive_link = '';
            params.storage_path = filePath;
            delete params.base64data;
        } catch (err) {
            console.error('Supabase storage upload failed:', err);
            throw new Error('Storage upload failed: ' + err.message);
        }
    }

    params.media_id = mediaId;
    const { data, error } = await supabase.from('media').insert([params]).select();
    if (error) throw error;
    return await resolveMediaUrls(data[0]);
};

export const getMediaById = async (media_id) => {
    const { data, error } = await supabase.from('media').select('*').eq('media_id', media_id).single();
    if (error) throw error;
    return await resolveMediaUrls(data);
};

export const getThumbnailBase64 = async (media_id) => {
    return '';
};

export const getMediaBySource = async (source_id) => {
    const { data, error } = await supabase.from('media').select('*').eq('source_id', source_id);
    if (error) throw error;
    return await resolveMediaUrls(data);
};

export const getAllMedia = async (params = {}) => {
    const { data, error } = await supabase.from('media').select('*').order('date_uploaded', { ascending: false });
    if (error) throw error;
    return await resolveMediaUrls(data);
};

export const updateMediaRefs = async (params) => {
    const { media_id, ...updates } = params;
    const { data, error } = await supabase.from('media').update(updates).eq('media_id', media_id).select();
    if (error) throw error;
    return data[0];
};

/**
 * Delete a media record from DB.
 * Optionally also removes the R2 object if r2_key is present.
 * Supabase Storage objects are NOT removed (same legacy behavior).
 */
export const renameMedia = async (mediaId, newName) => {
    const { data, error } = await supabase
        .from('media')
        .update({ display_name: newName })
        .eq('media_id', mediaId)
        .select();
    if (error) throw error;
    return data[0];
};

export const deleteMedia = async (media_id) => {
    // Fetch row first to grab r2_key if present
    const { data: row } = await supabase.from('media').select('r2_key').eq('media_id', media_id).maybeSingle();
    const { error } = await supabase.from('media').delete().eq('media_id', media_id);
    if (error) throw error;
    // Best-effort: delete from R2 via a DELETE presign (not yet supported in r2-presign edge fn)
    // For now, file stays in R2 (orphaned but harmless). Add DELETE op to edge function later.
};

export const scanOrphans = async () => {
    return { success: true, message: 'Scan complete.' };
};

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
    try {
        const { data: config, error: configErr } = await supabase.from('config').select('*').eq('config_id', 'MAIN_CONFIG').maybeSingle();
        
        // Fetch some basic counts for stats
        const { count: journalCount } = await supabase.from('journal').select('*', { count: 'exact', head: true });
        const { count: todoCount } = await supabase.from('todos').select('*', { count: 'exact', head: true });
        
        return { 
            success: true,
            config: config?.content || { user_name: 'Md Ismail', theme: 'dark' },
            stats: {
                journal: journalCount || 0,
                todos: todoCount || 0
            }
        };
    } catch (err) {
        console.warn('Dashboard stats fetch failed', err);
        return { 
            success: true,
            data: { user_name: 'Md Ismail', theme: 'dark' },
            stats: { journal: 0, todos: 0 } 
        };
    }
};

export const updateConfig = async (params) => {
    const { data, error } = await supabase.from('config').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const recalculateStats = async () => {
    return { success: true };
};

// ─── Saved Videos & Sync ────────────────────────────────────────────────────
export const getSavedVideos = async () => {
    const { data, error } = await supabase.from('yt_liked').select('*');
    if (error) throw error;
    return data;
};

export const saveVideo = async (params) => {
    const { data, error } = await supabase.from('yt_liked').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const getYTChannels = async () => {
    const { data, error } = await supabase.from('yt_channels').select('*');
    if (error) throw error;
    return data;
};

export const saveYTChannel = async (params) => {
    const { data, error } = await supabase.from('yt_channels').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const removeYTChannel = async (id) => {
    const { error } = await supabase.from('yt_channels').delete().eq('id', id);
    if (error) throw error;
};

export const getYTDismissed = async () => {
    const { data, error } = await supabase.from('yt_dismissed').select('*');
    if (error) throw error;
    return data;
};

export const saveYTDismissed = async (video_id) => {
    const { data, error } = await supabase.from('yt_dismissed').insert([{ video_id }]).select();
    if (error) throw error;
    return data[0];
};

export const getYTLiked = async () => {
    const { data, error } = await supabase.from('yt_liked').select('*');
    if (error) throw error;
    return data;
};

export const toggleYTLiked = async (params) => {
    const { video_id, liked } = params;
    if (liked) {
        return saveVideo(params);
    } else {
        const { error } = await supabase.from('yt_liked').delete().eq('video_id', video_id);
        if (error) throw error;
    }
};

export const getTwitchLiked = async () => {
    const { data, error } = await supabase.from('twitch_liked').select('*');
    if (error) throw error;
    return data;
};

export const toggleTwitchLiked = async (params) => {
    const { video_id, liked } = params;
    if (liked) {
        const { data, error } = await supabase.from('twitch_liked').upsert([params]).select();
        if (error) throw error;
        return data[0];
    } else {
        const { error } = await supabase.from('twitch_liked').delete().eq('video_id', video_id);
        if (error) throw error;
    }
};

// ─── Writing ──────────────────────────────────────────────────────────
export const getWritings = async () => {
    const { data, error } = await supabase.from('writing').select('*').order('updatedAt', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveWriting = async (params) => {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));
    const { data, error } = await supabase.from('writing').upsert([cleanParams]).select();
    if (error) throw error;
    return data[0];
};

export const deleteWriting = async (id) => {
    const { error } = await supabase.from('writing').delete().eq('id', id);
    if (error) throw error;
};





// ─── App Passwords v2 (salted SHA-256) ──────────────────────
// Salt is stored alongside the hash so rainbow tables don't work.
// hash = SHA256(salt + password) — computed client-side in VaultLock.

export const getAppPasswordV2 = async (id) => {
    const { data, error } = await supabase.from('app_passwords_v2').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data; // { id, label, salt, hash, created_at }
};

export const setAppPasswordV2 = async (id, label, salt, hash) => {
    const { data, error } = await supabase
        .from('app_passwords_v2')
        .upsert([{ id, label, salt, hash }], { onConflict: 'id' })
        .select();
    if (error) throw error;
    return data[0];
};

// Legacy stubs — kept so non-vault callers don't crash during transition
export const getAppPassword = getAppPasswordV2;
export const initAppPasswords = async () => ({ success: true });

// ─── Life Map ────────────────────────────────────────────────
export const getLifeMap = async () => {
    const { data, error } = await supabase.from('life_map').select('*');
    if (error) throw error;
    return data;
};

export const saveLifeMap = async (params) => {
    const { data, error } = await supabase.from('life_map').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteLifeMap = async (id) => {
    const { error } = await supabase.from('life_map').delete().eq('id', id);
    if (error) throw error;
};

// ─── Time Capsules ──────────────────────────────────────────
export const getTimeCapsules = async () => {
    const { data, error } = await supabase.from('time_capsules').select('*');
    if (error) throw error;
    return data;
};

export const saveTimeCapsule = async (params) => {
    const { data, error } = await supabase.from('time_capsules').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteTimeCapsule = async (id) => {
    const { error } = await supabase.from('time_capsules').delete().eq('id', id);
    if (error) throw error;
};

// ─── Who Am I ────────────────────────────────────────────────
export const getWhoAmI = async () => {
    const { data, error } = await supabase.from('who_am_i').select('*');
    if (error) throw error;
    return data;
};

export const saveWhoAmI = async (params) => {
    const { data, error } = await supabase.from('who_am_i').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

// ─── Thought Dump ──────────────────────────────────────────
export const getThoughts = async (params = {}) => {
    const { data, error } = await supabase.from('thought_dump').select('*');
    if (error) throw error;
    return data;
};

export const saveThought = async (params) => {
    const { data, error } = await supabase.from('thought_dump').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteThought = async (id) => {
    const { error } = await supabase.from('thought_dump').delete().eq('id', id);
    if (error) throw error;
};

// ——— Streaks ——————————————————————————————————————————————————————————————
export const getStreaks = async () => {
    const { data, error } = await supabase.from('streaks').select('*');
    if (error) throw error;
    return data;
};

export const saveStreak = async (params) => {
    const { data, error } = await supabase.from('streaks').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteStreak = async (id) => {
    const { error } = await supabase.from('streaks').delete().eq('id', id);
    if (error) throw error;
};

export const logStreak = async (streak_id, date) => {
    const { data, error } = await supabase.from('streak_logs').upsert([{ streak_id, date }]).select();
    if (error) throw error;
    return data[0];
};

export const getStreakLogs = async (streak_id) => {
    const { data, error } = await supabase.from('streak_logs').select('*').eq('streak_id', streak_id);
    if (error) throw error;
    return data;
};

// ─── Image Resizer (Browser-side) ─────────────────────────────
const resizeImageToWebP = (file, maxDimension = 400) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Image load error'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
    });
};

export const getReadingList = async () => {
    const { data, error } = await supabase.from('reading_list').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveReadingList = async (params) => {
    const { data, error } = await supabase.from('reading_list').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const saveReadingItem = saveReadingList;

export const deleteReadingItem = async (id) => {
    const { error } = await supabase.from('reading_list').delete().eq('id', id);
    if (error) throw error;
};

// ─── Watchlist ──────────────────────────────────────────
export const getWatchlist = async () => {
    const { data, error } = await supabase.from('watchlist').select('*');
    if (error) throw error;
    return data;
};

export const saveWatchlist = async (params) => {
    const { data, error } = await supabase.from('watchlist').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const saveWatchItem = saveWatchlist;

export const deleteWatchItem = async (id) => {
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (error) throw error;
};

// ─── Finance ──────────────────────────────────────────
export const getFinance = async (params = {}) => {
    const { data, error } = await supabase.from('finance').select('*');
    if (error) throw error;
    return data;
};

export const saveFinance = async (params) => {
    const { data, error } = await supabase.from('finance').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const saveFinanceItem = saveFinance;

export const deleteFinanceItem = async (id) => {
    const { error } = await supabase.from('finance').delete().eq('id', id);
    if (error) throw error;
};

// ─── Bookmarks ──────────────────────────────────────────
export const getBookmarks = async () => {
    const { data, error } = await supabase.from('bookmarks').select('*');
    if (error) throw error;
    return data;
};

export const saveBookmark = async (params) => {
    const { data, error } = await supabase.from('bookmarks').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteBookmark = async (id) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) throw error;
};

// ─── Writing ──────────────────────────────────────────────────────────


// ─── Study Notes ──────────────────────────────────────────
export const getStudyFolders = async () => {
    const { data, error } = await supabase.from('study_folders').select('*');
    if (error) throw error;
    return data;
};

export const createStudyFolder = async (params) => {
    const { data, error } = await supabase.from('study_folders').insert([{
        folder_id: `SF-${Math.random().toString(36).substr(2, 8)}`,
        folder_name: params.folder_name,
        parent_folder_id: params.parent_folder_id,
        color: params.color,
        icon: params.icon
    }]).select();
    if (error) throw error;
    return data[0];
};

export const updateStudyFolder = async (params) => {
    const { folder_id, ...updates } = params;
    const { data, error } = await supabase.from('study_folders').update(updates).eq('folder_id', folder_id).select();
    if (error) throw error;
    return data[0];
};

export const deleteStudyFolder = async (id) => {
    const { error } = await supabase.from('study_folders').delete().eq('folder_id', id);
    if (error) throw error;
};

export const getStudyNotes = async (params = {}) => {
    let query = supabase
        .from('study_notes')
        .select('*')
        .order('updated_at', { ascending: false }); // always freshest first
    if (params.folder_id) query = query.eq('folder_id', params.folder_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const getAllStudyNotes = async () => {
    const { data, error } = await supabase.from('study_notes').select('*');
    if (error) throw error;
    return data;
};

export const createStudyNote = async (params) => {
    console.log('[API] Creating Study Note...', params);
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('study_notes').insert([{
        note_id: `SN-${Math.random().toString(36).substr(2, 8)}`,
        title: params.title || 'Untitled Note',
        folder_id: params.folder_id,
        content: params.content || '',
        tags: params.tags || '',
        audio_urls: params.audio_urls || '',
        image_urls: params.image_urls || '',
        file_urls: params.file_urls || '',
        created_at: now,
        updated_at: now
    }]).select();
    
    if (error) {
        console.error('[API] Create Note Error:', error);
        throw error;
    }
    console.log('[API] Created Note Success:', data[0]);
    return data[0];
};

export const updateStudyNote = async (params) => {
    const { note_id, ...updates } = params;

    // Only skip fields that are explicitly undefined (not passed at all)
    // Empty string is valid — it means the user cleared the field
    if (updates.content === undefined) delete updates.content;
    if (updates.title === undefined) delete updates.title;

    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
        .from('study_notes')
        .update(updates)
        .eq('note_id', note_id)
        .select()
        .single(); // returns one row, not an array
    if (error) throw error;
    return data;
};

export const deleteStudyNote = async (id) => {
    const { error } = await supabase.from('study_notes').delete().eq('note_id', id);
    if (error) throw error;
};

// ─── Music ──────────────────────────────────────────────────────────
export const getMusicLibrary = async () => {
    const { data, error } = await supabase
        .from('music_library')
        .select('*')
        .order('updated_at', { ascending: false }); // Always freshest first
    if (error) throw error;
    return data;
};



export const syncMusicLibrary = async (params = {}, onStatus) => {
    if (!params.folderId || params.folderId === 'all') {
        return { message: 'Use specific folder sync to add new tracks', files_added: 0 };
    }

    if (onStatus) onStatus('Authenticating...');
    // Ensure we have a token BEFORE starting the scan timer
    await requestDriveAccess();
    
    if (onStatus) onStatus('Scanning Drive...');
    
    // 1. Scan Drive folder directly with specific audio filter
    const audioFilter = "mimeType contains 'audio/' or name contains '.mp3' or name contains '.wav' or name contains '.m4a' or name contains '.flac'";
    
    // Add a 60s safety timeout to the scan (after auth is done)
    const filesPromise = scanDriveFolder(params.folderId, audioFilter);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Drive Scan Timed Out (60s). This folder might be too large or Drive is unresponsive.')), 60000)
    );
    
    const audioFiles = await Promise.race([filesPromise, timeoutPromise]);
    
    if (audioFiles.length === 0) return { message: 'No new music found.', files_added: 0 };
    if (onStatus) onStatus(`Found ${audioFiles.length} tracks...`);

    const now = new Date().toISOString();

    // 2. Format the tracks to match the strict Supabase schema
    const formattedTracks = audioFiles.map(file => ({
        id: file.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown',
        album: 'Unknown',
        drive_file_id: file.id,
        drive_link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        file_size_mb: String((parseInt(file.size || 0) / (1024 * 1024)).toFixed(2)),
        last_played_time: '0',
        updated_at: now,
        folder_id: params.folderId
    }));

    // 3. Ensure the folder exists in music_folders
    if (onStatus) onStatus('Updating Folders...');
    const { data: folderExists } = await supabase.from('music_folders').select('id').eq('folder_id', params.folderId).maybeSingle();
    if (!folderExists) {
        await supabase.from('music_folders').insert([{
            id: `FLD-${params.folderId.substring(0, 8)}`,
            name: 'Synced Folder',
            folder_id: params.folderId,
            added_at: now
        }]);
    }

    // 4. Insert the scanned tracks directly into Supabase
    const chunkSize = 200;
    for (let i = 0; i < formattedTracks.length; i += chunkSize) {
        if (onStatus) onStatus(`Syncing ${Math.min(i + chunkSize, formattedTracks.length)} / ${formattedTracks.length}...`);
        const chunk = formattedTracks.slice(i, i + chunkSize);
        const { error } = await supabase.from('music_library').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
    }

    if (onStatus) onStatus('Finalizing...');
    return { message: 'Sync complete!', files_added: formattedTracks.length };
};

export const updateMusicHistory = async (params) => {
    const { id, ...updates } = params;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
        .from('music_library')
        .update(updates)
        .eq('music_id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getMusicFolders = async () => {
    const { data, error } = await supabase
        .from('music_folders')
        .select('*')
        .order('added_at', { ascending: false }); // Always freshest first
    if (error) throw error;
    return data;
};


export const addMusicFolder = async (params) => {
    const { data, error } = await supabase.from('music_folders').insert([{
        id: `FLD-${Math.random().toString(36).substr(2, 8)}`,
        name: params.name,
        folder_id: params.folder_id,
        added_at: new Date().toISOString()
    }]).select();
    if (error) throw error;
    return data[0];
};


export const removeMusicFolder = async (id) => {
    const { error } = await supabase.from('music_folders').delete().eq('id', id);
    if (error) throw error;
};

export const addMusicFromLink = async () => {
    throw new Error('Please use Sync Now with a folder instead.');
};

export const getMusicBytes = async (fileId) => {
    const token = await requestDriveAccess();
    const url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media';
    let res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (res.status === 401) {
        const gAuth = await import('./googleAuth');
        gAuth.clearDriveToken();
        const freshToken = await requestDriveAccess();
        res = await fetch(url, { headers: { Authorization: 'Bearer ' + freshToken } });
    }
    if (!res.ok) throw new Error('Drive fetch failed (' + res.status + ')');
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) throw new Error('Drive returned HTML - check file sharing permissions');
    const blob = await res.blob();
    if (!blob.size) throw new Error('Received empty file from Drive');
    return URL.createObjectURL(blob);
};

export const getYearlyReviews = async () => {
    const { data, error } = await supabase.from('yearly_reviews').select('*');
    if (error) throw error;
    return data;
};

export const saveYearlyReview = async (params) => {
    const { data, error } = await supabase.from('yearly_reviews').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

// ─── Twitch ──────────────────────────────────────────────────────────
export const getTwitchChannels = async () => {
    const { data, error } = await supabase.from('twitch_channels').select('*');
    if (error) throw error;
    return data;
};

export const saveTwitchChannel = async (params) => {
    const { data, error } = await supabase.from('twitch_channels').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const removeTwitchChannel = async (id) => {
    const { error } = await supabase.from('twitch_channels').delete().eq('id', id);
    if (error) throw error;
};

export const getTwitchData = async (params) => {
    return { success: true, streams: [], videos: [] };
};

export const searchTwitchChannel = async (query) => {
    return [];
};

export const getSavedTwitchVideos = async () => {
    const { data, error } = await supabase.from('saved_twitch_videos').select('*');
    if (error) throw error;
    return data;
};

export const saveTwitchVideo = async (params) => {
    const { data, error } = await supabase.from('saved_twitch_videos').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const removeSavedTwitchVideo = async (video_id) => {
    const { error } = await supabase.from('saved_twitch_videos').delete().eq('video_id', video_id);
    if (error) throw error;
};

export const saveTwitchDismissed = async (item_id) => {
    const { data, error } = await supabase.from('twitch_dismissed').upsert([{ item_id, dismissed_at: new Date().toISOString() }]).select();
    if (error) throw error;
    return data[0];
};

// ─── Delegation ──────────────────────────────────────────────────
export const getDelegation = async () => {
    const { data, error } = await supabase.from('delegation').select('*');
    if (error) throw error;
    return data;
};

export const saveDelegationItem = async (params) => {
    const { data, error } = await supabase.from('delegation').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteDelegationItem = async (id) => {
    // Bi-directional sync: If this is a linked Todo item, mark the Todo as completed
    if (id && String(id).startsWith('DLG-TD-')) {
        const todo_id = String(id).replace('DLG-TD-', '');
        try {
            await supabase.from('todos').update({
                status: 'completed',
                outcome_status: 'completed',
                completion_date: getLocalDate(),
                completion_time: new Date().toLocaleTimeString(),
                notes: 'Completed via Delegation section'
            }).eq('todo_id', todo_id);
        } catch (e) {
            console.error('Failed to sync delegation completion back to todos', e);
        }
    }
    const { error } = await supabase.from('delegation').delete().eq('id', id);
    if (error) throw error;
};

export const updateDelegationRank = async (id, rank) => {
    const { data, error } = await supabase.from('delegation').update({ rank }).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

// ─── Notifications ──────────────────────────────────────────────────
export const getNotifications = async () => {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) throw error;
    return data;
};

export const saveNotification = async (params) => {
    const { data, error } = await supabase.from('notifications').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const deleteNotification = async (id) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
};

export const checkNewContent = async (lastCheck) => {
    return { success: true, hasNew: false };
};

export const getRssFeeds = async () => {
    const { data, error } = await supabase.from('rss_feeds').select('*');
    if (error) throw error;
    return data;
};

export const saveRssFeed = async (params) => {
    const { data, error } = await supabase.from('rss_feeds').upsert([params]).select();
    if (error) throw error;
    return data[0];
};

export const removeRssFeed = async (id) => {
    const { error } = await supabase.from('rss_feeds').delete().eq('id', id);
    if (error) throw error;
};



// ─── Helper: file → base64 ──────────────────────────────────────────
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is "data:mime/type;base64,XXXXX" – strip prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Helper: Local Date Utilities ──────────────────────────────────
export function getLocalDate(date = new Date()) {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

export function sanitizeDate(dateVal) {
    if (!dateVal) return getLocalDate();

    // Robustly handle Date objects or valid date strings
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Fallback: If it's a string, try a simple regex match for YYYY-MM-DD
    const match = String(dateVal).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];

    return getLocalDate();
}


// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const todayStr = () => getLocalDate();

export async function getStreamableUrl(url, mode = 'stream') {
    if (!url) return '';
    const match = url.match(/\/d\/([^/?]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];

    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large' || mode === 'view') return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;

    // For playback, we now use the native Drive API if possible to avoid CORS/Auth issues
    try {
        const token = await requestDriveAccess();
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
        
        // We can't return this URL directly to an <audio> tag because it needs the Auth header.
        // So we return the direct uc?pattern as a fallback, or better yet, the caller should use getMusicBytes.
        return `https://drive.google.com/uc?export=open&id=${id}`;
    } catch (err) {
        return `https://drive.google.com/uc?export=open&id=${id}`;
    }
}












// â”€â”€â”€ Migration Helpers (Legacy Aliases for Compatibility) â”€â”€â”€â”€â”€â”€
export const getMusicLibraryLegacy = () => getMusicLibrary();
export const getMusicFoldersLegacy = () => getMusicFolders();
export const getEntriesLegacy = () => getEntries();
export const getStudyFoldersLegacy = () => getStudyFolders();
export const getStudyNotesLegacy = () => getStudyNotes();
export const getVaultFoldersLegacy = () => getVaultFolders();
export const getVaultFacesLegacy = () => getVaultFaces();




// --- Password Manager --------------------------------------------------------
// NOTE: All password data stored here is already encrypted (AES-256-GCM) by the
// client. The API layer only deals with ciphertext  never plaintext passwords.

/** Fetch all password entries (ciphertext  decryption is the UI's job). */
export const getPasswords = async () => {
    const { data, error } = await supabase
        .from('passwords')
        .select('*')
        .order('site_name', { ascending: true });
    if (error) throw error;
    return data;
};

/**
 * Create a single encrypted password entry.
 */
export const createPassword = async (params) => {
    const entry = {
        id: params.id || `PWD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        site_name: params.site_name || '',
        site_url: params.site_url || '',
        username: params.username || '',
        enc_password: params.enc_password,
        enc_iv: params.enc_iv,
        notes: params.notes || '',
        category: params.category || 'General',
        strength: params.strength || 'fair',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('passwords').insert([entry]).select();
    if (error) throw error;
    return data[0];
};

/**
 * Update an existing password entry.
 */
export const updatePassword = async (params) => {
    const { id, ...updates } = params;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
        .from('passwords')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
};

/** Hard-delete a password entry by id. */
export const deletePassword = async (id) => {
    const { error } = await supabase.from('passwords').delete().eq('id', id);
    if (error) throw error;
};

/**
 * Bulk-insert multiple encrypted password entries (from CSV import).
 */
export const bulkCreatePasswords = async (entries) => {
    const rows = entries.map((p) => ({
        id: p.id || `PWD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        site_name: p.site_name || '',
        site_url: p.site_url || '',
        username: p.username || '',
        enc_password: p.enc_password,
        enc_iv: p.enc_iv,
        notes: p.notes || '',
        category: p.category || 'General',
        strength: p.strength || 'fair',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase.from('passwords').insert(rows).select();
    if (error) throw error;
    return data;
};
