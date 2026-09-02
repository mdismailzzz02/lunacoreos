import { useState, useEffect, useRef } from 'react';
import AppShell from './components/Layout/AppShell';
import Dashboard from './components/Dashboard/Dashboard';
import JournalPage from './components/Journal/JournalPage';
import HabitsPage from './components/Habits/HabitsPage';
import MediaLibraryPage from './components/MediaLibrary/MediaLibraryPage';
import VaultPage from './components/Vault/VaultPage';
import TimeCapsulePage from './components/TimeCapsule/TimeCapsulePage';
import WhoAmIPage from './components/WhoAmI/WhoAmIPage';
import ThoughtDumpPage from './components/ThoughtDump/ThoughtDumpPage';
import StreaksPage from './components/Streaks/StreaksPage';
import ReadingListPage from './components/ReadingList/ReadingListPage';
import FinancePage from './components/Finance/FinancePage';
import BookmarksPage from './components/Bookmarks/BookmarksPage';
import WritingPage from './components/Writing/WritingPage';
import YearlyReviewPage from './components/YearlyReview/YearlyReviewPage';
import Videos from './components/Videos/Videos';
import TwitchPage from './components/Twitch/TwitchPage';
import StudyNotesPage from './components/StudyNotes/StudyNotesPage';
import DelegationPage from './components/Delegation/DelegationPage';
import NotificationsPage from './components/Notifications/NotificationsPage';
import InformationPage from './components/Information/InformationPage';
import MusicPlayerPage from './components/MusicPlayer/MusicPlayerPage';
import MailPage from './components/Mail/MailPage';
import SettingsPage from './components/Settings/SettingsPage';
import PasswordsPage from './components/Passwords/PasswordsPage';
import LunaAIPage from './components/LunaAI/LunaAIPage';
import LifeOSPage from './components/LifeOS/LifeOSPage';
import * as api from './services/api';
import { Preloader } from './services/preloader';
import { OfflineCache } from './services/offlineCache';
import OfflineCacheBadge from './components/OfflineCacheBadge';
import { supabase } from './services/supabaseClient';
import { loginWithSupabase } from './services/googleAuth';
import Dither from './components/Shared/Dither';
import BootSequence from './components/Auth/BootSequence';
import UnlockSequence from './components/Auth/UnlockSequence';
import { Eye, Lock } from 'lucide-react';
import MatrixRain from './components/Arcade/MatrixRain';
import Neofetch from './components/Arcade/Neofetch';
import Hollywood from './components/Arcade/Hollywood';
import SelfDestruct from './components/Arcade/SelfDestruct';
import TerminalCalculator from './components/Arcade/TerminalCalculator';
import TerminalCalendar from './components/Arcade/TerminalCalendar';
import LofiRadio from './components/Arcade/LofiRadio';
import Snake from './components/Arcade/Snake';
import Game2048 from './components/Arcade/Game2048';

