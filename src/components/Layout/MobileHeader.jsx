import React from 'react';
import { useAudio } from '../../context/AudioContext';
import { Disc } from 'lucide-react';

/**
 * MobileHeader - Top Header for branding and status
 */
export default function MobileHeader({ userName, isOffline, onMusicClick }) {
    const { playing } = useAudio();

    return (
        <header className="mobile-header">
            <div className="mobile-header-branding">
                <img src="/profile.jpg?v=2" alt="Logo" className="mobile-logo-img" />
                <span className="mobile-header-title">LunaCoreOS</span>
            </div>

            <div className="mobile-header-status">
                {isOffline && <span className="status-badge offline">☁️ Offline</span>}
                <button
                    className={`music-disc-btn ${playing ? 'is-playing' : ''}`}
                    onClick={onMusicClick}
                    title="Music Player"
                    aria-label="Open music player"
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Disc size={22} className="disc-icon" />
                    {playing && (
                        <span style={{
                            position: 'absolute', top: '2px', right: '2px',
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#4ade80',
                            boxShadow: '0 0 6px #4ade80',
                            animation: 'pulse-dot 1.5s ease-in-out infinite'
                        }} />
                    )}
                </button>
                <img src="/profile.jpg?v=2" alt="User" className="mobile-user-avatar-img" />
            </div>
        </header>
    );
}
