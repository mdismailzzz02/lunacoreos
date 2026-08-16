import React, { useState, useEffect } from 'react';
import {
    getTrashFiles,
    restoreFileFromTrash,
    permanentlyDeleteFile,
    emptyTrash,
    getR2PresignedGet,
} from '../../services/api';

const urlCache = new Map();
const URL_TTL_MS = 13 * 60 * 1000;

function getCachedUrl(r2Key) {
    const entry = urlCache.get(r2Key);
    if (entry && Date.now() < entry.expiresAt) return entry.url;
    urlCache.delete(r2Key);
    return null;
}

function setCachedUrl(r2Key, url) {
    urlCache.set(r2Key, { url, expiresAt: Date.now() + URL_TTL_MS });
}

function TrashFileCard({ file, onRestore, onDelete }) {
    const [thumbUrl, setThumbUrl] = useState(() => getCachedUrl(file.r2_key));
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        const cached = getCachedUrl(file.r2_key);
        if (cached) {
            setThumbUrl(cached);
            return;
        }

        const timer = setTimeout(() => {
            getR2PresignedGet(file.r2_key)
                .then(({ url }) => {
                    setCachedUrl(file.r2_key, url);
                    setThumbUrl(url);
                })
                .catch(console.error);
        }, 100);

        return () => clearTimeout(timer);
    }, [file.r2_key]);

    const handleRestore = async () => {
        if (!window.confirm(`Restore "${file.filename}" to its original location?`)) return;
        setIsRestoring(true);
        try {
            await restoreFileFromTrash(file.id);
            onRestore(file.id);
        } catch (err) {
            alert(`Failed to restore: ${err.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Permanently delete "${file.filename}"? This cannot be undone.`)) return;
        setIsDeleting(true);
        try {
            await permanentlyDeleteFile(file.id);
            onDelete(file.id);
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '12px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '8px', transition: 'all 0.2s'
        }}>
            {thumbUrl ? (
                <img
                    src={thumbUrl}
                    alt=""
                    style={{
                        width: '60px', height: '60px',
                        borderRadius: '8px', objectFit: 'cover',
                        background: 'rgba(0,0,0,0.3)'
                    }}
                />
            ) : (
                <div style={{
                    width: '60px', height: '60px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem'
                }}>
                    📄
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    Deleted: {new Date(file.trashed_at).toLocaleDateString()}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)',
                        color: '#22c55e', cursor: 'pointer', fontSize: '0.85rem',
                        transition: 'all 0.2s', fontWeight: 600
                    }}
                    onMouseOver={e => {
                        e.target.style.background = 'rgba(34,197,94,0.3)';
                        e.target.style.borderColor = '#22c55e';
                    }}
                    onMouseOut={e => {
                        e.target.style.background = 'rgba(34,197,94,0.2)';
                        e.target.style.borderColor = 'rgba(34,197,94,0.5)';
                    }}
                >
                    {isRestoring ? '⟳' : '↩️'} Restore
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                        color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem',
                        transition: 'all 0.2s', fontWeight: 600
                    }}
                    onMouseOver={e => {
                        e.target.style.background = 'rgba(239,68,68,0.3)';
                        e.target.style.borderColor = '#ef4444';
                    }}
                    onMouseOut={e => {
                        e.target.style.background = 'rgba(239,68,68,0.2)';
                        e.target.style.borderColor = 'rgba(239,68,68,0.5)';
                    }}
                >
                    {isDeleting ? '⟳' : '✕'} Delete
                </button>
            </div>
        </div>
    );
}

export default function TrashView() {
    const [trashFiles, setTrashFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadTrash();
    }, [page]);

    const loadTrash = async () => {
        setLoading(true);
        try {
            const { files, total: totalCount, hasMore: more } = await getTrashFiles(page, 50);
            setTrashFiles(files || []);
            setTotal(totalCount || 0);
            setHasMore(more || false);
        } catch (err) {
            console.error('Failed to load trash:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = (fileId) => {
        setTrashFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleDelete = (fileId) => {
        setTrashFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleEmptyTrash = async () => {
        if (!window.confirm('Permanently delete all files in trash? This cannot be undone.')) return;
        
        try {
            await emptyTrash();
            setTrashFiles([]);
            setTotal(0);
        } catch (err) {
            alert(`Failed to empty trash: ${err.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '20px', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>🗑️ Trash</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        {total === 0 ? 'Empty' : `${total} file${total !== 1 ? 's' : ''}`}
                    </p>
                </div>
                {total > 0 && (
                    <button
                        onClick={handleEmptyTrash}
                        style={{
                            padding: '10px 20px', borderRadius: '10px',
                            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                            color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem',
                            transition: 'all 0.2s', fontWeight: 600
                        }}
                        onMouseOver={e => {
                            e.target.style.background = 'rgba(239,68,68,0.3)';
                            e.target.style.borderColor = '#ef4444';
                        }}
                        onMouseOut={e => {
                            e.target.style.background = 'rgba(239,68,68,0.2)';
                            e.target.style.borderColor = 'rgba(239,68,68,0.5)';
                        }}
                    >
                        🗑️ Empty Trash
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.5)' }}>
                    Loading trash...
                </div>
            ) : trashFiles.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.5)', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '3rem' }}>🗑️</div>
                    <div>No files in trash</div>
                </div>
            ) : (
                <>
                    <div>
                        {trashFiles.map(file => (
                            <TrashFileCard
                                key={file.id}
                                file={file}
                                onRestore={handleRestore}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={loading}
                                style={{
                                    background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)',
                                    color: '#a78bfa', padding: '10px 20px', borderRadius: '10px',
                                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => {
                                    e.target.style.background = 'rgba(167,139,250,0.15)';
                                    e.target.style.borderColor = '#a78bfa';
                                }}
                                onMouseOut={e => {
                                    e.target.style.background = 'rgba(167,139,250,0.05)';
                                    e.target.style.borderColor = 'rgba(167,139,250,0.2)';
                                }}
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
