import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function TwitchRecent({ onNavigate }) {
    const [data, setData] = useState({ streams: [], videos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadTwitch = async () => {
            setLoading(true);
            try {
                const res = await api.getTwitchData();
                if (res.error) {
                    setError(res.error);
                } else {
                    setData(res);
                }
            } catch (err) {
                console.error('Twitch load error:', err);
                setError('Failed to fetch Twitch data.');
            } finally {
                setLoading(false);
            }
        };
        loadTwitch();
    }, []);

    if (error) return (
        <div style={{ padding: '1rem', background: 'rgba(255,118,117,0.1)', borderRadius: '12px', border: '1px solid rgba(255,118,117,0.2)', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: '#ff7675', fontSize: '0.85rem' }}>{error}</p>
        </div>
    );

    if (!loading && data.streams.length === 0 && data.videos.length === 0) return null;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>🎮 Twitch Activity</div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onNavigate('twitch_management')} // Placeholder for management tab
                    style={{ fontSize: '0.72rem' }}
                >
                    Manage Channels →
                </button>
            </div>

            {loading && (
                <div className="dash-videos-row">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="dash-video-skeleton">
                            <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 4 }} />
                        </div>
                    ))}
                </div>
            )}

            {!loading && (
                <div className="dash-videos-row" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {/* Live Streams First */}
                    {Array.isArray(data.streams) && data.streams.map(s => (
                        <a
                            key={s.id}
                            href={`https://twitch.tv/${s.user_login}`}
                            target="_blank"
                            rel="noreferrer"
                            className="dash-video-wrapper"
                            style={{ minWidth: '220px', flex: '0 0 auto', textDecoration: 'none' }}
                        >
                            <div className="dash-video-card">
                                <div className="dash-thumb-wrap">
                                    <img
                                        src={s.thumbnail_url ? s.thumbnail_url.replace('{width}', '440').replace('{height}', '248') : ''}
                                        alt={s.title}
                                        className="dash-thumb"
                                        style={{ border: '2px solid #a970ff' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        background: '#ea2027',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        LIVE
                                    </span>
                                    <span className="dash-ago">{s.viewer_count.toLocaleString()} viewers</span>
                                </div>
                                <p className="dash-video-title" style={{ color: 'var(--text)' }}>{s.title}</p>
                                <span className="dash-video-ch" style={{ color: '#a970ff', fontWeight: 'bold' }}>{s.user_name}</span>
                            </div>
                        </a>
                    ))}

                    {/* Recent Videos / VODs */}
                    {Array.isArray(data.videos) && data.videos.map(v => (
                        <a
                            key={v.id}
                            href={v.url}
                            target="_blank"
                            rel="noreferrer"
                            className="dash-video-wrapper"
                            style={{ minWidth: '200px', flex: '0 0 auto', textDecoration: 'none', opacity: 0.8 }}
                        >
                            <div className="dash-video-card">
                                <div className="dash-thumb-wrap">
                                    <img
                                        src={v.thumbnail_url ? v.thumbnail_url.replace('%{width}', '440').replace('%{height}', '248') : ''}
                                        alt={v.title}
                                        className="dash-thumb"
                                    />
                                    <span className="dash-ago">{v.duration}</span>
                                </div>
                                <p className="dash-video-title" style={{ color: 'var(--text-muted)' }}>{v.title}</p>
                                <span className="dash-video-ch">{v.user_name} (VOD)</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
