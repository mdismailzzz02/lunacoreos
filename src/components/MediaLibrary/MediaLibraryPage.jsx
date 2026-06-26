import { useState } from 'react';
import { useMedia } from '../../hooks/useMedia';
import Lightbox from '../Shared/Lightbox';
import SmartThumbnail from '../Shared/SmartThumbnail';
import { SkeletonCard } from '../Shared/Skeleton';

const TYPE_ICONS = { audio: '🔊', image: '🖼️', file: '📎', video: '🎬' };

export default function MediaLibraryPage({ guestMode = false }) {
    const { media, loading, upload, remove, scan, isUploading, uploadProgress } = useMedia();
    const [filter, setFilter] = useState('all');
    const [lb, setLb] = useState(null);
    const [search, setSearch] = useState('');

    const confirmRemove = (item) => {
        const label = item.display_name || item.filename;
        const inUse = !!item.referenced_in;
        const msg = inUse
            ? `"${label}" is used in a journal entry.\n\nDelete it anyway? This may break the entry's media.`
            : `Delete "${label}" from the media library?`;
        if (window.confirm(msg)) remove(item.media_id);
    };

    const handlePrint = (e, item) => {
        e.stopPropagation();
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = item.drive_link;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                // Fallback for CORS restricted links (like Drive viewer)
                window.open(item.drive_link, '_blank');
            }
            setTimeout(() => document.body.removeChild(iframe), 2000);
        };
    };

    // In guest mode: show nothing until user has typed a search query
    const showResults = !guestMode || search.trim().length > 0;

    const filtered = showResults ? media.filter(m => {
        if (filter !== 'all' && m.media_type !== filter) return false;
        if (search && !m.display_name?.toLowerCase().includes(search.toLowerCase()) && !m.filename?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }) : [];

    const images = filtered.filter(m => m.media_type === 'image');
    const others = filtered.filter(m => m.media_type !== 'image');

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'file';
        await upload(file, mediaType, 'media_library', null);
    };

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>🖼️ Media Library</h2>
                {!guestMode && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                            ⬆ Upload
                            <input type="file" hidden onChange={handleUpload} />
                        </label>
                        <button className="btn btn-ghost btn-sm" onClick={scan}>🔍 Scan Orphans</button>
                    </div>
                )}
            </div>

            {isUploading && (
                <div className="progress-container">
                    <div className="progress-header">
                        <div className="progress-label">
                            <span className="spinner-mini" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                            Uploading your file...
                        </div>
                        <div className="progress-value">{Math.round(uploadProgress)}%</div>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Search + Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    className="field-input"
                    style={{ width: 220 }}
                    placeholder="🔍 Search files..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="filter-bar" style={{ margin: 0 }}>
                    {['all', 'image', 'audio', 'file', 'video'].map(f => (
                        <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {TYPE_ICONS[f] || '📁'} {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats — hidden in guest mode */}
            {!guestMode && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{media.length} total files</span>
                    <span>·</span>
                    <span>{media.filter(m => m.is_orphan === 'TRUE').length} orphans</span>
                </div>
            )}

            {/* Guest prompt — shown when no search entered */}
            {guestMode && !showResults && (
                <div className="empty-state">
                    <div className="empty-emoji">🔍</div>
                    <p style={{ fontWeight: 600 }}>Search for a file to view it</p>
                    <p style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.4rem' }}>Files are hidden for privacy. Enter a filename or keyword above.</p>
                </div>
            )}

            {showResults && filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-emoji">📁</div>
                    <p>No files found matching your search</p>
                </div>
            ) : showResults ? (
                <>
                    {/* Images Grid */}
                    {images.length > 0 && (
                        <div>
                            <div className="section-title">Images ({images.length})</div>
                            <div className="media-lib-grid">
                                {images.map((item, i) => (
                                    <div key={item.media_id} className="media-lib-card" onClick={() => setLb(i)}>
                                        <SmartThumbnail 
                                            item={item} 
                                            className="media-lib-thumb"
                                        />
                                        <div className="media-lib-info">
                                            <div className="media-lib-name">{item.display_name || item.filename}</div>
                                            <div className="media-lib-meta">
                                                <span className="badge badge-ref">{item.media_id}</span>
                                                {' '}{item.file_size_kb}KB
                                            </div>
                                            {item.referenced_in && (
                                                <div style={{ fontSize: '0.65rem', color: 'var(--success)', marginTop: 2 }}>
                                                    📎 Used in entry
                                                </div>
                                            )}
                                            {item.is_orphan === 'TRUE' && (
                                                <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>⚠ Orphan</span>
                                            )}
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ flex: 1, fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)' }}
                                                    onClick={e => handlePrint(e, item)}
                                                >🖨️ Print</button>
                                                {!guestMode && (
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        style={{ flex: 1, fontSize: '0.7rem', padding: '2px 6px' }}
                                                        onClick={e => { e.stopPropagation(); confirmRemove(item); }}
                                                    >✕</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other files */}
                    {others.length > 0 && (
                        <div>
                            <div className="section-title">Files & Audio ({others.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {others.map(item => (
                                    <div key={item.media_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                                        <span style={{ fontSize: '1.4rem' }}>{TYPE_ICONS[item.media_type] || '📎'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.display_name || item.filename}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                <span className="badge badge-ref">{item.media_id}</span>
                                                {' '}{item.file_size_kb}KB · {String(item.upload_date).substring(0, 10)}
                                                {item.referenced_in && <span style={{ color: 'var(--success)', marginLeft: 6 }}>📎 In use</span>}
                                                {item.is_orphan === 'TRUE' && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>⚠ Orphan</span>}
                                            </div>
                                        </div>
                                        <a href={item.drive_link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open ↗</a>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ flexShrink: 0 }}
                                            onClick={e => handlePrint(e, item)}
                                        >🖨️</button>
                                        {!guestMode && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                style={{ flexShrink: 0 }}
                                                onClick={() => confirmRemove(item)}
                                            >✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}

            {lb !== null && (
                <Lightbox
                    images={images}
                    startIndex={lb}
                    onClose={() => setLb(null)}
                />
            )}
        </div>
    );
}
