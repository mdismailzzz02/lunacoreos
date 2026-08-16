import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import {
    getVaultFiles,
    getLikedVaultFiles,
    toggleLikedVaultFile,
    getR2PresignedGet,
    getR2PresignedBatch,
    syncVaultCollection,
    uploadFileToR2,
    getFileTextContent,
    getRandomVaultFiles,
    updateVaultCollection,
    createVaultCollection,
    deleteVaultCollection,
    moveFileToTrash,
    restoreFileFromTrash,
    permanentlyDeleteFile,
    getTrashFiles,
    emptyTrash,
    supabase,
} from '../../services/api';
import { SkeletonCard } from '../Shared/Skeleton';
import FaceScanner from './FaceScanner';
import FaceGroupsView from './FaceGroupsView';
import SecondaryVaultLock from './SecondaryVaultLock';

// ─── Mime Type Classifier ─────────────────────────────────────
function classifyMime(mime, filename = '') {
    if (!mime) mime = '';
    const lcFilename = filename.toLowerCase();
    if (mime.startsWith('video/') || /\.(mp4|mkv|webm|avi|mov)$/i.test(lcFilename)) return 'video';
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(lcFilename)) return 'audio';
    if (mime === 'application/pdf' || lcFilename.endsWith('.pdf')) return 'pdf';
    if (mime === 'text/html' || mime === 'application/xhtml+xml' || lcFilename.endsWith('.html') || lcFilename.endsWith('.htm')) return 'html';
    if (/\.(zip|rar|7z|tar|gz|bz2|xz)$/i.test(lcFilename)) return 'archive';
    if (/\.(exe|apk|msi|dmg|iso|bin|appx)$/i.test(lcFilename)) return 'binary';
    if (mime.startsWith('text/') || mime === 'application/json' || /\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|php|rb|sh|json|xml|css|scss|md)$/i.test(lcFilename)) return 'text';
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(lcFilename)) return 'image';
    return 'file';
}

// ─── URL Cache (keyed by r2_key, auto-expires before 15 min) ──
const urlCache = new Map(); // r2_key → { url, expiresAt }
const URL_TTL_MS = 13 * 60 * 1000; // 13 min (presigned GET is 15 min)

function getCachedUrl(r2Key) {
    const entry = urlCache.get(r2Key);
    if (entry && Date.now() < entry.expiresAt) return entry.url;
    urlCache.delete(r2Key);
    return null;
}

function setCachedUrl(r2Key, url) {
    urlCache.set(r2Key, { url, expiresAt: Date.now() + URL_TTL_MS });
}

// ─── Download Session Cache ─────────────────────────────────
const DL_SESSION_KEY = 'vault_dl_unlocked_at';
const DL_SESSION_TTL = 30 * 60 * 1000; // 30 min

function isDownloadSessionActive() {
    try {
        const at = Number(sessionStorage.getItem(DL_SESSION_KEY) || '0');
        return at > 0 && (Date.now() - at) < DL_SESSION_TTL;
    } catch { return false; }
}

