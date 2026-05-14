import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Save, User, Palette, Film, Brain, Globe } from 'lucide-react';

export default function SettingsPage() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        user_name: 'Md Ismail',
        theme: 'dark',
        tmdb_api_key: '',
        gemini_api_key: '',
        primary_accent: '#a29bfe'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.getDashboardStats();
            if (res?.config) {
                setConfig({
                    user_name: res.config.user_name || 'Md Ismail',
                    theme: res.config.theme || 'dark',
                    tmdb_api_key: res.config.tmdb_api_key || '',
                    gemini_api_key: res.config.gemini_api_key || '',
                    primary_accent: res.config.primary_accent || '#a29bfe'
                });
            }
        } catch (e) {
            addToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
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
            addToast('Settings saved successfully! ✨', 'success');
            
            // Apply theme immediately
            document.documentElement.setAttribute('data-theme', config.theme);
        } catch (e) {
            addToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>⚙️ System Settings</h1>
                <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>Customize your LunaCore OS experience.</p>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Profile Section */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--accent)' }}>
                        <User size={20} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Profile</h3>
                    </div>
                    <div className="field-group">
                        <label className="field-label">Preferred Name</label>
                        <input 
                            className="field-input" 
                            value={config.user_name} 
                            onChange={e => setConfig({ ...config, user_name: e.target.value })} 
                            placeholder="How should I address you?"
                        />
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--accent)' }}>
                        <Palette size={20} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Appearance</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="field-group">
                            <label className="field-label">Theme</label>
                            <select 
                                className="field-input" 
                                value={config.theme} 
                                onChange={e => setConfig({ ...config, theme: e.target.value })}
                            >
                                <option value="dark">Dark (Classic)</option>
                                <option value="light">Light (Clean)</option>
                                <option value="cyber">Cyberpunk (Vibrant)</option>
                                <option value="glass">Glassmorphism (Frosted)</option>
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">Accent Color</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input 
                                    type="color" 
                                    className="field-input" 
                                    style={{ width: '40px', padding: '2px', height: '40px' }}
                                    value={config.primary_accent} 
                                    onChange={e => setConfig({ ...config, primary_accent: e.target.value })}
                                />
                                <input 
                                    className="field-input" 
                                    style={{ flex: 1 }}
                                    value={config.primary_accent} 
                                    onChange={e => setConfig({ ...config, primary_accent: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Integrations */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--accent)' }}>
                        <Globe size={20} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Integrations</h3>
                    </div>
                    
                    <div className="field-group" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Film size={16} />
                            <label className="field-label" style={{ margin: 0 }}>TMDB API Key (Movies)</label>
                        </div>
                        <input 
                            className="field-input" 
                            type="password"
                            value={config.tmdb_api_key} 
                            onChange={e => setConfig({ ...config, tmdb_api_key: e.target.value })} 
                            placeholder="Enter your TMDB API Key for posters & search"
                        />
                        <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '5px' }}>
                            Get one at themoviedb.org
                        </p>
                    </div>

                    <div className="field-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Brain size={16} />
                            <label className="field-label" style={{ margin: 0 }}>Gemini AI API Key</label>
                        </div>
                        <input 
                            className="field-input" 
                            type="password"
                            value={config.gemini_api_key} 
                            onChange={e => setConfig({ ...config, gemini_api_key: e.target.value })} 
                            placeholder="Enter Gemini API Key for automated insights"
                        />
                        <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '5px' }}>
                            Required for AI processing of Study Notes and Journal.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={saving}
                        style={{ padding: '1rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                        {saving ? 'Saving...' : <><Save size={18} /> Save All Changes</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
