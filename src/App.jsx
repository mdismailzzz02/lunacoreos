import { useState, useEffect } from 'react';
import AppShell from './components/Layout/AppShell';
import Dashboard from './components/Dashboard/Dashboard';
import JournalPage from './components/Journal/JournalPage';
import TodosPage from './components/Todos/TodosPage';
import InsightsPage from './components/Insights/InsightsPage';
import HabitsPage from './components/Habits/HabitsPage';
import MediaLibraryPage from './components/MediaLibrary/MediaLibraryPage';
import Videos from './components/Videos/Videos';
import VaultPage from './components/Vault/VaultPage';
import LifeMapPage from './components/LifeMap/LifeMapPage';
import TimeCapsulePage from './components/TimeCapsule/TimeCapsulePage';
import WhoAmIPage from './components/WhoAmI/WhoAmIPage';
import ThoughtDumpPage from './components/ThoughtDump/ThoughtDumpPage';
import StreaksPage from './components/Streaks/StreaksPage';
import ReadingListPage from './components/ReadingList/ReadingListPage';
import WatchlistPage from './components/Watchlist/WatchlistPage';
import FinancePage from './components/Finance/FinancePage';
import BookmarksPage from './components/Bookmarks/BookmarksPage';
import WritingPage from './components/Writing/WritingPage';
import YearlyReviewPage from './components/YearlyReview/YearlyReviewPage';
import StudyNotesPage from './components/StudyNotes/StudyNotesPage';
import TwitchPage from './components/Twitch/TwitchPage';
import DelegationPage from './components/Delegation/DelegationPage';
import NotificationsPage from './components/Notifications/NotificationsPage';
import InformationPage from './components/Information/InformationPage';
import MusicPlayerPage from './components/MusicPlayer/MusicPlayerPage';
import SettingsPage from './components/Settings/SettingsPage';
import * as api from './services/api';
import { Preloader } from './services/preloader';
import { OfflineCache } from './services/offlineCache';
import OfflineCacheBadge from './components/OfflineCacheBadge';
import { supabase } from './services/supabaseClient';
import { loginWithSupabase } from './services/googleAuth';
import Dither from './components/Shared/Dither';
import { Eye, Lock } from 'lucide-react';

