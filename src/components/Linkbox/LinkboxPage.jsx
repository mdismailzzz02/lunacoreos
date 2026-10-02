import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as api from '../../services/api';
import { Link2, Inbox, X, AlertCircle, Trash2, Edit2, ExternalLink, Globe, Lock, Unlock } from 'lucide-react';
import AppleLoader from '../Layout/AppleLoader';
import SecondaryVaultLock from '../Vault/SecondaryVaultLock';

export default function LinkboxPage() {
    const [linkbox, setLinkbox] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ title: '', url: '', tags: '', note: '' });
    const [delegateLinkbox, setDelegateLinkbox] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isSecretMode, setIsSecretMode] = useState(false);
    const [showLock, setShowLock] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);

    useEffect(() => {
        loadLinkbox();
    }, [isSecretMode]);

    const loadLinkbox = async () => {
        try {
            setLoading(true);
            const data = await api.getLinkboxEntries(isSecretMode);
            setLinkbox(data || []);
        } catch (err) {
            console.error('Failed to load linkbox', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.url) return;

        const normalise = (u) => (u || '').trim().replace(/\/+$/, '').toLowerCase();
        const incomingUrl = normalise(formData.url);
        
        // Only check for duplicates if we are NOT editing
        if (!editingId && linkbox.some(b => normalise(b.url) === incomingUrl)) {
            setError('This URL is already in your linkbox.');
            return;
        }

        let updatedTags = formData.tags || '';
        if (isSecretMode) {
            if (!updatedTags.includes('__secret__')) {
                updatedTags = updatedTags ? updatedTags + ', __secret__' : '__secret__';
            }
        } else {
            updatedTags = updatedTags.replace(/,?\s*__secret__/g, '');
        }

        const linkboxData = {
            id: editingId || Date.now().toString(),
            ...formData,
            tags: updatedTags,
            notes: formData.note,
            description: formData.note,
            created_at: editingId ? (linkbox.find(b => b.id === editingId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        delete linkboxData.note;

        setSaving(true);
        setError('');
        try {
            await api.saveLinkboxEntry(linkboxData);
        } catch (err) {
            console.warn('Primary save failed, trying fallback:', err);
            if (err.message?.includes("column 'notes' does not exist") || err.message?.includes("schema cache")) {
                const fallback = { ...linkboxData };
                delete fallback.notes;
                await api.saveLinkboxEntry(fallback);
            } else {
                throw err;
            }
        }

        try {
            if (editingId) {
                setLinkbox(linkbox.map(b => b.id === editingId ? linkboxData : b));
            } else {
                setLinkbox([linkboxData, ...linkbox]);
            }

            if (delegateLinkbox) {
                await api.saveDelegationItem({
                    id: `DLG-BK-${Date.now()}`,
                    title: formData.title || formData.url,
                    source: 'Linkbox',
                    link: formData.url,
                    category: 'Reading',
                    importance: 'High',
                    due_date: delegateDueDate || '',
                    added_at: new Date().toISOString()
                });
            }
            setShowAdd(false);
            setEditingId(null);
            setFormData({ title: '', url: '', tags: '', note: '' });
            setDelegateLinkbox(false);
            setDelegateDueDate('');
        } catch (err) {
            console.error('Save linkbox error:', err);
            setError(err.message || 'Failed to save linkbox');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (linkbox) => {
        setFormData({
            title: linkbox.title || '',
            url: linkbox.url || '',
            tags: (linkbox.tags || '').replace(/,?\s*__secret__/g, ''),
            note: linkbox.notes || linkbox.note || linkbox.description || ''
        });
        setEditingId(linkbox.id);
        setShowAdd(true);
    };

    const handleDelete = async (linkboxId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this linkbox?')) return;

        try {
            await api.deleteLinkboxEntry(linkboxId);
            setLinkbox(linkbox.filter(b => b.id !== linkboxId));
        } catch (err) {
            console.error('Delete linkbox error:', err);
            alert('Failed to delete linkbox');
        }
    };

    const filtered = linkbox.filter(b =>
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFavicon = (url) => {
        try {
            const domain = new URL(url).hostname;
            return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        } catch (e) {
            return null;
        }
    };

    if (loading) return <AppleLoader />;

    return (
        <div className="fade-in apple-page-loaded" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#1c1c1e', padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 -50px 0 0 #1c1c1e' }}>
                <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link2 size={32} color={isSecretMode ? '#EC4899' : 'var(--accent)'} strokeWidth={2} />
                    <h1 style={{ margin: 0, fontSize: '2rem', color: isSecretMode ? '#EC4899' : 'white' }}>{isSecretMode ? 'Secret Linkbox' : 'Linkbox'}</h1>
                </div>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Your personal internet index. Tags, notes, and searching.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search linkbox..."
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
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: isSecretMode ? '#EC4899' : 'var(--brand-color, #a29bfe)', border: 'none', color: isSecretMode ? 'white' : 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        + Add Linkbox
                    </button>
                </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            {searchQuery ? 'No linkbox match your search.' : 'No linkbox yet. Save something interesting!'}
                        </div>
                    )}
                    {filtered.map(b => (
                        <div key={b.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '1rem',
                            paddingTop: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            position: 'relative'
                        }} onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = 'var(--brand-color, #a29bfe)';
                        }} onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}>
                            <button onClick={(e) => handleDelete(b.id, e)} style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: window.innerWidth <= 768 ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)',
                                border: '1px solid rgba(255, 107, 107, 0.3)',
                                color: '#ff6b6b',
                                width: window.innerWidth <= 768 ? '36px' : '28px',
                                height: window.innerWidth <= 768 ? '36px' : '28px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                opacity: window.innerWidth <= 768 ? 0.8 : 0.4,
                                zIndex: 10
                            }} onMouseEnter={e => {
                                if (window.innerWidth > 768) {
                                    e.target.style.opacity = '1';
                                    e.target.style.background = 'rgba(255, 107, 107, 0.2)';
                                }
                            }} onMouseLeave={e => {
                                if (window.innerWidth > 768) {
                                    e.target.style.opacity = '0.4';
                                    e.target.style.background = 'rgba(255, 107, 107, 0.1)';
                                }
                            }} title="Delete linkbox"><X size={14} color="currentColor" /></button>

                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(b); }} style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: window.innerWidth <= 768 ? '3.5rem' : '2.5rem',
                                background: 'rgba(162, 155, 254, 0.1)',
                                border: '1px solid rgba(162, 155, 254, 0.3)',
                                color: '#a29bfe',
                                width: window.innerWidth <= 768 ? '36px' : '28px',
                                height: window.innerWidth <= 768 ? '36px' : '28px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                opacity: window.innerWidth <= 768 ? 0.8 : 0.4,
                                zIndex: 10
                            }} onMouseEnter={e => {
                                if (window.innerWidth > 768) {
                                    e.target.style.opacity = '1';
                                    e.target.style.background = 'rgba(162, 155, 254, 0.2)';
                                }
                            }} onMouseLeave={e => {
                                if (window.innerWidth > 768) {
                                    e.target.style.opacity = '0.4';
                                    e.target.style.background = 'rgba(162, 155, 254, 0.1)';
                                }
                            }} title="Edit linkbox"><Edit2 size={14} color="currentColor" /></button>

                            <a href={b.url} target="_blank" rel="noopener noreferrer" style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                                        <Globe size={16} color="rgba(255,255,255,0.2)" style={{ position: 'absolute' }} />
                                        <img src={getFavicon(b.url)} alt="" style={{ width: '18px', height: '18px', position: 'relative', zIndex: 1 }} onError={e => e.target.style.display = 'none'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || b.url}</h3>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new URL(b.url).hostname}</div>
                                    </div>
                                </div>

                                {(b.notes || b.note || b.description) && (
                                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                        {b.notes || b.note || b.description}
                                    </p>
                                )}

                                {b.tags && b.tags.replace(/,?\s*__secret__/g, '').trim() && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {b.tags.replace(/,?\s*__secret__/g, '').split(',').map(tag => {
                                            if (!tag.trim()) return null;
                                            return (
                                                <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', opacity: 0.7 }}>
                                                    #{tag.trim()}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </a>
                        </div>
                    ))}
                </div>

            {showAdd && ReactDOM.createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <div style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '2.5rem', borderRadius: '24px', width: '90%', maxWidth: '550px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600' }}>{editingId ? 'Edit Linkbox' : 'Save Linkbox'}</h2>
                            <button onClick={() => { setShowAdd(false); setEditingId(null); setError(''); setFormData({ title: '', url: '', tags: '', note: '' }); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>×</button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <input
                                type="url"
                                placeholder="URL (https://...)"
                                required
                                autoFocus
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s' }}
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            <input
                                type="text"
                                placeholder="Title (Recommended)"
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s' }}
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            <input
                                type="text"
                                placeholder="Tags (comma separated: tech, news, etc.)"
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s' }}
                                value={formData.tags}
                                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            <textarea
                                placeholder="Add a note or why you saved this..."
                                rows={3}
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', resize: 'none', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s' }}
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#ccc', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={delegateLinkbox} onChange={e => setDelegateLinkbox(e.target.checked)} />
                                    <Inbox size={16} color="currentColor" style={{ marginRight: '6px' }} /> Also add to Delegation
                                </label>
                                {delegateLinkbox && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '24px' }}>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.5 }}>📅 Due Date & Time (optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={delegateDueDate}
                                            onChange={e => setDelegateDueDate(e.target.value)}
                                            style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(169,112,255,0.3)', color: 'white', colorScheme: 'dark', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                )}
                            </div>
                            {error && (
                                <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.9rem', padding: '0.75rem 1rem', background: 'rgba(255,107,107,0.1)', borderRadius: '12px', border: '1px solid rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center' }}>
                                    <AlertCircle size={16} style={{ marginRight: '8px' }} /> {error}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setError(''); setFormData({ title: '', url: '', tags: '', note: '' }); }} style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 2, padding: '1rem', borderRadius: '14px', background: isSecretMode ? '#EC4899' : 'white', border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'transform 0.2s' }} onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'scale(1.02)' }} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    {saving ? 'Saving...' : (editingId ? 'Update Linkbox' : 'Save Linkbox')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}
            
            {showLock && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
                    <SecondaryVaultLock
                        lockId="linkbox_secret"
                        title="Secret Linkbox"
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
        </div>
    );
}