function ExitTerminal({ onDismiss, onTerminate }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onDismiss();
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                onTerminate();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDismiss, onTerminate]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(20px)',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace'
        }}>
            <div style={{
                width: '100%', maxWidth: '900px', minHeight: '550px',
                background: 'rgba(15, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    background: 'rgba(40, 40, 45, 0.5)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', gap: '8px', position: 'absolute', left: '16px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e' }}></span>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dea123' }}></span>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29' }}></span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                        LunaCore Security Daemon — active
                    </div>
                </div>
                <div style={{ padding: '40px', color: '#e0e0e0', fontSize: '1rem', lineHeight: 1.6, flex: 1 }}>
                    <p style={{ color: '#ff5f56', fontWeight: 700, marginBottom: '16px', fontSize: '1.1rem' }}>FATAL: INTERRUPT SIGNAL RECEIVED</p>
                    <p>A termination signal was detected from the host environment.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                        <button 
                            onClick={onDismiss} 
                            style={{ textAlign: 'left', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', font: 'inherit', cursor: 'pointer', padding: '12px 16px', borderRadius: '6px', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'}
                        >
                            <span style={{ opacity: 0.7, marginRight: '8px' }}>{'>'}</span> Resume Session
                        </button>
                        
                        <button 
                            onClick={onTerminate} 
                            style={{ textAlign: 'left', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', font: 'inherit', cursor: 'pointer', padding: '12px 16px', borderRadius: '6px', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                        >
                            <span style={{ opacity: 0.7, marginRight: '8px' }}>{'>'}</span> Terminate Session (Logout)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [tab, setTab] = useState(() => sessionStorage.getItem('luna_active_tab') || 'journal');
    const [userName, setUserName] = useState('');
    const [theme, setTheme] = useState('dark');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [preload, setPreload] = useState({ active: false, current: 0, total: 0, status: '' });
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [radioChannel, setRadioChannel] = useState(1);
    const [authError, setAuthError] = useState('');
    const [guestTimeLeft, setGuestTimeLeft] = useState('');
    const [unlockState, setUnlockState] = useState(null);
    const [isBooting, setIsBooting] = useState(() => !sessionStorage.getItem('luna_booted'));
    const [terminalMinimized, setTerminalMinimized] = useState(() => !sessionStorage.getItem('luna_booted') ? false : true);
    const [terminalActivity, setTerminalActivity] = useState(Date.now());
    const [activeGame, setActiveGame] = useState(null);
    const [arcadeCategory, setArcadeCategory] = useState('main'); // 'main', 'games', 'tools', 'hacker'
    const [showInterruptSignal, setShowInterruptSignal] = useState(false);

    const renderMenuOptions = () => (
        <>
            {arcadeCategory === 'main' && (
                <>
                    <p className="term-text">1. Games Archive</p>
                    <p className="term-text">2. System Utilities</p>
                    <p className="term-text">3. Hacker Tools</p>
                    <p className="term-text">4. Terminal Lofi Radio</p>
                    <p className="term-text">5. System Info</p>
                    <p className="term-text" style={{ opacity: 0.5, marginTop: '15px' }}>0. Exit to login</p>
                </>
            )}
            {arcadeCategory === 'tools' && (
                <>
                    <p className="term-text" style={{ color: '#4ade80', marginBottom: '5px' }}>[ SYSTEM UTILITIES ]</p>
                    <p className="term-text">1. Calculator</p>
                    <p className="term-text">2. Calendar</p>
                    <p className="term-text" style={{ opacity: 0.5, marginTop: '15px' }}>0. Back to Main Menu</p>
                </>
            )}
            {arcadeCategory === 'games' && (
                <>
                    <p className="term-text" style={{ color: '#4ade80', marginBottom: '5px' }}>[ GAMES ARCHIVE ]</p>
                    <p className="term-text">1. Chrome Dino</p>
                    <p className="term-text">2. Snake (Native)</p>
                    <p className="term-text">3. 2048 (Native)</p>
                    <p className="term-text">4. Pacman (Network)</p>
                    <p className="term-text">5. Asteroids (Network)</p>
                    <p className="term-text">6. DOOM (Network)</p>
                    <p className="term-text">7. OutRun Racing (Network)</p>
                    <p className="term-text">8. Geometry Dash (Network)</p>
                    <p className="term-text" style={{ opacity: 0.5, marginTop: '15px' }}>0. Back to Main Menu</p>
                </>
            )}
            {arcadeCategory === 'hacker' && (
                <>
                    <p className="term-text" style={{ color: '#4ade80', marginBottom: '5px' }}>[ HACKER TOOLS ]</p>
                    <p className="term-text">1. The Matrix Protocol</p>
                    <p className="term-text">2. Hollywood Hacker Mode</p>
                    <p className="term-text">3. Self-Destruct Sequence</p>
                    <p className="term-text" style={{ opacity: 0.5, marginTop: '15px' }}>0. Back to Main Menu</p>
                </>
            )}
        </>
    );
    
    // Curated Lock Screen Dither Colors (Sophisticated, non-party vibes)
    const [lockScreenColor] = useState(() => {
        const colors = [
            [0.5, 0.5, 0.5], // Original Grey
            [0.8, 0.5, 0.2], // Amber (User's favorite)
            [0.4, 0.5, 0.7], // Steel Blue
            [0.6, 0.4, 0.6], // Muted Lavender
            [0.3, 0.6, 0.5], // Sage/Teal
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    });

    const triggerPreload = () => {
        if (preload.active) return;
        setPreload({ active: true, current: 0, total: 0 });
        Preloader.start((current, total, status) => {
            setPreload({ active: current < total, current, total, status });
        });
    };

    useEffect(() => {
        // ── TRUE VAULT LOCK: Tab Close Detection ──────────────────────────────
        // How it works:
        //   beforeunload fires on BOTH refresh and tab close.
        //   sessionStorage persists on refresh but CLEARS on tab close.
        //   So: if 'luna_navigating' is NOT in sessionStorage on load → tab was closed.
        //   If it IS present → it was a refresh → keep session alive.
        const wasRefresh = sessionStorage.getItem('luna_navigating') === 'true';
        sessionStorage.removeItem('luna_navigating'); // reset for next event

        if (!wasRefresh) {
            // ── Fresh tab open after close: fully sign out server-side ──
            // This invalidates the Supabase JWT. No DevTools trick can bypass a dead token.
            console.log('[Vault] 🔐 Tab was closed — signing out server-side.');
            supabase.auth.signOut();
            sessionStorage.removeItem('luna_vault_unlocked');
        }

        const handleBeforeUnload = (e) => {
            // Mark that this unload is a navigation/refresh (not a close)
            sessionStorage.setItem('luna_navigating', 'true');
            
            // Show the native browser warning when they try to refresh/close
            const isUnlocked = sessionStorage.getItem('luna_vault_unlocked') === 'true';
            if (isUnlocked || sessionStorage.getItem('luna_active_tab')) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // ── Handle Supabase Auth Session ──────────────────────────────────────
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const isUnlocked = sessionStorage.getItem('luna_vault_unlocked') === 'true';
                setUser((session?.user && isUnlocked) ? session.user : null);
            } catch (err) {
                console.error('Auth session fetch failed:', err);
            } finally {
                setAuthLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log(`[Auth Event] ${_event}`, session ? 'User present' : 'No user');
            
            if (_event === 'SIGNED_OUT') {
                // If a race condition happened but was recovered, the session might still be valid in storage
                const { data: check } = await supabase.auth.getSession();
                if (check?.session) {
                    console.log('[Auth] Ignored SIGNED_OUT because session is still valid.');
                    return;
                }
            }

            const isUnlocked = sessionStorage.getItem('luna_vault_unlocked') === 'true';
            if (session?.user && !isUnlocked) {
                console.log('[Vault] 🔒 Locked — master key required.');
                setUser(null);
            } else {
                setUser(session?.user ?? null);
            }
            setAuthLoading(false);
        });

        // ── Session Heartbeat (only while tab is open) ────────────────────────
        const heartbeat = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Pulsing session heartbeat...');
                const { error } = await supabase.auth.refreshSession();
                if (error) console.warn('[Auth] Heartbeat refresh failed:', error);
            }
        }, 15 * 60 * 1000);

        return () => {
            subscription.unsubscribe();
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // ── Guest Session Expiration (6 mins) ──────────────────────────────
    useEffect(() => {
        const isGuest = sessionStorage.getItem('luna_guest_access') === 'true';
        if (!isGuest) return;

        let loginTime = sessionStorage.getItem('luna_guest_login_time');
        if (!loginTime) {
            loginTime = Date.now().toString();
            sessionStorage.setItem('luna_guest_login_time', loginTime);
        }

        const MAX_SESSION_MS = 6 * 60 * 1000;

        const checkExpiration = () => {
            const elapsed = Date.now() - parseInt(loginTime, 10);
            const remaining = MAX_SESSION_MS - elapsed;
            
            if (remaining <= 0) {
                sessionStorage.removeItem('luna_guest_access');
                sessionStorage.removeItem('luna_guest_login_time');
                window.location.reload();
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setGuestTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        };

        checkExpiration(); // check immediately on mount
        const interval = setInterval(checkExpiration, 1000); // update timer every second
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (terminalMinimized) return;
        if (activeGame && activeGame !== 'menu') return; // Don't auto-close if an arcade module/game is running
        
        const timeout = setTimeout(() => {
            setTerminalMinimized(true);
        }, 2 * 60 * 1000);
        
        return () => clearTimeout(timeout);
    }, [terminalMinimized, terminalActivity, activeGame]);

    // ── Global Navigation Event ───────────────────────────────────────────────
    useEffect(() => {
        const handleNav = (e) => {
            if (e.detail) navigate(e.detail);
        };
        window.addEventListener('luna:navigate', handleNav);
        return () => window.removeEventListener('luna:navigate', handleNav);
    }, []);

    // ── Interrupt Signal Interceptor ──────────────────────────────────────
    useEffect(() => {
        if (!user) return; // Only trap if logged in

        // Push state so back button triggers popstate instead of exiting
        window.history.pushState({ trap: true }, '', window.location.pathname);
        window.history.pushState({ trap: true }, '', window.location.pathname);

        const handlePopState = (e) => {
            setShowInterruptSignal(true);
            // Re-push so they stay trapped
            window.history.pushState({ trap: true }, '', window.location.pathname);
        };

        const handleKeyDown = (e) => {
            // Intercept F5 or Cmd+R / Ctrl+R
            if (e.key === 'F5' || (e.code === 'KeyR' && (e.metaKey || e.ctrlKey))) {
                e.preventDefault();
                e.stopPropagation();
                setShowInterruptSignal(true);
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown, { capture: true }); // Use capture phase to intercept early

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [user]);

    // ── Panic Button: Spacebar x 4 to Logout ──────────────────────────────
    const spacebarCountRef = useRef(0);
    const spacebarTimeoutRef = useRef(null);

    useEffect(() => {
        if (!user) return; // Only active when logged in

        const handleGlobalKeyDown = (e) => {
            // Alt+A shortcut to immediately navigate to vault and prompt for hidden vault
            if (e.altKey && e.code === 'KeyA') {
                e.preventDefault();
                sessionStorage.setItem('luna_trigger_hidden_vault', 'true');
                navigate('vault');
                window.dispatchEvent(new CustomEvent('luna:open_hidden_vault'));
                return;
            }

            if (e.key === ' ' || e.code === 'Space') {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                    return; // Ignore if user is just typing
                }

                spacebarCountRef.current += 1;
                clearTimeout(spacebarTimeoutRef.current);

                if (spacebarCountRef.current >= 4) {
                    // Trigger instant logout
                    supabase.auth.signOut().then(() => {
                        sessionStorage.clear();
                        window.location.reload();
                    });
                } else {
                    // Reset count after 1 second
                    spacebarTimeoutRef.current = setTimeout(() => {
                        spacebarCountRef.current = 0;
                    }, 1000);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [user]);

    // ── Terminal Auto-Focus ──────────────────────────────────────────────────
    useEffect(() => {
        if (!terminalMinimized) {
            // Focus after the 0.5s CSS transition completes
            const timeout = setTimeout(() => {
                const input = document.querySelector('.terminal-window:not(.closed) .term-input');
                if (input) input.focus();
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [terminalMinimized, activeGame]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Trigger background cache sync when coming online
            OfflineCache.triggerSync();
        };

        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Initialize offline cache monitoring
        const cleanupCache = OfflineCache.init();
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            cleanupCache?.();
        };
    }, []);

    useEffect(() => {
        // Load config on mount
        api.getDashboardStats()
            .then(res => {
                if (res?.config?.user_name) setUserName(res.config.user_name);
                if (res?.config?.theme) {
                    setTheme(res.config.theme);
                    document.documentElement.setAttribute('data-theme', res.config.theme);
                }
            })
            .catch(() => { });
    }, []);

    const navigate = (tabId) => {
        setTab(tabId);
        sessionStorage.setItem('luna_active_tab', tabId);
    };

    const renderTab = () => {
        switch (tab) {
            case 'system-settings': return <SettingsPage />;
            case 'dashboard': return <Dashboard onNavigate={navigate} />;
            case 'journal': return <JournalPage />;
            case 'habits': return <HabitsPage />;
            case 'videos': return <Videos />;
            case 'media': return <MediaLibraryPage />;
            case 'vault': return <VaultPage />;
            case 'passwords': return <PasswordsPage />;
            case 'luna': return <LunaAIPage />;
            case 'timecapsule': return <TimeCapsulePage />;
            case 'whoami': return <WhoAmIPage />;
            case 'thoughtdump': return <ThoughtDumpPage />;
            case 'streaks': return <StreaksPage />;
            case 'readinglist': return <ReadingListPage />;
            case 'finance': return <FinancePage />;
            case 'bookmarks': return <BookmarksPage />;
            case 'writing': return <WritingPage />;
            case 'studynotes': return <StudyNotesPage />;
            case 'yearlyreview': return <YearlyReviewPage />;
            case 'twitch': return <TwitchPage />;
            case 'delegation': return <DelegationPage />;
            case 'notifications': return <NotificationsPage />;
            case 'information': return <InformationPage />;
            case 'musicplayer': return <MusicPlayerPage />;
            case 'mail': return <MailPage />;

            case 'lifeos': return <LifeOSPage />;
            default: 
                return <Dashboard onNavigate={navigate} />;
        }
    };

    const renderContent = () => {
        if (authLoading) {
            return (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                    <div className="loader" style={{ border: '3px solid #1a1a1a', borderTop: '3px solid #f97316', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', position: 'relative', zIndex: 1 }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            );
        }

        const isGuest = sessionStorage.getItem('luna_guest_access') === 'true';

        if ((!user || unlockState) && !isGuest) {
            return (
                <div className="vault-theme">
                    {/* The AI Orb */}
                    {!isBooting && (
                        <div className="ai-orb-wrapper">
                            <div 
                                className={`ai-orb ${terminalMinimized ? 'pulsating' : 'quiet'}`}
                                onClick={() => { 
                                    setTerminalMinimized(!terminalMinimized); 
                                    if (terminalMinimized) setTerminalActivity(Date.now());
                                }}
                            ></div>
                        </div>
                    )}

                    {/* The Terminal Window */}
                        <div 
                            className={`terminal-window ${terminalMinimized ? 'closed' : 'open'}`}
                            onClick={(e) => {
                                setTerminalActivity(Date.now());
                                const input = e.currentTarget.querySelector('.term-input');
                                if (input) input.focus();
                            }}
                            onKeyDown={() => setTerminalActivity(Date.now())}
                        >
                        <div className="terminal-content-wrapper">
                            <div className="terminal-header">
                                <div className="terminal-buttons">
                                    <span 
                                        className="term-btn close-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTerminalMinimized(true);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    ></span>
                                    <span className="term-btn min-btn"></span>
                                    <span className="term-btn max-btn"></span>
                                </div>
                                <div className="terminal-title">LunaCore Security Daemon — active</div>
                            </div>
                        <div className="terminal-body" style={{ display: 'flex', flexDirection: 'column', padding: '40px', overflowY: 'auto' }}>
                            {isBooting ? (
                                <BootSequence onComplete={() => {
                                    setIsBooting(false);
                                    sessionStorage.setItem('luna_booted', 'true');
                                    setTerminalMinimized(true);
                                }} />
                            ) : unlockState ? (
                                <UnlockSequence 
                                    isError={unlockState.isError} 
                                    onComplete={unlockState.onComplete} 
                                />
                            ) : !activeGame && (
                                <>
                                <p className="term-text">Last login: {new Date().toLocaleString()} on ttys000</p>
                                <p className="term-text">LunaCore OS (Encrypted Core Volume)</p>
                                <br />
                        <form onSubmit={async (e) => {
                        e.preventDefault();
                        const pwd = e.target.password.value;
                        const form = e.target;
                        
                        try {
                            setAuthError('');

                            if (pwd.trim() === '') {
                                setActiveGame('menu');
                                form.reset();
                                return;
                            }

                            // ── GUEST CODE FLOW ──
                            if (pwd.startsWith('guest')) {
                                const { data: isValid, error } = await supabase
                                    .rpc('verify_guest_code', { input_code: pwd });
                                
                                if (error || !isValid) {
                                    setAuthError('access denied: invalid guest code');
                                    form.reset();
                                    return;
                                }

                                sessionStorage.setItem('luna_guest_access', 'true');
                                sessionStorage.setItem('luna_guest_login_time', Date.now().toString());
                                window.location.reload(); 
                                return;
                            }

                            // ── Set flag BEFORE auth call to prevent race condition ──
                            // onAuthStateChange fires instantly on SIGNED_IN,
                            // so the flag must already be present when it checks.
                            sessionStorage.setItem('luna_vault_unlocked', 'true');

                            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com';
                            const { error } = await supabase.auth.signInWithPassword({
                                email: adminEmail,
                                password: pwd
                            });

                            if (error) {
                                // Auth failed — remove the flag we pre-set
                                sessionStorage.removeItem('luna_vault_unlocked');
                                setUnlockState({ isError: true, onComplete: () => {
                                    setAuthError('access denied: invalid master key');
                                    form.reset();
                                    setUnlockState(null);
                                }});
                            } else {
                                // On success: onAuthStateChange fires, sees flag = true
                                // But we keep rendering the terminal until unlockState is null!
                                setUnlockState({ isError: false, onComplete: () => {
                                    setUnlockState(null); // This nullifies unlockState, allowing AppShell to render
                                }});
                            }
                        } catch (err) {
                            console.error('Vault login failed:', err);
                            setUnlockState({ isError: true, onComplete: () => {
                                setAuthError('decryption failed: internal error');
                                form.reset();
                                setUnlockState(null);
                            }});
                        }
                    }} className="terminal-form">
                        <div className="terminal-input-line">
                            <span className="term-prompt">ismail@lunacore:~$</span>
                            <span className="term-command">./unlock</span>
                        </div>
                        <div className="terminal-input-line">
                            <span className="term-prompt">Access Key:</span>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                autoFocus 
                                className="term-input"
                                autoComplete="off"
                            />
                        </div>
                        {authError && <div className="term-error">{authError}</div>}
                        <button type="submit" style={{ display: 'none' }}>Submit</button>
                    </form>
                    </>
                    )}

                    {activeGame === 'menu' && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setAuthError('');
                            const opt = e.target.option.value.trim();
                            if (arcadeCategory === 'main') {
                                if (opt === '1') setArcadeCategory('games');
                                else if (opt === '2') setArcadeCategory('tools');
                                else if (opt === '3') setArcadeCategory('hacker');
                                else if (opt === '4') setActiveGame('lofi');
                                else if (opt === '5') setActiveGame('neofetch');
                                else if (opt === '0') setActiveGame(null);
                                else setAuthError('command not found: ' + opt);
                            } else if (arcadeCategory === 'tools') {
                                if (opt === '1') setActiveGame('calculator');
                                else if (opt === '2') setActiveGame('calendar');
                                else if (opt === '0') setArcadeCategory('main');
                                else setAuthError('command not found: ' + opt);
                            } else if (arcadeCategory === 'games') {
                                if (opt === '1') setActiveGame('dino');
                                else if (opt === '2') setActiveGame('snake');
                                else if (opt === '3') setActiveGame('2048');
                                else if (opt === '4') setActiveGame('pacman');
                                else if (opt === '5') setActiveGame('asteroids');
                                else if (opt === '6') setActiveGame('doom');
                                else if (opt === '7') setActiveGame('racing');
                                else if (opt === '8') setActiveGame('geometry');
                                else if (opt === '0') setArcadeCategory('main');
                                else setAuthError('command not found: ' + opt);
                            } else if (arcadeCategory === 'hacker') {
                                if (opt === '1') setActiveGame('matrix');
                                else if (opt === '2') setActiveGame('hollywood');
                                else if (opt === '3') setActiveGame('destruct');
                                else if (opt === '0') setArcadeCategory('main');
                                else setAuthError('command not found: ' + opt);
                            }
                            e.target.reset();
                        }} className="terminal-form">
                            <div className="terminal-input-line">
                                <span className="term-prompt">ismail@lunacore:~$</span>
                                <span className="term-command">./unlock</span>
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Access Key:</span>
                                <span className="term-text" style={{ opacity: 0.5 }}>***</span>
                            </div>
                            <div style={{ margin: '20px 0' }}>
                                <p className="term-text" style={{ color: '#00f2fe', marginBottom: '10px' }}>Arcade Mode Accessed.</p>
                                {renderMenuOptions()}
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Select Option:</span>
                                <input type="text" name="option" autoFocus className="term-input" autoComplete="off" />
                            </div>
                            {authError && <div className="term-error">{authError}</div>}
                            <button type="submit" style={{ display: 'none' }}>Submit</button>
                        </form>
                    )}

                    {activeGame === 'dino' && (
                        <div className="terminal-form">
                            <div className="terminal-input-line">
                                <span className="term-prompt">ismail@lunacore:~$</span>
                                <span className="term-command">./unlock</span>
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Access Key:</span>
                                <span className="term-text" style={{ opacity: 0.5 }}>***</span>
                            </div>
                            <div style={{ margin: '20px 0' }}>
                                <p className="term-text" style={{ color: '#00f2fe', marginBottom: '10px' }}>Arcade Mode Accessed.</p>
                                {renderMenuOptions()}
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Select Option:</span>
                                <span className="term-text">1</span>
                            </div>
                            
                            <div className="terminal-input-line" style={{ marginTop: '20px' }}>
                                <span className="term-prompt">ismail@lunacore:~/arcade$</span>
                                <span className="term-command">./dino.sh</span>
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-text" style={{ color: '#f97316' }}>Loading environment... Done.</span>
                            </div>
                            
                            <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', width: '600px', height: '200px', margin: '20px 0', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <iframe src="https://chromedino.com/embed/" frameBorder="0" scrolling="no" width="100%" height="100%" loading="lazy" style={{ borderRadius: '8px' }}></iframe>
                            </div>
                            
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                setAuthError('');
                                const cmd = e.target.command.value.trim().toLowerCase();
                                if (cmd === 'exit' || cmd === 'quit' || cmd === '0') setActiveGame('menu');
                                else setAuthError('command not found: ' + cmd);
                                e.target.reset();
                            }}>
                                <div className="terminal-input-line">
                                    <span className="term-prompt">Type 'exit' to return:</span>
                                    <input type="text" name="command" autoFocus className="term-input" autoComplete="off" />
                                </div>
                                {authError && <div className="term-error">{authError}</div>}
                                <button type="submit" style={{ display: 'none' }}>Submit</button>
                            </form>
                        </div>
                    )}

                    {['matrix', 'neofetch', 'hollywood', 'destruct', 'lofi', 'calculator', 'calendar', 'snake', '2048', 'pacman', 'asteroids', 'doom', 'racing', 'geometry'].includes(activeGame) && (
                        <div className="terminal-form">
                            <div className="terminal-input-line">
                                <span className="term-prompt">ismail@lunacore:~$</span>
                                <span className="term-command">./unlock</span>
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Access Key:</span>
                                <span className="term-text" style={{ opacity: 0.5 }}>***</span>
                            </div>
                            <div style={{ margin: '20px 0' }}>
                                <p className="term-text" style={{ color: '#00f2fe', marginBottom: '10px' }}>Arcade Mode Accessed.</p>
                                {renderMenuOptions()}
                            </div>
                            <div className="terminal-input-line">
                                <span className="term-prompt">Select Option:</span>
                                <span className="term-text">
                                    {activeGame === 'matrix' ? '1' : activeGame === 'neofetch' ? '5' : activeGame === 'hollywood' ? '2' : activeGame === 'destruct' ? '3' : activeGame === 'lofi' ? '4' : activeGame === 'calculator' ? '1' : activeGame === 'calendar' ? '2' : activeGame === 'snake' ? '2' : activeGame === '2048' ? '3' : activeGame === 'pacman' ? '4' : activeGame === 'asteroids' ? '5' : activeGame === 'doom' ? '6' : activeGame === 'racing' ? '7' : '8'}
                                </span>
                            </div>
                            
                            <div className="terminal-input-line" style={{ marginTop: '20px' }}>
                                <span className="term-prompt">ismail@lunacore:~/arcade$</span>
                                <span className="term-command">
                                    {activeGame === 'matrix' ? './matrix.sh' : activeGame === 'neofetch' ? 'neofetch' : activeGame === 'hollywood' ? './hack_mainframe.sh' : activeGame === 'destruct' ? './self_destruct.sh --force' : activeGame === 'lofi' ? './lofi_radio.sh --stream' : activeGame === 'calculator' ? './calc' : activeGame === 'calendar' ? 'cal' : activeGame === 'snake' ? './snake.sh' : activeGame === '2048' ? './2048.sh' : activeGame === 'pacman' ? 'curl https://freepacman.org/ -o window' : activeGame === 'asteroids' ? 'curl https://freeasteroids.org/ -o window' : activeGame === 'doom' ? 'curl https://js-dos.com/games/doom/ -o window' : activeGame === 'racing' ? 'curl https://racer.js.org/ -o window' : 'curl https://geometrydash.io/ -o window'}
                                </span>
                            </div>
                            
                            {activeGame === 'matrix' && <MatrixRain />}
                            {activeGame === 'neofetch' && <Neofetch />}
                            {activeGame === 'hollywood' && <Hollywood />}
                            {activeGame === 'destruct' && <SelfDestruct onComplete={() => setActiveGame('menu')} />}
                            {activeGame === 'lofi' && <LofiRadio channel={radioChannel} />}
                            {activeGame === 'calculator' && <TerminalCalculator />}
                            {activeGame === 'calendar' && <TerminalCalendar />}
                            {activeGame === 'snake' && <Snake />}
                            {activeGame === '2048' && <Game2048 />}
                            {activeGame === 'pacman' && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '10px 15px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>PAC-MAN NETWORK UPLINK</span>
                                        <button onClick={() => setActiveGame('menu')} style={{ background: 'rgba(255, 95, 86, 0.2)', color: '#ff5f56', border: '1px solid #ff5f56', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                                            [X] TERMINATE
                                        </button>
                                    </div>
                                    <iframe src="https://nicerwritter27.github.io/web-pacman/" frameBorder="0" scrolling="no" style={{ flex: 1, width: '100%', border: 'none' }}></iframe>
                                </div>
                            )}
                            {activeGame === 'asteroids' && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '10px 15px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>ASTEROIDS NETWORK UPLINK</span>
                                        <button onClick={() => setActiveGame('menu')} style={{ background: 'rgba(255, 95, 86, 0.2)', color: '#ff5f56', border: '1px solid #ff5f56', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                                            [X] TERMINATE
                                        </button>
                                    </div>
                                    <iframe src="https://freeasteroids.org/" frameBorder="0" scrolling="no" style={{ flex: 1, width: '100%', border: 'none' }}></iframe>
                                </div>
                            )}
                            {activeGame === 'doom' && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '10px 15px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>DOOM (1993) UPLINK (Click to focus)</span>
                                        <button onClick={() => setActiveGame('menu')} style={{ background: 'rgba(255, 95, 86, 0.2)', color: '#ff5f56', border: '1px solid #ff5f56', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                                            [X] TERMINATE
                                        </button>
                                    </div>
                                    <iframe src="https://dos.zone/player/?bundleUrl=https://cdn.dos.zone/custom/dos/doom.jsdos?anonymous=1" frameBorder="0" scrolling="no" style={{ flex: 1, width: '100%', border: 'none' }}></iframe>
                                </div>
                            )}
                            {activeGame === 'racing' && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '10px 15px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>OUTRUN RACING UPLINK</span>
                                        <button onClick={() => setActiveGame('menu')} style={{ background: 'rgba(255, 95, 86, 0.2)', color: '#ff5f56', border: '1px solid #ff5f56', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                                            [X] TERMINATE
                                        </button>
                                    </div>
                                    <iframe src="https://hexgl.bkcore.com/play/" frameBorder="0" scrolling="no" style={{ flex: 1, width: '100%', border: 'none' }}></iframe>
                                </div>
                            )}
                            {activeGame === 'geometry' && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '10px 15px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>GEOMETRY DASH UPLINK (Click to focus)</span>
                                        <button onClick={() => setActiveGame('menu')} style={{ background: 'rgba(255, 95, 86, 0.2)', color: '#ff5f56', border: '1px solid #ff5f56', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                                            [X] TERMINATE
                                        </button>
                                    </div>
                                    <iframe src="https://turbowarp.org/105500895/embed" allowTransparency="true" frameBorder="0" scrolling="no" allowFullScreen style={{ flex: 1, width: '100%', border: 'none' }}></iframe>
                                </div>
                            )}
                            
                            {activeGame !== 'destruct' && (
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setAuthError('');
                                    let cmd = e.target.command.value.trim().toLowerCase();
                                    if (cmd === 'exit' || cmd === 'quit' || cmd === '7') {
                                        setActiveGame('menu');
                                    } else if (activeGame === 'lofi') {
                                        // Allow "channel 1" or just "1"
                                        if (cmd.startsWith('channel ')) {
                                            cmd = cmd.split(' ')[1];
                                        }
                                        const ch = parseInt(cmd);
                                        if (ch >= 1 && ch <= 5) setRadioChannel(ch);
                                        else setAuthError('invalid channel (1-5)');
                                    } else {
                                        setAuthError('command not found: ' + cmd);
                                    }
                                    e.target.reset();
                                }}>
                                    {activeGame === 'lofi' && (
                                        <div style={{ marginBottom: '15px', opacity: 0.8 }}>
                                            <p className="term-text" style={{ color: '#00f2fe' }}>AVAILABLE FREQUENCIES:</p>
                                            <p className="term-text">[1] LOFI_CORE (Study Beats)</p>
                                            <p className="term-text">[2] SYNTH_MAINFRAME (Cyberpunk)</p>
                                            <p className="term-text">[3] 8BIT_SECTOR (Chiptune)</p>
                                            <p className="term-text">[4] AMBIENT_PILL (Deep Sleep)</p>
                                            <p className="term-text">[5] SPACE_DRONE (Deep Space)</p>
                                        </div>
                                    )}
                                    <div className="terminal-input-line">
                                        <span className="term-prompt">
                                            {activeGame === 'lofi' ? "Select Channel (1-5) or 'exit':" : "Type 'exit' to return:"}
                                        </span>
                                        <input type="text" name="command" autoFocus className="term-input" autoComplete="off" />
                                    </div>
                                    {authError && <div className="term-error">{authError}</div>}
                                    <button type="submit" style={{ display: 'none' }}>Submit</button>
                                </form>
                            )}
                        </div>
                    )}
                    </div>
                        </div>
                    </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    .vault-theme {
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        color: #fff;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }
                    .terminal-window {
                        width: 100%;
                        max-width: 900px;
                        min-height: 550px;
                        max-height: 85vh;
                        height: auto;
                        background: rgba(15, 15, 20, 0.7);
                        backdrop-filter: blur(24px) saturate(180%);
                        -webkit-backdrop-filter: blur(24px) saturate(180%);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 12px;
                        box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
                        overflow: hidden;
                        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                        z-index: 10;
                        transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                        position: relative;
                        top: 0;
                        right: 0;
                        opacity: 1;
                        transform: scale(1);
                        filter: blur(0px);
                    }
                    .terminal-window.closed {
                        opacity: 0;
                        transform: scale(1.02);
                        filter: blur(24px);
                        pointer-events: none;
                    }
                    .ai-orb-wrapper {
                        animation: delayedOrbFade 2.5s ease-in;
                        position: fixed;
                        top: 96px;
                        left: 96px;
                        z-index: 9999;
                    }
                    @keyframes delayedOrbFade {
                        0% { opacity: 0; pointer-events: none; }
                        80% { opacity: 0; pointer-events: none; }
                        100% { opacity: 1; pointer-events: auto; }
                    }
                    .ai-orb {
                        position: relative;
                        width: 130px;
                        height: 130px;
                        max-width: 130px;
                        border-radius: 50%;
                        background: #0288d1;
                        border: none;
                        outline: none;
                        cursor: pointer;
                        padding: 0;
                        overflow: hidden;
                        z-index: 9999;
                        transition: all 0.3s ease;
                        box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe;
                    }
                    .ai-orb.pulsating {
                        animation: voicePulse 4.5s linear infinite;
                    }
                    .ai-orb::before {
                        content: '';
                        position: absolute;
                        top: -50px; left: -50px; width: 230px; height: 230px;
                        background: conic-gradient(from 0deg, #ff0055, #00f2fe, #7f00ff, #e100ff, #ffaa00, #ff0055);
                        animation: orbSpin 4s linear infinite;
                        filter: blur(15px);
                        z-index: 1;
                        opacity: 1;
                    }
                    .ai-orb::after {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; width: 130px; height: 130px;
                        border-radius: 50%;
                        box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.4);
                        z-index: 2;
                        pointer-events: none;
                    }
                    @keyframes orbSpin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes voicePulse {
                        0% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(127, 0, 255, 0.6); }
                        8% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        10% { transform: scale(1.35); box-shadow: 0 0 25px rgba(255, 255, 255, 1), 0 0 50px #00f2fe, 0 0 35vw rgba(255, 255, 255, 1), 0 0 15vw #00f2fe, 0 0 10vw #7f00ff, inset 0 0 100px #fff; }
                        12% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        20% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(225, 0, 255, 0.6); }

                        28% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        30% { transform: scale(1.4); box-shadow: 0 0 30px rgba(255, 255, 255, 1), 0 0 60px #00f2fe, 0 0 80vw rgba(255, 255, 255, 1), 0 0 40vw #00f2fe, 0 0 15vw #7f00ff, inset 0 0 100px #fff; }
                        32% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        40% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(127, 0, 255, 0.6); }

                        48% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        50% { transform: scale(1.3); box-shadow: 0 0 20px rgba(255, 255, 255, 1), 0 0 40px #00f2fe, 0 0 40vw rgba(255, 255, 255, 1), 0 0 20vw #00f2fe, 0 0 10vw #7f00ff, inset 0 0 80px #fff; }
                        52% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        60% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(225, 0, 255, 0.6); }

                        68% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        70% { transform: scale(1.38); box-shadow: 0 0 25px rgba(255, 255, 255, 1), 0 0 50px #00f2fe, 0 0 65vw rgba(255, 255, 255, 1), 0 0 35vw #00f2fe, 0 0 15vw #7f00ff, inset 0 0 100px #fff; }
                        72% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        80% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(127, 0, 255, 0.6); }

                        88% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        90% { transform: scale(1.35); box-shadow: 0 0 20px rgba(255, 255, 255, 1), 0 0 40px #00f2fe, 0 0 55vw rgba(255, 255, 255, 1), 0 0 25vw #00f2fe, 0 0 10vw #7f00ff, inset 0 0 100px #fff; }
                        92% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 15vw rgba(0, 242, 254, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.6); }
                        100% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 30px #00f2fe, 0 0 5vw rgba(225, 0, 255, 0.6); }
                    }
                    .ai-orb:hover {
                        transform: scale(1.05);
                    }
                    .terminal-content-wrapper {
                        transition: opacity 0.3s ease;
                        opacity: 1;
                        position: relative;
                        z-index: 10;
                        max-height: inherit;
                        display: flex;
                        flex-direction: column;
                    }
                    .terminal-header {
                        display: flex;
                        align-items: center;
                        padding: 12px 16px;
                        background: rgba(40, 40, 45, 0.5);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        position: relative;
                    }
                    .terminal-buttons {
                        display: flex;
                        gap: 8px;
                        position: absolute;
                        left: 16px;
                    }
                    .term-btn {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }
                    .close-btn { background: #ff5f56; border: 1px solid #e0443e; }
                    .min-btn { background: #ffbd2e; border: 1px solid #dea123; }
                    .max-btn { background: #27c93f; border: 1px solid #1aab29; }
                    
                    .terminal-title {
                        flex: 1;
                        text-align: center;
                        color: rgba(255, 255, 255, 0.6);
                        font-size: 0.85rem;
                        font-weight: 500;
                        letter-spacing: 0.5px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }
                    .terminal-body {
                        padding: 24px;
                        flex: 1;
                        overflow-y: auto;
                    }
                    .term-text {
                        color: #e0e0e0;
                        margin: 0 0 8px 0;
                        font-size: 0.95rem;
                        line-height: 1.4;
                    }
                    .terminal-input-line {
                        display: flex;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    .term-prompt {
                        color: #4ade80;
                        margin-right: 12px;
                        font-size: 0.95rem;
                        font-weight: 600;
                    }
                    .term-command {
                        color: #e0e0e0;
                        font-size: 0.95rem;
                    }
                    .term-input {
                        flex: 1;
                        background: transparent;
                        border: none;
                        outline: none;
                        color: #e0e0e0;
                        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                        font-size: 0.95rem;
                        letter-spacing: 0.2rem;
                    }
                    .term-error {
                        color: #ff5f56;
                        margin-top: 12px;
                        font-size: 0.95rem;
                    }
                ` }} />
                </div>
            );
        }

        if (isGuest) {
            return (
                <div style={{ padding: '1rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Guest Access</h2>
                            {guestTimeLeft && (
                                <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>
                                    ⏳ {guestTimeLeft} remaining
                                </span>
                            )}
                        </div>
                        <button 
                            className="btn btn-primary" 
                            style={{ background: '#ef4444', border: 'none' }}
                            onClick={() => {
                                sessionStorage.removeItem('luna_guest_access');
                                sessionStorage.removeItem('luna_guest_login_time');
                                window.location.reload();
                            }}
                        >
                            End Session
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface, #1a1a2e)', borderRadius: '1rem', padding: '2rem' }}>
                        <MediaLibraryPage guestMode={true} />
                    </div>
                </div>
            );
        }

        return (
            <>
                <AppShell 
                    activeTab={tab} 
                    onNavigate={navigate} 
                    userName={userName} 
                    isOffline={isOffline} 
                    preload={preload}
                    onPreload={triggerPreload}
                >
                    {renderTab()}
                </AppShell>
                <OfflineCacheBadge />
            </>
        );
    };

    const isGuest = typeof window !== 'undefined' && sessionStorage.getItem('luna_guest_access') === 'true';
    const showDither = !user && !isGuest;

    return (
        <>
            {showDither && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, pointerEvents: 'none' }}>
                    <Dither 
                        waveColor={lockScreenColor}
                        disableAnimation={false}
                        enableMouseInteraction={true}
                        mouseRadius={0.3}
                        colorNum={4.3}
                        waveAmplitude={0.3}
                        waveFrequency={3}
                        waveSpeed={0.05}
                    />
                </div>
            )}
            {renderContent()}
        </>
    );
}
