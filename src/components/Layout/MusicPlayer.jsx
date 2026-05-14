import { useRef, useState, useEffect, useCallback } from 'react';
import { useAudio, STATIONS } from '../../context/AudioContext';
import Dither from '../Shared/Dither';
import { 
    Play, Pause, X, Volume2, VolumeX, Disc, 
    Coffee, Wind, Moon, Radio
} from 'lucide-react';
import '../../styles/MusicPlayer.css';

// ── YouTube helpers ────────────────────────────────────────────
const YT_IDS = ['1RcVIuZ8Wdk', 'PXpERbbAvBs', '0dcFWLV_OlI'];
function pickRandom() { return YT_IDS[Math.floor(Math.random() * YT_IDS.length)]; }

function extractYTId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch (_) { }
    return null;
}

function loadYTApi() {
    if (window.YT || document.getElementById('yt-api-script')) return;
    const s = document.createElement('script');
    s.id = 'yt-api-script';
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
}

const LS_RADIO_KEY = 'luna_radio_url';
const LS_MUSIC_MODAL_KEY = 'luna_music_modal_open';

// ─────────────────────────────────────────────────────────────
export default function MusicPlayer() {
    const audioRef = useRef(null);
    const ytDivRef = useRef(null);
    const ytPlayer = useRef(null);
    const pendingYT = useRef(null);

    const { registerMusic, volume, setMusicVolume, playing, setPlaying,
        station, selectStation } = useAudio();
    const [muted, setMuted] = useState(false);
    const [prevVol, setPrevVol] = useState(volume);
    const [showModal, setShowModal] = useState(() => localStorage.getItem(LS_MUSIC_MODAL_KEY) === 'true');

    // Radio station state
    const [radioUrl, setRadioUrl] = useState(() => localStorage.getItem(LS_RADIO_KEY) || '');
    const [radioInput, setRadioInput] = useState('');
    const [showRadioInput, setShowRadioInput] = useState(false);
    const [trackName, setTrackName] = useState(''); // live track title from YT

    // Add method to open modal from header
    useEffect(() => {
        console.log('[MusicPlayer] Mounting and registering window.openMusicPlayer');
        window.openMusicPlayer = () => {
            console.log('[MusicPlayer] window.openMusicPlayer called, opening modal');
            setShowModal(true);
            localStorage.setItem(LS_MUSIC_MODAL_KEY, 'true');
        };
        return () => {
            console.log('[MusicPlayer] Unmounting, deleting window.openMusicPlayer');
            delete window.openMusicPlayer;
        };
    }, []);

    // ── YT Player helpers ─────────────────────────────────────
    const createYTPlayer = useCallback((videoId) => {
        if (!window.YT || !window.YT.Player) { pendingYT.current = videoId; return; }
        if (ytPlayer.current) {
            try { ytPlayer.current.destroy(); } catch (_) { }
            ytPlayer.current = null;
        }
        ytPlayer.current = new window.YT.Player(ytDivRef.current, {
            height: '1', width: '1',
            videoId,
            playerVars: {
                autoplay: 0, controls: 0, loop: 1,
                playlist: videoId, rel: 0, modestbranding: 1,
                playsinline: 1,
                mute: 1
            },
            events: {
                onReady: (e) => {
                    e.target.mute();
                    e.target.setVolume(Math.round(volume * 100));
                    
                    const unmute = () => {
                        try {
                            e.target.unMute();
                            e.target.setVolume(muted ? 0 : Math.round(volume * 100));
                        } catch (_) { }
                        document.removeEventListener('click', unmute);
                        document.removeEventListener('touchstart', unmute);
                    };
                    document.addEventListener('click', unmute);
                    document.addEventListener('touchstart', unmute, { passive: true });

                    try {
                        const title = e.target.getVideoData()?.title;
                        if (title) {
                            setTrackName(title);
                            if ('mediaSession' in navigator) {
                                navigator.mediaSession.metadata = new window.MediaMetadata({
                                    title: title,
                                    artist: 'Md Ismail Radio (YouTube)',
                                    album: 'Md Ismail Vault',
                                    artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
                                });
                            }
                        }
                    } catch (_) { }
                },
                onStateChange: (e) => {
                    if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
                    if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
                    if (e.data === -1) setPlaying(false);
                }
            },
        });
    }, [volume, muted, setPlaying]);

    const destroyYT = () => {
        if (ytPlayer.current) {
            try { ytPlayer.current.destroy(); } catch (_) { }
            ytPlayer.current = null;
        }
    };

    // ── Mount / API bootstrap ─────────────────────────────────
    useEffect(() => {
        loadYTApi();
        window.onYouTubeIframeAPIReady = () => {
            if (pendingYT.current) {
                createYTPlayer(pendingYT.current);
                pendingYT.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        registerMusic(audio);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => togglePlay());
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: STATIONS[0].desc,
                artist: STATIONS[0].label,
                album: 'Md Ismail Vault',
                artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            });
        }
    }, []);

    useEffect(() => {
        if (!ytPlayer.current) return;
        if (station.id === 'ambience' || station.id === 'radio') {
            try { ytPlayer.current.setVolume(muted ? 0 : Math.round(volume * 100)); }
            catch (_) { }
        }
    }, [volume, muted, station.id]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
        }
    }, [playing]);

    // ── Controls ──────────────────────────────────────────────
    const togglePlay = () => {
        console.log('[MusicPlayer] togglePlay called. Current station:', station.id, 'Playing:', playing);
        if (station.id === 'ambience' || station.id === 'radio') {
            if (!ytPlayer.current) {
                console.log('[MusicPlayer] ytPlayer missing, recreating...');
                createYTPlayer(station.id === 'radio' ? extractYTId(radioUrl) : pickRandom());
                return;
            }
            try {
                if (playing) { 
                    console.log('[MusicPlayer] Pausing YouTube');
                    ytPlayer.current.pauseVideo(); 
                    setPlaying(false); 
                } else { 
                    console.log('[MusicPlayer] Playing YouTube');
                    ytPlayer.current.playVideo(); 
                    setPlaying(true); 
                }
            } catch (err) { console.error('[MusicPlayer] YT Control error:', err); }
            return;
        }
        const a = audioRef.current;
        if (!a) return;
        console.log('[MusicPlayer] Toggling Audio Element. Current paused:', a.paused);
        if (a.paused) {
            a.play().catch(err => console.error('[MusicPlayer] Audio Play error:', err));
        } else {
            a.pause();
        }
    };

    const toggleMute = () => {
        if (muted) {
            setMusicVolume(prevVol);
            if (audioRef.current) audioRef.current.volume = prevVol;
            try { ytPlayer.current?.unMute(); ytPlayer.current?.setVolume(Math.round(prevVol * 100)); } catch (_) { }
            setMuted(false);
        } else {
            setPrevVol(volume);
            setMusicVolume(0);
            if (audioRef.current) audioRef.current.volume = 0;
            try { ytPlayer.current?.mute(); } catch (_) { }
            setMuted(true);
        }
    };

    const onVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setMusicVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
        try { ytPlayer.current?.unMute(); ytPlayer.current?.setVolume(Math.round(v * 100)); } catch (_) { }
        setMuted(v === 0);
    };

    const playUrl = useCallback((url) => {
        if (!url) return;
        const ytId = extractYTId(url);
        if (ytId) {
            if (audioRef.current) audioRef.current.pause();
            createYTPlayer(ytId);
        } else {
            destroyYT();
            setPlaying(false);
            const a = audioRef.current;
            if (!a) return;
            a.src = url;
            a.play().catch(() => { });
        }
    }, [createYTPlayer, setPlaying]);

    const applyRadioUrl = () => {
        const url = radioInput.trim();
        if (!url) return;
        localStorage.setItem(LS_RADIO_KEY, url);
        setRadioUrl(url);
        setRadioInput('');
        setShowRadioInput(false);
        playUrl(url);
    };

    const handleStation = (st) => {
        console.log('[MusicPlayer] Switching to station:', st.id);
        if (st.id === 'radio') {
            selectStation(st);
            if (radioUrl) {
                playUrl(radioUrl);
            } else {
                setShowRadioInput(true);
            }
            return;
        }

        selectStation(st);
        setShowRadioInput(false);

        if (st.id === 'ambience') {
            if (audioRef.current) audioRef.current.pause();
            destroyYT();
            setTrackName('');
            createYTPlayer(pickRandom());
        } else {
            destroyYT();
            setTrackName('');
            setPlaying(false);
            const a = audioRef.current;
            if (!a) return;
            a.src = st.url;
            a.load();
            a.play().catch(err => console.error('[MusicPlayer] Station Play error:', err));

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                    title: st.desc,
                    artist: st.label,
                    album: 'Md Ismail Vault',
                    artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
                });
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        localStorage.setItem(LS_MUSIC_MODAL_KEY, 'false');
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="music-player-root">
            <audio ref={audioRef} playsInline />
            <div ref={ytDivRef} style={{ position: 'fixed', left: '-9999px', bottom: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />

            <div style={{ display: showModal ? 'block' : 'none' }}>
                <>
                    <div className="music-modal-overlay" onClick={closeModal} />
                    <div className="music-modal">
                        {/* Sharp Internal Dither Background */}
                        <div className="modal-internal-dither">
                            <Dither 
                                waveColor={[0.8, 0.5, 0.2]} 
                                waveSpeed={0.08}
                                waveAmplitude={0.4}
                                waveFrequency={4}
                                colorNum={4}
                                pixelSize={2}
                            />
                        </div>

                        <div className="music-modal-header">
                            <h2><Disc size={20} style={{ color: 'var(--accent)' }} /> Music Player</h2>
                            <button className="music-modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="music-modal-content">
                            {/* Vinyl Record Visual */}
                            <div className={`vinyl-container ${playing ? 'playing' : ''}`}>
                                <div className={`vinyl-record ${playing ? 'spinning' : ''}`}>
                                    <div className="vinyl-label">
                                        {station.icon || '🎵'}
                                    </div>
                                    <div className="vinyl-center" />
                                </div>
                            </div>

                            {/* Track Info */}
                            <div className="music-track-info">
                                <div className="station-label">{station.label}</div>
                                <div className="track-name">{trackName || station.desc}</div>
                            </div>

                            {/* Main Controls */}
                            <div className="music-controls">
                                <button className="play-pause-btn" onClick={togglePlay}>
                                    {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />}
                                </button>
                            </div>

                            {/* Volume Section */}
                            <div className="volume-control-box">
                                <div className="volume-header">
                                    <span>Volume</span>
                                    <span>{Math.round((muted ? 0 : volume) * 100)}%</span>
                                </div>
                                <div className="volume-slider-container">
                                    <button style={{ color: 'var(--text-muted)' }} onClick={toggleMute}>
                                        {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input 
                                        type="range" 
                                        className="music-vol-slider" 
                                        min="0" 
                                        max="1" 
                                        step="0.01"
                                        value={muted ? 0 : volume} 
                                        onChange={onVolumeChange} 
                                    />
                                </div>
                            </div>

                            {/* Station Selection */}
                            <div className="stations-section">
                                <h3>Stations</h3>
                                <div className="stations-grid">
                                    {STATIONS.map(st => (
                                        <button
                                            key={st.id}
                                            className={`station-card ${st.id === station.id ? 'active' : ''}`}
                                            onClick={() => handleStation(st)}
                                        >
                                            <span className="st-icon">{st.icon}</span>
                                            <div className="st-info">
                                                <span className="st-name">{st.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {station.id === 'radio' && (
                                    <div className="radio-custom-input">
                                        <input
                                            placeholder="Paste YouTube URL…"
                                            value={radioInput}
                                            onChange={e => setRadioInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && applyRadioUrl()}
                                        />
                                        <button onClick={applyRadioUrl}>Set</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            </div>
        </div>
    );
}
