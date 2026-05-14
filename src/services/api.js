import { scanDriveFolder, scanDriveFolderIdsOnly, requestDriveAccess } from './googleAuth';
import { supabase } from './supabaseClient';
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

// ─── Vault ────────────────────────────────────────────────────

export const getVaultFolders = async () => {
    const { data, error } = await supabase.from('vault_folders').select('*');
    if (error) throw error;
    // Map uppercase DB columns back to what frontend expects
    return data.map(f => ({ 
        id: f.ID, 
        name: f.Name,
        folder_id: f.FolderID,
        faceGroupsJSON: f.FaceGroupsJSON || '[]'
    }));
};

export const createVaultFolder = async (params) => {
    const newId = `VLT-${Math.random().toString(36).substr(2, 8)}`;
    const { data, error } = await supabase.from('vault_folders').insert([{
        "ID": newId,
        "Name": params.name,
        "FolderID": params.folder_id,
        "FaceGroupsJSON": params.faceGroupsJSON || '[]',
        "CreatedAt": new Date().toISOString()
    }]).select();
    if (error) throw error;
    return { ...data[0], id: data[0].ID, name: data[0].Name, folder_id: data[0].FolderID };
};

export const updateVaultFolder = async (params) => {
    const { id, ...updates } = params;
    const dbUpdates = {};
    if (updates.name) dbUpdates.Name = updates.name;
    if (updates.folder_id) dbUpdates.FolderID = updates.folder_id;
    if (updates.faceGroupsJSON) dbUpdates.FaceGroupsJSON = updates.faceGroupsJSON;

    const { data, error } = await supabase.from('vault_folders').update(dbUpdates).eq('ID', id).select();
    if (error) throw error;
    return { ...data[0], id: data[0].ID };
};

export const deleteVaultFolder = async (id) => {
    const { error } = await supabase.from('vault_folders').delete().eq('ID', id);
    if (error) throw error;
};

// Aliases for compatibility
export const addVaultFolder = createVaultFolder;
export const removeVaultFolder = deleteVaultFolder;


export const getVaultFaces = async () => {
    const { data, error } = await supabase.from('vault_faces').select('*');
    if (error) throw error;
    return data;
};

