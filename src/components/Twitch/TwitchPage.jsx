import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import TwitchPlayerModal from './TwitchPlayerModal';

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ── Sub-components ─────────────────────────────────────────────
function TwitchChannelCard({ ch, selected, onClick, onRemove }) {
    return (
        <div className={`yt-channel-card ${selected ? 'active' : ''}`} onClick={onClick}>
            <img src={ch.profile_image_url} alt={ch.display_name} className="yt-ch-avatar" style={{ border: '2px solid #a970ff' }} />
            <div className="yt-ch-info">
                <span className="yt-ch-name">{ch.display_name}</span>
                <span className="yt-ch-subs">@{ch.login}</span>
            </div>
            <button className="yt-ch-remove" onClick={e => { e.stopPropagation(); onRemove(ch.id); }} title="Remove">✕</button>
        </div>
    );
}

function TwitchVideoCard({ item, type, onPlay, onSave, onDismiss, isLiked, onLike }) {
    const isLive = type === 'live';
    const isSaved = type === 'library';
    const isPending = type === 'pending';
    const [shouldDelegate, setShouldDelegate] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');

    // Construct IDs for the player
    const channelName = isLive ? item.user_login : null;
    const videoId = !isLive ? (item.video_id || item.id) : null;

    // Fix Twitch thumbnail placeholders ({width}x{height})
    const getThumbnail = (url) => {
        if (!url) return 'https://static-cdn.jtvnw.net/ttv-static/404_preview-400x225.jpg';

        // Twitch VODs often use: %{width}x%{height}. We catch {width}, %{width}, and encoded %7Bwidth%7D
        return url
            .replace(/%?\{width\}/g, '400')
            .replace(/%?\{height\}/g, '225')
            .replace(/%?%7Bwidth%7D/g, '400')
            .replace(/%?%7Bheight%7D/g, '225');
    };

    return (
        <div className={isPending ? "yt-pending-card" : "yt-video-card"} onClick={() => onPlay(channelName, videoId)} style={{ cursor: 'pointer' }}>
            <div className={isPending ? "yt-pending-link" : ""}>
                <div className="yt-thumb-wrap" style={{ background: '#1a1a2e', position: 'relative' }}>
                    <img
                        src={getThumbnail(item.thumbnail_url || item.thumbnail)}
                        alt=""
                        className="yt-thumb"
                        style={{ borderBottom: isLive ? '3px solid #ff4655' : 'none' }}
                        onError={(e) => { e.target.src = 'https://static-cdn.jtvnw.net/ttv-static/404_preview-400x225.jpg'; }}
                    />
                    {isLive && <span className="yt-ago" style={{ background: '#ff4655', color: '#fff' }}>LIVE</span>}
                    {!isLive && <span className="yt-ago">{timeAgo(item.created_at || item.published_at || item.saved_at)}</span>}
                    {/* Like button */}
                    <button
                        onClick={e => { e.stopPropagation(); onLike(videoId || item.video_id || item.id); }}
                        style={{
                            position: 'absolute', top: '6px', right: '6px',
                            background: isLiked ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
                            border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '12px', backdropFilter: 'blur(4px)', zIndex: 10
                        }}
                    >
                        {isLiked ? '❤️' : '🤍'}
                    </button>
                </div>
                <div className="yt-video-info">
                    <p className="yt-video-title">{item.title}</p>
                    <span className="yt-video-ch">{item.user_name || item.display_name}</span>
                </div>
            </div>

            {(isPending || isLive || isSaved) && (onSave || onDismiss || (isSaved && onSave)) && (
                <div className="yt-pending-actions" style={{ flexDirection: (isPending || isLive) ? 'column' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                    {onSave && !isSaved && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label className="delegate-toggle" style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={shouldDelegate} onChange={e => setShouldDelegate(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                                    📥 Delegation
                                </label>
                                <button
                                    className="yt-approve-btn"
                                    onClick={(e) => { e.stopPropagation(); onSave(item, isLive, shouldDelegate, delegateDueDate); }}
                                    title={isLive ? 'Bookmark Stream' : 'Add to Library'}
                                    style={{ background: isLive ? 'rgba(169, 112, 255, 0.2)' : undefined, color: isLive ? '#a970ff' : undefined }}
                                >
                                    ＋
                                </button>
                            </div>
                            {shouldDelegate && (
                                <input
                                    type="datetime-local"
                                    value={delegateDueDate}
                                    onChange={e => setDelegateDueDate(e.target.value)}
                                    style={{ padding: '3px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(169,112,255,0.3)', color: 'white', colorScheme: 'dark', fontSize: '0.7rem', width: '100%' }}
                                    placeholder="Due date/time"
                                />
                            )}
                        </div>
                    )}
                    {isSaved && onSave && (
                        <button
                            className="yt-dismiss-btn"
                            onClick={(e) => { e.stopPropagation(); onSave(item); }}
                            title="Remove from Library"
                        >
                            ✕
                        </button>
                    )}
                    {onDismiss && !isSaved && (
                        <button className="yt-dismiss-btn" onClick={(e) => { e.stopPropagation(); onDismiss(item.id || item.video_id); }} title="Dismiss">
                            ✕
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────
export default function TwitchPage() {
    const [channels, setChannels] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const [library, setLibrary] = useState([]);

    const [streams, setStreams] = useState([]);
    const [videos, setVideos] = useState([]);

    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addQuery, setAddQuery] = useState('');
    const [adding, setAdding] = useState(false);

    const [activePlayer, setActivePlayer] = useState({ channel: null, videoId: null });
    const [activeTab, setActiveTab] = useState('live'); 
    const [likedVideoIds, setLikedVideoIds] = useState(new Set());
    const [likedVideosMap, setLikedVideosMap] = useState(new Map());
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadSyncData = useCallback(async (isSilent = false) => {
        if (!isSilent && !initialLoaded) setLoading(true);
        else setRefreshing(true);
        
        setError('');
        try {
            const [chans, lib, data, likedList] = await Promise.all([
                api.getTwitchChannels(),
                api.getSavedTwitchVideos(),
                api.getTwitchData(),
                api.getTwitchLiked().catch(e => [])
            ]);
            
            setChannels(Array.isArray(chans) ? chans : []);
            setLibrary(Array.isArray(lib) ? lib : []);
            setDismissed(new Set(data?.dismissed || []));
            setStreams(data?.streams || []);
            setVideos(data?.videos || []);
            
            const lMap = new Map();
            const safeLiked = Array.isArray(likedList) ? likedList : [];
            safeLiked.forEach(l => lMap.set(l.video_id, l));
            setLikedVideosMap(lMap);
            setLikedVideoIds(new Set(safeLiked.map(l => l.video_id)));

            if (data?.error) {
                console.error('[Twitch] API Error:', data.error);
                setError(data.error);
            }
        } catch (err) {
            console.error('[Twitch] Load Failed:', err);
            setError('Failed to connect to Twitch API.');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setInitialLoaded(true);
        }
    }, [initialLoaded]);

    useEffect(() => {
        loadSyncData();
    }, [loadSyncData]);

    // Refresh data when switching channels to ensure we catch recent status
    useEffect(() => {
        if (selected && initialLoaded) {
            loadSyncData(true);
        }
    }, [selected]); // eslint-disable-line

    const handleAdd = async (overrideQuery = null) => {
        const query = overrideQuery || addQuery;
        if (!query.trim()) return;
        setAdding(true);
        setError('');
        try {
            const ch = await api.searchTwitchChannel(query.trim());
            if (!ch || ch.error) { setError(ch?.error || 'Channel not found.'); return; }
            if (channels.find(c => c.id === ch.id)) { setError('Already followed!'); return; }

            const newCh = {
                id: ch.id,
                login: ch.broadcaster_login,
                display_name: ch.display_name,
                profile_image_url: ch.thumbnail_url,
            };

            await api.saveTwitchChannel(newCh);
            setChannels(prev => [...prev, newCh]);
            setAddQuery('');
            if (activeTab === 'streamers') setActiveTab('live');
            loadSyncData(true); // Refresh data for new channel
        } catch (err) {
            setError('Error adding channel.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (id) => {
        try {
            await api.removeTwitchChannel(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            if (selected === id) setSelected(null);
        } catch (err) {
            console.error('Remove channel error:', err);
        }
    };

    const handleSave = async (item, isLive, shouldDelegate = false, delegateDueDate = '') => {
        const payload = {
            video_id: item.video_id || item.id,
            title: item.title,
            user_name: item.user_name || item.display_name,
            user_id: item.user_id || item.id,
            thumbnail_url: item.thumbnail_url || item.thumbnail,
            created_at: item.created_at || item.published_at || new Date().toISOString(),
            type: isLive ? 'live' : 'archive',
            url: isLive ? `https://twitch.tv/${item.user_login}` : item.url,
            duration: item.duration || ''
        };

        try {
            await api.saveTwitchVideo(payload);
            setLibrary(prev => [payload, ...prev]);

            if (shouldDelegate) {
                await api.saveDelegationItem({
                    id: `DLG-TW-${Date.now()}`,
                    title: payload.title,
                    source: 'Twitch',
                    link: payload.url,
                    category: isLive ? 'Live Stream' : 'VOD',
                    importance: 'High',
                    due_date: delegateDueDate || '',
                    added_at: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error('Save twitch video error:', err);
        }
    };

    const handleRemoveSaved = async (item) => {
        if (!window.confirm('Remove from library?')) return;
        try {
            await api.removeSavedTwitchVideo(item.video_id || item.id);
            setLibrary(prev => prev.filter(v => (v.video_id || v.id) !== (item.video_id || item.id)));
        } catch (err) {
            console.error('Remove video error:', err);
        }
    };

    const handleDismiss = async (itemId) => {
        try {
            await api.saveTwitchDismissed(itemId);
            setDismissed(prev => new Set([...prev, itemId]));
        } catch (err) {
            console.error('Dismiss error:', err);
        }
    };

    const handlePlay = (ch, vid) => setActivePlayer({ channel: ch, videoId: vid });

    const toggleLikeTwitch = async (vidId) => {
        const isCurrentlyLiked = likedVideoIds.has(vidId);
        setLikedVideoIds(prev => {
            const next = new Set(prev);
            isCurrentlyLiked ? next.delete(vidId) : next.add(vidId);
            return next;
        });

        // Find metadata
        const v = streams.find(s => String(s.id) === String(vidId)) || 
                  videos.find(v => String(v.id) === String(vidId)) || 
                  library.find(l => String(l.video_id || l.id) === String(vidId)) ||
                  likedVideosMap.get(vidId);

        try {
            await api.toggleTwitchLiked({
                video_id: vidId,
                title: v?.title || 'Twitch Stream',
                user_name: v?.user_name || v?.display_name || '',
                thumbnail_url: v?.thumbnail_url || v?.thumbnail || ''
            });
        } catch (err) {
            setLikedVideoIds(prev => {
                const next = new Set(prev);
                isCurrentlyLiked ? next.add(vidId) : next.delete(vidId);
                return next;
            });
        }
    };

    // Filter Logic - Using String() to avoid ID type mismatches (String vs Number)
    const filteredStreams = selected ? streams.filter(s => String(s.user_id) === String(selected)) : streams;
    const filteredLibrary = selected ? library.filter(v => String(v.user_id) === String(selected)) : library;
    const pendingVideos = videos.filter(v =>
        !library.some(l => (l.video_id || l.id) === v.id) &&
        !dismissed.has(v.id) &&
        (!selected || String(v.user_id) === String(selected))
    );

    return (
        <div className="videos-layout">
            {/* ─── Mobile Segmented Control ─── */}
            <div className="vault-mobile-nav mobile-only" style={{ marginBottom: '1.25rem' }}>
                <div className="vault-segments">
                    <button className={activeTab === 'live' ? 'active' : ''} onClick={() => setActiveTab('live')}>🔴 Live</button>
                    <button className={activeTab === 'vods' ? 'active' : ''} onClick={() => setActiveTab('vods')}>🎞️ VODs</button>
                    <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>📚 Library</button>
                    <button className={activeTab === 'liked' ? 'active' : ''} onClick={() => setActiveTab('liked')}>❤️ Liked</button>
                    <button className={activeTab === 'streamers' ? 'active' : ''} onClick={() => setActiveTab('streamers')}>📡 Streamers</button>
                </div>
            </div>

            {/* ─── Desktop Sidebar ─── */}
            <aside className="videos-sidebar desktop-only">
                <div className="videos-sidebar-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>🎮 Twitch</h2>
                </div>
                <div className="yt-add-row">
                    <input
                        className="field-input yt-add-input"
                        placeholder="Search channel..."
                        value={addQuery}
                        onChange={e => setAddQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
                        {adding ? '…' : '+'}
                    </button>
                </div>
                {error && <p className="yt-error">{error}</p>}

                {channels.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '0.75rem 0' }}>
                        <button 
                            className={`yt-all-btn ${!selected && activeTab !== 'liked' ? 'active' : ''}`} 
                            onClick={() => { setSelected(null); setActiveTab('live'); }}
                        >
                            🌐 All Followed
                        </button>
                        <button 
                            className={`yt-all-btn ${activeTab === 'liked' ? 'active' : ''}`} 
                            onClick={() => { setActiveTab('liked'); setSelected(null); }} 
                            style={{ color: activeTab === 'liked' ? '#ef4444' : 'inherit' }}
                        >
                            ❤️ Liked Videos
                        </button>
                    </div>
                )}

                <div className="yt-channel-list">
                    {channels.map(ch => (
                        <TwitchChannelCard key={ch.id} ch={ch} selected={selected === ch.id}
                            onClick={() => { setSelected(ch.id); if (activeTab === 'liked') setActiveTab('live'); }} onRemove={handleRemove} />
                    ))}
                    {!loading && channels.length === 0 && (
                        <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                            <span className="empty-emoji">📡</span>
                            <p>Follow a channel to see live streams and VODs</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Mobile Streamers View ─── */}
            {activeTab === 'streamers' && (
                <div className="mobile-channels-view mobile-only fade-in" style={{ width: '100%', padding: '1rem 0.5rem' }}>
                    <div className="mobile-channel-list-grid">
                        {/* Integrated Add Card */}
                        <div className="mobile-channel-card add-card" onClick={() => {
                            const val = window.prompt('Enter Twitch channel name:');
                            if (val) handleAdd(val);
                        }}>
                            <div className="add-icon" style={{ color: '#a970ff' }}>＋</div>
                            <span>Add Streamer</span>
                        </div>

                        {channels.map(ch => (
                            <div key={ch.id} className={`mobile-channel-card ${selected === ch.id ? 'active' : ''}`} onClick={() => { setSelected(ch.id); setActiveTab('live'); }}>
                                <img src={ch.profile_image_url} alt="" className="card-avatar" style={{ border: '2px solid #a970ff' }} />
                                <span className="card-name">{ch.display_name}</span>
                                <button className="card-remove" onClick={(e) => { e.stopPropagation(); handleRemove(ch.id); }}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Content Feed ─── */}
            <main className={`videos-feed ${(activeTab === 'streamers' && 'desktop-only') || ''}`}>
                {/* Mobile Channel Strip */}
                {(activeTab === 'live' || activeTab === 'vods' || activeTab === 'library') && channels.length > 0 && (
                    <div className="mobile-channel-strip mobile-only fade-in">
                        <div className={`strip-item ${!selected ? 'active' : ''}`} onClick={() => setSelected(null)}>
                            <div className="strip-avatar-all" style={{ background: '#a970ff22', color: '#a970ff' }}>🌐</div>
                            <span>All</span>
                        </div>
                        {channels.map(ch => (
                            <div key={ch.id} className={`strip-item ${selected === ch.id ? 'active' : ''}`} onClick={() => setSelected(ch.id)}>
                                <img src={ch.profile_image_url} alt="" className="strip-avatar" style={{ borderColor: '#a970ff' }} />
                                <span>{ch.display_name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="yt-loading">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="yt-video-skeleton">
                                <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 8 }} />
                                <div className="skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                )}

                {refreshing && (
                    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#a970ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                        <div className="spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Refreshing Twitch Data...
                    </div>
                )}

                {!loading && (
                    <div className="fade-in">
                        {/* 1. Live Now Section — Always show on desktop or when Live tab is picked */}
                        {(activeTab === 'live' || activeTab === 'vods') && (
                            <div className="yt-pending-section" style={{ borderLeft: '4px solid #ff4655', marginBottom: '2rem' }}>
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title" style={{ color: '#ff4655' }}>🔴 Live Now</span>
                                    <span className="yt-pending-count" style={{ background: '#ff4655' }}>{filteredStreams.length}</span>
                                </div>
                                <div className="yt-video-grid">
                                    {filteredStreams.map(s => (
                                        <TwitchVideoCard
                                            key={s.id}
                                            item={s}
                                            type="live"
                                            onPlay={handlePlay}
                                            onSave={handleSave}
                                            isLiked={likedVideoIds.has(s.id)}
                                            onLike={toggleLikeTwitch}
                                        />
                                    ))}
                                    {filteredStreams.length === 0 && (
                                        <div className="empty-state" style={{ padding: '2rem' }}>
                                            <span className="empty-emoji">💤</span>
                                            <p>No one is live right now.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. VODs Section — Always show on desktop or when VODs tab is picked */}
                        {(activeTab === 'vods' || activeTab === 'live') && (
                            <div className="yt-pending-section">
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title">🎞️ Recent Highlights</span>
                                    <span className="yt-pending-count">{pendingVideos.length}</span>
                                </div>
                                <div className="yt-pending-grid">
                                    {pendingVideos.map(v => (
                                        <TwitchVideoCard
                                            key={v.id}
                                            item={v}
                                            type="pending"
                                            onPlay={handlePlay}
                                            onSave={handleSave}
                                            onDismiss={handleDismiss}
                                            isLiked={likedVideoIds.has(v.id)}
                                            onLike={toggleLikeTwitch}
                                        />
                                    ))}
                                    {pendingVideos.length === 0 && (
                                        <div className="empty-state" style={{ padding: '3rem' }}>
                                            <span className="empty-emoji">📼</span>
                                            <p>No recent highlights.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Saved Library */}
                        {(activeTab === 'library' || (activeTab === 'live' && filteredStreams.length === 0 && pendingVideos.length === 0 && activeTab !== 'liked')) && filteredLibrary.length > 0 && (
                            <div className="yt-section">
                                <div className="yt-approved-header">📚 Saved Library</div>
                                <div className="yt-video-grid">
                                    {filteredLibrary.map(item => (
                                        <TwitchVideoCard
                                            key={item.video_id || item.id}
                                            item={item}
                                            type="library"
                                            onPlay={handlePlay}
                                            onSave={handleRemoveSaved}
                                            isLiked={likedVideoIds.has(item.video_id || item.id)}
                                            onLike={toggleLikeTwitch}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Liked Section */}
                        {activeTab === 'liked' && (
                            <div className="yt-section">
                                <div className="yt-approved-header" style={{ color: '#ef4444' }}>❤️ Liked Videos</div>
                                {likedVideoIds.size === 0 ? (
                                    <div className="empty-state" style={{ padding: '3rem' }}>
                                        <span className="empty-emoji">🤍</span>
                                        <p>No liked Twitch content yet. HEART your favorites to see them here.</p>
                                    </div>
                                ) : (
                                    <div className="yt-video-grid">
                                        {[...likedVideoIds].map(id => {
                                            const v = streams.find(s => String(s.id) === String(id)) || 
                                                      videos.find(vd => String(vd.id) === String(id)) ||
                                                      library.find(l => String(l.video_id || l.id) === String(id)) ||
                                                      likedVideosMap.get(id);
                                            if (!v) return null;
                                            return (
                                                <TwitchVideoCard
                                                    key={id}
                                                    item={v}
                                                    type="library"
                                                    onPlay={handlePlay}
                                                    isLiked={true}
                                                    onLike={toggleLikeTwitch}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab !== 'streamers' && activeTab !== 'liked' && filteredStreams.length === 0 && pendingVideos.length === 0 && filteredLibrary.length === 0 && channels.length > 0 && (
                            <div className="empty-state" style={{ marginTop: '3rem' }}>
                                <span className="empty-emoji">🎮</span>
                                <p>No active streams or recent highlights found.</p>
                            </div>
                        )}

                        {channels.length === 0 && activeTab !== 'streamers' && (
                            <div className="empty-state" style={{ marginTop: '3rem' }}>
                                <span className="empty-emoji">📡</span>
                                <p>No streamers followed. Switch to "Streamers" to add some!</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <TwitchPlayerModal
                channel={activePlayer.channel}
                videoId={activePlayer.videoId}
                onClose={() => setActivePlayer({ channel: null, videoId: null })}
            />
        </div>
    );
}
