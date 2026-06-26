import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import MediaRow from './MediaRow';

export default function MediaAttachmentsPanel({ sourceId, onMediaChange, refreshKey }) {
    const [mediaItems, setMediaItems] = useState({ audio: [], images: [], files: [] });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);

    // Load media for this sourceId
    useEffect(() => {
        if (!sourceId) return;
        
        const fetchData = async (isRetry = false) => {
            try {
                const data = await api.getMediaBySource(sourceId);
                console.log(`[MediaPanel] ${isRetry ? 'RETRY' : 'FETCH'} data for ${sourceId}:`, data);
                const items = data || [];
                setMediaItems({
                    audio: items.filter(i => i.media_type === 'audio'),
                    images: items.filter(i => i.media_type === 'image'),
                    files: items.filter(i => i.media_type === 'file'),
                });
            } catch (err) {
                console.error('[MediaPanel] Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchData();
        
        // "Double-check" after 1.5s in case of DB lag
        const timer = setTimeout(() => fetchData(true), 1500);
        return () => clearTimeout(timer);
    }, [sourceId, refreshKey]);

    // Listen for deletions triggered by inline embed delete buttons
    useEffect(() => {
        const handler = (e) => {
            const { media_id } = e.detail;
            if (!media_id) return;
            setMediaItems(prev => ({
                audio: prev.audio.filter(m => m.media_id !== media_id),
                images: prev.images.filter(m => m.media_id !== media_id),
                files: prev.files.filter(m => m.media_id !== media_id),
            }));
        };
        document.addEventListener('sn-media-deleted', handler);
        return () => document.removeEventListener('sn-media-deleted', handler);
    }, []);

    const handleUpload = async (file, mediaType) => {
        if (!sourceId || !file) return;

        const MAX_SIZE = 45 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 45MB.`);
            return;
        }

        if (!mediaType) {
            if (file.type.includes('image')) mediaType = 'image';
            else if (file.type.includes('audio')) mediaType = 'audio';
            else mediaType = 'file';
        }

        setSaving(true);
        setProgress(10);
        let timer;
        try {
            const base64data = await api.fileToBase64(file);
            setProgress(30);

            timer = setInterval(() => {
                setProgress(prev => {
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
                uploaded_from: 'studynotes', // or keep as generic
                source_id: sourceId,
            });

            clearInterval(timer);
            setProgress(100);

            const newItem = {
                media_id: res.media_id,
                drive_link: res.drive_link,
                thumbnail_link: res.thumbnail_link,
                filename: file.name,
                display_name: file.name,
                media_type: mediaType
            };
 
            let finalRefs;
            setMediaItems(prev => {
                const typeKey = mediaType === 'image' ? 'images' : (mediaType === 'audio' ? 'audio' : 'files');
                const newState = { ...prev, [typeKey]: [...prev[typeKey], newItem] };
                finalRefs = {
                    audio_refs: newState.audio.map(m => m.media_id).join(','),
                    image_refs: newState.images.map(m => m.media_id).join(','),
                    file_refs: newState.files.map(m => m.media_id).join(',')
                };
                return newState;
            });
 
            // Notify parent OUTSIDE of the setState functional update
            if (onMediaChange && finalRefs) {
                onMediaChange(finalRefs);
            }

            setTimeout(() => {
                setSaving(false);
                setProgress(0);
            }, 800);
        } catch (e) {
            clearInterval(timer);
            setSaving(false);
            setProgress(0);
            console.error('Upload Error:', e);
            alert(`Upload failed: ${e.message}`);
        }
    };

    const handleRemove = async (mediaId) => {
        if (!sourceId || !mediaId) return;
        if (!window.confirm('Permanently delete this media file?')) return;

        try {
            await api.deleteMedia(mediaId);
            // Tell the editor to remove any matching ghost embeds
            document.dispatchEvent(new CustomEvent('sn-media-deleted', { detail: { media_id: mediaId } }));
            
            let finalRefs;
            setMediaItems(prev => {
                const newState = {
                    audio: prev.audio.filter(m => m.media_id !== mediaId),
                    images: prev.images.filter(m => m.media_id !== mediaId),
                    files: prev.files.filter(m => m.media_id !== mediaId)
                };

                finalRefs = {
                    audio_refs: newState.audio.map(m => m.media_id).join(','),
                    image_refs: newState.images.map(m => m.media_id).join(','),
                    file_refs: newState.files.map(m => m.media_id).join(',')
                };
                return newState;
            });

            // Notify parent OUTSIDE of the setState functional update
            if (onMediaChange && finalRefs) {
                onMediaChange(finalRefs);
            }
        } catch (e) {
            console.error('Delete failed:', e);
            alert('Failed to delete media: ' + e.message);
        }
    };

    if (!sourceId) return null;

    return (
        <div className="media-attachments-panel" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <MediaRow 
                active={{ entry_id: sourceId }} // Compatibility with MediaRow props
                mediaItems={mediaItems} 
                onUpload={handleUpload}
                onRecord={f => handleUpload(f, 'audio')}
                onRemove={handleRemove}
            />
            {saving && (
                <div className="progress-container" style={{ marginTop: '1.5rem' }}>
                    <div className="progress-header">
                        <div className="progress-label">
                            <span className="spinner-mini" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                            Uploading media...
                        </div>
                            <div className="progress-value">{Math.round(progress)}%</div>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}
