import { useState, useEffect, useCallback } from 'react';
import { searchChannel, getChannelVideos, searchGlobalVideos, getChannelById } from '../../services/youtube';
import * as api from '../../services/api';
import YTPlayerModal from './YTPlayerModal';

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ── Sub-components ─────────────────────────────────────────────
function ChannelCard({ ch, selected, onClick, onRemove }) {
    return (
        <div className={`yt-channel-card ${selected ? 'active' : ''}`} onClick={onClick}>
            <img src={ch.thumbnail} alt={ch.title} className="yt-ch-avatar" />
            <div className="yt-ch-info">
                <span className="yt-ch-name">{ch.title}</span>
                <span className="yt-ch-subs">{ch.subs}</span>
            </div>
            <button className="yt-ch-remove" onClick={e => { e.stopPropagation(); onRemove(ch.id); }} title="Remove">✕</button>
        </div>
    );
}

function VideoCard({ video, onPlay, isLiked, onLike, isChannelSaved, onSaveChannel, onDelegate, isDelegated }) {
    const vidId = video.video_id || (typeof video.id === 'object' ? video.id.videoId : video.id);
    return (
        <div className="yt-video-card" onClick={() => onPlay(vidId)} style={{ cursor: 'pointer' }}>
            <div className="yt-thumb-wrap" style={{ position: 'relative' }}>
                <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
                <span className="yt-ago">{timeAgo(video.publishedAt || video.published_at)}</span>
                
                <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* Save Channel Button */}
                    {onSaveChannel && (
                        <button
                            onClick={e => { e.stopPropagation(); onSaveChannel(video.channelId || video.channel_id); }}
                            title={isChannelSaved ? 'Channel Saved' : 'Save Channel'}
                            style={{
                                background: isChannelSaved ? 'rgba(59,130,246,0.85)' : 'rgba(0,0,0,0.55)',
                                border: 'none', borderRadius: '50%',
                                width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '13px',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s',
                                boxShadow: isChannelSaved ? '0 0 8px rgba(59,130,246,0.6)' : 'none'
                            }}
                        >
                            {isChannelSaved ? '📺' : '➕'}
                        </button>
                    )}
                    
                    {/* Delegate Button */}
                    {onDelegate && (
                        <button
                            onClick={e => { e.stopPropagation(); onDelegate(video); }}
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
                    )}

                    {/* Like button */}
                    {onLike && (
                        <button
                            onClick={e => { e.stopPropagation(); onLike(vidId); }}
                            title={isLiked ? 'Remove from library' : 'Save to library'}
                            style={{
                                background: isLiked ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
                                border: 'none', borderRadius: '50%',
                                width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '13px',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s',
                                boxShadow: isLiked ? '0 0 8px rgba(239,68,68,0.6)' : 'none'
                            }}
                        >
                            {isLiked ? '❤️' : '🤍'}
                        </button>
                    )}
                </div>
            </div>
            <div className="yt-video-info">
                <p className="yt-video-title">{video.title}</p>
                <span className="yt-video-ch">{video.channelTitle || video.channel_title}</span>
            </div>
        </div>
    );
}

