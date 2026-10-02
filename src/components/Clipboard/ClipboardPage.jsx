import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as api from '../../services/api';
import { Clipboard, Lock, Unlock, Trash2, Copy, AlertCircle, Globe, X } from 'lucide-react';
import AppleLoader from '../Layout/AppleLoader';
import SecondaryVaultLock from '../Vault/SecondaryVaultLock';

export default function ClipboardPage() {
    const [clips, setClips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSecretMode, setIsSecretMode] = useState(false);
    const [newClipContent, setNewClipContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showLock, setShowLock] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [selectedClip, setSelectedClip] = useState(null);

    useEffect(() => {
        loadClips();
    }, [isSecretMode]);

    const loadClips = async () => {
        setLoading(true);
        try {
            const data = await api.getClipboardClips(isSecretMode);
            setClips(data || []);
        } catch (err) {
            console.error('Failed to load clipboard', err);
            setError('Failed to load clipboard items');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newClipContent.trim()) return;

        setSaving(true);
        setError('');
        try {
            const newClip = await api.saveClipboardText(newClipContent, isSecretMode);
            setClips([newClip, ...clips]);
            setNewClipContent('');
            setShowAdd(false);
        } catch (err) {
            console.error('Save clip error:', err);
            setError('Failed to save clip');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (clipId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this clip?')) return;

        try {
            await api.deleteClipboardClip(clipId);
            setClips(clips.filter(c => c.id !== clipId));
        } catch (err) {
            console.error('Delete clip error:', err);
            alert('Failed to delete clip');
        }
    };

    const handleCopy = (content, e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(content);
        // Optional: show toast
    };

    const extractUrl = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches[0] : null;
    };

    const getFavicon = (url) => {
        try {
            const domain = new URL(url).hostname;
            return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        } catch (e) {
            return null;
        }
    };

    const filtered = clips.filter(c => 
        c.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && clips.length === 0) return <AppleLoader />;

    return (
        <div className="fade-in apple-page-loaded" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#1c1c1e', padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 -50px 0 0 #1c1c1e' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clipboard size={32} color={isSecretMode ? "#EC4899" : "var(--accent)"} strokeWidth={2} />
                        <h1 style={{ margin: 0, fontSize: '2rem', color: isSecretMode ? '#EC4899' : 'white' }}>
                            {isSecretMode ? 'Secret Clipboard' : 'Clipboard'}
                        </h1>
                    </div>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Your synced text snippets and copied links.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search clips..."
                            style={{ padding: '0.8rem 1.2rem', paddingRight: '2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minWidth: '250px' }}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    <button
                        onClick={() => {
                            if (isSecretMode) {
                                setIsSecretMode(false);
                                setIsUnlocked(false);
                            } else if (isUnlocked) {
                                setIsSecretMode(true);
                            } else {
                                setShowLock(true);
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.8rem 1.2rem',
                            borderRadius: '12px',
                            border: `1px solid ${isSecretMode ? 'rgba(236,72,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            background: isSecretMode ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.05)',
                            color: isSecretMode ? '#EC4899' : 'white',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isSecretMode ? <Unlock size={18} /> : <Lock size={18} />}
                        {isSecretMode ? 'Secret Mode' : 'Public Mode'}
                    </button>

                    <button
                        onClick={() => setShowAdd(true)}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: isSecretMode ? '#EC4899' : 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        + Add Clip
                    </button>
                </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                        {searchQuery ? 'No clips match your search.' : 'Clipboard is empty.'}
                    </div>
                )}
                {filtered.map(c => {
                    const url = extractUrl(c.content);
                    const favicon = url ? getFavicon(url) : null;
                    
                    return (
                        <div key={c.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }} onClick={() => setSelectedClip(c)} onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.borderColor = isSecretMode ? 'rgba(236, 72, 153, 0.5)' : 'var(--brand-color, #a29bfe)';
                        }} onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}>
                            {favicon && (
                                <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                                    <Globe size={16} color="rgba(255,255,255,0.2)" style={{ position: 'absolute' }} />
                                    <img src={favicon} alt="" style={{ width: '18px', height: '18px', position: 'relative', zIndex: 1 }} onError={e => e.target.style.display = 'none'} />
                                </div>
                            )}
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '0.95rem', 
                                    color: 'rgba(255,255,255,0.9)', 
                                    lineHeight: '1.4',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word'
                                }}>
                                    {c.content}
                                </p>
                                <div style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '4px' }}>
                                    {new Date(c.created_at).toLocaleString()}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleCopy(c.content, e); }} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                   onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                   title="Copy">
                                    <Copy size={16} />
                                </button>
                                
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, e); }} style={{
                                    background: 'rgba(255, 107, 107, 0.1)',
                                    border: 'none',
                                    color: '#ff6b6b',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)'}
                                   onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                   title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showAdd && ReactDOM.createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <div style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '550px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600' }}>Add to {isSecretMode ? <span style={{ color: '#EC4899' }}>Secret Clipboard</span> : 'Clipboard'}</h2>
                            <button onClick={() => { setShowAdd(false); setError(''); setNewClipContent(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>×</button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <textarea
                                placeholder="Paste your text or link here..."
                                required
                                autoFocus
                                rows={8}
                                style={{ padding: '1.2rem', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', resize: 'vertical', fontFamily: 'inherit', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s' }}
                                value={newClipContent}
                                onChange={e => setNewClipContent(e.target.value)}
                                onFocus={e => e.target.style.borderColor = isSecretMode ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.3)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            
                            {error && (
                                <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.9rem', padding: '0.75rem 1rem', background: 'rgba(255,107,107,0.1)', borderRadius: '12px', border: '1px solid rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center' }}>
                                    <AlertCircle size={16} style={{ marginRight: '8px' }} /> {error}
                                </p>
                            )}
                            
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => { setShowAdd(false); setError(''); setNewClipContent(''); }} style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 2, padding: '1rem', borderRadius: '14px', background: isSecretMode ? '#EC4899' : 'white', border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'transform 0.2s' }} onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'scale(1.02)' }} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    {saving ? 'Saving...' : 'Save Clip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}
            
            {showLock && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
                    <SecondaryVaultLock
                        lockId="clipboard_secret"
                        title="Secret Clipboard"
                        icon="Lock"
                        onSuccess={() => {
                            setIsUnlocked(true);
                            setIsSecretMode(true);
                            setShowLock(false);
                        }}
                        onClose={() => setShowLock(false)}
                    />
                </div>
            )}
            
            {selectedClip && ReactDOM.createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '2rem' }} onClick={() => setSelectedClip(null)}>
                    <div style={{ 
                        background: 'rgba(28, 28, 30, 0.95)', 
                        padding: '2rem', 
                        borderRadius: '24px', 
                        width: '100%', 
                        maxWidth: '700px', 
                        maxHeight: '85vh', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative' 
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isSecretMode ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clipboard size={24} color={isSecretMode ? '#EC4899' : 'white'} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: '600' }}>Clip Content</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(selectedClip.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClip(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>×</button>
                        </div>
                        
                        <div style={{ 
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1.5rem', 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.03)',
                            fontSize: '1.05rem',
                            lineHeight: '1.6',
                            color: 'rgba(255,255,255,0.9)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text'
                        }}>
                            {selectedClip.content}
                        </div>
                        
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={(e) => { handleCopy(selectedClip.content, e); setSelectedClip(null); }} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: isSecretMode ? '#EC4899' : 'white', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <Copy size={18} /> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}
