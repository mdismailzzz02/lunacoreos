import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useMedia() {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const load = useCallback(async (filter) => {
        try {
            const data = await api.getAllMedia(filter || {});
            setMedia(data || []);
        } catch (e) {
            addToast('Failed to load media', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const upload = async (file, mediaType, uploadedFrom, sourceId) => {
        const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (R2 single PUT limit)
        if (file.size > MAX_SIZE) {
            addToast(`File too large (${(file.size / (1024 * 1024 * 1024)).toFixed(1)}GB). Max 5GB.`, 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        try {
            const res = await api.uploadMedia(
                {
                    file,                                  // raw File → goes to R2
                    media_type: mediaType,
                    uploaded_from: uploadedFrom,
                    source_id: sourceId,
                },
                (pct) => setUploadProgress(pct)           // real XHR progress
            );

            setUploadProgress(100);
            await load();
            addToast('File uploaded', 'success');

            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 800);

            return res;
        } catch (e) {
            setIsUploading(false);
            setUploadProgress(0);
            addToast('Upload failed', 'error');
            throw e;
        }
    };

    const remove = async (media_id) => {
        try {
            await api.deleteMedia(media_id);
            setMedia(prev => prev.filter(m => m.media_id !== media_id));
            addToast('File deleted', 'info');
        } catch (e) { addToast('Failed to delete file', 'error'); }
    };

    const scan = async () => {
        const res = await api.scanOrphans();
        await load();
        addToast(`Orphan scan: ${res.updated} updated`, 'info');
    };

    const rename = async (media_id, newName) => {
        try {
            await api.renameMedia(media_id, newName);
            setMedia(prev => prev.map(m => m.media_id === media_id ? { ...m, display_name: newName } : m));
            addToast('File renamed', 'success');
        } catch (e) {
            addToast('Failed to rename file', 'error');
            throw e;
        }
    };

    return { media, loading, upload, remove, scan, rename, refresh: load, isUploading, uploadProgress };
}
