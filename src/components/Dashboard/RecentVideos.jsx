import { useState, useEffect } from 'react';
import { getChannelVideos } from '../../services/youtube';
import * as api from '../../services/api';
import YTPlayerModal from '../Videos/YTPlayerModal';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

export default function RecentVideos({ onNavigate }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasChannels, setHasChannels] = useState(true);
    const [activeVideo, setActiveVideo] = useState(null);

    useEffect(() => {
        const loadRecent = async () => {
            setLoading(true);
            try {
                const [channels, dismissed, approved] = await Promise.all([
                    api.getYTChannels(),
                    api.getYTDismissed(),
                    api.getSavedVideos()
                ]);

                if (!channels || channels.length === 0) {
                    setHasChannels(false);
                    return;
                }
                setHasChannels(true);

                const results = await Promise.all(channels.map(c => getChannelVideos(c.uploadsId, 8)));
                const cutoff = Date.now() - ONE_WEEK_MS;
                const recent = results
                    .flat()
                    .filter(v => {
                        const isRecent = new Date(v.publishedAt).getTime() >= cutoff;
                        const isNew = !dismissed.includes(v.id) && !approved.some(a => (a.video_id || a.id) === v.id);
                        return isRecent && isNew;
                    })
                    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
                setVideos(recent);
            } catch (err) {
                console.error('RecentVideos load error:', err);
            } finally {
                setLoading(false);
            }
        };
        loadRecent();
    }, []);

    const handleApprove = async (e, video) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.saveVideo({
                video_id: video.id,
                title: video.title,
                channel_title: video.channelTitle,
                channel_id: video.channelId,
                thumbnail: video.thumbnail,
                published_at: video.publishedAt,
            });
            setVideos(prev => prev.filter(v => v.id !== video.id));
        } catch (err) {
            console.error('Approve error:', err);
        }
    };

    const handleDismiss = async (e, videoId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.saveYTDismissed(videoId);
            setVideos(prev => prev.filter(v => v.id !== videoId));
        } catch (err) {
            console.error('Dismiss error:', err);
        }
    };

    if (!hasChannels && !loading) return null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>📺 New This Week (Curate)</div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onNavigate('videos')}
                    style={{ fontSize: '0.72rem' }}
                >
                    Management →
                </button>
            </div>

            {loading && (
                <div className="dash-videos-row">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="dash-video-skeleton">
                            <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 4 }} />
                        </div>
                    ))}
                </div>
            )}

            {!loading && videos.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    No new videos to curate this week.
                </p>
            )}

            {!loading && videos.length > 0 && (
                <div className="dash-videos-row">
                    {videos.slice(0, 6).map(v => (
                        <div key={v.id} className="dash-video-wrapper" onClick={() => setActiveVideo(v.id)} style={{ cursor: 'pointer' }}>
                            <div className="dash-video-card">
                                <div className="dash-thumb-wrap">
                                    <img src={v.thumbnail} alt={v.title} className="dash-thumb" />
                                    <span className="dash-ago">{timeAgo(v.publishedAt)}</span>
                                </div>
                                <p className="dash-video-title">{v.title}</p>
                                <span className="dash-video-ch">{v.channelTitle}</span>
                            </div>
                            <div className="dash-video-actions">
                                <button className="dash-approve-btn" onClick={(e) => handleApprove(e, v)} title="Approve">＋</button>
                                <button className="dash-dismiss-btn" onClick={(e) => handleDismiss(e, v.id)} title="Dismiss">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <YTPlayerModal videoId={activeVideo} onClose={() => setActiveVideo(null)} />
        </div>
    );
}