function PendingCard({ video, onApprove, onDismiss, onPlay }) {
    const [saving, setSaving] = useState(false);
    const [shouldDelegate, setShouldDelegate] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');

    const handleApprove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaving(true);
        await onApprove(video, shouldDelegate, delegateDueDate);
        setSaving(false);
    };

    const handleDismissAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss(video.id);
    };

    return (
        <div className="yt-pending-card" onClick={() => onPlay(video.id)} style={{ cursor: 'pointer' }}>
            <div className="yt-pending-link">
                <div className="yt-thumb-wrap">
                    <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
                    <span className="yt-ago">{timeAgo(video.publishedAt)}</span>
                </div>
                <div className="yt-video-info">
                    <p className="yt-video-title">{video.title}</p>
                    <span className="yt-video-ch">{video.channelTitle}</span>
                </div>
            </div>
            <div className="yt-pending-actions" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="delegate-toggle" style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={shouldDelegate} onChange={e => setShouldDelegate(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                        📥 Delegation
                    </label>
                    <button className="yt-approve-btn" onClick={handleApprove} disabled={saving} title="Add to Library">
                        {saving ? '…' : '＋'}
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
                <button className="yt-dismiss-btn" onClick={handleDismissAction} title="Ignore Video">
                    ✕
                </button>
            </div>
        </div>
    );
}

// ── Main Videos Component ──────────────────────────────────────
export default function Videos() {
    const [channels, setChannels] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const [library, setLibrary] = useState([]); // Full list from sheet

    const [selected, setSelected] = useState(null);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [delegatedVideoIds, setDelegatedVideoIds] = useState(new Set());
    const [delegatingVideo, setDelegatingVideo] = useState(null);
    const [delegateDate, setDelegateDate] = useState('');
    const [addQuery, setAddQuery] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [activeVideo, setActiveVideo] = useState(null);
    const [activeTab, setActiveTab] = useState('feed');
    const [contentFilter, setContentFilter] = useState('all'); // all, videos, live, shorts
    const [nextPageToken, setNextPageToken] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Global Search State
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchNextPageToken, setSearchNextPageToken] = useState(null);

    // Liked videos — synced with backend
    const [likedVideoIds, setLikedVideoIds] = useState(new Set());
    const [likedVideosMap, setLikedVideosMap] = useState(new Map()); // stores full metadata for liked videos

    const toggleLikeVideo = async (vidId) => {
        const isCurrentlyLiked = likedVideoIds.has(vidId);
        
        // Find video metadata for the backend and local state
        const v = pending.find(p => p.id === vidId) || library.find(l => (l.video_id || l.id) === vidId) || searchResults.find(s => s.id === vidId);
        const originalMapItem = likedVideosMap.get(vidId);

        // Optimistic UI updates for both Sets and Maps
        setLikedVideoIds(prev => {
            const next = new Set(prev);
            isCurrentlyLiked ? next.delete(vidId) : next.add(vidId);
            return next;
        });
        
        setLikedVideosMap(prev => {
            const next = new Map(prev);
            if (isCurrentlyLiked) {
                next.delete(vidId);
            } else {
                next.set(vidId, {
                    video_id: vidId,
                    title: v?.title || '',
                    channel_title: v?.channelTitle || v?.channel_title || '',
                    channel_id: v?.channelId || v?.channel_id || '',
                    published_at: v?.publishedAt || v?.published_at || new Date().toISOString(),
                    thumbnail: v?.thumbnail || '',
                    is_favorite: false
                });
            }
            return next;
        });
        
        try {
            await api.toggleYTLiked({
                video_id: vidId,
                title: v?.title || '',
                channel_title: v?.channelTitle || v?.channel_title || '',
                channel_id: v?.channelId || v?.channel_id || '',
                published_at: v?.publishedAt || v?.published_at || new Date().toISOString(),
                thumbnail: v?.thumbnail || '',
                liked: !isCurrentlyLiked
            });
        } catch (err) {
            console.error('Failed to toggle like:', err);
            // Revert on error
            setLikedVideoIds(prev => {
                const next = new Set(prev);
                isCurrentlyLiked ? next.add(vidId) : next.delete(vidId);
                return next;
            });
            setLikedVideosMap(prev => {
                const next = new Map(prev);
                if (isCurrentlyLiked && originalMapItem) {
                    next.set(vidId, originalMapItem);
                } else {
                    next.delete(vidId);
                }
                return next;
            });
        }
    };


    // Load initial data from Google Sheets
    const loadSyncData = useCallback(async () => {
        try {
            // Fetch core data (these have existed longer)
            const [chans, ids, approvedList] = await Promise.all([
                api.getYTChannels(),
                api.getYTDismissed(),
                api.getSavedVideos()
            ]);
            setChannels(chans || []);
            setDismissed(new Set(ids || []));
            setLibrary(approvedList || []);

            // Fetch Liked list separately so it doesn't break the whole app if backend isn't updated
            try {
                const likedList = await api.getYTLiked();
                if (likedList && Array.isArray(likedList)) {
                    const likedMap = new Map();
                    likedList.forEach(l => likedMap.set(l.video_id, l));
                    setLikedVideosMap(likedMap);
                    setLikedVideoIds(new Set(likedList.map(l => l.video_id)));
                }
            } catch (likedErr) {
                console.warn('Liked videos sync failed (likely backend needs deployment):', likedErr);
            }
        } catch (err) {
            console.error('Load sync error:', err);
            setError('DEBUG ERROR: ' + (err.message || JSON.stringify(err)));
        }
    }, []);

    useEffect(() => {
        loadSyncData().finally(() => {
            setLoading(false);
            setInitialLoaded(true);
        });
    }, [loadSyncData]);

    const fetchVideos = useCallback(async (chans, sel, ignored, savedSet) => {
        if (!chans.length) {
            setPending([]);
            return;
        }
        
        // Only show skeletons on first load, otherwise use a background 'refreshing' state
        if (!initialLoaded) setLoading(true);
        else setRefreshing(true);
        
        setError('');
        try {
            const targets = sel ? chans.filter(c => c.id === sel) : chans;
            const results = await Promise.all(targets.map(c => getChannelVideos(c.uploadsId, sel ? 20 : 8)));
            const flat = results.map(r => r.items).flat().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            // Pending = flat MINUS (already saved in library OR ignored)
            const waiting = flat.filter(v => !savedSet.has(v.id) && !ignored.has(v.id));
            setPending(waiting);
            
            // Only support pagination when viewing a single channel
            if (sel && results.length === 1) {
                setNextPageToken(results[0].nextPageToken);
            } else {
                setNextPageToken(null);
            }
        } catch {
            setError('Failed to load videos. Check your API key or network.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [initialLoaded]);

    // Re-fetch uploads when channels/selection/library IDs change
    useEffect(() => {
        if ((channels && channels.length) || !loading) {
            const savedIds = new Set((library || []).map(v => v.video_id || v.id));
            fetchVideos(channels || [], selected, dismissed || new Set(), savedIds);
        }
    }, [channels, selected, dismissed, library, loading, fetchVideos]);

    const loadMore = async () => {
        if (!selected || !nextPageToken) return;
        const target = channels.find(c => c.id === selected);
        if (!target) return;
        
        setLoadingMore(true);
        try {
            const result = await getChannelVideos(target.uploadsId, 20, nextPageToken);
            const savedSet = new Set((library || []).map(v => v.video_id || v.id));
            const newItems = result.items.filter(v => !savedSet.has(v.id) && !dismissed.has(v.id));
            
            setPending(prev => [...prev, ...newItems]);
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleAdd = async () => {
        if (!addQuery.trim()) return;
        setAdding(true);
        setError('');
        try {
            const ch = await searchChannel(addQuery.trim());
            if (!ch) { setError('Channel not found. Try the exact handle (e.g. @mkbhd)'); return; }
            if (channels.find(c => c.id === ch.id)) { setError('Already subscribed!'); return; }

            const sub = ch.statistics?.subscriberCount;
            const subs = sub
                ? (sub >= 1_000_000 ? `${(sub / 1_000_000).toFixed(1)}M subs`
                    : sub >= 1_000 ? `${(sub / 1_000).toFixed(0)}K subs`
                        : `${sub} subs`) : '';

            const newCh = {
                id: ch.id, 
                title: ch.snippet?.title || 'Unknown',
                thumbnail: ch.snippet?.thumbnails?.default?.url,
                uploadsId: ch.contentDetails?.relatedPlaylists?.uploads,
                subs: subs || '',
            };

            await api.saveYTChannel(newCh);
            setChannels(prev => [...prev, newCh]);
            setAddQuery('');
            if (activeTab === 'channels') setActiveTab('feed'); // Switch back to feed after adding
        } catch {
            setError('Error searching channel. Try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleAddChannelById = async (channelId) => {
        if (!channelId || channels.find(c => c.id === channelId)) return;
        setAdding(true);
        try {
            const ch = await getChannelById(channelId);
            if (!ch) return;

            const sub = ch.statistics?.subscriberCount;
            const subs = sub
                ? (sub >= 1_000_000 ? `${(sub / 1_000_000).toFixed(1)}M subs`
                    : sub >= 1_000 ? `${(sub / 1_000).toFixed(0)}K subs`
                        : `${sub} subs`) : '';

            const newCh = {
                id: ch.id, 
                title: ch.snippet?.title || 'Unknown',
                thumbnail: ch.snippet?.thumbnails?.default?.url,
                uploadsId: ch.contentDetails?.relatedPlaylists?.uploads,
                subs: subs || '',
            };

            await api.saveYTChannel(newCh);
            setChannels(prev => [...prev, newCh]);
        } catch (err) {
            console.error('Failed to add channel by id:', err);
        } finally {
            setAdding(false);
        }
    };

    const handleGlobalSearch = async () => {
        if (!globalSearchQuery.trim()) return;
        setIsSearching(true);
        try {
            const result = await searchGlobalVideos(globalSearchQuery, 20);
            setSearchResults(result.items);
            setSearchNextPageToken(result.nextPageToken);
        } catch (err) {
            console.error('Global search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleGlobalLoadMore = async () => {
        if (!globalSearchQuery.trim() || !searchNextPageToken) return;
        setIsSearching(true);
        try {
            const result = await searchGlobalVideos(globalSearchQuery, 20, searchNextPageToken);
            setSearchResults(prev => [...prev, ...result.items]);
            setSearchNextPageToken(result.nextPageToken);
        } catch (err) {
            console.error('Global search load more failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const removeChannel = async (id) => {
        try {
            await api.removeYTChannel(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            if (selected === id) setSelected(null);
        } catch (err) {
            console.error('Remove channel error:', err);
        }
    };

    const handleApprove = async (video, shouldDelegate = false, delegateDueDate = '') => {
        const payload = {
            video_id: video.id,
            title: video.title,
            channel_title: video.channelTitle,
            channel_id: video.channelId,
            thumbnail: video.thumbnail,
            published_at: video.publishedAt,
        };
        try {
            await api.saveVideo(payload);
            setLibrary(prev => [payload, ...prev]);

            if (shouldDelegate) {
                await api.saveDelegationItem({
                    id: `DLG-YT-${Date.now()}`,
                    title: payload.title,
                    source: 'YouTube',
                    link: `https://youtube.com/watch?v=${payload.video_id}`,
                    category: 'Video',
                    importance: 'High',
                    due_date: delegateDueDate || '',
                    added_at: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error('Save video error:', err);
        }
    };

    const handleDelegateVideo = (video) => {
        const vidId = video.video_id || (typeof video.id === 'object' ? video.id.videoId : video.id);
        if (delegatedVideoIds.has(vidId)) return; // Already delegated
        
        setDelegatingVideo(video);
        setDelegateDate('');
    };

    const confirmDelegateVideo = async () => {
        if (!delegatingVideo) return;
        const vidId = delegatingVideo.video_id || (typeof delegatingVideo.id === 'object' ? delegatingVideo.id.videoId : delegatingVideo.id);

        try {
            await api.saveDelegationItem({
                id: `DLG-YT-${Date.now()}`,
                title: delegatingVideo.title,
                link: `https://youtube.com/watch?v=${vidId}`,
                category: 'Video',
                importance: 'Medium',
                due_date: delegateDate || '',
                added_at: new Date().toISOString()
            });
            setDelegatedVideoIds(prev => {
                const next = new Set(prev);
                next.add(vidId);
                return next;
            });
            setDelegatingVideo(null);
        } catch (err) {
            console.error('Failed to delegate video:', err);
        }
    };

    const handleDismiss = async (videoId) => {
        try {
            await api.saveYTDismissed(videoId);
            setDismissed(prev => new Set([...prev, videoId]));
        } catch (err) {
            console.error('Dismiss video error:', err);
        }
    };

    // Filter library based on selected channel (if any)
    const filteredLibrary = selected
        ? library.filter(v => (v.channel_id || v.channelId) === selected)
        : library;

    return (
        <div className="videos-layout">
            {/* ─── Mobile Segmented Control ─── */}
            <div className="vault-mobile-nav mobile-only" style={{ marginBottom: '1.25rem' }}>
                <div className="vault-segments">
                    <button className={activeTab === 'feed' ? 'active' : ''} onClick={() => setActiveTab('feed')}>🔥 Feed</button>
                    <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>🔍 Search</button>
                    <button className={activeTab === 'liked' ? 'active' : ''} onClick={() => setActiveTab('liked')}>❤️ Liked</button>
                    <button className={activeTab === 'channels' ? 'active' : ''} onClick={() => setActiveTab('channels')}>📡 Channels</button>
                </div>
            </div>

            {/* ─── Desktop Sidebar ─── */}
            <aside className="videos-sidebar desktop-only">
                <div className="videos-sidebar-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>📺 Channels</h2>
                </div>
                <div className="yt-add-row">
                    <input
                        className="field-input yt-add-input"
                        placeholder="@handle or channel name"
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
                            className={`yt-all-btn ${!selected && activeTab === 'feed' ? 'active' : ''}`} 
                            onClick={() => { setSelected(null); setActiveTab('feed'); }}
                        >
                            🌐 All Feed
                        </button>
                        <button 
                            className={`yt-all-btn ${activeTab === 'search' ? 'active' : ''}`} 
                            onClick={() => { setActiveTab('search'); setSelected(null); }}
                        >
                            🔍 Search YouTube
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
                        <ChannelCard key={ch.id} ch={ch} selected={selected === ch.id}
                            onClick={() => setSelected(ch.id)} onRemove={removeChannel} />
                    ))}
                    {!loading && channels.length === 0 && (
                        <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                            <span className="empty-emoji">📡</span>
                            <p>Add a channel above to see their latest videos</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Mobile Channels View ─── */}
            {activeTab === 'channels' && (
                <div className="mobile-channels-view mobile-only fade-in" style={{ width: '100%', padding: '0.5rem' }}>
                    <div className="mobile-channel-list-grid">
                        {/* Integrated Add Card */}
                        <div className="mobile-channel-card add-card" onClick={() => {
                            const val = window.prompt('Enter YouTube @handle or channel name:');
                            if (val) handleAdd(val);
                        }}>
                            <div className="add-icon">＋</div>
                            <span>Add Channel</span>
                        </div>

                        {channels.map(ch => (
                            <div key={ch.id} className={`mobile-channel-card ${selected === ch.id ? 'active' : ''}`} onClick={() => { setSelected(ch.id); setActiveTab('feed'); }}>
                                <img src={ch.thumbnail} alt="" className="card-avatar" />
                                <span className="card-name">{ch.title}</span>
                                <button className="card-remove" onClick={(e) => { e.stopPropagation(); removeChannel(ch.id); }}>✕</button>
                            </div>
                        ))}
                    </div>
                    {error && <p className="yt-error" style={{ marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                </div>
            )}

            {/* ─── Video Feed Area ─── */}
            <main className={`videos-feed ${(activeTab === 'channels' && 'desktop-only') || ''}`}>
                {/* Mobile Channel Strip (on Feed tab) */}
                {activeTab === 'feed' && channels.length > 0 && (
                    <div className="mobile-channel-strip mobile-only fade-in">
                        <div className={`strip-item ${!selected ? 'active' : ''}`} onClick={() => setSelected(null)}>
                            <div className="strip-avatar-all">🌐</div>
                            <span>All</span>
                        </div>
                        {channels.map(ch => (
                            <div key={ch.id} className={`strip-item ${selected === ch.id ? 'active' : ''}`} onClick={() => setSelected(ch.id)}>
                                <img src={ch.thumbnail} alt="" className="strip-avatar" />
                                <span>{ch.title.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content Type Filters (only show when a specific channel is selected on the feed) */}
                {activeTab === 'feed' && selected && (
                    <div className="yt-content-filters fade-in" style={{ display: 'flex', gap: '8px', padding: '0 1.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
                        <button className={`yt-filter-chip ${contentFilter === 'all' ? 'active' : ''}`} onClick={() => setContentFilter('all')}>All</button>
                        <button className={`yt-filter-chip ${contentFilter === 'videos' ? 'active' : ''}`} onClick={() => setContentFilter('videos')}>Videos</button>
                        <button className={`yt-filter-chip ${contentFilter === 'live' ? 'active' : ''}`} onClick={() => setContentFilter('live')}>Live</button>
                        <button className={`yt-filter-chip ${contentFilter === 'shorts' ? 'active' : ''}`} onClick={() => setContentFilter('shorts')}>Shorts</button>
                    </div>
                )}

                {loading && (
                    <div className="yt-loading">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="yt-video-skeleton">
                                <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 8 }} />
                                <div className="skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4 }} />
                                <div className="skeleton" style={{ height: 12, marginTop: 6, width: '60%', borderRadius: 4 }} />
                            </div>
                        ))}
                    </div>
                )}

                {refreshing && (
                    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                        <div className="spinner-sm" /> Refreshing Feed...
                    </div>
                )}

                {!loading && (
                    <div className="fade-in">
                        {/* Pending Approval section */}
                        {activeTab === 'feed' && pending.length > 0 && (
                            <div className="yt-pending-section">
                                <div className="yt-pending-header">
                                    <span className="yt-pending-title">🕐 Newly Added</span>
                                </div>
                                <div className="yt-pending-grid">
                                    {pending.filter(v => {
                                        if (!selected) return true; // Only filter when a channel is selected
                                        if (contentFilter === 'all') return true;
                                        if (contentFilter === 'live') return v.isLive;
                                        if (contentFilter === 'shorts') return v.isShort;
                                        if (contentFilter === 'videos') return !v.isLive && !v.isShort;
                                        return true;
                                    }).map(v => (
                                        <PendingCard
                                            key={v.id}
                                            video={v}
                                            onApprove={handleApprove}
                                            onDismiss={handleDismiss}
                                            onPlay={setActiveVideo}
                                        />
                                    ))}
                                </div>
                                
                                {/* Load More Button for single channel view */}
                                {selected && nextPageToken && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                                        <button 
                                            className="btn btn-secondary" 
                                            onClick={loadMore} 
                                            disabled={loadingMore}
                                            style={{ minWidth: '140px', borderRadius: '100px' }}
                                        >
                                            {loadingMore ? <div className="spinner-sm" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}/> : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Saved Library Section — shows in the global 'All Feed' (below new) */}
                        {(activeTab === 'feed' && !selected) && filteredLibrary.length > 0 && (
                            <div className={pending.length > 0 ? 'yt-approved-section' : ''} style={{ marginTop: '1.5rem' }}>
                                <div className="yt-approved-header">📚 Saved from Library</div>
                                <div className="yt-video-grid">
                                    {filteredLibrary.map(v => (
                                        <VideoCard
                                            key={v.video_id || v.id}
                                            video={v}
                                            onPlay={setActiveVideo}
                                            isLiked={likedVideoIds.has(v.video_id || v.id)}
                                            onLike={toggleLikeVideo}
                                            isChannelSaved={channels.some(c => c.id === (v.channelId || v.channel_id))}
                                            onSaveChannel={handleAddChannelById}
                                            onDelegate={handleDelegateVideo}
                                            isDelegated={delegatedVideoIds.has(v.video_id || v.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Global Search Section */}
                        {activeTab === 'search' && (
                            <div className="yt-approved-section fade-in">
                                <div className="yt-approved-header" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', width: '100%', maxWidth: '600px' }}>
                                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            className="field-input" 
                                            style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            placeholder="Search YouTube for any topic..."
                                            value={globalSearchQuery}
                                            onChange={e => setGlobalSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                                        />
                                        {globalSearchQuery && (
                                            <button
                                                onClick={() => {
                                                    setGlobalSearchQuery('');
                                                    setSearchResults([]);
                                                    setSearchNextPageToken('');
                                                }}
                                                style={{
                                                    position: 'absolute', right: '12px', background: 'none', border: 'none',
                                                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px',
                                                    fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                                title="Clear search"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ borderRadius: '100px', padding: '0 24px' }}
                                        onClick={handleGlobalSearch}
                                        disabled={isSearching}
                                    >
                                        {isSearching && searchResults.length === 0 ? '...' : 'Search'}
                                    </button>
                                </div>
                                
                                {searchResults.length > 0 ? (
                                    <>
                                        <div className="yt-video-grid">
                                            {searchResults.map(v => (
                                                <VideoCard 
                                                    key={v.id.videoId} 
                                                    video={v} 
                                                    onPlay={setActiveVideo} 
                                                    isLiked={likedVideoIds.has(v.id.videoId)} 
                                                    onLike={toggleLikeVideo}
                                                    isChannelSaved={channels.some(c => c.id === v.snippet?.channelId)}
                                                    onSaveChannel={handleAddChannelById}
                                                    onDelegate={handleDelegateVideo}
                                                    isDelegated={delegatedVideoIds.has(v.id.videoId)}
                                                />
                                            ))}
                                        </div>
                                        {searchNextPageToken && (
                                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    onClick={handleGlobalLoadMore} 
                                                    disabled={isSearching}
                                                    style={{ minWidth: '140px', borderRadius: '100px' }}
                                                >
                                                    {isSearching ? <div className="spinner-sm" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}/> : 'Load More'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    !isSearching && globalSearchQuery && (
                                        <div className="empty-state">
                                            <span className="empty-emoji">🔍</span>
                                            <p>No results found for "{globalSearchQuery}"</p>
                                        </div>
                                    )
                                )}
                                {!globalSearchQuery && searchResults.length === 0 && (
                                    <div className="empty-state" style={{ marginTop: '2rem' }}>
                                        <span className="empty-emoji">🌎</span>
                                        <p>Search all of YouTube to find new videos.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Liked List Section — shows whenever tab is 'liked' */}
                        {activeTab === 'liked' && (
                            <div className="yt-approved-section">
                                <div className="yt-approved-header">❤️ Liked Videos</div>
                                {likedVideoIds.size === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-emoji">🤍</span>
                                        <p>No liked videos yet. Tap ❤️ on any video to save it here.</p>
                                    </div>
                                ) : (
                                    <div className="yt-video-grid">
                                        {[...likedVideoIds].map(id => {
                                            const v = library.find(l => (l.video_id || l.id) === id) || likedVideosMap.get(id);
                                            if (!v) return null;
                                            return (
                                                <VideoCard
                                                    key={id}
                                                    video={v}
                                                    onPlay={setActiveVideo}
                                                    isLiked={true}
                                                    onLike={toggleLikeVideo}
                                                    isChannelSaved={channels.some(c => c.id === (v.channelId || v.channel_id))}
                                                    onSaveChannel={handleAddChannelById}
                                                    onDelegate={handleDelegateVideo}
                                                    isDelegated={delegatedVideoIds.has(v.video_id || v.id)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab !== 'channels' && filteredLibrary.length === 0 && pending.length === 0 && channels.length > 0 && (
                            <div className="empty-state">
                                <span className="empty-emoji">🎬</span>
                                <p>No videos found</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Global Modal Player */}
            <YTPlayerModal videoId={activeVideo} onClose={() => setActiveVideo(null)} />

            {/* Delegation Date Modal */}
            {delegatingVideo && (
                <div className="modal-overlay" onClick={() => setDelegatingVideo(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Delegate Video</h3>
                            <button className="icon-btn" onClick={() => setDelegatingVideo(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img src={delegatingVideo.thumbnail} alt="" style={{ width: '120px', borderRadius: '8px', aspectRatio: '16/9', objectFit: 'cover' }} />
                                <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {delegatingVideo.title}
                                </p>
                            </div>
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
                                <button className="btn btn-secondary" onClick={() => setDelegatingVideo(null)} style={{ flex: 1, justifyContent: 'center' }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={confirmDelegateVideo} style={{ flex: 1, justifyContent: 'center' }}>
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

// Force HMR reload
