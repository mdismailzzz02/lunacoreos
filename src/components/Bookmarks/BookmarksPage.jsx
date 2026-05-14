import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ title: '', url: '', tags: '', note: '' });
    const [delegateBookmark, setDelegateBookmark] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadBookmarks();
    }, []);

    const loadBookmarks = async () => {
        try {
            const data = await api.getBookmarks();
            setBookmarks(data || []);
        } catch (err) {
            console.error('Failed to load bookmarks', err);
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
        if (!editingId && bookmarks.some(b => normalise(b.url) === incomingUrl)) {
            setError('This URL is already in your bookmarks.');
            return;
        }

        const bookmarkData = {
            id: editingId || Date.now().toString(),
            ...formData,
            notes: formData.note,
            description: formData.note,
            created_at: editingId ? (bookmarks.find(b => b.id === editingId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        delete bookmarkData.note;

        setSaving(true);
        setError('');
        try {
            await api.saveBookmark(bookmarkData);
        } catch (err) {
            console.warn('Primary save failed, trying fallback:', err);
            if (err.message?.includes("column 'notes' does not exist") || err.message?.includes("schema cache")) {
                const fallback = { ...bookmarkData };
                delete fallback.notes;
                await api.saveBookmark(fallback);
            } else {
                throw err;
            }
        }

        try {
            if (editingId) {
                setBookmarks(bookmarks.map(b => b.id === editingId ? bookmarkData : b));
            } else {
                setBookmarks([bookmarkData, ...bookmarks]);
            }

            if (delegateBookmark) {
                await api.saveDelegationItem({
                    id: `DLG-BK-${Date.now()}`,
                    title: formData.title || formData.url,
                    source: 'Bookmark',
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
            setDelegateBookmark(false);
            setDelegateDueDate('');
        } catch (err) {
            console.error('Save bookmark error:', err);
            setError(err.message || 'Failed to save bookmark');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (bookmark) => {
        setFormData({
            title: bookmark.title || '',
            url: bookmark.url || '',
            tags: bookmark.tags || '',
            note: bookmark.notes || bookmark.note || bookmark.description || ''
        });
        setEditingId(bookmark.id);
        setShowAdd(true);
    };

    const handleDelete = async (bookmarkId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this bookmark?')) return;

        try {
            await api.deleteBookmark(bookmarkId);
            setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
        } catch (err) {
            console.error('Delete bookmark error:', err);
            alert('Failed to delete bookmark');
        }
    };

    const filtered = bookmarks.filter(b =>
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFavicon = (url) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>🔖 Smart Bookmarks</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Your personal internet index. Tags, notes, and searching.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Search bookmarks..."
                        style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minWidth: '250px' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <button
                        onClick={() => setShowAdd(true)}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        + Add Bookmark
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            {searchQuery ? 'No bookmarks match your search.' : 'No bookmarks yet. Save something interesting!'}
                        </div>
                    )}
                    {filtered.map(b => (
                        <div key={b.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '1.5rem',
                            paddingTop: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
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
                                top: '0.75rem',
                                right: '0.75rem',
                                background: window.innerWidth <= 768 ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)',
                                border: '1px solid rgba(255, 107, 107, 0.3)',
                                color: '#ff6b6b',
                                width: window.innerWidth <= 768 ? '40px' : '32px',
                                height: window.innerWidth <= 768 ? '40px' : '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
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
                            }} title="Delete bookmark">✕</button>

                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(b); }} style={{
                                position: 'absolute',
                                top: '0.75rem',
                                right: '3rem',
                                background: 'rgba(162, 155, 254, 0.1)',
                                border: '1px solid rgba(162, 155, 254, 0.3)',
                                color: '#a29bfe',
                                width: window.innerWidth <= 768 ? '40px' : '32px',
                                height: window.innerWidth <= 768 ? '40px' : '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
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
                            }} title="Edit bookmark">✎</button>

                            <a href={b.url} target="_blank" rel="noopener noreferrer" style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        <img src={getFavicon(b.url)} alt="" style={{ width: '24px', height: '24px' }} onError={e => e.target.style.display = 'none'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || b.url}</h3>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new URL(b.url).hostname}</div>
                                    </div>
                                </div>

                                {(b.notes || b.note) && (
                                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {b.notes || b.note}
                                    </p>
                                )}

                                {b.tags && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {b.tags.split(',').map(tag => (
                                            <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', opacity: 0.7 }}>
                                                #{tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '450px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{editingId ? 'Edit Bookmark' : 'Save Bookmark'}</h2>
                            <button onClick={() => { setShowAdd(false); setEditingId(null); setError(''); setFormData({ title: '', url: '', tags: '', note: '' }); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <input
                                type="url"
                                placeholder="URL (https://...)"
                                required
                                autoFocus
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Title (Recommended)"
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Tags (comma separated: tech, news, etc.)"
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={formData.tags}
                                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                            />
                            <textarea
                                placeholder="Add a note or why you saved this..."
                                rows={3}
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'none' }}
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#aaa', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={delegateBookmark} onChange={e => setDelegateBookmark(e.target.checked)} />
                                    📥 Also add to Delegation
                                </label>
                                {delegateBookmark && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '22px' }}>
                                        <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>📅 Due Date & Time (optional)</label>
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
                                <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)' }}>
                                    ⚠️ {error}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setError(''); setFormData({ title: '', url: '', tags: '', note: '' }); }} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Saving...' : (editingId ? 'Update Bookmark' : 'Save Bookmark')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
