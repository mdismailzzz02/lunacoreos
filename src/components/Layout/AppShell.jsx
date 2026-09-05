import { useState } from 'react';
import CommandDisk from './CommandDisk';
import SmartActions from './SmartActions';
import NavModePicker from './NavModePicker';
import MusicPlayer from './MusicPlayer';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';

export default function AppShell({ activeTab, onNavigate, userName, isOffline, preload, onPreload, tabHistory, onCloseTab, children }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [navMode, setNavMode] = useState(() => localStorage.getItem('luna_nav_mode') || null);
    const progress = preload?.total > 0 ? (preload.current / preload.total) * 100 : 0;

    const handleMobileNavigate = (tab) => {
        onNavigate(tab);
        setIsMenuOpen(false);
    };

    const handleMusicClick = () => {
        if (window.openMusicPlayer) {
            window.openMusicPlayer();
        }
    };

    const handleNavModeSelect = (mode) => {
        localStorage.setItem('luna_nav_mode', mode);
        setNavMode(mode);
    };

    return (
        <>
            <MobileHeader userName={userName} isOffline={isOffline} onMusicClick={handleMusicClick} />

            {/* ── Floating Preloader Pill ── */}
            {preload?.active && (
                <div style={{
                    position: 'fixed', bottom: '5.5rem', right: '1.25rem',
                    background: 'var(--surface, #1a1a2e)',
                    border: '1px solid rgba(167, 139, 250, 0.4)',
                    borderRadius: '100px',
                    padding: '0.6rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(167, 139, 250, 0.1)',
                    zIndex: 10000,
                    animation: 'pill-bounce 2s infinite ease-in-out, fade-in-up 0.5s ease'
                }}>
                    <div className="spinner-mini" style={{ width: '14px', height: '14px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Syncing: {preload.status || 'Vault'}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                            {preload.current} / {preload.total} items
                        </span>
                    </div>

                    <div style={{ width: '50px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${progress}%`, height: '100%',
                            background: 'var(--accent)',
                            transition: 'width 0.3s ease-out',
                            boxShadow: '0 0 8px var(--accent)'
                        }} />
                    </div>
                </div>
            )}

            {/* ── First-time Nav Mode Picker ── */}
            {!navMode && <NavModePicker onSelect={handleNavModeSelect} />}

            {/* ── Desktop Navigation (based on user choice) ── */}
            {navMode === 'disk' && <CommandDisk activeTab={activeTab} onNavigate={onNavigate} />}
            {navMode === 'smart' && <SmartActions activeTab={activeTab} onNavigate={onNavigate} tabHistory={tabHistory} onCloseTab={onCloseTab} />}

            <div className={`app-shell candy-theme ${isOffline ? 'is-offline' : ''} ${isMenuOpen ? 'menu-open' : ''}`}>
                {/* Mobile: Keep traditional sidebar drawer */}
                <Sidebar
                    active={activeTab}
                    onNavigate={handleMobileNavigate}
                    userName={userName}
                    isOffline={isOffline}
                    onPreload={onPreload}
                    preload={preload}
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onMusicClick={handleMusicClick}
                    tabHistory={tabHistory}
                />

                <main className={`content-area tab-enter tab-${activeTab}`}>
                    <div className="tabs-container" style={{ minHeight: '100%' }}>
                        {children}
                    </div>
                </main>
            </div>

            <MobileNav
                active={activeTab}
                onNavigate={onNavigate}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            />

            <MusicPlayer />
        </>
    );
}
