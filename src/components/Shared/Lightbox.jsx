import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../../services/api';

function LightboxImage({ item, index }) {
    const getInitialSrc = (url) => {
        if (!url) return '';
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
        if (!match) return url;
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2500`;
    };

    const [src, setSrc] = useState(getInitialSrc(item.drive_link));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setSrc(getInitialSrc(item.drive_link));
        setFailed(false);
    }, [item.media_id]);

    const handleError = async () => {
        if (failed) return;
        setFailed(true);
        try {
            const res = await api.getThumbnailBase64(item.media_id);
            if (res && res.base64) setSrc(res.base64);
        } catch (e) {
            console.error('Lightbox proxy fail:', e);
        }
    };

    return (
        <img
            className="lightbox-img"
            src={src}
            alt={item.display_name || `Image ${index + 1}`}
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
            onError={handleError}
            draggable={false}
        />
    );
}

export default function Lightbox({ images, startIndex = 0, onClose }) {
    const [idx, setIdx] = useState(startIndex);

    // ── Pinch-to-Zoom State ───────────────────────────────────
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const lastTouchDist = useRef(null);
    const lastTap = useRef(0);
    const dragStart = useRef(null);
    const containerRef = useRef(null);

    const resetZoom = useCallback(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    }, []);

    const prev = () => { resetZoom(); setIdx(i => (i - 1 + images.length) % images.length); };
    const next = () => { resetZoom(); setIdx(i => (i + 1) % images.length); };

    // ── Touch Handlers ────────────────────────────────────────
    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Start pinch
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
        } else if (e.touches.length === 1) {
            // Detect double-tap
            const now = Date.now();
            if (now - lastTap.current < 300) {
                // Double tap → toggle zoom
                if (scale > 1) {
                    resetZoom();
                } else {
                    setScale(2.5);
                }
            }
            lastTap.current = now;
            // Start drag tracking
            dragStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y };
        }
    };

    const onTouchMove = (e) => {
        e.preventDefault(); // Prevent browser scroll/bounce
        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastTouchDist.current) {
                const delta = dist / lastTouchDist.current;
                setScale(s => Math.min(Math.max(s * delta, 1), 5));
            }
            lastTouchDist.current = dist;
        } else if (e.touches.length === 1 && scale > 1 && dragStart.current) {
            // Pan when zoomed in
            setTranslate({
                x: e.touches[0].clientX - dragStart.current.x,
                y: e.touches[0].clientY - dragStart.current.y,
            });
        }
    };

    const onTouchEnd = (e) => {
        if (e.touches.length < 2) {
            lastTouchDist.current = null;
        }
        // Swipe navigation (only when not zoomed)
        if (scale <= 1 && e.changedTouches.length === 1 && dragStart.current) {
            const dx = e.changedTouches[0].clientX - (dragStart.current.x + translate.x);
            if (Math.abs(dx) > 60) {
                dx < 0 ? next() : prev();
            }
        }
        dragStart.current = null;
    };

    // ── Attach non-passive touchmove so preventDefault() works ──
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => el.removeEventListener('touchmove', onTouchMove);
    });

    if (!images || images.length === 0) return null;
    const currentItem = images[idx];

    return (
        <div
            className="lightbox-overlay"
            onClick={scale === 1 ? onClose : undefined}
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Top Bar */}
            <div className="lightbox-topbar" onClick={e => e.stopPropagation()}>
                <span className="lightbox-title">{currentItem.display_name || ''}</span>
                <button className="lightbox-close" onClick={onClose} title="Close">✕</button>
            </div>

            {/* Nav Buttons (hidden when zoomed) */}
            {images.length > 1 && scale === 1 && (
                <button className="lightbox-nav lightbox-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
            )}

            {/* Image / Video */}
            <div
                className="lightbox-img-wrap"
                style={{
                    transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                    transition: scale === 1 ? 'transform 0.3s ease' : 'none',
                    cursor: scale > 1 ? 'grab' : 'default',
                }}
                onClick={e => e.stopPropagation()}
            >
                {currentItem.media_type === 'video' ? (
                    <video
                        className="lightbox-img"
                        controls
                        autoPlay
                        src={currentItem.drive_link}
                    />
                ) : (
                    <LightboxImage item={currentItem} index={idx} />
                )}
            </div>

            {images.length > 1 && scale === 1 && (
                <button className="lightbox-nav lightbox-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && scale === 1 && (
                <div className="lightbox-strip" onClick={e => e.stopPropagation()}>
                    {images.map((img, i) => (
                        <div
                            key={img.media_id || i}
                            className={`lightbox-strip-thumb ${i === idx ? 'active' : ''}`}
                            onClick={() => setIdx(i)}
                        >
                            <img
                                src={`https://drive.google.com/thumbnail?id=${(img.drive_link?.match(/\/d\/([^/]+)/) || img.drive_link?.match(/id=([^&/]+)/))?.[1]}&sz=w100`}
                                alt={img.display_name}
                                referrerPolicy="no-referrer"
                                draggable={false}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Zoom hint */}
            {scale > 1 && (
                <button
                    className="lightbox-reset-zoom"
                    onClick={e => { e.stopPropagation(); resetZoom(); }}
                >
                    ✕ Reset Zoom
                </button>
            )}
        </div>
    );
}
