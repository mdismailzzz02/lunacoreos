import { useState, useEffect } from 'react';
import { getSavedVideos } from '../../services/api';
import YTPlayerModal from '../Videos/YTPlayerModal';

function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

export default function ToBeViewedVideos({ onNavigate }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);

    useEffect(() => {
        setLoading(true);
        getSavedVideos()
            .then(data => {
                setVideos(data || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (!loading && videos.length === 0) return null;

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>✅ To Be Viewed (Saved)</div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onNavigate('videos')}
                    style={{ fontSize: '0.72rem' }}
                >
                    Library →
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
                <div className="dash-videos-row">
                    {videos.slice(0, 6).map(v => (
                        <div
                            key={v.video_id || v.id}
                            className="dash-video-card"
                            onClick={() => setActiveVideo(v.video_id || v.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="dash-thumb-wrap">
                                <img src={v.thumbnail} alt={v.title} className="dash-thumb" />
                                <span className="dash-ago">{timeAgo(v.published_at || v.publishedAt)}</span>
                            </div>
                            <p className="dash-video-title">{v.title}</p>
                            <span className="dash-video-ch">{v.channel_title || v.channelTitle}</span>
                        </div>
                    ))}
                </div>
            )}

            <YTPlayerModal videoId={activeVideo} onClose={() => setActiveVideo(null)} />
        </div>
    );
}
