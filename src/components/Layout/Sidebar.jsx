import { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import Dither from '../Shared/Dither';
import { Disc, Settings, Play, Pause, SkipForward } from 'lucide-react';

const DEFAULT_TABS = [
    { id: 'dashboard', icon: '🌸', label: 'Dashboard' },
    { id: 'luna', icon: '✨', label: 'Luna AI' },
    { id: 'mail', icon: '✉️', label: 'Gmail Inbox' },
    { id: 'todos', icon: '🎯', label: 'Todos' },
    { id: 'journal', icon: '📖', label: 'Journal' },
    { id: 'horoscope', icon: '♾️', label: 'Horoscope' },
    { id: 'studynotes', icon: '📝', label: 'Study Notes' },
    { id: 'musicplayer', icon: '🎵', label: 'Music Player' },
    { id: 'lifeos', icon: '🧬', label: 'LifeOS React' },
    { id: 'insights', icon: '✨', label: 'Insights' },
    { id: 'writing', icon: '✍️', label: 'Writing' },
    { id: 'readinglist', icon: '📚', label: 'Reading List' },
    { id: 'bookmarks', icon: '❤️', label: 'Bookmarks' },
    { id: 'videos', icon: '🎬', label: 'Videos' },
    { id: 'media', icon: '🎨', label: 'Media Library' },
    { id: 'twitch', icon: '🎮', label: 'Twitch' },
    { id: 'watchlist', icon: '🎞️', label: 'Watchlist' },
    { id: 'lifemap', icon: '🧭', label: 'Life Map' },
    { id: 'timecapsule', icon: '📦', label: 'Time Capsule' },
    { id: 'yearlyreview', icon: '🎆', label: 'Yearly Review' },
    { id: 'delegation', icon: '🤝', label: 'Delegation' },
    { id: 'passwords', icon: '🔑', label: 'Passwords' },
    { id: 'vault', icon: '💎', label: 'Vault', isRed: true },
    { id: 'system-settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ active, onNavigate, userName, isOffline, onPreload, preload, isOpen, onClose, onMusicClick }) {
    const { playing, currentTrack, playTrack, playNext } = useAudio();
    const [isHovered, setIsHovered] = useState(false);
    const [tabs, setTabs] = useState(DEFAULT_TABS);
    const hoverTimeout = useRef(null);

    // Intelligent Sorting: Load usage stats and sort
    useEffect(() => {
        try {
            const stats = JSON.parse(localStorage.getItem('luna_sidebar_stats') || '{}');
            const sortedTabs = [...DEFAULT_TABS].sort((a, b) => {
                if (a.id === 'dashboard') return -1;
                if (b.id === 'dashboard') return 1;
                const countA = stats[a.id] || 0;
                const countB = stats[b.id] || 0;
                if (countA !== countB) {
                    return countB - countA; // Higher counts first
                }
                // Fallback to alphabetical if counts are the same
                return a.label.localeCompare(b.label);
            });
            setTabs(sortedTabs);
        } catch (e) {
            setTabs(DEFAULT_TABS);
        }
    }, []);

    const trackUsageAndNavigate = (tab) => {
        try {
            const stats = JSON.parse(localStorage.getItem('luna_sidebar_stats') || '{}');
            stats[tab.id] = (stats[tab.id] || 0) + 1;
            localStorage.setItem('luna_sidebar_stats', JSON.stringify(stats));
            
            // Re-sort silently for next time
            const sortedTabs = [...DEFAULT_TABS].sort((a, b) => {
                if (a.id === 'dashboard') return -1;
                if (b.id === 'dashboard') return 1;
                const countA = stats[a.id] || 0;
                const countB = stats[b.id] || 0;
                if (countA !== countB) return countB - countA;
                return a.label.localeCompare(b.label);
            });
            setTabs(sortedTabs);
        } catch (e) {
            console.error('Failed to track tab usage', e);
        }

        if (tab.isExternal) {
            window.open(tab.isExternal, '_blank');
        } else {
            onNavigate(tab.id);
        }
    };

    const handleMouseEnter = () => {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
            setIsHovered(true);
        }, 150); // Small delay to avoid accidental triggers
    };

    const handleMouseLeave = () => {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
            setIsHovered(false);
        }, 200); // Slightly longer delay for exit to feel stable
    };

    return (
        <>
            {/* Mobile Drawer Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <aside 
                className={`sidebar scifi-sidebar ${isOpen ? 'open' : ''} ${isHovered ? 'is-expanded' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Sharp Internal Dither Background */}
                <div className="sidebar-internal-dither">
                    <Dither 
                        waveColor={[0.5, 0.5, 0.5]} 
                        waveSpeed={0.03}
                        waveAmplitude={0.2}
                        waveFrequency={2}
                        colorNum={4}
                        pixelSize={2}
                    />
                </div>

            <div className="sidebar-logo">
                <div className="logo-flex" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
                    <img src="/profile.jpg" alt="Logo" className="app-logo-img" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                    <div className="logo-text">
                        <h1>LunaCoreOS</h1>
                        <p>Your private sanctuary</p>
                    </div>
                </div>
            </div>

            {/* Top Mini Music Player */}
            {currentTrack && active !== 'musicplayer' && (
                <div className="sidebar-top-music">
                    <div className="stm-track-info" onClick={() => onNavigate('musicplayer')}>
                        <div className={`stm-disc ${playing ? 'spinning' : ''}`}>
                            <Disc size={16} />
                        </div>
                        <div className="stm-details">
                            <span className="stm-title">{currentTrack.title}</span>
                            <span className="stm-artist">{currentTrack.artist}</span>
                        </div>
                        {playing && (
                            <div className="stm-bars">
                                <span/><span/><span/>
                            </div>
                        )}
                    </div>
                    <div className="stm-controls">
                        <button className="stm-btn" onClick={() => playTrack(currentTrack)}>
                            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
                        </button>
                        <button className="stm-btn" onClick={playNext}>
                            <SkipForward size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`nav-item ${active === tab.id ? 'active' : ''}`}
                        onClick={() => trackUsageAndNavigate(tab)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                trackUsageAndNavigate(tab);
                            }
                        }}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className={`nav-label ${tab.isRed ? 'text-red' : ''}`}>{tab.label}</span>
                    </div>
                ))}
                <div style={{ height: '2rem', flexShrink: 0 }} />
            </nav>

            {/* Footer actions removed to clean up UI, music player is now at top */}
        </aside>
        </>
    );
}
