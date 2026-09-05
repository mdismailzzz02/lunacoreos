import { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { Settings, User, Palette, Film, Brain, Globe, Mail, Key, Camera, Check } from 'lucide-react';
import { forceGoogleReauth } from '../../services/googleAuth';
import { useToast } from '../../context/ToastContext';
import AppleLoader from '../Layout/AppleLoader';
import { supabase } from '../../services/supabaseClient';

export default function SettingsPage() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [guestCodes, setGuestCodes] = useState([]);
    const [refreshingCodes, setRefreshingCodes] = useState(false);
    const fileInputRef = useRef(null);
    const [config, setConfig] = useState({
        user_name: '',
        theme: 'dark',
        gemini_api_key: '',
        tmdb_api_key: '',
        primary_accent: '#a29bfe',
        avatar_url: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.getDashboardStats();
            if (res?.config) {
                setConfig(prev => ({
                    ...prev,
                    theme: res.config.theme || 'dark',
                    tmdb_api_key: res.config.tmdb_api_key || '',
                    gemini_api_key: res.config.gemini_api_key || '',
                    primary_accent: res.config.primary_accent || '#a29bfe'
                }));
            }

            // Fetch avatar and name from Supabase Auth metadata
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata) {
                setConfig(prev => ({ 
                    ...prev, 
                    avatar_url: user.user_metadata.avatar_url || prev.avatar_url,
                    user_name: user.user_metadata.display_name || res?.config?.user_name || prev.user_name
                }));
            }
            
            const { data } = await supabase.from('guest_codes').select('*').eq('used', false).order('created_at', { ascending: false }).limit(5);
            if (data) setGuestCodes(data);
        } catch (e) {
            addToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshGuestCodes = async () => {
        setRefreshingCodes(true);
        try {
            await supabase.from('guest_codes').update({ used: true }).eq('used', false);
            const newCodes = Array(5).fill(0).map(() => ({
                code: 'guest' + Math.floor(100 + Math.random() * 900).toString(),
                used: false
            }));
            const { data, error } = await supabase.from('guest_codes').insert(newCodes).select();
            if (error) throw error;
            if (data) setGuestCodes(data);
            addToast('Generated 5 new guest codes', 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to refresh guest codes', 'error');
        } finally {
            setRefreshingCodes(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            setUploadingAvatar(true);
            addToast('Uploading avatar...', 'info');
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const r2Key = `profiles/${user.id}/${Date.now()}-avatar.png`;
            const { url: putUrl } = await api.getR2PresignedPut(r2Key, file.type || 'image/png');
            
            await fetch(putUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'image/png' },
                body: file
            });

            const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_URL || '';
            const avatarUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${r2Key}` : '';

            if (avatarUrl) {
                await supabase.auth.updateUser({
                    data: { avatar_url: avatarUrl }
                });
                
                setConfig(prev => ({ ...prev, avatar_url: avatarUrl }));

                try {
                    const cachedStr = localStorage.getItem('luna_last_user');
                    if (cachedStr) {
                        const cached = JSON.parse(cachedStr);
                        cached.avatar_url = avatarUrl;
                        localStorage.setItem('luna_last_user', JSON.stringify(cached));
                    }
                } catch (e) {}

                addToast('Avatar updated successfully!', 'success');
            }
        } catch (err) {
            console.error(err);
            addToast('Failed to upload avatar', 'error');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateConfig({
                config_id: 'MAIN_CONFIG',
                content: config
            });

            if (config.user_name) {
                await supabase.auth.updateUser({
                    data: { display_name: config.user_name }
                });
                try {
                    const cachedStr = localStorage.getItem('luna_last_user');
                    if (cachedStr) {
                        const cached = JSON.parse(cachedStr);
                        cached.display_name = config.user_name;
                        localStorage.setItem('luna_last_user', JSON.stringify(cached));
                    }
                } catch (e) {}
            }

            addToast('Settings saved successfully!', 'success');
            document.documentElement.setAttribute('data-theme', config.theme);
        } catch (e) {
            addToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <AppleLoader />;

    return (
        <div className="apple-settings-page fade-in">
            <style>{`
                .apple-settings-page {
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    max-width: 680px;
                    margin: 0 auto;
                    padding: 2rem 1rem 6rem;
                    color: var(--text);
                }
                .apple-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                    position: relative;
                }
                .apple-avatar-container {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 1rem;
                    cursor: pointer;
                    border-radius: 50%;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    border: 2px solid rgba(255,255,255,0.05);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
                    background: var(--surface);
                }
                .apple-avatar-container:hover {
                    transform: scale(1.05);
                    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
                }
                .apple-avatar-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .apple-avatar-fallback {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, var(--surface-light), var(--surface));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.3);
                }
                .apple-avatar-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .apple-avatar-container:hover .apple-avatar-overlay {
                    opacity: 1;
                }
                .apple-user-name {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .apple-user-subtitle {
                    font-size: 0.95rem;
                    color: rgba(255,255,255,0.5);
                    margin-top: 4px;
                }
                .apple-section-title {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.5);
                    margin: 0 0 0.5rem 1rem;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                .apple-list-group {
                    background: rgba(255,255,255,0.04);
                    border-radius: 12px;
                    overflow: hidden;
                    margin-bottom: 2rem;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 4px 24px rgba(0,0,0,0.1);
                }
                .apple-list-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    min-height: 48px;
                }
                .apple-list-row:last-child {
                    border-bottom: none;
                }
                .apple-row-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .apple-icon-wrapper {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .apple-row-label {
                    font-size: 1.05rem;
                    font-weight: 500;
                }
                .apple-row-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                    justify-content: flex-end;
                }
                .apple-input {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.7);
                    font-size: 1.05rem;
                    text-align: right;
                    outline: none;
                    width: 100%;
                    font-family: inherit;
                    padding: 0;
                }
                .apple-input:focus {
                    color: var(--text);
                }
                .apple-input::placeholder {
                    color: rgba(255,255,255,0.2);
                }
                .apple-select {
                    appearance: none;
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.7);
                    font-size: 1.05rem;
                    text-align: right;
                    outline: none;
                    cursor: pointer;
                    font-family: inherit;
                    padding: 0;
                    padding-right: 1.2rem;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
                    background-repeat: no-repeat;
                    background-position: right center;
                    background-size: 10px auto;
                }
                .apple-select:focus {
                    color: var(--text);
                }
                .apple-select option {
                    background: var(--bg);
                    color: var(--text);
                }
                .apple-color-picker {
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: none;
                    border-radius: 50%;
                    overflow: hidden;
                    cursor: pointer;
                    background: transparent;
                }
                .apple-color-picker::-webkit-color-swatch-wrapper {
                    padding: 0;
                }
                .apple-color-picker::-webkit-color-swatch {
                    border: 2px solid rgba(255,255,255,0.2);
                    border-radius: 50%;
                }
                .apple-button {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 6px 14px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .apple-button:hover {
                    background: rgba(255,255,255,0.15);
                    border-color: rgba(255,255,255,0.2);
                }
                .apple-button:active {
                    transform: scale(0.97);
                }
                .apple-guest-tag {
                    background: rgba(255,255,255,0.1);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.9rem;
                    letter-spacing: 1px;
                }
                .apple-footer-save {
                    position: fixed;
                    bottom: 30px;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    z-index: 50;
                    pointer-events: none;
                }
                .apple-save-btn {
                    pointer-events: auto;
                    background: rgba(0, 122, 255, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 30px;
                    padding: 12px 36px;
                    font-size: 1.05rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 8px 32px rgba(0, 122, 255, 0.4);
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .apple-save-btn:hover:not(:disabled) {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 12px 40px rgba(0, 122, 255, 0.6);
                    background: rgba(0, 122, 255, 0.95);
                }
                .apple-save-btn:active:not(:disabled) {
                    transform: translateY(2px) scale(0.98);
                }
                .apple-save-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
            `}</style>

            <form onSubmit={handleSave}>
                <div className="apple-header">
                    <input 
                        type="file" 
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                    />
                    <div className="apple-avatar-container" onClick={() => fileInputRef.current?.click()}>
                        {config.avatar_url ? (
                            <img src={config.avatar_url} alt="Profile" className="apple-avatar-img" />
                        ) : (
                            <div className="apple-avatar-fallback">
                                <User size={40} />
                            </div>
                        )}
                        <div className="apple-avatar-overlay">
                            {uploadingAvatar ? (
                                <div className="spinner" style={{ width: 24, height: 24, borderTopColor: 'white', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <>
                                    <Camera size={20} style={{ marginBottom: 4 }} />
                                    <span>Edit</span>
                                </>
                            )}
                        </div>
                    </div>
                    <h1 className="apple-user-name">{config.user_name || 'Set Preferred Name'}</h1>
                    <p className="apple-user-subtitle">Apple ID, Cloudflare, & Media</p>
                </div>

                <div className="apple-section-title">Personal</div>
                <div className="apple-list-group">
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#8e8e93' }}>
                                <User size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">Name</span>
                        </div>
                        <div className="apple-row-right">
                            <input 
                                className="apple-input" 
                                value={config.user_name} 
                                onChange={e => setConfig({ ...config, user_name: e.target.value })} 
                                placeholder="Preferred Name"
                            />
                        </div>
                    </div>
                </div>

                <div className="apple-section-title">Appearance</div>
                <div className="apple-list-group">
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#ff3b30' }}>
                                <Palette size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">Theme</span>
                        </div>
                        <div className="apple-row-right">
                            <select 
                                className="apple-select" 
                                value={config.theme} 
                                onChange={e => setConfig({ ...config, theme: e.target.value })}
                            >
                                <option value="dark">Dark (Classic)</option>
                                <option value="light">Light (Clean)</option>
                                <option value="cyber">Cyberpunk (Vibrant)</option>
                                <option value="glass">Glassmorphism (Frosted)</option>
                            </select>
                        </div>
                    </div>
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#ff9500' }}>
                                <Settings size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">Accent Color</span>
                        </div>
                        <div className="apple-row-right">
                            <input 
                                className="apple-input" 
                                value={config.primary_accent} 
                                onChange={e => setConfig({ ...config, primary_accent: e.target.value })}
                                style={{ width: '80px', marginRight: '8px' }}
                            />
                            <input 
                                type="color" 
                                className="apple-color-picker" 
                                value={config.primary_accent} 
                                onChange={e => setConfig({ ...config, primary_accent: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="apple-section-title">Integrations</div>
                <div className="apple-list-group">
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#5856d6' }}>
                                <Film size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">TMDB API Key</span>
                        </div>
                        <div className="apple-row-right">
                            <input 
                                className="apple-input" 
                                type="password"
                                value={config.tmdb_api_key} 
                                onChange={e => setConfig({ ...config, tmdb_api_key: e.target.value })} 
                                placeholder="Required for media"
                            />
                        </div>
                    </div>
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#af52de' }}>
                                <Brain size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">Gemini API Key</span>
                        </div>
                        <div className="apple-row-right">
                            <input 
                                className="apple-input" 
                                type="password"
                                value={config.gemini_api_key} 
                                onChange={e => setConfig({ ...config, gemini_api_key: e.target.value })} 
                                placeholder="Required for AI"
                            />
                        </div>
                    </div>
                    <div className="apple-list-row">
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#007aff' }}>
                                <Globe size={18} strokeWidth={2.5} />
                            </div>
                            <span className="apple-row-label">Google Account</span>
                        </div>
                        <div className="apple-row-right">
                            <button 
                                type="button" 
                                className="apple-button"
                                onClick={async () => {
                                    try {
                                        await forceGoogleReauth();
                                        addToast('Google Account Reconnected', 'success');
                                    } catch (e) {
                                        addToast('Google Reconnect failed', 'error');
                                    }
                                }}
                            >
                                Reconnect
                            </button>
                        </div>
                    </div>
                </div>

                <div className="apple-section-title">Guest System</div>
                <div className="apple-list-group">
                    <div className="apple-list-row" style={{ alignItems: 'flex-start' }}>
                        <div className="apple-row-left">
                            <div className="apple-icon-wrapper" style={{ background: '#34c759' }}>
                                <Key size={18} strokeWidth={2.5} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 2 }}>
                                <span className="apple-row-label">Active Guest Codes</span>
                                {guestCodes.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
                                        {guestCodes.map(gc => (
                                            <div key={gc.code} className="apple-guest-tag">
                                                {gc.code}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '12px', opacity: 0.5, fontSize: '0.9rem' }}>No active guest codes.</div>
                                )}
                            </div>
                        </div>
                        <div className="apple-row-right" style={{ alignSelf: 'flex-start', paddingTop: '2px' }}>
                            <button 
                                type="button" 
                                onClick={handleRefreshGuestCodes}
                                disabled={refreshingCodes}
                                className="apple-button" 
                            >
                                {refreshingCodes ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="apple-footer-save">
                    <button type="submit" className="apple-save-btn" disabled={saving}>
                        {saving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