function activateDownloadSession() {
    try { sessionStorage.setItem(DL_SESSION_KEY, String(Date.now())); } catch {}
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
    const [mediaUrl, setMediaUrl] = useState(null);

    useEffect(() => {
        setCurrent(index);
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setTextContent(null);
        setMediaUrl(null);
    }, [index]);

    useEffect(() => {
        const item = items[current];
        if (!item) return;
        // Fetch presigned URL for current item if not already cached
        const cached = getCachedUrl(item.r2_key);
        if (cached) { setMediaUrl(cached); return; }
        getR2PresignedGet(item.r2_key)
            .then(({ url }) => { setCachedUrl(item.r2_key, url); setMediaUrl(url); })
            .catch(console.error);
    }, [current, items]);

    useEffect(() => {
        const item = items[current];
        if (!item || !mediaUrl) return;
        const itemType = item.type || classifyMime(item.mime_type, item.filename);
        if (itemType !== 'text' && itemType !== 'html') return;
        setTextLoading(true);
        setTextContent(null);
        getFileTextContent(item.r2_key)
            .then(res => setTextContent(res?.content || ''))
            .catch(() => setTextContent('// Could not load file content.'))
            .finally(() => setTextLoading(false));
    }, [current, items, mediaUrl]);

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
    const itemType = item.type || classifyMime(item.mime_type, item.filename);
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
                    touch-action: none; overflow: hidden; animation: none;
                }
                .vault-lightbox-media {
                    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                    box-sizing: border-box; overflow: hidden; position: relative;
                }
                .vault-lightbox-img {
                    max-width: 100vw; max-height: 100vh; object-fit: contain;
                    box-shadow: 0 0 100px rgba(0,0,0,0.5); transform-origin: center center;
                    transition: none;
                }
            `}</style>

            <div className="vl-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)', zIndex: 20 }}>
                <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', padding: '8px 20px', borderRadius: '30px', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.filename || 'SECURE_ASSET'}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); onLike(item); }} style={{ background: isLiked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isLiked ? '❤️' : '🤍'}
                    </button>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '48px', height: '48px', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
                </div>
            </div>

            <div className="vault-lightbox-media" onClick={e => e.stopPropagation()} onWheel={isImage ? handleWheel : undefined} onMouseDown={isImage ? handleMouseDown : undefined} onMouseMove={isImage ? handleMouseMove : undefined} onMouseUp={isImage ? handleMouseUp : undefined}>
                {!mediaUrl && (
                    <div style={{ opacity: 0.4, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em' }}>LOADING_ASSET...</div>
                )}

                {mediaUrl && isImage && (
                    <img className="vault-lightbox-img" src={mediaUrl} referrerPolicy="no-referrer" alt=""
                        style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transition: dragging ? 'none' : 'transform 0.15s ease' }} />
                )}

                {mediaUrl && itemType === 'video' && (
                    <video controls autoPlay muted src={mediaUrl} ref={el => { if(el) el.volume = 0.1; }} style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: '16px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }} />
                )}

                {mediaUrl && itemType === 'audio' && (
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '4rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: '6rem', marginBottom: '2rem' }}>🎵</div>
                        <h3 style={{ margin: '0 0 2rem', fontSize: '1.2rem', fontWeight: 800 }}>{item.filename}</h3>
                        <audio controls autoPlay src={mediaUrl} style={{ width: '320px', filter: 'invert(1) hue-rotate(180deg)' }} />
                    </div>
                )}

                {mediaUrl && itemType === 'pdf' && (
                    <iframe src={mediaUrl} style={{ width: 'min(90vw, 1000px)', height: '85vh', border: 'none', borderRadius: '16px' }} />
                )}

                {mediaUrl && itemType === 'html' && textContent && (
                    <iframe 
                        srcDoc={textContent}
                        style={{ width: 'min(95vw, 1200px)', height: '85vh', border: 'none', borderRadius: '16px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', background: 'white' }}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
                    />
                )}

                {mediaUrl && itemType === 'html' && !textContent && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.6 }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(167,139,250,0.1)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p>LOADING_HTML...</p>
                    </div>
                )}

                {mediaUrl && itemType === 'text' && (
                    <div style={{ width: 'min(95vw, 1000px)', height: '80vh', background: '#0d0d15', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                        <div style={{ padding: '1.2rem 2rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>SOURCE_CODE_VIEWER</span>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '2rem', fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: '0.9rem', lineHeight: 1.6, color: '#e2e8f0' }}>
                            {textLoading ? (
                                <div style={{ opacity: 0.5 }}>LOADING_CONTENT...</div>
                            ) : (
                                <pre style={{ margin: 0 }}><code>{textContent || '// No content detected.'}</code></pre>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '64px', height: '64px', fontSize: '2.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 100, transition: 'none' }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}>
                        ‹
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); navigate(1); }} style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '64px', height: '64px', fontSize: '2.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 100, transition: 'none' }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}>
                        ›
                    </button>
                </>
            )}
        </div>,
        document.body
    );
}

// ─── Lazy Image Card ──────────────────────────────────────────
function VaultCard({ file, isLiked, onLike, onOpen, onDownload, onDelete }) {
    const [thumbUrl, setThumbUrl] = useState(() => getCachedUrl(file.r2_key));
    const [imgLoaded, setImgLoaded] = useState(false);
    const cardRef = useRef(null);
    const retryRef = useRef(null);
    const nameLabelRef = useRef(null);
    const nameTextRef = useRef(null);
    const [scrollDist, setScrollDist] = useState(0);

    useEffect(() => {
        // Already in cache — done
        const cached = getCachedUrl(file.r2_key);
        if (cached) { setThumbUrl(cached); return; }

        // Wait for the batch-prefetch to populate the cache (up to 3s),
        // then fall back to an individual request only if still missing.
        let attempts = 0;
        const MAX_ATTEMPTS = 12; // 12 × 250ms = 3s
        retryRef.current = setInterval(() => {
            const url = getCachedUrl(file.r2_key);
            if (url) {
                clearInterval(retryRef.current);
                setThumbUrl(url);
                return;
            }
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                clearInterval(retryRef.current);
                // Batch didn't cover this key — fetch individually as last resort
                getR2PresignedGet(file.r2_key)
                    .then(({ url: u }) => { setCachedUrl(file.r2_key, u); setThumbUrl(u); })
                    .catch(console.error);
            }
        }, 250);

        return () => clearInterval(retryRef.current);
    }, [file.r2_key]);

    // Measure text overflow to power the scroll animation
    useEffect(() => {
        if (nameTextRef.current && nameLabelRef.current) {
            const textW = nameTextRef.current.scrollWidth;
            const containerW = nameLabelRef.current.clientWidth;
            setScrollDist(textW > containerW + 2 ? containerW - textW : 0);
        }
    }, [file.filename]);

    const fileType = classifyMime(file.mime_type, file.filename);
    const isScrolling = scrollDist < 0;

    const handleCardClick = () => {
        if (fileType === 'html' || fileType === 'pdf') {
            const url = getCachedUrl(file.r2_key);
            if (url) {
                window.open(url, '_blank');
            } else {
                getR2PresignedGet(file.r2_key).then(({ url: u }) => {
                    setCachedUrl(file.r2_key, u);
                    window.open(u, '_blank');
                }).catch(() => {
                    onOpen();
                });
            }
        } else {
            onOpen();
        }
    };

    return (
        <div className="vault-card-wrapper">
            <div ref={cardRef} onClick={handleCardClick} className="vault-card">
                {/* Shimmer placeholder — always present, hidden after image/video loads or for generic icons */}
                {!imgLoaded && (fileType === 'image' || fileType === 'video') && (
                    <div className="vault-shimmer">
                        {!thumbUrl && (
                            <span style={{ fontSize: '2rem', opacity: 0.25 }}>
                                {fileType === 'video' ? '🎬' : '🖼️'}
                            </span>
                        )}
                    </div>
                )}
                {thumbUrl && fileType === 'image' && (
                    <img
                        className={`vault-thumb ${imgLoaded ? 'vault-thumb--loaded' : ''}`}
                        src={thumbUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        alt=""
                        onLoad={() => setImgLoaded(true)}
                    />
                )}
                {thumbUrl && fileType === 'video' && (
                    <video
                        className={`vault-thumb ${imgLoaded ? 'vault-thumb--loaded' : ''}`}
                        src={`${thumbUrl}#t=8`}
                        preload="metadata"
                        muted
                        onLoadedData={() => setImgLoaded(true)}
                    />
                )}
                {/* Generic thumbnails for other files */}
                {fileType !== 'image' && fileType !== 'video' && (
                    <div className="vault-thumb vault-thumb--loaded" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', background: 'rgba(255,255,255,0.02)' }}>
                        {fileType === 'audio' ? '🎵' : fileType === 'pdf' ? '📄' : fileType === 'html' ? '🌐' : fileType === 'text' ? '📝' : fileType === 'archive' ? '🗜️' : fileType === 'binary' ? '⚙️' : '📁'}
                    </div>
                )}
                <div className="card-overlay" />
                {/* Like button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onLike(file); }}
                    style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'none', zIndex: 5 }}
                >
                    {isLiked ? '❤️' : '🤍'}
                </button>
                {/* Download button */}
                <button
                    className="vault-dl-btn"
                    onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                    title="Download file"
                >
                    ⬇
                </button>
                {/* Delete button */}
                <button
                    className="vault-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                    title="Move to trash"
                >
                    🗑️
                </button>
                {fileType !== 'image' && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', background: fileType === 'text' ? 'rgba(139, 92, 246, 0.2)' : fileType === 'video' ? 'rgba(59, 130, 246, 0.2)' : fileType === 'audio' ? 'rgba(168, 85, 247, 0.2)' : fileType === 'pdf' ? 'rgba(249, 115, 22, 0.2)' : fileType === 'html' ? 'rgba(16, 185, 129, 0.2)' : fileType === 'archive' ? 'rgba(234, 179, 8, 0.2)' : fileType === 'binary' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(167,139,250,0.2)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800, color: fileType === 'text' ? '#a78bfa' : fileType === 'video' ? '#60a5fa' : fileType === 'audio' ? '#d8b4fe' : fileType === 'pdf' ? '#fb923c' : fileType === 'html' ? '#10b981' : fileType === 'archive' ? '#eab308' : fileType === 'binary' ? '#94a3b8' : 'white', backdropFilter: 'blur(8px)', border: '1px solid' + (fileType === 'text' ? ' rgba(167,139,250,0.3)' : fileType === 'video' ? ' rgba(59,130,246,0.3)' : fileType === 'audio' ? ' rgba(168,85,247,0.3)' : fileType === 'pdf' ? ' rgba(249,115,22,0.3)' : fileType === 'html' ? ' rgba(16,185,129,0.3)' : fileType === 'archive' ? ' rgba(234, 179, 8, 0.3)' : fileType === 'binary' ? ' rgba(100, 116, 139, 0.3)' : ' rgba(167,139,250,0.3)'), zIndex: 5 }}>
                        {fileType === 'text' ? '📝' : fileType === 'video' ? '🎬' : fileType === 'audio' ? '🎵' : fileType === 'pdf' ? '📄' : fileType === 'html' ? '🌐' : fileType === 'archive' ? '🗜️' : fileType === 'binary' ? '⚙️' : '📁'} {fileType.toUpperCase()}
                    </div>
                )}

            </div>
            {/* Filename label with scroll animation on hover */}
            <div ref={nameLabelRef} className="vault-filename-label">
                <span
                    ref={nameTextRef}
                    className="vault-filename-text"
                    style={isScrolling ? { '--scroll-dist': `${scrollDist}px` } : {}}
                    data-animated={isScrolling ? 'true' : 'false'}
                >
                    {file.filename || 'ASSET'}
                </span>
            </div>
        </div>
    );
}

