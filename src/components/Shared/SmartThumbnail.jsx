import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useSecureUrl } from '../../hooks/useSecureUrl';

function getDriveStreamUrl(url, mode = 'download') {
    if (!url) return '';
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];
    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large') return `https://drive.google.com/thumbnail?id=${id}&sz=w2500`;
    return `https://docs.google.com/uc?id=${id}&export=${mode}`;
}

export default function SmartThumbnail({ item, onClick, onRemove, className = "img-thumb" }) {
    // R2 items: public URL — use directly, no blob needed
    const isR2 = !!item._isR2;

    // Supabase Storage items: fetch signed URL and expose as session-local blob URL.
    // The raw signed URL never appears in the DOM or address bar.
    const isSupabase = !isR2 && !!item._isSupabaseStorage;
    const { blobUrl, loading, error } = useSecureUrl(
        isSupabase ? item.drive_link : null,
        !isSupabase,
        item
    );

    // For legacy Google Drive items, use the Drive thumbnail URL directly.
    const driveSrc = (!isR2 && !isSupabase) ? getDriveStreamUrl(item.drive_link, 'preview') : null;

    // Resolved src: R2 public URL | blob URL (Supabase) | Drive URL (legacy)
    const resolvedSrc = isR2 ? item.drive_link : isSupabase ? blobUrl : driveSrc;

    const [failed, setFailed] = useState(false);

    // Reset failed state when item changes
    useEffect(() => { setFailed(false); }, [item.media_id]);

    const handleError = async () => {
        if (failed) return;
        setFailed(true);
        try {
            const res = await api.getThumbnailBase64(item.media_id);
            // base64 fallback handled via state below if needed
        } catch (e) {
            console.error('Thumbnail fallback fail:', e);
        }
    };

    // Secure "open" handler
    // - R2 items: just open the public URL in a new tab
    // - Supabase items: download via blob URL so signed URL stays hidden
    const handleOpen = (e) => {
        if (isR2) {
            e.preventDefault();
            window.open(item.drive_link, '_blank', 'noopener,noreferrer');
            return;
        }
        if (!isSupabase) return;
        e.preventDefault();
        if (!blobUrl) return;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.display_name || item.filename || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className={className} onClick={onClick} style={{ position: 'relative' }}>
            {loading && !resolvedSrc ? (
                <div style={{
                    width: '100%', height: '100%', minHeight: 80,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)', fontSize: '0.7rem'
                }}>
                    ⏳
                </div>
            ) : (
                <img
                    src={resolvedSrc || ''}
                    alt={item.filename}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={handleError}
                />
            )}

            {onRemove && (
                <button
                    className="media-remove-btn"
                    onClick={(e) => { e.stopPropagation(); onRemove(item.media_id); }}
                    title="Remove from entry"
                >
                    ×
                </button>
            )}

            <div className="img-overlay">
                <span className="img-name">{item.display_name || item.filename}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span className="badge badge-ref" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>{item.media_id}</span>
                    {(isR2 || isSupabase) ? (
                        // R2: open public URL in new tab | Supabase: download via blob
                        <button
                            className="badge badge-ref"
                            style={{
                                textDecoration: 'none', color: 'var(--accent)',
                                background: 'var(--accent-dim)', border: 'none',
                                cursor: 'pointer', fontSize: 'inherit'
                            }}
                            onClick={(e) => { e.stopPropagation(); handleOpen(e); }}
                            title={isR2 ? 'Open in new tab' : 'Download (secure)'}
                        >
                            {isR2 ? '↗ Open' : '↓ Save'}
                        </button>
                    ) : (
                        <a
                            href={item.drive_link}
                            target="_blank"
                            rel="noreferrer"
                            className="badge badge-ref"
                            style={{ textDecoration: 'none', color: 'var(--accent)', background: 'var(--accent-dim)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            ↗ View
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
