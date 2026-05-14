import { useState, useEffect } from 'react';
import * as api from '../../services/api';

const IMPORTANCE_COLORS = { High: '#ff6b6b', Medium: '#ffa94d', Low: '#74c0fc' };
const SOURCE_ICONS = { Twitch: '🎮', YouTube: '📺', Bookmark: '🔖', Watchlist: '🎬', Manual: '✍️' };

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

function formatShortDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('en-US', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch { return ''; }
}

export default function DelegationWidget({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDelegation()
            .then(res => {
                const list = Array.isArray(res) ? res : (res?.data || []);
                // Sort by rank first, then newest
                const sorted = [...list].sort((a, b) => {
                    const ra = parseInt(a.rank) || 9999;
                    const rb = parseInt(b.rank) || 9999;
                    return ra - rb || new Date(b.added_at) - new Date(a.added_at);
                });
                setItems(sorted.slice(0, 5));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📥</span>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Delegation</span>
                    {items.length > 0 && (
                        <span style={{ background: 'rgba(169,112,255,0.2)', color: '#a970ff', borderRadius: '10px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                            {items.length}
                        </span>
                    )}
                </div>
                <button onClick={() => onNavigate('delegation')} style={{
                    background: 'none', border: 'none', color: '#a970ff', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 600, opacity: 0.8, padding: '0.2rem 0.5rem',
                    borderRadius: '6px', transition: 'opacity 0.2s'
                }}
                    onMouseEnter={e => e.target.style.opacity = 1}
                    onMouseLeave={e => e.target.style.opacity = 0.8}
                >
                    View all →
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '40px', borderRadius: '10px' }} />)}
                </div>
            ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.3, fontSize: '0.82rem' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>📥</span>
                    Nothing delegated yet
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map((item, i) => (
                        <div key={item.id}
                            onClick={() => onNavigate('delegation')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.55rem 0.75rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                            {/* Rank number */}
                            <span style={{ fontSize: '0.68rem', opacity: 0.35, width: '14px', textAlign: 'right', flexShrink: 0 }}>
                                {i + 1}
                            </span>
                            {/* Source icon */}
                            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>
                                {SOURCE_ICONS[item.source] || '📋'}
                            </span>
                            {/* Title */}
                            <span style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.title}
                            </span>
                            {/* Importance dot */}
                            <span style={{
                                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                                background: IMPORTANCE_COLORS[item.importance] || '#888'
                            }} title={item.importance} />
                            {/* Time */}
                            {item.added_at && (
                                <span style={{ fontSize: '0.68rem', opacity: 0.35, flexShrink: 0 }}>
                                    {timeAgo(item.added_at)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