// ─── Media Grid ───────────────────────────────────────────────
function MediaGrid({ items, likedIds, onLike, onOpen, onDownload, onDelete }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%', overflowX: 'hidden', boxSizing: 'border-box', paddingBottom: '40px' }} className="vault-ultimate-grid">
            <style>{`
                @media (max-width: 767px) { .vault-ultimate-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; } }
                @media (min-width: 768px) and (max-width: 1023px) { .vault-ultimate-grid { grid-template-columns: repeat(3, 1fr) !important; } }
                @media (min-width: 1400px) { .vault-ultimate-grid { grid-template-columns: repeat(5, 1fr) !important; } }
                .vault-card-wrapper { display: flex; flex-direction: column; gap: 6px; min-width: 0; min-height: 0; }
                .vault-card-wrapper > .vault-card { flex-shrink: 0; }
                .vault-card {
                    position: relative; aspect-ratio: 1/1; width: 100%;
                    border-radius: 24px; overflow: hidden;
                    cursor: pointer; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
                    transition: none;
                    will-change: auto;
                    contain: layout style paint;
                }
                .vault-card:hover { transform: none; border-color: rgba(167,139,250,0.6); box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 15px rgba(167,139,250,0.15); }
                .vault-thumb {
                    position: absolute; inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover; object-position: center; display: block;
                    opacity: 0; transition: none;
                }
                .vault-thumb--loaded { opacity: 1; }
                .vault-card:hover .vault-thumb { transform: none; }
                .vault-shimmer {
                    position: absolute; inset: 0;
                    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
                    background-size: 200% 100%;
                    animation: none;
                    display: flex; align-items: center; justify-content: center;
                }
                @keyframes vault-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 70%); opacity: 0.95; pointer-events: none; }
                /* ── Download button ── */
                .vault-dl-btn {
                    position: absolute; top: 10px; right: 10px; z-index: 6;
                    width: 30px; height: 30px; border-radius: 50%;
                    background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.18);
                    color: white; font-size: 0.72rem; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    opacity: 1; transform: none;
                    transition: none;
                    backdrop-filter: blur(10px);
                }
                .vault-card:hover .vault-dl-btn { opacity: 1; transform: none; }
                .vault-dl-btn:hover { background: rgba(167,139,250,0.7) !important; border-color: #a78bfa !important; transform: none !important; }
                /* ── Delete button ── */
                .vault-delete-btn {
                    position: absolute; top: 10px; right: 48px; z-index: 6;
                    width: 30px; height: 30px; border-radius: 50%;
                    background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.18);
                    color: white; font-size: 0.72rem; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    opacity: 1; transform: none;
                    transition: none;
                    backdrop-filter: blur(10px);
                }
                .vault-card:hover .vault-delete-btn { opacity: 1; transform: none; }
                .vault-delete-btn:hover { background: rgba(239,68,68,0.7) !important; border-color: #ef4444 !important; transform: none !important; }
                /* ── Filename label ── */
                .vault-subfolder-card:hover .subfolder-action-btn,
                .vault-subfolder-row:hover .subfolder-action-btn { opacity: 1 !important; }
                .vault-filename-label {
                    width: 100%; overflow: hidden; padding: 0 3px;
                    font-size: 0.68rem; font-weight: 600;
                    color: rgba(255,255,255,0.45); line-height: 1.4;
                    height: 1.4em; user-select: none;
                }
                .vault-filename-text { display: inline-block; white-space: nowrap; }
                .vault-card-wrapper:hover .vault-filename-text[data-animated="true"] {
                    animation: none;
                }
                @keyframes vault-name-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(0); }
                }
            `}</style>
            {items.map((file, idx) => (
                <VaultCard key={file.id || idx} file={file} isLiked={likedIds.has(file.id)} onLike={onLike} onOpen={() => onOpen(idx)} onDownload={onDownload} onDelete={onDelete} />
            ))}
        </div>
    );
}

