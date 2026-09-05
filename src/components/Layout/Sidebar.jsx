import { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import Dither from '../Shared/Dither';
import {
    Home, Dna, Sparkles, Mail, BookOpen, FileText, PenTool,
    Heart, Users, Music, Play, Pause, SkipForward, Tv,
    Gamepad2, Diamond, Image, Library, Package, Star,
    KeyRound, Settings, Disc, Film
} from 'lucide-react';

const TABS = [
    { id: 'dashboard', Icon: Home, label: 'Dashboard' },


    { id: 'mail', Icon: Mail, label: 'Gmail Inbox' },

    { id: 'journal', Icon: BookOpen, label: 'Journal' },
    { id: 'studynotes', Icon: FileText, label: 'Study Notes' },
    { id: 'writing', Icon: PenTool, label: 'Writing' },
    { id: 'bookmarks', Icon: Heart, label: 'Bookmarks' },
    { id: 'delegation', Icon: Users, label: 'Delegation' },
    { id: 'musicplayer', Icon: Music, label: 'Music Player' },
    { id: 'videos', Icon: Tv, label: 'YouTube' },

    { id: 'vault', Icon: Diamond, label: 'Vault', isRed: true },
    { id: 'media', Icon: Image, label: 'Media Library' },
    
    // Remaining items in between

    { id: 'readinglist', Icon: Library, label: 'Reading List' },
    { id: 'watchlist', Icon: Film, label: 'Watchlist' },
    { id: 'timecapsule', Icon: Package, label: 'Time Capsule' },
    { id: 'yearlyreview', Icon: Star, label: 'Yearly Review' },
    { id: 'passwords', Icon: KeyRound, label: 'Passwords' },
    
    // Settings at the very end
    { id: 'system-settings', Icon: Settings, label: 'Settings' },
];

export default function Sidebar({ active, onNavigate, userName, isOffline, onPreload, preload, isOpen, onClose, onMusicClick, tabHistory }) {
    const { playing, currentTrack, playTrack, playNext } = useAudio();
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeout = useRef(null);

    const handleMouseEnter = () => {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
            setIsHovered(true);
        }, 150);
    };

    const handleMouseLeave = () => {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
            setIsHovered(false);
        }, 200);
    };

    return (
        <>
            {/* Mobile Drawer Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <aside 
                className={`sidebar ${isOpen ? 'open' : ''} ${isHovered ? 'is-expanded' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
            <div className="sidebar-logo">
                <div className="logo-flex" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
                    <img src="/logo.png" alt="Logo" className="app-logo-img" style={{ borderRadius: '50%', objectFit: 'cover' }} />
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
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        className={`nav-item ${active === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            if (tab.isExternal) window.open(tab.isExternal, '_blank');
                            else onNavigate(tab.id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (tab.isExternal) window.open(tab.isExternal, '_blank');
                                else onNavigate(tab.id);
                            }
                        }}
                    >
                        <span className="nav-icon"><tab.Icon size={18} strokeWidth={1.8} /></span>
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
