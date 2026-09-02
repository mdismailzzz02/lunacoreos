import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * TwitchPlayerModal
 * Plays Twitch live streams or VODs using the Interactive Embed iFrame.
 * Handles the 'parent' query parameter for domain-locked embeds.
 */
export default function TwitchPlayerModal({ channel, videoId, onClose }) {
    const [loading, setLoading] = useState(true);

    // Get the current hostname for the parent parameter (required by Twitch)
    const parentDomain = window.location.hostname;

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!channel && !videoId) return null;

    // Construct the embed URL
    // If videoId is provided, play VOD. Otherwise, play live channel.
    const embedUrl = videoId
        ? `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}&autoplay=true&muted=false`
        : `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&autoplay=true&muted=false`;

    return ReactDOM.createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000, cursor: 'pointer'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: 'min(90vw, 1100px)',
                    aspectRatio: '16 / 9',
                    background: '#000',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    cursor: 'default',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ✕
                </button>

                {/* Loading indicator */}
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#a970ff'
                    }}>
                        <div style={{
                            width: '40px', height: '40px', border: '3px solid rgba(169, 112, 255, 0.2)',
                            borderTop: '3px solid #a970ff', borderRadius: '50%', animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading Twitch Player...</span>
                    </div>
                )}

                <iframe
                    src={embedUrl}
                    height="100%"
                    width="100%"
                    allowFullScreen
                    frameBorder="0"
                    onLoad={() => setLoading(false)}
                    style={{ border: 'none' }}
                    title="Twitch Player"
                />
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>,
        document.body
    );
}
