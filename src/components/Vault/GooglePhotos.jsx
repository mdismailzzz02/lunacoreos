import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getVaultMedia, getLikedImages, toggleLikedImage, getFaceGroups, getFileTextContent, getVaultIndex, saveVaultIndex } from '../../services/api';
import { SkeletonCard } from '../Shared/Skeleton';
import FaceScanner from './FaceScanner';
import FaceGroupsView from './FaceGroupsView';


// ─── File Type Classifier ─────────────────────────────────────
function classifyMime(mime) {
    if (!mime) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('text/') || mime === 'application/json') return 'text';
    return 'image';
}

// ─── VaultLightbox ───────────────────────────────────────────
function VaultLightbox({ items, index, onClose, likedIds, onLike }) {
    const [current, setCurrent] = useState(index);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [textContent, setTextContent] = useState(null);
    const [textLoading, setTextLoading] = useState(false);
    const [audioError, setAudioError] = useState(false);

    useEffect(() => {
        setCurrent(index);
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setTextContent(null);
        setAudioError(false);
    }, [index]);

    const navigate = (dir) => {
        setCurrent(c => (c + dir + items.length) % items.length);
        setScale(1); setTranslate({ x: 0, y: 0 });
    };

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'ArrowLeft') navigate(-1);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [items.length, onClose]);

    useEffect(() => {
        const item = items[current];
        if (!item || item.type !== 'text') return;
        setTextLoading(true);
        setTextContent(null);
        getFileTextContent(item.id)
            .then(res => setTextContent(res?.content || ''))
            .catch(() => setTextContent('// Could not load file content.'))
            .finally(() => setTextLoading(false));
    }, [current, items]);

    const handleWheel = (e) => {
        e.preventDefault();
        setScale(s => Math.min(4, Math.max(0.5, s + (e.deltaY > 0 ? -0.15 : 0.15))));
    };
    const handleMouseDown = (e) => {
        if (e.button === 2 || e.button === 0) { e.preventDefault(); setDragging(true); setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y }); }
    };
    const handleMouseMove = (e) => { if (dragging) setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setDragging(false);

    if (index < 0 || !items[current]) return null;
    const item = items[current];
    const itemType = item.type || 'image';
    const isImage = itemType === 'image';
    const isLiked = likedIds?.has(item.id);

    return ReactDOM.createPortal(
        <div onClick={scale === 1 ? onClose : undefined} className="vault-lightbox-container">
            <style>{`
                .vault-lightbox-container {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    width: 100vw; height: 100vh; background: rgba(0,0,0,0.98);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    backdrop-filter: blur(25px); box-sizing: border-box; z-index: 99999;
                    touch-action: none; overflow: hidden; animation: vault-fade-in 0.3s ease-out;
                }
                .vault-lightbox-media {
                    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                    box-sizing: border-box; overflow: hidden; position: relative;
                }
                .vault-lightbox-img {
                    max-width: 100vw; max-height: 100vh; object-fit: contain;
                    box-shadow: 0 0 100px rgba(0,0,0,0.5); transform-origin: center center;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            <div className="vl-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)', zIndex: 20 }}>
                <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', padding: '8px 20px', borderRadius: '30px', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.title || 'SECURE_ASSET'}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); onLike(item); }} style={{ background: isLiked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isLiked ? '❤️' : '🤍'}
                    </button>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
                </div>
            </div>

            <div className="vault-lightbox-media" onClick={e => e.stopPropagation()} onWheel={isImage ? handleWheel : undefined} onMouseDown={isImage ? handleMouseDown : undefined} onMouseMove={isImage ? handleMouseMove : undefined} onMouseUp={isImage ? handleMouseUp : undefined}>
                {isImage && <img className="vault-lightbox-img" src={item.largeSrc || item.src} referrerPolicy="no-referrer" alt="" style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transition: dragging ? 'none' : 'transform 0.15s ease' }} />}
                
                {itemType === 'video' && <iframe src={`https://drive.google.com/file/d/${item.id}/preview`} style={{ width: 'min(95vw, 1280px)', height: 'min(80vh, 720px)', border: 'none', borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }} allow="autoplay; fullscreen" allowFullScreen />}
                
                {itemType === 'audio' && (
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '4rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: '6rem', marginBottom: '2rem', animation: 'pulse 2s infinite ease-in-out' }}>🎵</div>
                        <h3 style={{ margin: '0 0 2rem', fontSize: '1.2rem', fontWeight: 800 }}>{item.title}</h3>
                        <audio controls autoPlay src={`https://drive.google.com/uc?id=${item.id}&export=download`} style={{ width: '320px', filter: 'invert(1) hue-rotate(180deg)' }} />
                    </div>
                )}

                {itemType === 'pdf' && <iframe src={`https://drive.google.com/file/d/${item.id}/preview`} style={{ width: 'min(90vw, 1000px)', height: '85vh', border: 'none', borderRadius: '16px' }} />}

                {itemType === 'text' && (
                    <div style={{ width: 'min(95vw, 1000px)', height: '80vh', background: '#0d0d15', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                        <div style={{ padding: '1.2rem 2rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>SOURCE_CODE_DECRYPTOR</span>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '2rem', fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: '0.9rem', lineHeight: 1.6, color: '#e2e8f0' }}>
                            {textLoading ? (
                                <div style={{ opacity: 0.5 }}>DECRYPTING_BUFFER...</div>
                            ) : (
                                <pre style={{ margin: 0 }}>
                                    <code>{textContent || '// No content detected.'}</code>
                                </pre>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(-1); }} 
                        style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '64px', height: '64px', fontSize: '2.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 100, transition: 'all 0.2s' }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        ‹
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(1); }} 
                        style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '64px', height: '64px', fontSize: '2.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 100, transition: 'all 0.2s' }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        ›
                    </button>
                </>
            )}
        </div>,
        document.body
    );
}

// ─── MediaGrid ───────────────────────────────────────────────
function MediaGrid({ items, likedIds, onLike, onOpen }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)', // Force exactly 5 columns
            gap: '16px',
            width: '100%',
            overflowX: 'hidden', 
            boxSizing: 'border-box',
            paddingBottom: '40px'
        }} className="vault-ultimate-grid">
            <style>{`
                @media (max-width: 767px) { .vault-ultimate-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; width: 100% !important; } }
                @media (min-width: 768px) and (max-width: 1023px) { .vault-ultimate-grid { grid-template-columns: repeat(3, 1fr) !important; width: 90% !important; } }
                .vault-card {
                    position: relative;
                    aspect-ratio: 1/1;
                    border-radius: 24px;
                    overflow: hidden;
                    cursor: pointer;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .vault-card:hover {
                    transform: translateY(-12px) scale(1.03);
                    border-color: rgba(167,139,250,0.6);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.8), 0 0 20px rgba(167,139,250,0.2);
                }
                .vault-thumb {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    object-position: center;
                    display: block;
                    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .vault-card:hover .vault-thumb { transform: scale(1.15); }
                .card-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 70%);
                    opacity: 0.95;
                }
            `}</style>
            {items.map((photo, index) => (
                <div key={photo.id || index} onClick={() => onOpen(index)} className="vault-card">
                    <img className="vault-thumb" src={photo.src} loading="lazy" referrerPolicy="no-referrer" alt="" />
                    <div className="card-overlay" />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLike(photo); }}
                        style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.2s', zIndex: 5 }}
                    >
                        {likedIds.has(photo.id) ? '❤️' : '🤍'}
                    </button>
                    {photo.type && photo.type !== 'image' && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(167,139,250,0.2)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(167,139,250,0.3)', zIndex: 5 }}>
                            {photo.type.toUpperCase()}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────
export default function GooglePhotos({ activeTab, folders, onTabChange }) {
    const [liked, setLiked] = useState([]);
    const [folderCache, setFolderCache] = useState({});
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lightboxItems, setLightboxItems] = useState([]);
    const [likePending, setLikePending] = useState(new Set());

    // Always rebuild Drive thumbnail URLs from the file ID to avoid 403 expired signed URLs
    const buildSrcFromId = (id) => ({
        src: `https://lh3.googleusercontent.com/u/0/d/${id}=s800`,
        largeSrc: `https://lh3.googleusercontent.com/u/0/d/${id}=s1600`,
    });

    useEffect(() => {
        getLikedImages()
            .then(res => {
                const items = Array.isArray(res) ? res : (res.data?.liked || res.liked || []);
                setLiked(items.map(it => {
                    const finalId = it.id || it.ID;
                    // Always regenerate from ID — stored Drive URLs expire and return 403
                    const { src, largeSrc } = buildSrcFromId(finalId);
                    return {
                        id: finalId,
                        title: it.title || it.Title || 'Untitled Asset',
                        src,
                        largeSrc,
                        type: it.type || it.Type || 'image'
                    };
                }));
            })
            .catch(err => console.error("Vault retrieval error:", err))
            .finally(() => setInitLoading(false));
    }, []);

    useEffect(() => {
        if (!activeTab || activeTab === 'liked') return;
        const folder = folders?.find(f => String(f.id) === String(activeTab));
        if (folder) fetchFolder(folder);
    }, [activeTab, folders]);

    const fetchFolder = async (folder, isLoadMore = false, forceResync = false) => {
        const fid = folder.folder_id || folder.folderId;
        
        // In-memory load more
        if (isLoadMore) {
            setFolderCache(c => {
                const currentData = c[fid];
                if (!currentData) return c;
                const currentCount = currentData.displayedItems.length;
                const nextBatch = currentData.allItems.slice(currentCount, currentCount + 50);
                return {
                    ...c,
                    [fid]: {
                        ...currentData,
                        displayedItems: [...currentData.displayedItems, ...nextBatch]
                    }
                };
            });
            return;
        }

        setLoading(true);
        try {
            const res = await getVaultMedia(fid, forceResync);
            if (res && res.success && res.index) {
                const index = res.index;
                const totalCount = index.ids ? index.ids.length : 0;
                
                // Shuffle indices
                const indices = Array.from({ length: totalCount }, (_, i) => i);
                const shuffledIndices = indices.sort(() => Math.random() - 0.5);
                
                // Build items
                const allItems = shuffledIndices.map(i => {
                    const id = index.ids[i];
                    const { src, largeSrc } = buildSrcFromId(id);
                    return {
                        id,
                        src,
                        largeSrc,
                        title: index.names ? index.names[i] : 'Untitled',
                        type: index.mimeTypes ? classifyMime(index.mimeTypes[i]) : 'image'
                    };
                });

                setFolderCache(c => ({
                    ...c,
                    [fid]: { allItems, displayedItems: allItems.slice(0, 50), totalCount }
                }));
            }
        } catch (err) {
            console.error("Index sync failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const likedIds = new Set(liked.map(l => l.id));

    const handleLike = async (photo) => {
        if (likePending.has(photo.id)) return;
        setLikePending(p => new Set(p).add(photo.id));
        const isLiked = likedIds.has(photo.id);
        setLiked(prev => isLiked ? prev.filter(l => l.id !== photo.id) : [...prev, { ...photo }]);
        try {
            await toggleLikedImage({ id: photo.id, title: photo.title, thumbnailLink: photo.src, largeSrc: photo.largeSrc, type: photo.type, liked: !isLiked });
        } catch {
            setLiked(prev => isLiked ? [...prev, { ...photo }] : prev.filter(l => l.id !== photo.id));
        } finally {
            setLikePending(p => { const n = new Set(p); n.delete(photo.id); return n; });
        }
    };

    if (initLoading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', opacity: 0.5 }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(167,139,250,0.1)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em' }}>INITIALIZING_VAULT_DECRYPTOR</p>
        </div>
    );

    if (activeTab === 'liked') {
        return (
            <div style={{ animation: 'vault-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, margin: 0 }}>{liked.length} SECURE ITEMS RETRIEVED</p>
                </div>
                {liked.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤍</div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>NO ENCRYPTED LIKES FOUND</p>
                    </div>
                ) : (
                    <MediaGrid items={liked} likedIds={likedIds} onLike={handleLike} onOpen={(i) => { setLightboxItems(liked); setLightboxIndex(i); }} />
                )}
                <VaultLightbox items={lightboxItems} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} likedIds={likedIds} onLike={handleLike} />
            </div>
        );
    }

    const folder = folders?.find(f => String(f.id) === String(activeTab));
    if (!folder) return <div style={{ color: 'rgba(255,255,255,0.2)', padding: '2rem' }}>INITIALIZING_STREAM...</div>;
    const fid = folder.folder_id || folder.folderId;
    const folderData = folderCache[fid] || { displayedItems: [], allItems: [] };
    const items = folderData.displayedItems;
    const hasMore = folderData.allItems.length > items.length;

    return (
        <div style={{ animation: 'vault-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, margin: 0 }}>{items.length} SHUFFLED ASSETS · {folder.name.toUpperCase()}</p>
                    {loading && <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800, letterSpacing: '0.1em', animation: 'pulse 1.5s infinite' }}>[ SYNCING_DEEP_INDEX ]</span>}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => fetchFolder(folder, false, true)} 
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        SYNC_DRIVE
                    </button>
                    <button 
                        onClick={() => { 
                            setFolderCache(c => {
                                const currentData = c[fid];
                                if (!currentData) return c;
                                const shuffled = [...currentData.allItems].sort(() => Math.random() - 0.5);
                                return {
                                    ...c,
                                    [fid]: {
                                        ...currentData,
                                        allItems: shuffled,
                                        displayedItems: shuffled.slice(0, 50)
                                    }
                                };
                            });
                        }} 
                        style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        RESHUFFLE_STREAM
                    </button>
                </div>
            </div>
            {loading && items.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {[...Array(15)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <>
                    <MediaGrid items={items} likedIds={likedIds} onLike={handleLike} onOpen={(i) => { setLightboxItems(items); setLightboxIndex(i); }} />
                    
                    {hasMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', paddingBottom: '4rem' }}>
                            <button 
                                onClick={() => fetchFolder(folder, true)}
                                style={{ 
                                    background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', 
                                    color: '#a78bfa', padding: '1.2rem 3rem', borderRadius: '20px', 
                                    fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                                    transition: 'all 0.3s', letterSpacing: '0.1em'
                                }}
                                onMouseOver={e => { e.target.style.background = 'rgba(167,139,250,0.15)'; e.target.style.borderColor = '#a78bfa'; }}
                                onMouseOut={e => { e.target.style.background = 'rgba(167,139,250,0.05)'; e.target.style.borderColor = 'rgba(167,139,250,0.2)'; }}
                            >
                                LOAD_MORE_ASSETS
                            </button>
                        </div>
                    )}
                </>
            )}
            <VaultLightbox items={lightboxItems} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} likedIds={likedIds} onLike={handleLike} />
        </div>
    );
}
