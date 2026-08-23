import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { getChannelVideos } from '../../services/youtube';
import { PlayCircle, Radio, Video, Heart, Clock } from 'lucide-react';
import YTPlayerModal from '../Videos/YTPlayerModal';
import TwitchPlayerModal from '../Twitch/TwitchPlayerModal';

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
    const [ytLiked, setYtLiked] = useState([]);
    const [twitchLiked, setTwitchLiked] = useState([]);
    const [recentVods, setRecentVods] = useState([]);
    const [hasTwitchChannels, setHasTwitchChannels] = useState(true);
    const [loading, setLoading] = useState(true);
    
    const [recentFeedVideos, setRecentFeedVideos] = useState([]);
    const [hasYtChannels, setHasYtChannels] = useState(true);
    const [loadingFeed, setLoadingFeed] = useState(true);

    const [activeYTVideo, setActiveYTVideo] = useState(null);
    const [activeTwitchPlayer, setActiveTwitchPlayer] = useState({ channel: null, videoId: null });

    const [delegatedVideoIds, setDelegatedVideoIds] = useState(new Set());
    const [delegatingItem, setDelegatingItem] = useState(null);
    const [delegateDate, setDelegateDate] = useState('');

    useEffect(() => {
        let mounted = true;
        
        Promise.all([
            api.getTwitchData().catch(() => ({ streams: [], videos: [] })),
            api.getTwitchChannels().catch(() => []),
            api.getYTLiked().catch(() => []),
            api.getTwitchLiked().catch(() => []),
            api.getYTChannels().catch(() => []),
            api.getDelegation().catch(() => [])
        ]).then(([twitchData, channels, ytLikes, twitchLikes, ytChans, delegationData]) => {
            if (!mounted) return;
            setStreams(twitchData?.streams || []);
            setRecentVods(twitchData?.videos || []);
            setHasTwitchChannels(channels.length > 0);
            setHasYtChannels(ytChans && ytChans.length > 0);
            setYtLiked(ytLikes || []);
            setTwitchLiked(twitchLikes || []);
            
            if (delegationData) {
                const delegatedIds = delegationData
                    .filter(d => d.link && (d.link.includes('youtube.com') || d.link.includes('twitch.tv')))
                    .map(d => {
                        try {
                            const url = new URL(d.link);
                            if (d.link.includes('youtube.com')) return url.searchParams.get('v');
                            if (d.link.includes('twitch.tv/videos/')) return url.pathname.split('/').pop();
                            if (d.link.includes('twitch.tv/')) return url.pathname.split('/')[1];
                        } catch(e) {}
                        return null;
                    })
                    .filter(Boolean);
                setDelegatedVideoIds(new Set(delegatedIds));
            }

            setLoading(false);
            
            // Fetch recent videos for YouTube channels
            if (ytChans && ytChans.length > 0) {
                Promise.all(ytChans.map(c => getChannelVideos(c.uploadsId, 5).catch(() => ({ items: [] }))))
                    .then(results => {
                        if (!mounted) return;
                        const flat = results.map(r => r.items || []).flat();
                        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        const recent = flat.filter(v => new Date(v.publishedAt) >= oneWeekAgo)
                                           .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
                        setRecentFeedVideos(recent);
                        setLoadingFeed(false);
                    });
            } else {
                setLoadingFeed(false);
            }
        });

        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '400px', width: '100%' }}></div>;

    const toggleYTLike = async (e, v) => {
        e.stopPropagation();
        const vidId = v.id || v.video_id;
        const isLiked = ytLiked.some(l => (l.video_id || l.id) === vidId);
        
        if (isLiked) {
            setYtLiked(prev => prev.filter(l => (l.video_id || l.id) !== vidId));
            try { await api.toggleYTLiked({ video_id: vidId, liked: false }); } catch(err){}
        } else {
            const newLike = {
                video_id: vidId,
                title: v.title || v.snippet?.title || '',
                thumbnail: v.thumbnail || v.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vidId}/mqdefault.jpg`,
                liked_at: new Date().toISOString()
            };
            setYtLiked(prev => [newLike, ...prev]);
            try { await api.toggleYTLiked({ ...newLike, liked: true }); } catch(err){}
        }
    };

    const toggleTwitchLike = async (e, v, isStream) => {
        e.stopPropagation();
        const vidId = isStream ? (v.user_name || v.user_login) : (v.id || v.video_id);
        const isLiked = twitchLiked.some(l => (l.video_id || l.channel_name) === vidId);
        
        if (isLiked) {
            setTwitchLiked(prev => prev.filter(l => (l.video_id || l.channel_name) !== vidId));
            try { await api.toggleTwitchLiked({ video_id: vidId, liked: false }); } catch(err){}
        } else {
            const newLike = {
                video_id: vidId, // Use vidId as video_id so upsert/delete works consistently
                channel_name: isStream ? vidId : (v.user_name || v.channel_name),
                title: v.title || '',
                thumbnail: isStream ? v.thumbnail_url?.replace('{width}', '320').replace('{height}', '180') : (v.thumbnail_url?.replace('%{width}', '320').replace('%{height}', '180') || v.thumbnail),
                liked_at: new Date().toISOString()
            };
            setTwitchLiked(prev => [newLike, ...prev]);
            try { await api.toggleTwitchLiked({ ...newLike, liked: true }); } catch(err){}
        }
    };

    const handleDelegate = (e, item, platform, isStream = false) => {
        e.stopPropagation();
        const id = platform === 'youtube' ? (item.id || item.video_id) : (isStream ? (item.user_name || item.user_login) : (item.id || item.video_id));
        if (delegatedVideoIds.has(id)) return;
        setDelegatingItem({ item, platform, isStream, id });
        setDelegateDate('');
    };

    const confirmDelegate = async () => {
        if (!delegatingItem) return;
        const { item, platform, isStream, id } = delegatingItem;
        let link = '';
        let title = item.title || item.snippet?.title || item.user_name || '';
        
        if (platform === 'youtube') link = `https://youtube.com/watch?v=${id}`;
        if (platform === 'twitch') {
            if (isStream) link = `https://twitch.tv/${id}`;
            else link = `https://twitch.tv/videos/${id}`;
        }

        try {
            await api.saveDelegationItem({
                id: `DLG-${platform.toUpperCase()}-${Date.now()}`,
                title,
                link,
                category: platform === 'youtube' ? 'Video' : 'Stream',
                importance: 'Medium',
                due_date: delegateDate || '',
                added_at: new Date().toISOString()
            });
            setDelegatedVideoIds(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });
            setDelegatingItem(null);
        } catch (err) {
            console.error(err);
        }
    };

    const renderButtons = (item, platform, isStream = false) => {
        const id = platform === 'youtube' ? (item.id || item.video_id) : (isStream ? (item.user_name || item.user_login) : (item.id || item.video_id));
        const isDelegated = delegatedVideoIds.has(id);
        
        let isLiked = false;
        if (platform === 'youtube') isLiked = ytLiked.some(l => (l.video_id || l.id) === id);
        if (platform === 'twitch') isLiked = twitchLiked.some(l => (l.video_id || l.channel_name) === id);

        return (
            <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '6px', alignItems: 'center', zIndex: 10 }}>
                <button
                    onClick={e => handleDelegate(e, item, platform, isStream)}
                    title={isDelegated ? 'Added to Delegation' : 'Add to Delegation'}
                    style={{
                        background: isDelegated ? 'rgba(168,85,247,0.85)' : 'rgba(0,0,0,0.55)',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '13px',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s',
                        boxShadow: isDelegated ? '0 0 8px rgba(168,85,247,0.6)' : 'none'
                    }}
                >
                    📥
                </button>
                <button
                    onClick={e => platform === 'youtube' ? toggleYTLike(e, item) : toggleTwitchLike(e, item, isStream)}
                    style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '13px',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s'
                    }}
                >
                    {isLiked ? '❤️' : '🤍'}
                </button>
            </div>
        );
    };

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

                {/* YT: Recent Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 className="card-title" style={{ fontSize: '0.85rem' }}>Recent Channel Videos</h4>
                    {loadingFeed ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading recent videos...</div>
                    ) : recentFeedVideos.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No videos from the last 7 days.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {recentFeedVideos.map(v => (
                                <div key={v.id} className="interactive-scale" onClick={() => setActiveYTVideo(v.id || v.video_id)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        {renderButtons(v, 'youtube', false)}
                                        <img src={v.thumbnail || v.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt={v.title || v.snippet?.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                            <PlayCircle size={32} color="#fff" />
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title || v.snippet?.title}</div>
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
                            {likedVideos.map(v => (
                                <div key={v.video_id} className="interactive-scale" onClick={() => setActiveYTVideo(v.video_id || v.id)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        {renderButtons(v, 'youtube', false)}
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
                                <div key={s.id} className="interactive-scale" onClick={() => setActiveTwitchPlayer({ channel: s.user_name || s.user_login, videoId: null })} style={{ position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(168, 85, 247, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                    {renderButtons(s, 'twitch', true)}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img src={s.thumbnail_url?.replace('{width}', '100').replace('{height}', '100')} alt={s.user_name} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
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
                            {recentVods.map(v => (
                                <div key={v.id} className="interactive-scale" onClick={() => setActiveTwitchPlayer({ channel: null, videoId: v.id || v.video_id })} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        {renderButtons(v, 'twitch', false)}
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
                            {twitchLiked.map(v => (
                                <div key={v.video_id} className="interactive-scale" onClick={() => setActiveTwitchPlayer({ channel: null, videoId: v.video_id || v.id })} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                                        {renderButtons(v, 'twitch', false)}
                                        <img src={v.thumbnail || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${v.channel_name}-320x180.jpg`} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
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

            {/* Global Modals for Playback */}
            <YTPlayerModal videoId={activeYTVideo} onClose={() => setActiveYTVideo(null)} />
            <TwitchPlayerModal
                channel={activeTwitchPlayer.channel}
                videoId={activeTwitchPlayer.videoId}
                onClose={() => setActiveTwitchPlayer({ channel: null, videoId: null })}
            />

            {/* Delegation Modal */}
            {delegatingItem && (
                <div className="modal-overlay" onClick={() => setDelegatingItem(null)} style={{ zIndex: 10000 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Delegate {delegatingItem.platform === 'youtube' ? 'Video' : 'Stream'}</h3>
                            <button className="icon-btn" onClick={() => setDelegatingItem(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="field-group">
                                <label style={{ marginBottom: '8px', display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                                    Due Date & Time (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    className="field-input"
                                    value={delegateDate}
                                    onChange={e => setDelegateDate(e.target.value)}
                                    style={{ width: '100%', colorScheme: 'dark' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                <button className="btn btn-secondary" onClick={() => setDelegatingItem(null)} style={{ flex: 1, justifyContent: 'center' }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={confirmDelegate} style={{ flex: 1, justifyContent: 'center' }}>
                                    Delegate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
