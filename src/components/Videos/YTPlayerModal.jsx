import { useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';

export default function YTPlayerModal({ videoId, onClose }) {
    const { audioRef } = useAudio();

    useEffect(() => {
        if (!videoId) return;

        // Duck/Pause music when player opens
        if (audioRef?.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [videoId, onClose, audioRef]);

    if (!videoId) return null;

    return (
        <div className="yt-modal-overlay" onClick={onClose}>
            <div className="yt-modal-content" onClick={e => e.stopPropagation()}>
                <button className="yt-modal-close" onClick={onClose}>✕</button>
                <div className="yt-video-container">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
