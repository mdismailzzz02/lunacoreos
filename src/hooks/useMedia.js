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
        // Google Apps Script has a ~50MB payload limit. With base64 overhead, 
        // we should limit files to about 35-40MB to be safe.
        const MAX_SIZE = 45 * 1024 * 1024; // 45MB
        if (file.size > MAX_SIZE) {
            addToast(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 45MB.`, 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);
        let timer;
        try {
            const base64data = await api.fileToBase64(file);
            setUploadProgress(30);

            // Simulate progress while waiting for Apps Script
            timer = setInterval(() => {
                setUploadProgress(prev => {
                    // Decaying progress: move 5% of the remaining distance to 100%
                    // This ensures it keeps moving but never quite hits 100 until finished
                    const remaining = 100 - prev;
                    const increment = Math.max(0.1, remaining * 0.05);
                    const next = prev + increment;
                    return next >= 99 ? 99 : next;
                });
            }, 500);

            const res = await api.uploadMedia({
                base64data,
                filename: file.name,
                mime_type: file.type,
                media_type: mediaType,
                uploaded_from: uploadedFrom,
                source_id: sourceId,
            });

            clearInterval(timer);
            setUploadProgress(100);
            
            await load();
            addToast('File uploaded', 'success');

            // Brief delay before hiding progress bar
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 800);

            return res;
        } catch (e) {
            clearInterval(timer);
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

    return { media, loading, upload, remove, scan, refresh: load, isUploading, uploadProgress };
}