// ─── Upload Queue UI ──────────────────────────────────────────
function UploadQueue({ collectionId, onDone }) {
    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState({});
    const [running, setRunning] = useState(false);
    const inputRef = useRef(null);
    const CONCURRENCY = 10;

    const addFiles = (incoming) => {
        setFiles(prev => [...prev, ...Array.from(incoming)]);
    };

    const startUpload = async () => {
        if (!files.length || running) return;
        setRunning(true);
        const queue = [...files];
        const results = [];

        const uploadOne = async (file) => {
            try {
                await uploadFileToR2(file, collectionId, (pct) => {
                    setProgress(p => ({ ...p, [file.name]: pct }));
                });
                results.push({ name: file.name, ok: true });
            } catch (err) {
                console.error('Upload failed:', file.name, err);
                setProgress(p => ({ ...p, [file.name]: -1 }));
            }
        };

        // Run in batches of CONCURRENCY
        for (let i = 0; i < queue.length; i += CONCURRENCY) {
            const batch = queue.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(uploadOne));
        }
        setRunning(false);
        setFiles([]);
        setProgress({});
        onDone();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    };

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                style={{ border: '2px dashed rgba(167,139,250,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'none' }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                    Drag & drop files here, or click to browse
                </p>
                <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    {files.map(f => (
                        <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '8px' }}>
                            <span style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)' }}>{f.name}</span>
                            <div style={{ width: '120px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: '4px', transition: 'none',
                                    width: `${progress[f.name] || 0}%`,
                                    background: progress[f.name] === -1 ? '#ef4444' : progress[f.name] === 100 ? '#34d399' : '#a78bfa'
                                }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '35px', textAlign: 'right' }}>
                                {progress[f.name] === -1 ? '✗' : progress[f.name] === 100 ? '✓' : progress[f.name] ? `${progress[f.name]}%` : '—'}
                            </span>
                        </div>
                    ))}
                    <button
                        onClick={startUpload}
                        disabled={running}
                        style={{ marginTop: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: running ? 'rgba(167,139,250,0.2)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: running ? 'not-allowed' : 'pointer' }}
                    >
                        {running ? `UPLOADING... (${Object.values(progress).filter(p => p === 100).length}/${files.length})` : `UPLOAD ${files.length} FILE${files.length > 1 ? 'S' : ''}`}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────
export default function GooglePhotos({ activeTab, collections, onTabChange, onCollectionsChanged }) {
    const [liked, setLiked] = useState([]);
    const [collectionCache, setCollectionCache] = useState({}); // colId → { files, page, total, hasMore }
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lightboxItems, setLightboxItems] = useState([]);
    const [likePending, setLikePending] = useState(new Set());
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannedGroups, setScannedGroups] = useState(null);
    const [innerTab, setInnerTab] = useState('all'); // 'all' or 'favorites'
    const [isRandomView, setIsRandomView] = useState(false);
    const [pendingDeleteSub, setPendingDeleteSub] = useState(null);
    const [pendingDownload, setPendingDownload] = useState(null);       // file object awaiting password
    const [pendingFolderDownload, setPendingFolderDownload] = useState(null); // subfolder awaiting password
    const [folderDownloading, setFolderDownloading] = useState(false);
    const [folderDownloadMsg, setFolderDownloadMsg] = useState('');
    const lastAutoSyncedCollection = useRef(null);
    const isSyncingRef = useRef(false); // Synchronous lock to prevent concurrent syncs

    // Load liked items on mount + batch-prefetch their presigned URLs
    useEffect(() => {
        getLikedVaultFiles()
            .then(items => {
                const arr = Array.isArray(items) ? items : [];
                setLiked(arr);
                // Batch-prefetch presigned URLs for liked tab (20 at a time)
                const keys = arr.map(f => f.r2_key).filter(k => k && !getCachedUrl(k));
                for (let i = 0; i < keys.length; i += 20) {
                    const batch = keys.slice(i, i + 20);
                    getR2PresignedBatch(batch)
                        .then(({ urls }) => { Object.entries(urls).forEach(([k, url]) => setCachedUrl(k, url)); })
                        .catch(console.error);
                }
            })
            .catch(err => console.error('Vault liked fetch error:', err))
            .finally(() => setInitLoading(false));
    }, []);

    const col = collections?.find(c => String(c.id) === String(activeTab));

    // Load collection when active tab changes
    useEffect(() => {
        if (!activeTab) return;
        setInnerTab('all'); // Reset inner tab when switching collections
        const col = collections?.find(c => String(c.id) === String(activeTab));
        
        // Use the database value (or fallback to false)
        const isRand = col?.default_random || false;
        setIsRandomView(isRand);

        if (col) {
            // We use a functional state update to safely read current cache without adding it to deps
            setCollectionCache(prev => {
                if (isRand) {
                    // Only fetch random if we don't already have random cache for this col
                    if (!prev[col.id] || !prev[col.id].isRandom) {
                        setTimeout(() => fetchRandomFiles(col.id), 0);
                    }
                } else {
                    if (!prev[col.id] || prev[col.id].isRandom) {
                        setTimeout(() => fetchCollectionPage(col.id, 1), 0);
                    }
                }
                return prev;
            });
        }
        // Reset scanner states on tab change
        setShowScanner(false);
        setScannedGroups(null);
    }, [activeTab, collections]); // We don't add isRandomView here because toggle button handles its own fetch

    const fetchCollectionPage = async (collectionId, page) => {
        setLoading(true);
        try {
            const res = await getVaultFiles(collectionId, page, 50);
            const newFiles = res.files || [];

            // Batch-prefetch thumbnail presigned URLs (20 at a time)
            const keys = newFiles.map(f => f.r2_key).filter(k => !getCachedUrl(k));
            for (let i = 0; i < keys.length; i += 20) {
                const batch = keys.slice(i, i + 20);
                getR2PresignedBatch(batch)
                    .then(({ urls }) => { Object.entries(urls).forEach(([k, url]) => setCachedUrl(k, url)); })
                    .catch(console.error);
            }

            setCollectionCache(prev => {
                const existing = prev[collectionId];
                return {
                    ...prev,
                    [collectionId]: {
                        files: page === 1 ? newFiles : [...(existing?.files || []), ...newFiles],
                        page,
                        total: res.total,
                        hasMore: res.hasMore,
                        isRandom: false
                    }
                };
            });
        } catch (err) {
            console.error('fetchCollectionPage error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fixFlattenedFiles = async () => {
        if (!window.confirm("Run structure repair? This will assign misplaced files to their proper folders.")) return;
        setSyncing(true);
        setSyncMsg('Repairing structure...');
        try {
            const { data: cols } = await supabase.from('vault_collections').select('*');
            const { data: files } = await supabase.from('vault_files').select('id, r2_key, collection_id');
            
            let moved = 0;
            for (const file of (files || [])) {
                let bestCol = null;
                let bestLen = -1;
                for (const c of (cols || [])) {
                    if (file.r2_key.startsWith(c.key_prefix) && file.r2_key !== c.key_prefix) {
                        const rest = file.r2_key.slice(c.key_prefix.length);
                        if (!rest.includes('/')) {
                            if (c.key_prefix.length > bestLen) {
                                bestCol = c;
                                bestLen = c.key_prefix.length;
                            }
                        }
                    }
                }
                if (bestCol && bestCol.id !== file.collection_id) {
                    await supabase.from('vault_files').update({ collection_id: bestCol.id }).eq('id', file.id);
                    moved++;
                }
            }
            setSyncMsg(`✅ Repaired ${moved} files`);
            if (moved > 0) fetchCollectionPage(col?.id || activeTab, 1);
            setTimeout(() => setSyncMsg(''), 5000);
        } catch (err) {
            setSyncMsg(`❌ Repair failed: ${err.message}`);
            setTimeout(() => setSyncMsg(''), 5000);
        } finally {
            setSyncing(false);
        }
    };

    const fetchRandomFiles = async (collectionId) => {
        setLoading(true);
        try {
            const randomFiles = await getRandomVaultFiles(collectionId, 50);
            
            const keys = randomFiles.map(f => f.r2_key).filter(k => !getCachedUrl(k));
            for (let i = 0; i < keys.length; i += 20) {
                const batch = keys.slice(i, i + 20);
                getR2PresignedBatch(batch)
                    .then(({ urls }) => { Object.entries(urls).forEach(([k, url]) => setCachedUrl(k, url)); })
                    .catch(console.error);
            }

            setCollectionCache(prev => {
                const existing = prev[collectionId] || { total: 0 };
                return {
                    ...prev,
                    [collectionId]: {
                        files: randomFiles,
                        page: 1,
                        total: existing.total,
                        hasMore: false, // Disable pagination in random view to avoid duplicates
                        isRandom: true
                    }
                };
            });
        } catch (err) {
            console.error('fetchRandomFiles error:', err);
        } finally {
            setLoading(false);
        }
    };

    const likedIds = new Set(liked.map(l => l.id));

    const handleLike = async (file) => {
        if (likePending.has(file.id)) return;
        setLikePending(p => new Set(p).add(file.id));
        const isLiked = likedIds.has(file.id);
        setLiked(prev => isLiked ? prev.filter(l => l.id !== file.id) : [...prev, { ...file }]);
        try {
            await toggleLikedVaultFile(file.id, !isLiked);
        } catch {
            setLiked(prev => isLiked ? [...prev, { ...file }] : prev.filter(l => l.id !== file.id));
        } finally {
            setLikePending(p => { const n = new Set(p); n.delete(file.id); return n; });
        }
    };

    const handleDelete = async (file) => {
        if (!file || !file.id) return;
        if (!window.confirm(`Move "${file.filename}" to trash?`)) return;
        
        try {
            console.log('🗑️ DELETE START - File:', { id: file.id, filename: file.filename, r2_key: file.r2_key });
            await moveFileToTrash(file.id);
            console.log('✅ DELETE SUCCESS - File moved to trash');
            // Refresh the folder to show updated file list
            await fetchCollectionPage(col?.id || activeTab, 1);
        } catch (err) {
            console.error('❌ DELETE FAILED:', err);
            alert(`Failed to delete file: ${err.message}`);
        }
    };

    const handleSync = async (collectionId, silent = false) => {
        // Prevent concurrent syncs using synchronous ref lock
        if (isSyncingRef.current) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }
        
        // Acquire lock immediately (synchronous)
        isSyncingRef.current = true;
        
        if (!silent) {
            setSyncing(true);
            setSyncMsg('Scanning R2...');
        }
        try {
            const result = await syncVaultCollection(collectionId);
            if (!silent) {
                setSyncMsg(`✅ +${result.added} files, -${result.removed || 0} removed, +${result.addedFolders || 0} folders (${result.skipped} skipped)`);
            }

            if ((result.removedKeys || []).length > 0) {
                (result.removedKeys || []).forEach(key => {
                    urlCache.delete(key);
                });
                setCollectionCache(prev => {
                    const current = prev[collectionId];
                    if (!current || !Array.isArray(current.files)) return prev;
                    const nextFiles = current.files.filter(file => !(result.removedKeys || []).includes(file.r2_key));
                    return {
                        ...prev,
                        [collectionId]: {
                            ...current,
                            files: nextFiles,
                            total: Math.max(0, (current.total || 0) - (current.files.length - nextFiles.length))
                        }
                    };
                });
            }

            // Refresh the active folder when sync adds or removes items. This keeps the UI in sync
            // without reloading the whole app or forcing the user to re-enter passwords.
            if (result.added > 0 || (result.removed || 0) > 0 || (result.addedFolders && result.addedFolders > 0)) {
                await fetchCollectionPage(collectionId, 1);
                if (!silent && onCollectionsChanged) onCollectionsChanged();
            }
            if (!silent) setTimeout(() => setSyncMsg(''), 4000);
        } catch (err) {
            if (!silent) {
                setSyncMsg(`❌ Sync failed: ${err.message}`);
                setTimeout(() => setSyncMsg(''), 5000);
            }
        } finally {
            // Always release lock, whether silent or not
            isSyncingRef.current = false;
            setSyncing(false);
            if (!silent) setTimeout(() => setSyncMsg(''), 4000);
        }
    };

    // Disable automatic background sync/polling for now to avoid heavy full-folder scans
    // when a collection is opened. The older app behavior was lighter and did not block
    // the UI with repeated list requests. Manual sync remains available via button click.
    useEffect(() => {
        if (!col || !col.id) return;
        lastAutoSyncedCollection.current = col.id;
    }, [col?.id]);

    const handleCreateSubfolder = async () => {
        const name = window.prompt('Enter subfolder name:');
        if (!name) return;
        try {
            await createVaultCollection({ name, type: 'gallery', parent_id: col.id });
            if (onCollectionsChanged) onCollectionsChanged();
        } catch (err) {
            alert('Failed to create subfolder');
        }
    };

    const handleDeleteSubfolder = async (id, name) => {
        if (!window.confirm(`Remove subfolder "${name}" from your Vault?\n\nFiles in R2 are NOT deleted — only the index is removed.`)) return;
        setPendingDeleteSub(id);
    };

    const confirmDeleteSub = async () => {
        const id = pendingDeleteSub;
        setPendingDeleteSub(null);
        try {
            await deleteVaultCollection(id);
            if (onCollectionsChanged) onCollectionsChanged();
        } catch (err) {
            console.error('Failed to delete subfolder', err);
            alert('Failed to delete subfolder');
        }
    };

    // ─── Download Handlers ────────────────────────────────────────
    const performFileDownload = async (file) => {
        try {
            let url = getCachedUrl(file.r2_key);
            if (!url) {
                const res = await getR2PresignedGet(file.r2_key);
                url = res.url;
                setCachedUrl(file.r2_key, url);
            }
            const response = await fetch(url);
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = file.filename || 'vault_file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        } catch (err) {
            console.error('File download failed:', err);
        }
    };

    const performFolderDownload = async (subfolder) => {
        setFolderDownloading(true);
        setFolderDownloadMsg('Fetching file list...');
        try {
            const res = await getVaultFiles(subfolder.id, 1, 500);
            const files = res.files || [];
            if (files.length === 0) {
                setFolderDownloadMsg('No files in this folder.');
                setTimeout(() => setFolderDownloadMsg(''), 3000);
                return;
            }
            // Batch-fetch presigned URLs
            setFolderDownloadMsg(`Preparing ${files.length} files...`);
            const missingKeys = files.map(f => f.r2_key).filter(k => !getCachedUrl(k));
            for (let i = 0; i < missingKeys.length; i += 20) {
                const batch = missingKeys.slice(i, i + 20);
                try {
                    const { urls } = await getR2PresignedBatch(batch);
                    Object.entries(urls).forEach(([k, u]) => setCachedUrl(k, u));
                } catch {}
            }
            // Fetch file contents and build zip
            const { zipSync } = await import('fflate');
            const fileData = {};
            const usedNames = new Set();
            let done = 0;
            await Promise.all(files.map(async (file) => {
                try {
                    const url = getCachedUrl(file.r2_key);
                    if (!url) return;
                    const resp = await fetch(url);
                    const buf = await resp.arrayBuffer();
                    let name = file.filename || file.r2_key.split('/').pop() || `file_${done}`;
                    // Deduplicate names
                    if (usedNames.has(name)) name = `${Date.now()}_${name}`;
                    usedNames.add(name);
                    fileData[name] = new Uint8Array(buf);
                    done++;
                    setFolderDownloadMsg(`Downloading... ${done}/${files.length}`);
                } catch {}
            }));
            setFolderDownloadMsg('Zipping...');
            const zipped = zipSync(fileData, { level: 0 }); // level 0 = store (fast)
            const blob = new Blob([zipped], { type: 'application/zip' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${subfolder.name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 10000);
            setFolderDownloadMsg(`✅ ${done} files downloaded`);
            setTimeout(() => setFolderDownloadMsg(''), 4000);
        } catch (err) {
            console.error('Folder download failed:', err);
            setFolderDownloadMsg('❌ Download failed');
            setTimeout(() => setFolderDownloadMsg(''), 4000);
        } finally {
            setFolderDownloading(false);
        }
    };

    const handleFileDownloadClick = (file) => {
        if (isDownloadSessionActive()) {
            performFileDownload(file);
        } else {
            setPendingDownload(file);
        }
    };

    const handleFolderDownloadClick = (subfolder) => {
        if (isDownloadSessionActive()) {
            performFolderDownload(subfolder);
        } else {
            setPendingFolderDownload(subfolder);
        }
    };

    if (initLoading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', opacity: 0.5 }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(167,139,250,0.1)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'none' }} />
            <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em' }}>INITIALIZING_VAULT_CORE</p>
        </div>
    );



    // ─── COLLECTION TAB ───────────────────────────────────────
    if (!col) return <div style={{ color: 'rgba(255,255,255,0.2)', padding: '2rem' }}>INITIALIZING_STREAM...</div>;

    const colData = collectionCache[col.id] || { files: [], hasMore: false, total: 0 };
    // Filter items based on innerTab: all files or just favorites for this collection
    const collectionLiked = liked.filter(f => f.collection_id === col.id);
    const items = innerTab === 'favorites'
        ? collectionLiked
        : colData.files.filter(item => !likedIds.has(item.id));

    const subfolders = collections?.filter(c => c.parent_id === col.id) || [];
    const parentFolder = col.parent_id ? collections?.find(c => c.id === col.parent_id) : null;

    return (
        <div style={{ animation: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, margin: 0 }}>
                        {items.length}{innerTab === 'all' && colData.total > items.length ? ` / ${colData.total}` : ''} {innerTab === 'favorites' ? 'FAVORITES' : 'FILES'} · {col.name.toUpperCase()}
                    </p>
                    {syncing && <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800, letterSpacing: '0.1em', animation: 'none' }}>[ SYNCING_R2 ]</span>}
                    {syncMsg && <span style={{ fontSize: '0.75rem', color: syncMsg.startsWith('✅') ? '#34d399' : '#f87171', fontWeight: 700 }}>{syncMsg}</span>}
                    {folderDownloadMsg && <span style={{ fontSize: '0.75rem', color: folderDownloading ? '#a78bfa' : folderDownloadMsg.startsWith('✅') ? '#34d399' : folderDownloadMsg.startsWith('❌') ? '#f87171' : '#a78bfa', fontWeight: 700, animation: 'none' }}>{folderDownloadMsg}</span>}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textTransform: 'none', letterSpacing: 'normal' }}>
                    R2 Path: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{col.key_prefix}</code>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {parentFolder && (
                        <button
                            onClick={() => onTabChange(parentFolder.id)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            ‹ BACK
                        </button>
                    )}
                    <button
                        onClick={handleCreateSubfolder}
                        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        + SUBFOLDER
                    </button>
                    <button
                        onClick={() => setShowUpload(v => !v)}
                        style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        {showUpload ? 'CLOSE_UPLOAD' : '↑ UPLOAD'}
                    </button>
                    <button
                        onClick={() => handleSync(col.id)}
                        disabled={syncing}
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer' }}
                    >
                        SYNC_R2
                    </button>
                    {isRandomView && (
                        <button
                            onClick={() => fetchRandomFiles(col.id)}
                            disabled={loading}
                            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', color: '#f472b6', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            🔄 REROLL
                        </button>
                    )}
                    <button
                        onClick={() => {
                            const nextState = !isRandomView;
                            setIsRandomView(nextState);
                            
                            // Silently update the database so it syncs across devices
                            updateVaultCollection(col.id, { default_random: nextState }).catch(err => 
                                console.error('Failed to save random preference', err)
                            );
                            
                            // Update local collections state if possible, though VaultPage holds it
                            // For now, this local isRandomView state handles the UI immediately
                            col.default_random = nextState; 

                            if (nextState) {
                                fetchRandomFiles(col.id);
                            } else {
                                fetchCollectionPage(col.id, 1);
                            }
                        }}
                        disabled={loading}
                        style={{ background: isRandomView ? 'rgba(52,211,153,0.1)' : 'rgba(167,139,250,0.1)', border: `1px solid ${isRandomView ? 'rgba(52,211,153,0.2)' : 'rgba(167,139,250,0.2)'}`, color: isRandomView ? '#34d399' : '#a78bfa', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        {loading ? 'LOADING...' : isRandomView ? 'NORMAL VIEW' : 'RANDOM VIEW'}
                    </button>
                </div>
            </div>

            {/* ─── Inner Tab Toggle: ALL FILES | FAVORITES ─── */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem', width: 'fit-content' }}>
                <button
                    onClick={() => setInnerTab('all')}
                    style={{
                        padding: '8px 18px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em', transition: 'none',
                        background: innerTab === 'all' ? 'rgba(167,139,250,0.25)' : 'transparent',
                        color: innerTab === 'all' ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                        boxShadow: innerTab === 'all' ? '0 2px 8px rgba(167,139,250,0.15)' : 'none'
                    }}
                >
                    ALL FILES
                </button>
                <button
                    onClick={() => setInnerTab('favorites')}
                    style={{
                        padding: '8px 18px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em', transition: 'none',
                        background: innerTab === 'favorites' ? 'rgba(239,68,68,0.2)' : 'transparent',
                        color: innerTab === 'favorites' ? '#fca5a5' : 'rgba(255,255,255,0.35)',
                        boxShadow: innerTab === 'favorites' ? '0 2px 8px rgba(239,68,68,0.1)' : 'none'
                    }}
                >
                    ❤️ FAVORITES {collectionLiked.length > 0 ? `(${collectionLiked.length})` : ''}
                </button>
            </div>

            {showUpload && (
                <UploadQueue
                    collectionId={col.id}
                    onDone={() => { setShowUpload(false); fetchCollectionPage(col.id, 1); }}
                />
            )}

            {showScanner && !scannedGroups && (
                <div style={{ marginBottom: '2rem' }}>
                    <FaceScanner 
                        collectionId={col.id} 
                        images={items} 
                        onComplete={(res) => setScannedGroups(res)} 
                        onCancel={() => setShowScanner(false)} 
                    />
                </div>
            )}
            
            {scannedGroups && (
                <div style={{ marginBottom: '2rem' }}>
                    <FaceGroupsView 
                        collectionId={col.id}
                        groups={scannedGroups} 
                        onSave={() => { setScannedGroups(null); setShowScanner(false); }}
                        onBack={() => setScannedGroups(null)}
                    />
                </div>
            )}

            {loading && items.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {[...Array(15)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : innerTab === 'favorites' && items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤍</div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>NO FAVORITES IN THIS COLLECTION</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Like items to see them here</p>
                </div>
            ) : (
                <>
                    {subfolders.length > 0 && innerTab === 'all' && (
                        <div style={{ marginBottom: '2rem' }}>
                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginBottom: '2px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', paddingLeft: '28px' }}>NAME</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em' }}>TYPE</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textAlign: 'right', paddingRight: '70px' }}>FILES</span>
                            </div>
                            {/* Rows */}
                            {subfolders.map(sub => (
                                <div
                                    key={sub.id}
                                    className="vault-subfolder-row"
                                    onClick={() => onTabChange(sub.id)}
                                    style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', borderRadius: '6px', position: 'relative', transition: 'none' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', minWidth: 0 }}>
                                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>📁</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>{sub.name}</span>
                                    </div>
                                    {/* Type */}
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>File folder</span>
                                    {/* Files + Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', paddingRight: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', minWidth: '32px', textAlign: 'right' }}>
                                            {sub.file_count > 0 ? sub.file_count : '—'}
                                        </span>
                                        {/* Download */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleFolderDownloadClick(sub); }}
                                            className="subfolder-action-btn"
                                            title="Download folder as ZIP"
                                            style={{ background: 'transparent', border: 'none', color: '#38bdf8', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.65rem', opacity: 0, transition: 'none', flexShrink: 0 }}
                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; e.currentTarget.style.opacity = '1'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >⬇</button>
                                        {/* Delete */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSubfolder(sub.id, sub.name); }}
                                            className="subfolder-action-btn"
                                            title="Delete Subfolder"
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.65rem', opacity: 0, transition: 'none', flexShrink: 0 }}
                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.opacity = '1'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <MediaGrid items={items} likedIds={likedIds} onLike={handleLike} onOpen={(i) => { setLightboxItems(items); setLightboxIndex(i); }} onDownload={handleFileDownloadClick} onDelete={handleDelete} />

                    {innerTab === 'all' && colData.hasMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', paddingBottom: '4rem' }}>
                            <button
                                onClick={() => fetchCollectionPage(col.id, colData.page + 1)}
                                disabled={loading}
                                style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', padding: '1.2rem 3rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', transition: 'none', letterSpacing: '0.1em' }}
                                onMouseOver={e => { e.target.style.background = 'rgba(167,139,250,0.15)'; e.target.style.borderColor = '#a78bfa'; }}
                                onMouseOut={e => { e.target.style.background = 'rgba(167,139,250,0.05)'; e.target.style.borderColor = 'rgba(167,139,250,0.2)'; }}
                            >
                                {loading ? 'LOADING...' : `LOAD MORE (${colData.total - items.length} remaining)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <VaultLightbox items={lightboxItems} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} likedIds={likedIds} onLike={handleLike} />
            
            {pendingDeleteSub && (
                <SecondaryVaultLock 
                    lockId="vault" 
                    title="Delete Subfolder"
                    icon="🗑️"
                    onSuccess={confirmDeleteSub} 
                    onClose={() => setPendingDeleteSub(null)} 
                />
            )}
            {/* ─── Download password gates ─── */}
            {pendingDownload && (
                <SecondaryVaultLock
                    lockId="vault"
                    title="Download File"
                    icon="⬇️"
                    onSuccess={() => {
                        activateDownloadSession();
                        const file = pendingDownload;
                        setPendingDownload(null);
                        performFileDownload(file);
                    }}
                    onClose={() => setPendingDownload(null)}
                />
            )}
            {pendingFolderDownload && (
                <SecondaryVaultLock
                    lockId="vault"
                    title="Download Folder"
                    icon="📦"
                    onSuccess={() => {
                        activateDownloadSession();
                        const sub = pendingFolderDownload;
                        setPendingFolderDownload(null);
                        performFolderDownload(sub);
                    }}
                    onClose={() => setPendingFolderDownload(null)}
                />
            )}
        </div>
    );
}
