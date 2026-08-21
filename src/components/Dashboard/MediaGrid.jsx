import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { PlayCircle, Radio, Video, Heart, Clock } from 'lucide-react';

function timeAgoSafe(dateString) {
    if (!dateString) return 'Recently';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatViewers(num) {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

export default function MediaGrid({ onNavigate }) {
    const [streams, setStreams] = useState([]);
    const [ytVideos, setYtVideos] = useState([]);
    const [ytLiked, setYtLiked] = useState([]);
    const [twitchLiked, setTwitchLiked] = useState([]);
    const [recentVods, setRecentVods] = useState([]);
    const [hasTwitchChannels, setHasTwitchChannels] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        Promise.all([
            api.getTwitchData().catch(() => ({ streams: [], videos: [] })),
            api.getTwitchChannels().catch(() => []),
            api.getSavedVideos().catch(() => []),
            api.getYTLiked().catch(() => []),
            api.getTwitchLiked().catch(() => [])
        ]).then(([twitchData, channels, videos, ytLikes, twitchLikes]) => {
            if (!mounted) return;
            setStreams(twitchData?.streams || []);
            setRecentVods(twitchData?.videos || []);
            setHasTwitchChannels(channels.length > 0);
            setYtVideos(videos || []);
            setYtLiked(ytLikes || []);
            setTwitchLiked(twitchLikes || []);
            setLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '400px', width: '100%' }}></div>;

    // YouTube Math
    const todayStr = new Date().toLocaleDateString('en-CA');
    const newToday = ytVideos.filter(v => {
        if (!v.liked_at) return false;
        const d = new Date(v.liked_at);
        if (isNaN(d.getTime())) return false;
        return d.toLocaleDateString('en-CA') === todayStr;
    }).sort((a, b) => new Date(b.liked_at) - new Date(a.liked_at));

    const likedVideos = ytLiked.sort((a, b) => new Date(b.created_at || b.liked_at || 0) - new Date(a.created_at || a.liked_at || 0));

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%' }}>
            
            {/* 🔴 YOUTUBE COLUMN */}
            <div className="dashboard-card fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div className="icon-backdrop" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        <Video size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>YouTube</h3>
                </div>

                {/* YT: New Today */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 className="card-title" style={{ fontSize: '0.85rem' }}>Daily New Videos</h4>
                    {newToday.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No new videos tracked today.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {newToday.slice(0, 4).map(v => (
                                <div key={v.video_id} className="interactive-scale" onClick={() => onNavigate('videos')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                            <PlayCircle size={32} color="#fff" />
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* YT: Liked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={14} color="#ec4899" fill="#ec4899" />
                        <h4 className="card-title" style={{ fontSize: '0.85rem', margin: 0 }}>Saved Favorites</h4>
                    </div>
                    {likedVideos.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No liked videos yet.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {likedVideos.slice(0, 4).map(v => (
                                <div key={v.video_id} className="interactive-scale" onClick={() => onNavigate('videos')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 🟣 TWITCH COLUMN */}
            <div className="dashboard-card fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div className="icon-backdrop" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                        <Radio size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Twitch</h3>
                </div>

                {/* Twitch: Live Now */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 className="card-title" style={{ fontSize: '0.85rem' }}>Live Right Now</h4>
                    {!hasTwitchChannels ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Add channels in the Twitch tab to see live status here</div>
                    ) : streams.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No one is live right now</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {streams.map(s => (
                                <div key={s.id} className="interactive-scale" onClick={() => onNavigate('twitch')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(168, 85, 247, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img src={s.thumbnail_url?.replace('{width}', '100').replace('{height}', '100')} alt={s.user_name} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover' }} onError={(e) => { e.target.src = '/profile.jpg'; }} />
                                            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--surface)' }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }}></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{s.user_name}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>{formatViewers(s.viewer_count)}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {s.title}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Twitch: Recent Updates/VODs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        <h4 className="card-title" style={{ fontSize: '0.85rem', margin: 0 }}>Recent Streams</h4>
                    </div>
                    {recentVods.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent streams tracked.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {recentVods.slice(0, 4).map(v => (
                                <div key={v.id} className="interactive-scale" onClick={() => onNavigate('twitch')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        <img src={v.thumbnail_url?.replace('%{width}', '320').replace('%{height}', '180')} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.user_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeAgoSafe(v.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Twitch: Liked Videos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={14} color="#a855f7" fill="#a855f7" />
                        <h4 className="card-title" style={{ fontSize: '0.85rem', margin: 0 }}>Saved Favorites</h4>
                    </div>
                    {twitchLiked.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No liked streams yet.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {twitchLiked.slice(0, 4).map(v => (
                                <div key={v.video_id} className="interactive-scale" onClick={() => onNavigate('twitch')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        <img src={v.thumbnail || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${v.channel_name}-320x180.jpg`} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/profile.jpg'; }} />
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}