export default function App() {
    const [tab, setTab] = useState(() => localStorage.getItem('luna_active_tab') || 'journal');
    const [userName, setUserName] = useState('');
    const [theme, setTheme] = useState('dark');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [preload, setPreload] = useState({ active: false, current: 0, total: 0, status: '' });
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState('');
    
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

        const handleBeforeUnload = () => {
            // Mark that this unload is a navigation/refresh (not a close)
            sessionStorage.setItem('luna_navigating', 'true');
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log(`[Auth Event] ${_event}`, session ? 'User present' : 'No user');
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
        console.log('[App] Navigating to:', tabId);
        setTab(tabId);
        localStorage.setItem('luna_active_tab', tabId);
    };

    const renderTab = () => {
        console.log('[App] Rendering tab:', tab);
        switch (tab) {
            case 'system-settings': return <SettingsPage />;
            case 'dashboard': return <Dashboard onNavigate={navigate} />;
            case 'journal': return <JournalPage />;
            case 'todos': return <TodosPage />;
            case 'insights': return <InsightsPage />;
            case 'habits': return <HabitsPage />;
            case 'videos': return <Videos />;
            case 'media': return <MediaLibraryPage />;
            case 'vault': return <VaultPage />;
            case 'lifemap': return <LifeMapPage />;
            case 'timecapsule': return <TimeCapsulePage />;
            case 'whoami': return <WhoAmIPage />;
            case 'thoughtdump': return <ThoughtDumpPage />;
            case 'streaks': return <StreaksPage />;
            case 'readinglist': return <ReadingListPage />;
            case 'watchlist': return <WatchlistPage />;
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
            default: 
                console.warn('[App] Unknown tab, falling back to dashboard:', tab);
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

        if (!user) {
            return (
                <div className="vault-theme">
                    <div className="vault-container">
                    <div className="vault-icon">
                        <div className="pulse-ring"></div>
                        <div style={{ fontSize: '6rem', position: 'relative', zIndex: 2 }}>🌘</div>
                    </div>
                    <h1>LunaCore OS</h1>
                    <p>Enter your Master Key to unlock your private space.</p>
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const pwd = e.target.password.value;
                        const loginBtn = e.target.querySelector('.vault-button');
                        
                        try {
                            loginBtn.disabled = true;
                            loginBtn.innerText = 'Decrypting...';
                            setAuthError('');

                            // ── Set flag BEFORE auth call to prevent race condition ──
                            // onAuthStateChange fires instantly on SIGNED_IN,
                            // so the flag must already be present when it checks.
                            sessionStorage.setItem('luna_vault_unlocked', 'true');

                            const { error } = await supabase.auth.signInWithPassword({
                                email: 'mdismailzzz02@gmail.com',
                                password: pwd
                            });

                            if (error) {
                                // Auth failed — remove the flag we pre-set
                                sessionStorage.removeItem('luna_vault_unlocked');
                                setAuthError('Invalid Master Key. Access Denied.');
                                loginBtn.disabled = false;
                                loginBtn.innerText = 'DECRYPT';
                            }
                            // On success: onAuthStateChange fires, sees flag = true, unlocks ✅
                        } catch (err) {
                            console.error('Vault login failed:', err);
                            setAuthError('Decryption process failed. Please try again.');
                            loginBtn.disabled = false;
                            loginBtn.innerText = 'DECRYPT';
                        }
                    }} className="vault-form">
                        <div className="input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                placeholder="" 
                                autoFocus 
                                required 
                                style={{ letterSpacing: showPassword ? '0.1rem' : '0.5rem' }}
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ color: `rgb(${Math.round(lockScreenColor[0]*255)}, ${Math.round(lockScreenColor[1]*255)}, ${Math.round(lockScreenColor[2]*255)})` }}
                            >
                                {showPassword ? <Lock size={20} /> : <Eye size={20} />}
                            </button>
                            <div className="input-glow"></div>
                        </div>
                        {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.2rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{authError}</div>}
                        <button type="submit" className="vault-button">
                            DECRYPT
                        </button>
                    </form>
                    
                    <div className="vault-footer">
                        <span>Encrypted & Private</span>
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
                        font-family: 'Inter', sans-serif;
                    }
                    .vault-container {
                        text-align: center;
                        padding: 2rem;
                        background: transparent;
                        width: 100%;
                        max-width: 450px;
                        z-index: 10;
                    }
                    .vault-icon {
                        position: relative;
                        width: 140px;
                        height: 140px;
                        margin: 0 auto 3rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .pulse-ring {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        border-radius: 50%;
                        background: #f97316;
                        opacity: 0.2;
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 0.2; }
                        100% { transform: scale(1.5); opacity: 0; }
                    }
                    .vault-container h1 {
                        font-size: 2.5rem;
                        margin-bottom: 0.5rem;
                        color: #ffffff;
                        font-weight: 700;
                        letter-spacing: -0.02em;
                    }
                    .vault-container p {
                        color: #ffffff;
                        font-size: 0.9rem;
                        margin-bottom: 2.5rem;
                        font-weight: 500;
                        letter-spacing: 0.05rem;
                        opacity: 0.8;
                    }
                    .input-wrapper {
                        position: relative;
                        margin-bottom: 1.5rem;
                    }
                    .vault-form input {
                        width: 100%;
                        padding: 1.2rem;
                        padding-right: 3.5rem;
                        background: rgba(255, 255, 255, 0.03);
                        backdrop-filter: blur(5px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 1rem;
                        color: #fff;
                        font-size: 1.2rem;
                        text-align: center;
                        transition: all 0.3s;
                        outline: none;
                    }
                    .vault-form input::placeholder {
                        letter-spacing: 0.1rem !important;
                    }
                    .vault-form input:focus {
                        border-color: #f97316;
                        background: rgba(255, 255, 255, 0.07);
                    }
                    .toggle-password {
                        position: absolute;
                        right: 1rem;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        font-size: 1.2rem;
                        cursor: pointer;
                        opacity: 0.5;
                        transition: opacity 0.3s;
                        z-index: 3;
                    }
                    .toggle-password:hover {
                        opacity: 1;
                    }
                    .vault-button {
                        width: 100%;
                        padding: 1.2rem;
                        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                        border: none;
                        border-radius: 1rem;
                        color: #fff;
                        font-weight: 600;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
                    }
                    .vault-button:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 20px 25px -5px rgba(249, 115, 22, 0.4);
                    }
                    .vault-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .vault-footer {
                        margin-top: 2.5rem;
                        font-size: 0.75rem;
                        color: #39ff14;
                        text-transform: uppercase;
                        letter-spacing: 0.2rem;
                        font-weight: 600;
                        text-shadow: 0 0 10px rgba(57, 255, 20, 0.4);
                    }
                ` }} />
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

    return (
        <>
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
            {renderContent()}
        </>
    );
}
