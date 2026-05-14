import { useState } from 'react';
import * as api from '../../services/api';

function getStreamableUrl(url, mode = 'download') {
    if (!url) return '';
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];
    
    // For images, sz=w1000 is for thumbnails, sz=w2500 is for full-screen previews
    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large') return `https://drive.google.com/thumbnail?id=${id}&sz=w2500`;
    
    // docs.google.com/uc is often more reliable for audio/image streaming
    return `https://docs.google.com/uc?id=${id}&export=${mode}`;
}

export default function SmartThumbnail({ item, onClick, onRemove, className = "img-thumb" }) {
    const [src, setSrc] = useState(getStreamableUrl(item.drive_link, 'preview'));
    const [failed, setFailed] = useState(false);

    const handleError = async () => {
        // If it failed already, don't keep trying
        if (failed) return;
        setFailed(true);
        console.log(`Thumbnail ${item.media_id} failed, fetching base64...`);
        try {
            const res = await api.getThumbnailBase64(item.media_id);
            if (res && res.base64) {
                setSrc(res.base64);
            }
        } catch (e) {
            console.error('Base64 fail:', e);
        }
    };

    return (
        <div className={className} onClick={onClick} style={{ position: 'relative' }}>
            <img 
                src={src} 
                alt={item.filename} 
                loading="lazy" 
                referrerPolicy="no-referrer"
                onError={handleError}
            />
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
                </div>
            </div>
        </div>
    );
}