export const createVaultFace = async (params) => {
    const { data, error } = await supabase.from('vault_faces').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const updateVaultFace = async (params) => {
    const { id, ...updates } = params;
    const { data, error } = await supabase.from('vault_faces').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const deleteVaultFace = async (id) => {
    const { error } = await supabase.from('vault_faces').delete().eq('id', id);
    if (error) throw error;
};


// ─── Vault Index Functions ───────────────────────────────────
export const getVaultIndex = async (folderId) => {
    const { data, error } = await supabase.from('vault_index').select('Data').eq('FolderID', folderId).maybeSingle();
    if (error) return null;
    return data?.Data || null;
};

export const saveVaultIndex = async (folderId, indexData) => {
    const { error } = await supabase.from('vault_index').upsert({
        FolderID: folderId,
        Data: indexData,
        UpdatedAt: new Date().toISOString()
    }, { onConflict: 'FolderID' });
    if (error) throw error;
    return true;
};


// ─── Media ───────────────────────────────────────────────────────────────────
export const uploadMedia = async (params) => {
    // 1. Upload to Supabase Storage if base64data is provided
    if (params.base64data) {
        try {
            const bucketName = 'media';
            const { decode } = await import('base64-arraybuffer');
            const base64Clean = params.base64data.includes(',') ? params.base64data.split(',')[1] : params.base64data;
            const arrayBuffer = decode(base64Clean);
            
            const fileExt = params.filename ? params.filename.split('.').pop() : 'bin';
            const filePath = `${params.uploaded_from || 'misc'}/${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, arrayBuffer, {
                    contentType: params.mime_type || 'application/octet-stream',
                    upsert: true
                });

            if (storageError) throw storageError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            params.drive_link = publicUrl; // Re-use drive_link field for the URL to avoid schema changes
            params.storage_path = filePath;
            
            // Remove base64 payload to save database space
            delete params.base64data;
        } catch (err) {
            console.error('Supabase storage upload failed:', err);
            throw new Error(`Storage upload failed: ${err.message}. Make sure you have a "media" bucket created in Supabase with public access.`);
        }
    }

    if (!params.media_id) {
        params.media_id = `MED-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    console.log('Inserting Media:', params);
    const { data, error } = await supabase.from('media').insert([params]).select();
    if (error) throw error;
    return data[0];
};

export const getMediaById = async (media_id) => {
    const { data, error } = await supabase.from('media').select('*').eq('media_id', media_id).single();
    if (error) throw error;
    return data;
};

export const getThumbnailBase64 = async (media_id) => {
    // Legacy call. For now, return placeholder or Drive link.
    return '';
};

export const getMediaBySource = async (source_id) => {
    const { data, error } = await supabase.from('media').select('*').eq('source_id', source_id);
    if (error) throw error;
    return data;
};

export const getAllMedia = async (params = {}) => {
    const { data, error } = await supabase.from('media').select('*');
    if (error) throw error;
    return data;
};

export const updateMediaRefs = async (params) => {
    const { media_id, ...updates } = params;
    const { data, error } = await supabase.from('media').update(updates).eq('media_id', media_id).select();
    if (error) throw error;
    return data[0];
};

export const deleteMedia = async (media_id) => {
    const { error } = await supabase.from('media').delete().eq('media_id', media_id);
    if (error) throw error;
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


// ─── Vault ────────────────────────────────────────────────────
// Raw call — returns full response (used for vault endpoints that don't wrap in {success, data})
// ─── Vault Logic (Native) ───────────────────────────────────


export const getVaultMedia = async (folderId, forceResync = false) => {
    try {
        let index = null;
        if (!forceResync) {
            index = await getVaultIndex(folderId);
        }

        // If old format (allItems exists), force a fresh migration scan
        if (index && index.allItems) {
            index = null; 
        }

        let newFiles = [];
        let fetchedAt = null;

        if (!index) {
            // 1. Full scan (First time or forced)
            const res = await scanDriveFolderIdsOnly(folderId, null);
            newFiles = res.files;
            fetchedAt = res.fetchedAt;
        } else {
            // 2. Delta scan (Only new files since last sync)
            const res = await scanDriveFolderIdsOnly(folderId, index.lastSyncedAt);
            newFiles = res.files;
            fetchedAt = res.fetchedAt;
        }

        // If we have an existing index, merge the new files
        let allIds = index ? index.ids || [] : [];
        let allNames = index ? index.names || [] : [];
        let allMimes = index ? index.mimeTypes || [] : [];

        if (newFiles.length > 0) {
            for (const file of newFiles) {
                allIds.push(file.id);
                allNames.push(file.name);
                allMimes.push(file.mimeType);
            }
        }

        const newIndex = {
            ids: allIds,
            names: allNames,
            mimeTypes: allMimes,
            lastSyncedAt: fetchedAt || (index ? index.lastSyncedAt : new Date().toISOString())
        };

        // Save back to Supabase
        await saveVaultIndex(folderId, newIndex);

        return { success: true, index: newIndex, newCount: newFiles.length };
    } catch (err) {
        console.error('getVaultMedia error:', err);
        return { success: false, error: err.message };
    }
};

export const getLikedImages = async () => {
    const { data, error } = await supabase.from('vault_liked').select('*');
    if (error) throw error;
    // Map capitalized DB columns to camelCase for frontend
    return data.map(item => ({
        id: item.ID,
        title: item.Title,
        thumbnailLink: item.ThumbnailLink,
        largeSrc: item.LargeSrc,
        type: item.Type,
        likedAt: item.LikedAt
    }));
};

export const toggleLikedImage = async (params) => {
    const { id, liked } = params;
    if (liked) {
        const dbParams = {
            "ID": params.id,
            "Title": params.title,
            "ThumbnailLink": params.thumbnailLink,
            "LargeSrc": params.largeSrc,
            "Type": params.type,
            "LikedAt": params.likedAt || new Date().toISOString()
        };
        const { data, error } = await supabase.from('vault_liked').upsert([dbParams]).select();
        if (error) throw error;
        return data[0];
    } else {
        const { error } = await supabase.from('vault_liked').delete().eq('ID', id);
        if (error) throw error;
    }
};

export const getFaceGroups = async (folderId) => {
    const { data, error } = await supabase.from('vault_folders').select('FaceGroupsJSON').eq('FolderID', folderId).single();
    if (error) return [];
    return JSON.parse(data.FaceGroupsJSON || '[]');
};

export const saveFaceGroups = async (folderId, groups) => {
    const { data, error } = await supabase.from('vault_folders').update({ FaceGroupsJSON: JSON.stringify(groups) }).eq('FolderID', folderId).select();
    if (error) throw error;
    return data[0];
};

export const getFileTextContent = async (fileId) => {
    // This requires Drive API to read file content. 
    // We'll leave it as placeholder for now or use Drive API fetch.
    return 'Text content scanning requires Drive API integration.';
};


// ─── App Passwords ──────────────────────────────────────────
export const getAppPassword = async (id) => {
    const { data, error } = await supabase.from('app_passwords').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data;
};

export const setAppPassword = async (id, label, hash) => {
    const { data, error } = await supabase.from('app_passwords').upsert([{ id, label, hash }]).select();
    if (error) throw error;
    return data[0];
};

export const initAppPasswords = async () => {
    return { success: true };
};

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

// ─── Reading List ──────────────────────────────────────────
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


