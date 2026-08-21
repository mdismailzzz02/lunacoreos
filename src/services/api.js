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

export const getVaultCollections = async (mode = 'normal') => {
    let query = supabase.from('vault_collections').select('*').order('created_at', { ascending: true });
    if (mode === 'normal') {
        query = query.eq('is_hidden', false).eq('is_secret', false);
    } else if (mode === 'hidden') {
        query = query.eq('is_secret', false); // show normal + hidden
    } else if (mode === 'secret') {
        query = query.eq('is_hidden', false); // show normal + secret
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

const normalizeR2Prefix = (prefix) => {
    if (prefix === null || prefix === undefined) return '';
    const cleaned = String(prefix).trim().replace(/\\/g, '/');
    if (!cleaned || cleaned === '/') return '';
    return cleaned.endsWith('/') ? cleaned : `${cleaned}/`;
};

export const createVaultCollection = async ({ name, type = 'gallery', key_prefix, is_hidden = false, is_secret = false, parent_id = null }) => {
    let prefix = normalizeR2Prefix(key_prefix);

    if (!prefix) {
        prefix = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`;

        if (parent_id) {
            const { data: parent } = await supabase.from('vault_collections').select('key_prefix').eq('id', parent_id).single();
            if (parent?.key_prefix) {
                prefix = `${normalizeR2Prefix(parent.key_prefix)}${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`;
            }
        }
    }

    // 1. Register in Database
    const { data, error } = await supabase.from('vault_collections').insert([{
        name,
        type,
        key_prefix: prefix,
        is_hidden,
        is_secret,
        parent_id
    }]).select();
    if (error) throw error;

    // 2. Automatically create the visual "folder" in R2 by uploading a 0-byte object.
    // Skip this when the collection is intentionally rooted at the bucket root.
    if (prefix) {
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
    }

    return data[0];
};

export const updateVaultCollection = async (id, updates) => {
    const { data, error } = await supabase.from('vault_collections').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const deleteVaultCollection = async (id) => {
    // 1. Get the collection to find its prefix
    const { data: col } = await supabase.from('vault_collections').select('key_prefix').eq('id', id).single();
    
    // 2. Delete from DB (cascade deletes files in DB)
    const { error } = await supabase.from('vault_collections').delete().eq('id', id);
    if (error) throw error;
    
    // 3. Delete files from R2 asynchronously so UI isn't blocked
    if (col?.key_prefix) {
        deleteR2Prefix(col.key_prefix).catch(err => console.error('Failed to delete files in R2:', err));
    }
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

export const getRandomVaultFiles = async (collectionId, limit = 50) => {
    const { data, error } = await supabase.rpc('get_random_vault_files', {
        p_collection_id: collectionId,
        p_limit: limit
    });

    if (error) {
        console.error("Error fetching random files:", error);
        throw error;
    }
    
    return data; 
};

export const insertVaultFile = async (params) => {
    const { data, error } = await supabase.from('vault_files').insert([params]).select();
    if (error) throw error;
    return data[0];
};

// Delete a file - moves to trash instead of permanent deletion
export const deleteVaultFile = async (fileId) => {
    // Always move to trash first - never permanently delete without user confirmation
    return moveFileToTrash(fileId);
};


// ─── Vault Trash System ───────────────────────────────────────

/**
 * Get or create the trash collection for a vault path
 * Trash prefix: luna-vault/documents-lunatrash/ (configurable per vault)
 */
const getOrCreateTrashCollection = async (vaultPrefix = '') => {
    // Important: the bucket name is not a folder in R2. The real object prefix is inside the bucket, e.g.
    // "documents-lunatrash/". Cloudflare shows the bucket name in the UI as a parent path, but the actual
    // object key should not include the bucket name itself.
    const canonicalTrashPrefix = 'documents-lunatrash/';
    const preferredTrashPrefix = vaultPrefix
        ? `${normalizeR2Prefix(vaultPrefix.replace(/\/$/, ''))}-lunatrash/`
        : canonicalTrashPrefix;

    const { data: exact } = await supabase
        .from('vault_collections')
        .select('*')
        .eq('key_prefix', preferredTrashPrefix)
        .limit(1);

    if (exact && exact[0]) return exact[0];

    // Repair legacy nested trash entries created by the earlier bug.
    const { data: legacy } = await supabase
        .from('vault_collections')
        .select('*')
        .or('key_prefix.like.%documents-lunatrash%,key_prefix.eq.luna-vault/documents-lunatrash/,key_prefix.eq.luna-vault/luna-vault/documents-lunatrash/')
        .limit(20);

    if (legacy && legacy.length > 0) {
        const target = legacy.find(r => r.key_prefix === preferredTrashPrefix) || legacy[0];
        const { data: updated } = await supabase
            .from('vault_collections')
            .update({ key_prefix: preferredTrashPrefix, name: '🗑️ Trash' })
            .eq('id', target.id)
            .select();

        if (updated && updated[0]) return updated[0];
    }

    const { data: created } = await supabase
        .from('vault_collections')
        .insert([{
            name: '🗑️ Trash',
            type: 'gallery',
            key_prefix: preferredTrashPrefix,
            is_hidden: false,
            is_secret: false,
            parent_id: null
        }])
        .select();

    return created ? created[0] : null;
};

/**
 * Move a file to trash (soft delete)
 * Moves R2 object to trash prefix and marks file as trashed in DB
 */
export const moveFileToTrash = async (fileId) => {
    console.log('📦 moveFileToTrash START - fileId:', fileId);
    const { data: file } = await supabase
        .from('vault_files')
        .select('id, r2_key, filename, collection_id')
        .eq('id', fileId)
        .single();
    
    console.log('📦 File fetched:', { id: file?.id, r2_key: file?.r2_key, filename: file?.filename });
    if (!file) throw new Error('File not found');
    
    const trashCol = await getOrCreateTrashCollection();
    console.log('📦 Trash collection:', { id: trashCol?.id, key_prefix: trashCol?.key_prefix });
    if (!trashCol) throw new Error('Could not create trash collection');
    
    // Generate trash key by adding timestamp to preserve duplicates
    const timestamp = Date.now();
    const ext = file.filename.split('.').pop();
    const nameWithoutExt = file.filename.slice(0, -(ext.length + 1));
    const trashedR2Key = `${trashCol.key_prefix}${timestamp}-${nameWithoutExt}.${ext}`;
    console.log('📦 R2 key paths:', { source: file.r2_key, dest: trashedR2Key });
    
    // Move file in R2 first using the Edge Function
    try {
        console.log('📦 Calling r2EdgeFetch copy operation...');
        const moveResult = await r2EdgeFetch({ 
            op: 'copy', 
            source_key: file.r2_key, 
            dest_key: trashedR2Key 
        });
        console.log('📦 Copy result:', moveResult);
        if (!moveResult.success) throw new Error('Copy failed');
    } catch (e) {
        console.error('❌ R2 copy failed:', e);
        throw new Error(`Failed to move file to trash: ${e.message}`);
    }
    
    // Mark as trashed in DB after successful R2 move
    const { error: updateErr } = await supabase
        .from('vault_files')
        .update({
            is_trashed: true,
            trashed_at: new Date().toISOString(),
            original_collection_id: file.collection_id,
            original_r2_key: file.r2_key,
            collection_id: trashCol.id,
            r2_key: trashedR2Key
        })
        .eq('id', fileId);
    
    if (updateErr) throw updateErr;
};

/**
 * Restore a file from trash back to its original location
 */
export const restoreFileFromTrash = async (fileId) => {
    const { data: file } = await supabase
        .from('vault_files')
        .select('*')
        .eq('id', fileId)
        .single();
    
    if (!file || !file.is_trashed) throw new Error('File is not in trash');
    if (!file.original_collection_id || !file.original_r2_key) throw new Error('Cannot restore: original location unknown');
    
    // Move file in R2 first using the Edge Function
    try {
        const moveResult = await r2EdgeFetch({ 
            op: 'copy', 
            source_key: file.r2_key, 
            dest_key: file.original_r2_key 
        });
        if (!moveResult.success) throw new Error('Copy failed');
    } catch (e) {
        console.error('Failed to move file in R2:', e);
        throw new Error(`Failed to restore file: ${e.message}`);
    }
    
    // Restore in DB after successful R2 move
    const { error: updateErr } = await supabase
        .from('vault_files')
        .update({
            is_trashed: false,
            trashed_at: null,
            collection_id: file.original_collection_id,
            r2_key: file.original_r2_key,
            original_collection_id: null,
            original_r2_key: null
        })
        .eq('id', fileId);
    
    if (updateErr) throw updateErr;
};

/**
 * Permanently delete a file from trash
 */
export const permanentlyDeleteFile = async (fileId) => {
    const { data: file } = await supabase
        .from('vault_files')
        .select('r2_key')
        .eq('id', fileId)
        .single();
    
    if (!file) throw new Error('File not found');
    
    // Delete from DB
    const { error } = await supabase.from('vault_files').delete().eq('id', fileId);
    if (error) throw error;
    
    // Delete from R2
    if (file?.r2_key) {
        deleteR2Object(file.r2_key).catch(err => console.error('Failed to delete file from R2:', err));
    }
};

/**
 * Get all trashed files
 */
export const getTrashFiles = async (page = 1, pageSize = 50) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
        .from('vault_files')
        .select('*', { count: 'exact' })
        .eq('is_trashed', true)
        .order('trashed_at', { ascending: false })
        .range(from, to);
    
    if (error) throw error;
    return { files: data, total: count, page, pageSize, hasMore: to < count - 1 };
};

/**
 * Empty entire trash (permanent delete all trashed files)
 */
export const emptyTrash = async () => {
    const { data: allTrashed } = await supabase
        .from('vault_files')
        .select('r2_key')
        .eq('is_trashed', true);
    
    // Delete all from DB
    const { error } = await supabase
        .from('vault_files')
        .delete()
        .eq('is_trashed', true);
    
    if (error) throw error;
    
    // Delete all from R2
    if (allTrashed) {
        for (const file of allTrashed) {
            deleteR2Object(file.r2_key).catch(err => console.error('Failed to delete from R2:', err));
        }
    }
};


// ─── Vault R2 — Public bucket URLs (no signed-read URL required) ───────────

const R2_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign`;

const buildPublicR2Url = (key) => {
    const publicBase = import.meta.env.VITE_R2_PUBLIC_URL;
    if (!publicBase) return null;
    const normalizedBase = publicBase.replace(/\/$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${normalizedBase}/${encodedKey}`;
};

async function r2EdgeFetch(queryParams, body = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const qs = new URLSearchParams(queryParams).toString();
    console.log('🌐 r2EdgeFetch:', { op: queryParams.op, qs });
    const res = await fetch(`${R2_EDGE_URL}?${qs}`, {
        method: body ? 'POST' : 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    console.log('🌐 r2EdgeFetch response:', { status: res.status, ok: res.ok });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('🌐 r2EdgeFetch error:', err);
        throw new Error(err.error || `r2-presign edge function error ${res.status}`);
    }
    const result = await res.json();
    console.log('🌐 r2EdgeFetch success:', result);
    return result;
}

/** Public bucket upload/read: if VITE_R2_PUBLIC_URL is configured, use direct public URLs. */
export const getR2PresignedPut = async (key, mimeType = 'application/octet-stream') => {
    return r2EdgeFetch({ op: 'put', key, content_type: mimeType });
};

/** Direct public GET URL for viewing/downloading a file from a public bucket. */
export const getR2PresignedGet = async (key) => {
    const publicUrl = buildPublicR2Url(key);
    if (publicUrl) {
        return { url: publicUrl };
    }
    throw new Error('VITE_R2_PUBLIC_URL is not configured. Set it to your public R2 bucket URL.');
};

/** Batch direct public GET URLs for a public bucket. Returns { urls: { [key]: url } } */
export const getR2PresignedBatch = async (keys) => {
    if (!keys || keys.length === 0) return { urls: {} };

    const publicBase = import.meta.env.VITE_R2_PUBLIC_URL;
    if (publicBase) {
        const urls = {};
        keys.forEach((k) => {
            const publicUrl = buildPublicR2Url(k);
            if (publicUrl) urls[k] = publicUrl;
        });
        return { urls };
    }

    return r2EdgeFetch({ op: 'batch_get' }, { keys });
};

/** List R2 objects under a prefix (for sync). Returns paginated { objects, nextToken, isTruncated } */
export const listR2Objects = async (prefix, token = null, pageSize = 200, delimiter = null) => {
    const params = { op: 'list', prefix, page_size: pageSize };
    if (token) params.token = token;
    if (delimiter) params.delimiter = delimiter;
    return r2EdgeFetch(params);
};

export const deleteR2Object = async (key) => {
    return r2EdgeFetch({ op: 'delete', key }, { method: 'POST' });
};

export const deleteR2Prefix = async (prefix) => {
    return r2EdgeFetch({ op: 'delete_prefix', prefix }, { method: 'POST' });
};


// ─── Vault R2 — Sync (rclone/bulk upload → index) ───────────

/**
 * Scans all R2 objects under the collection's key_prefix,
 * diffs against existing vault_files rows, and inserts new ones.
 * Supports delta sync — only adds new objects not yet in DB.
 * Returns { added, skipped, total }.
 */
export const syncVaultCollection = async (collectionId) => {
    const deleteCollectionTree = async (id) => {
        const { data: children } = await supabase
            .from('vault_collections')
            .select('*')
            .eq('parent_id', id);

        for (const child of (children || [])) {
            await deleteCollectionTree(child.id);
        }

        await supabase.from('vault_files').delete().eq('collection_id', id);
        await supabase.from('vault_collections').delete().eq('id', id);
    };

    // 1. Load collection metadata
    const { data: col, error: colErr } = await supabase
        .from('vault_collections').select('*').eq('id', collectionId).single();
    if (colErr) throw colErr;

    const basePrefix = normalizeR2Prefix(col.key_prefix);

    // 2. Get the last successful sync marker for this collection. If it exists, only ingest
    // files newer than that timestamp rather than re-scanning the whole tree every time.
    const { data: syncState } = await supabase
        .from('vault_sync_log')
        .select('last_synced_at')
        .eq('collection_id', collectionId)
        .maybeSingle();

    const lastSyncedAt = syncState?.last_synced_at ? new Date(syncState.last_synced_at) : null;

    // 3. Get immediate contents under the prefix (delimiter = "/").
    let allObjects = [];
    let allPrefixes = [];
    let nextToken = null;
    do {
        const res = await listR2Objects(basePrefix, nextToken, 200, "/");
        allObjects = allObjects.concat(res.objects || []);
        allPrefixes = allPrefixes.concat(res.prefixes || []);
        nextToken = res.nextToken || null;
    } while (nextToken);

    const currentR2Keys = new Set((allObjects || []).filter(obj => obj && obj.key && obj.size > 0).map(obj => obj.key));
    const currentR2Prefixes = new Set((allPrefixes || []).filter(p => p && p !== basePrefix));

    let addedFiles = 0;
    let addedFolders = 0;

    // Delta-sync: if a sync marker exists, only consider objects newer than that timestamp.
    const rawObjects = (allObjects || []).filter(obj => {
        if (!obj || !obj.key || obj.size <= 0 || obj.key === basePrefix) return false;
        if (!lastSyncedAt || !obj.lastModified) return true;
        const modifiedAt = new Date(obj.lastModified);
        return modifiedAt > lastSyncedAt;
    });

    const { data: existingFiles } = await supabase
        .from('vault_files')
        .select('id, r2_key, is_trashed')
        .eq('collection_id', collectionId);
    const existingKeys = new Set((existingFiles || []).map(f => f.r2_key));

    const missingActiveKeys = (existingFiles || [])
        .filter(file => !file.is_trashed && !currentR2Keys.has(file.r2_key))
        .map(file => file.r2_key);

    if (missingActiveKeys.length > 0) {
        console.log('[syncVaultCollection] removing stale active files from Supabase:', missingActiveKeys.length, missingActiveKeys.slice(0, 10));
        const { error: deleteErr } = await supabase
            .from('vault_files')
            .delete()
            .eq('collection_id', collectionId)
            .in('r2_key', missingActiveKeys);

        if (deleteErr) throw deleteErr;
    }

    const seen = new Set();
    const fileRows = [];

    for (const obj of rawObjects) {
        if (seen.has(obj.key)) continue;
        seen.add(obj.key);

        const filename = obj.key.split('/').pop() || obj.key;
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeMap = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4',
            mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4',
            wav: 'audio/wav', pdf: 'application/pdf',
            txt: 'text/plain', js: 'text/javascript', ts: 'text/typescript',
        };
        const mime = mimeMap[ext] || 'application/octet-stream';

        fileRows.push({
            collection_id: collectionId,
            filename,
            r2_key: obj.key,
            size_bytes: obj.size,
            mime_type: mime,
            uploaded_at: obj.lastModified || new Date().toISOString()
        });
    }

    if (fileRows.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < fileRows.length; i += BATCH_SIZE) {
            const slice = fileRows.slice(i, i + BATCH_SIZE);
            const { error: insErr } = await supabase
                .from('vault_files')
                .upsert(slice, { onConflict: 'r2_key' });

            if (insErr) throw insErr;
            addedFiles += slice.length;
        }
    }

    await supabase
        .from('vault_sync_log')
        .upsert({
            collection_id: collectionId,
            last_synced_at: new Date().toISOString()
        }, { onConflict: 'collection_id' });

    return {
        added: addedFiles,
        addedFolders: 0,
        removed: missingActiveKeys.length,
        removedKeys: missingActiveKeys,
        skipped: Math.max(0, rawObjects.length - addedFiles),
        total: rawObjects.length
    };
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


    return isArray ? items : items[0];
};



/**
 * Upload a file to R2.
 * Pass { file: File, media_type, uploaded_from, source_id } and an optional onProgress callback.
 */
export const uploadMedia = async (params, onProgress) => {
    const mediaId = params.media_id || ('MED-' + Math.random().toString(36).substr(2, 9).toUpperCase());

    if (!(params.file instanceof File)) {
        throw new Error('uploadMedia: params.file must be a File object. Supabase Storage (base64) path has been removed.');
    }

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
    // Fetch row first to grab r2_key before deleting
    const { data: row } = await supabase.from('media').select('r2_key').eq('media_id', media_id).maybeSingle();
    const { error } = await supabase.from('media').delete().eq('media_id', media_id);
    if (error) throw error;
    // Best-effort: delete the actual file from R2 so nothing is orphaned
    if (row?.r2_key) {
        deleteR2Object(row.r2_key).catch(err => console.warn('[deleteMedia] R2 cleanup failed (non-fatal):', err));
    }
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
    const { video_id, liked, ...dbParams } = params;
    if (liked) {
        const { data, error } = await supabase.from('twitch_liked').upsert([{ video_id, ...dbParams }]).select();
        if (error) throw error;
        return data[0];
    } else {
        const { error } = await supabase.from('twitch_liked').delete().eq('video_id', video_id);
        if (error) throw error;
    }
};

// ─── Writing ──────────────────────────────────────────────────────────
export const getWritings = async (mode = 'normal') => {
    let query = supabase.from('writing').select('*').order('updatedAt', { ascending: false });
    if (mode === 'normal') query = query.or('mode.eq.normal,mode.is.null');
    else query = query.eq('mode', mode);
    
    const { data, error } = await query;
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
    const { data, error } = await supabase.from('reading_list').select('*');
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
        .select('note_id, title, folder_id, tags, linked_notes, audio_urls, image_urls, file_urls, created_at, updated_at, delete_status')
        .or('delete_status.neq.yes,delete_status.is.null') // exclude soft-deleted notes, preserving nulls
        .order('updated_at', { ascending: false }); // always freshest first
    if (params.folder_id) query = query.eq('folder_id', params.folder_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const getStudyNoteContent = async (note_id) => {
    const { data, error } = await supabase
        .from('study_notes')
        .select('content')
        .eq('note_id', note_id)
        .single();
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
        title: params.title || '',
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

// ─── Music (via Vault R2) ────────────────────────────────────────────────
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

export const getR2TrackUrl = (r2_key) => {
    if (!r2_key) return '';
    return `${R2_PUBLIC_URL}/${r2_key}`;
};

/**
 * Fetch audio files directly from the vault_files table.
 */
export const getMusicLibrary = async (collectionId = null, playlistId = null) => {
    if (playlistId) {
        // Fetch tracks specifically for this playlist
        const { data, error } = await supabase
            .from('music_playlist_tracks')
            .select(`
                file_id,
                added_at,
                vault_files (*, vault_collections(name))
            `)
            .eq('playlist_id', playlistId)
            .order('added_at', { ascending: true });
            
        if (error) throw error;
        
        return data
            .filter(row => row.vault_files && !row.vault_files.is_trashed)
            .map(row => {
                const f = row.vault_files;
                return {
                    id: f.id,
                    title: f.filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
                    artist: f.vault_collections?.name || 'Vault',
                    album: 'Playlist Track',
                    r2_key: f.r2_key,
                    playback_url: getR2TrackUrl(f.r2_key),
                    file_size_mb: ((f.size_bytes || 0) / 1048576).toFixed(2),
                    collection_id: f.collection_id,
                    playlist_added_at: row.added_at
                };
            });
    }

    // Standard folder fetching logic
    let query = supabase
        .from('vault_files')
        .select('*, vault_collections(name)')
        .or('mime_type.ilike.audio/%,filename.ilike.%.mp3,filename.ilike.%.wav,filename.ilike.%.m4a,filename.ilike.%.flac')
        .ilike('r2_key', '%documents-music-folders/%')
        .eq('is_trashed', false)
        .order('filename', { ascending: true });

    if (collectionId && collectionId !== 'all') {
        query = query.eq('collection_id', collectionId);
    }
    
    const { data, error } = await query;
    if (error) throw error;

    return data.map(f => ({
        id: f.id,
        title: f.filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
        artist: f.vault_collections?.name || 'Vault',
        album: 'Vault Collection',
        r2_key: f.r2_key,
        playback_url: getR2TrackUrl(f.r2_key),
        file_size_mb: ((f.size_bytes || 0) / 1048576).toFixed(2),
        collection_id: f.collection_id
    }));
};

/**
 * Fetch Vault collections that we can use as "Folders"
 */
export const getMusicFolders = async () => {
    const { data, error } = await supabase
        .from('vault_collections')
        .select('*')
        .eq('is_hidden', false)
        .eq('is_secret', false)
        .ilike('key_prefix', '%documents-music-folders/%')
        .order('name', { ascending: true });
    if (error) throw error;
    
    // Map them to the expected format for MusicPlayerPage
    return data.map(c => ({
        id: c.id,
        name: c.name.replace('documents-music-folders/', ''), // Clean up display name if needed
        key_prefix: c.key_prefix
    }));
};

// ── Custom Playlists ──────────────────────────────────────────────────
export const getMusicPlaylists = async () => {
    const { data, error } = await supabase
        .from('music_playlists')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const createMusicPlaylist = async (name) => {
    const { data, error } = await supabase
        .from('music_playlists')
        .insert([{ name }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteMusicPlaylist = async (playlistId) => {
    const { error } = await supabase
        .from('music_playlists')
        .delete()
        .eq('id', playlistId);
    if (error) throw error;
};

export const addTrackToPlaylist = async (playlistId, fileId) => {
    const { error } = await supabase
        .from('music_playlist_tracks')
        .insert([{ playlist_id: playlistId, file_id: fileId }]);
    if (error && error.code !== '23505') throw error; // Ignore unique constraint violation (already added)
};

export const removeTrackFromPlaylist = async (playlistId, fileId) => {
    const { error } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .match({ playlist_id: playlistId, file_id: fileId });
    if (error) throw error;
};


export const addMusicFolder = async () => {
    throw new Error('Please create Collections in the Vault instead.');
};
export const removeMusicFolder = async () => {
    throw new Error('Please manage Collections in the Vault.');
};

export const syncMusicLibrary = async (params = {}, onStatus) => {
    if (onStatus) onStatus('Scanning Vault...');
    // Since we're pulling directly from Vault, "Syncing" just means reloading the data
    const data = await getMusicLibrary(params.folderId);
    return { message: `Found ${data.length} audio files in Vault.`, files_added: 0 };
};

export const updateMusicHistory = async () => {
    // We don't store playback position on Vault files to keep the schema clean
    return null;
};

export const getMusicBytes = async () => { throw new Error('getMusicBytes is removed. Use R2 playback_url.'); };
export const addMusicFromLink = async () => { throw new Error('Use Vault to upload files.'); };

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

let twitchAccessToken = null;
let twitchTokenExpiry = 0;

const getTwitchToken = async () => {
    if (twitchAccessToken && Date.now() < twitchTokenExpiry) {
        return twitchAccessToken;
    }
    const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Twitch credentials missing in .env");

    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
        method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get Twitch token');
    
    twitchAccessToken = data.access_token;
    twitchTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return twitchAccessToken;
};

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
    try {
        const { data: channels } = await supabase.from('twitch_channels').select('*');
        if (!channels || channels.length === 0) return { streams: [], videos: [] };
        
        const token = await getTwitchToken();
        const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
        
        const userLogins = channels.map(c => `user_login=${c.login}`).join('&');

        // 1. Fetch live streams
        const streamsRes = await fetch(`https://api.twitch.tv/helix/streams?${userLogins}`, {
            headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` }
        });
        const streamsData = await streamsRes.json();
        const streams = streamsData.data || [];

        // 2. Fetch recent VODs concurrently for up to 10 channels to avoid long loads
        const videoPromises = channels.slice(0, 10).map(c => 
            fetch(`https://api.twitch.tv/helix/videos?user_id=${c.id}&first=3&type=archive`, {
                headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).catch(() => ({ data: [] }))
        );
        const videosData = await Promise.all(videoPromises);
        let videos = [];
        videosData.forEach(vd => {
            if (vd.data) videos = videos.concat(vd.data);
        });

        // Sort videos by most recent
        videos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return { success: true, streams, videos };
    } catch (e) {
        return { error: e.message, streams: [], videos: [] };
    }
};

export const searchTwitchChannel = async (query) => {
    try {
        const token = await getTwitchToken();
        const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
        
        const res = await fetch(`https://api.twitch.tv/helix/users?login=${query}`, {
            headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const user = data.data[0];
            // Map fields to match what TwitchPage.jsx expects
            return {
                ...user,
                broadcaster_login: user.login,
                thumbnail_url: user.profile_image_url
            };
        }
        return { error: 'Channel not found' };
    } catch (e) {
        return { error: e.message };
    }
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
    // R2, Supabase Storage, or any non-Drive URL → return as-is, no auth needed
    const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
    if (!isDrive) return url;

    const match = url.match(/\/d\/([^/?]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];

    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large' || mode === 'view') return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;

    // For Drive playback, use uc?export=open pattern
    try {
        await requestDriveAccess();
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

export const toggleYTLike = async (video_id, is_favorite) => {
    const { data, error } = await supabase.from('yt_liked').update({ is_favorite }).eq('video_id', video_id).select();
    if (error) throw error;
    return data;
};

