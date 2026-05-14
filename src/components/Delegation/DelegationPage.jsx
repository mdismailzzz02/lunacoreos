import { useState, useEffect } from 'react';
import * as api from '../../services/api';

const CATEGORIES = ['All', 'Live Stream', 'VOD', 'Video', 'Reading', 'Movie', 'TV Show', 'Podcast', 'Other'];
const IMPORTANCE = ['High', 'Medium', 'Low'];
const SOURCES = ['Manual', 'Twitch', 'YouTube', 'Bookmark', 'Watchlist'];

const SOURCE_ICONS = { Twitch: '🎮', YouTube: '📺', Bookmark: '🔖', Watchlist: '🎬', Manual: '✍️' };
const IMPORTANCE_COLORS = { High: '#ff6b6b', Medium: '#ffa94d', Low: '#74c0fc' };
const RANK_BADGES = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatDateTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch { return iso; }
}

function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

function DelegationCard({ item, rank, totalItems, onDelete, onRankUp, onRankDown }) {
    const [confirming, setConfirming] = useState(false);
    const [rankLoading, setRankLoading] = useState(false);

    const handleRank = async (dir) => {
        setRankLoading(true);
        await (dir === 'up' ? onRankUp(item.id) : onRankDown(item.id));
        setRankLoading(false);
    };

    const numRank = item.rank ? parseInt(item.rank) : null;
    const badge = numRank && RANK_BADGES[numRank] ? RANK_BADGES[numRank] : null;

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: `1px solid ${numRank === 1 ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '20px', padding: '1.4rem',
            display: 'flex', flexDirection: 'column', gap: '0.9rem',
            position: 'relative', transition: 'border-color 0.2s, transform 0.15s',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = numRank === 1 ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {/* Rank badge + Importance badge */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {badge && <span style={{ fontSize: '1.1rem' }}>{badge}</span>}
                <div style={{
                    background: (IMPORTANCE_COLORS[item.importance] || '#aaa') + '22',
                    color: IMPORTANCE_COLORS[item.importance] || '#aaa',
                    borderRadius: '8px', padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700,
                    border: `1px solid ${(IMPORTANCE_COLORS[item.importance] || '#aaa')}44`
                }}>
                    {item.importance || 'Medium'}
                </div>
            </div>

            {/* Title + source */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingRight: '6rem' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{SOURCE_ICONS[item.source] || '📋'}</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.4 }}>{item.title}</h3>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.category && (
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 9px', borderRadius: '20px', fontSize: '0.68rem', opacity: 0.8 }}>
                                {item.category}
                            </span>
                        )}
                        <span style={{ fontSize: '0.68rem', opacity: 0.45 }}>{item.source}</span>
                    </div>
                </div>
            </div>

            {/* Timestamps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {item.added_at && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', opacity: 0.3 }}>🕐 Added:</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.45 }}>{formatDateTime(item.added_at)}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.28 }}>· {timeAgo(item.added_at)}</span>
                    </div>
                )}
                {item.due_date && (() => {
                    const due = new Date(item.due_date);
                    const now = Date.now();
                    const diff = due - now;
                    const isOverdue = diff < 0;
                    const isSoon = diff > 0 && diff < 24 * 60 * 60 * 1000;
                    const color = isOverdue ? '#ff6b6b' : isSoon ? '#ffa94d' : 'rgba(255,255,255,0.55)';
                    const label = isOverdue ? '🔴 Overdue:' : isSoon ? '🟡 Due soon:' : '📅 Due:';
                    return (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: isOverdue ? 'rgba(255,107,107,0.08)' : isSoon ? 'rgba(255,169,77,0.08)' : 'transparent', borderRadius: '6px', padding: isOverdue || isSoon ? '2px 6px' : '0', marginLeft: '-6px' }}>
                            <span style={{ fontSize: '0.68rem', color, fontWeight: isOverdue || isSoon ? 700 : 400 }}>{label}</span>
                            <span style={{ fontSize: '0.7rem', color, fontWeight: isOverdue || isSoon ? 700 : 400 }}>
                                {due.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                        </div>
                    );
                })()}
            </div>

            {item.note && (
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.note}
                </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                {/* Rank controls */}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => handleRank('up')} disabled={rankLoading || rank === 0} title="Raise priority" style={rankBtnStyle(rank === 0)}>↑</button>
                    <button onClick={() => handleRank('down')} disabled={rankLoading || rank === totalItems - 1} title="Lower priority" style={rankBtnStyle(rank === totalItems - 1)}>↓</button>
                </div>
                {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                        flex: 1, padding: '0.5rem 0.9rem', borderRadius: '10px', minWidth: 0,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                        color: 'white', textDecoration: 'none', fontSize: '0.78rem', textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>Open ↗</a>
                )}
                <button onClick={() => { if (!confirming) { setConfirming(true); return; } onDelete(item.id); }} style={{
                    padding: '0.5rem 0.9rem', borderRadius: '10px', whiteSpace: 'nowrap',
                    background: confirming ? 'rgba(255,107,107,0.2)' : 'transparent',
                    border: confirming ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.09)',
                    color: confirming ? '#ff6b6b' : 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s'
                }}>
                    {confirming ? 'Confirm?' : '✕ Done'}
                </button>
            </div>
        </div>
    );
}

const rankBtnStyle = (disabled) => ({
    width: '30px', height: '30px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
});

function QuickAddModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: '', link: '', source: 'Manual', category: 'Other', importance: 'High', note: '', due_date: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true); setError('');
        try {
            const newItem = {
                ...form,
                id: `DLG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                added_at: new Date().toISOString()
            };
            await onSave(newItem);
            onClose();
        } catch (err) {
            setError(err?.message || 'Failed to save. Make sure the "delegation" table exists in Supabase.');
        } finally { setSaving(false); }
    };

    const F = (label, key, type = 'text', opts = {}) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.78rem', opacity: 0.55, fontWeight: 600 }}>{label}</label>
            {opts.as === 'select' ? (
                <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}>
                    {opts.options.map(o => <option key={o} value={o} style={{ background: '#1a1a2e', color: '#fff' }}>{o}</option>)}
                </select>
            ) : opts.as === 'textarea' ? (
                <textarea rows={3} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={opts.ph || ''} style={{ ...inputStyle, resize: 'none' }} />
            ) : (
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={opts.ph || ''} style={inputStyle} />
            )}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '2rem', width: '480px', maxWidth: '92vw', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📥 Add to Delegation</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {F('Title *', 'title', 'text', { ph: 'e.g. "Watch this stream later"' })}
                    {F('Link (optional)', 'link', 'url', { ph: 'https://...' })}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        {F('Source', 'source', 'text', { as: 'select', options: SOURCES })}
                        {F('Category', 'category', 'text', { as: 'select', options: CATEGORIES.filter(c => c !== 'All') })}
                        {F('Importance', 'importance', 'text', { as: 'select', options: IMPORTANCE })}
                    </div>
                    {/* Due date/time picker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.78rem', opacity: 0.55, fontWeight: 600 }}>📅 Due Date & Time (optional)</label>
                        <input
                            type="datetime-local"
                            value={form.due_date}
                            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                        />
                    </div>
                    {F('Note (optional)', 'note', 'text', { as: 'textarea', ph: 'Why is this important?' })}
                    {error && (
                        <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)' }}>
                            ⚠️ {error}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.85rem', borderRadius: '12px', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Delegating…' : '📥 Delegate This'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputStyle = { padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' };

const SORT_OPTIONS = [
    { key: 'rank', label: '🏅 Rank' },
    { key: 'date_new', label: '📅 Newest' },
    { key: 'date_old', label: '📅 Oldest' },
    { key: 'importance', label: '⭐ Importance' },
];

const IMPORTANCE_ORDER = { High: 0, Medium: 1, Low: 2 };

export default function DelegationPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortKey, setSortKey] = useState('rank');
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => { loadItems(); }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await api.getDelegation();
            const list = Array.isArray(res) ? res : (res?.data || []);
            setItems(list);
        } catch (err) { console.error('Failed to load delegation items', err); }
        finally { setLoading(false); }
    };

    const handleSave = async (formWithId) => {
        const res = await api.saveDelegationItem(formWithId);
        const saved = res?.data || res;
        if (!saved || !saved.id) throw new Error('Unexpected response from Supabase.');
        setItems(prev => [saved, ...prev]);
    };

    const handleDelete = async (id) => {
        await api.deleteDelegationItem(id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleRankChange = async (id, direction) => {
        setItems(prev => {
            const arr = [...prev];
            const idx = arr.findIndex(i => i.id === id);
            if (idx < 0) return prev;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= arr.length) return prev;
            // Swap rank numbers
            const rankA = parseInt(arr[idx].rank) || idx + 1;
            const rankB = parseInt(arr[swapIdx].rank) || swapIdx + 1;
            arr[idx] = { ...arr[idx], rank: rankB };
            arr[swapIdx] = { ...arr[swapIdx], rank: rankA };
            // Persist both
            api.updateDelegationRank(arr[idx].id, rankB).catch(console.error);
            api.updateDelegationRank(arr[swapIdx].id, rankA).catch(console.error);
            return arr;
        });
    };

    const sortedItems = [...items].sort((a, b) => {
        if (sortKey === 'rank') {
            const ra = parseInt(a.rank) || 9999;
            const rb = parseInt(b.rank) || 9999;
            return ra - rb || new Date(b.added_at) - new Date(a.added_at);
        }
        if (sortKey === 'date_new') return new Date(b.added_at) - new Date(a.added_at);
        if (sortKey === 'date_old') return new Date(a.added_at) - new Date(b.added_at);
        if (sortKey === 'importance') return (IMPORTANCE_ORDER[a.importance] ?? 1) - (IMPORTANCE_ORDER[b.importance] ?? 1);
        return 0;
    });

    const filtered = activeCategory === 'All' ? sortedItems : sortedItems.filter(i => i.category === activeCategory);

    const counts = CATEGORIES.reduce((acc, c) => {
        acc[c] = c === 'All' ? items.length : items.filter(i => i.category === c).length;
        return acc;
    }, {});

    return (
        <div className="fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.9rem', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📥 Delegation
                    </h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.45, fontSize: '0.88rem' }}>
                        {items.length} item{items.length !== 1 ? 's' : ''} · Things that matter, but can wait
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', background: 'linear-gradient(135deg, #a970ff, #7c4dff)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(169,112,255,0.3)' }}>
                    + Add Item
                </button>
            </div>

            {/* Controls row: categories + sort */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                {/* Category pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {CATEGORIES.filter(c => counts[c] > 0 || c === 'All').map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                            padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer',
                            border: `1px solid ${activeCategory === cat ? '#a970ff' : 'rgba(255,255,255,0.1)'}`,
                            background: activeCategory === cat ? 'rgba(169,112,255,0.18)' : 'rgba(255,255,255,0.04)',
                            color: activeCategory === cat ? '#a970ff' : 'rgba(255,255,255,0.55)',
                            fontWeight: activeCategory === cat ? 700 : 400, fontSize: '0.78rem', transition: 'all 0.2s'
                        }}>
                            {cat}{counts[cat] > 0 && <span style={{ opacity: 0.55, marginLeft: '4px' }}>{counts[cat]}</span>}
                        </button>
                    ))}
                </div>
                {/* Sort selector */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>Sort:</span>
                    {SORT_OPTIONS.map(s => (
                        <button key={s.key} onClick={() => setSortKey(s.key)} style={{
                            padding: '0.35rem 0.85rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem',
                            border: `1px solid ${sortKey === s.key ? '#a970ff' : 'rgba(255,255,255,0.1)'}`,
                            background: sortKey === s.key ? 'rgba(169,112,255,0.15)' : 'transparent',
                            color: sortKey === s.key ? '#a970ff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s'
                        }}>{s.label}</button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '175px', borderRadius: '20px' }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.35, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
                    <p>Nothing delegated yet.<br />Use the "📥 Delegation" toggle when saving streams, videos, or bookmarks!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                    {filtered.map((item, idx) => (
                        <DelegationCard
                            key={item.id}
                            item={item}
                            rank={idx}
                            totalItems={filtered.length}
                            onDelete={handleDelete}
                            onRankUp={(id) => handleRankChange(id, 'up')}
                            onRankDown={(id) => handleRankChange(id, 'down')}
                        />
                    ))}
                </div>
            )}

            {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
        </div>
    );
}
