import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

const AudioCtx = createContext(null);

// ── Curated ambient radio stations ────────────────────────────
export const STATIONS = [
    { id: 'ambience', label: 'Ambience', icon: '🌧️', url: '', desc: 'Rain & Nature · Generated Locally' },
    { id: 'jazz', label: 'Jazz', icon: '🎷', url: 'https://ice1.somafm.com/secretagent-128-mp3', desc: 'Secret Agent · Smooth Jazz' },
    { id: 'sleep', label: 'Sleep', icon: '😴', url: 'https://ice1.somafm.com/dronezone-128-mp3', desc: 'Drone Zone · Deep Atmospheric' },
    { id: 'piano', label: 'Piano', icon: '🎹', url: 'https://ice1.somafm.com/fluid-128-mp3', desc: 'Fluid · Calming Instrumental' },
    { id: 'chill', label: 'Chill', icon: '✨', url: 'https://ice1.somafm.com/lush-128-mp3', desc: 'Lush · Electronic Chill' },
    { id: 'radio', label: 'Radio', icon: '📻', url: '', desc: 'Your custom station', isCustom: true },
];

export function AudioProvider({ children }) {
    // ── Global Playback Engine State ──
    const audioRef = useRef(new Audio());
    const [currentTrack, setCurrentTrack] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.2); // Default to 20%
    const [library, setLibrary] = useState([]);
    const [repeatMode, setRepeatMode] = useState('all');
    const [isShuffle, setIsShuffle] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // ── Ambient Station State ──
    const [station, setStation] = useState(STATIONS[0]);
    const selectStation = useCallback((st) => setStation(st), []);

    // Context Refs for Logic
    const libraryRef = useRef(library);
    const currentTrackRef = useRef(currentTrack);
    const repeatRef = useRef(repeatMode);
    const shuffleRef = useRef(isShuffle);

    useEffect(() => { libraryRef.current = library; }, [library]);
    useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
    useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { shuffleRef.current = isShuffle; }, [isShuffle]);

    const audioCtxRef = useRef(null);
    const [analyserNode, setAnalyserNode] = useState(null);
    const sourceRef = useRef(null);
    const musicRef = useRef(null); // Ref for registered audio elements (Modal or Dashboard)

    // ── Hi-Fi Engine Initialization ──
    const initEngine = useCallback((audioEl) => {
        if (!audioCtxRef.current) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const actx = new AudioContext();
                audioCtxRef.current = actx;
                const source = actx.createMediaElementSource(audioEl);
                sourceRef.current = source;
                const bass = actx.createBiquadFilter();
                bass.type = 'lowshelf'; bass.frequency.value = 110; bass.gain.value = 5;
                const treble = actx.createBiquadFilter();
                treble.type = 'highshelf'; treble.frequency.value = 5000; treble.gain.value = 3;
                const analyser = actx.createAnalyser();
                analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.85;
                setAnalyserNode(analyser);
                source.connect(bass); bass.connect(treble); treble.connect(analyser); analyser.connect(actx.destination);
            } catch (err) { console.warn("Engine disabled:", err.message); }
        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const registerMusic = useCallback((audioEl) => {
        if (!audioEl) return;
        musicRef.current = audioEl;
        audioEl.addEventListener('play', () => initEngine(audioEl));
    }, [initEngine]);

    // ── Initialize Global Audio Engine ──
    useEffect(() => {
        const audio = audioRef.current;
        audio.crossOrigin = 'anonymous';
        audio.volume = volume;
        registerMusic(audio); // Register the global music instance

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
        };

        const handleEnded = () => {
            if (repeatRef.current === 'one') {
                audio.currentTime = 0;
                audio.play();
            } else {
                playNext();
            }
        };

        const handlePlay = () => setPlaying(true);
        const handlePause = () => setPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    const playTrack = useCallback(async (track) => {
        if (!track) return;
        if (currentTrackRef.current?.id === track.id) {
            if (audioRef.current.paused) audioRef.current.play();
            else audioRef.current.pause();
            return;
        }

        const playbackId = Date.now();
        audioRef.current._lastPlaybackId = playbackId;

        try {
            const streamUrl = await api.getMusicBytes(track.drive_file_id);

            // ── Check if we've been superseded ──
            if (audioRef.current._lastPlaybackId !== playbackId) return;

            audioRef.current.pause();
            audioRef.current.src = streamUrl;
            audioRef.current.load();

            if (track.last_played_time > 0 && (track.file_size_mb || 0) > 30) {
                audioRef.current.currentTime = track.last_played_time;
            }

            // ── Execute Play safely ──
            const p = audioRef.current.play();
            if (p !== undefined) {
                p.catch(e => {
                    if (e.name !== 'AbortError') console.warn('[Audio] Playback error:', e);
                });
            }

            setCurrentTrack(track);
        } catch (err) {
            console.error('Global Playback failed', err);
        }
    }, []);

    const playNext = useCallback(() => {
        const lib = libraryRef.current;
        const track = currentTrackRef.current;
        if (lib.length === 0 || !track) return;

        let nextIdx;
        const currentIdx = lib.findIndex(t => t.id === track.id);

        if (shuffleRef.current) {
            nextIdx = Math.floor(Math.random() * lib.length);
            if (lib.length > 1 && nextIdx === currentIdx) nextIdx = (nextIdx + 1) % lib.length;
        } else {
            nextIdx = currentIdx + 1;
            if (nextIdx >= lib.length) {
                if (repeatRef.current === 'all') nextIdx = 0;
                else { setPlaying(false); return; }
            }
        }
        playTrack(lib[nextIdx]);
    }, [playTrack]);

    const playPrev = useCallback(() => {
        const lib = libraryRef.current;
        const track = currentTrackRef.current;
        if (lib.length === 0 || !track) return;
        const idx = lib.findIndex(t => t.id === track.id);
        const prevIdx = (idx - 1 + lib.length) % lib.length;
        playTrack(lib[prevIdx]);
    }, [playTrack]);

    const setMusicVolume = useCallback((v) => {
        setVolume(v);
        audioRef.current.volume = v;
        if (musicRef.current) musicRef.current.volume = v;
    }, []);

    return (
        <AudioCtx.Provider value={{
            currentTrack, playTrack, playNext, playPrev,
            playing, setPlaying,
            volume, setMusicVolume,
            library, setLibrary,
            repeatMode, setRepeatMode,
            isShuffle, setIsShuffle,
            currentTime, duration,
            station, selectStation,
            registerMusic,
            analyser: analyserNode,
            audioRef
        }}>
            {children}
        </AudioCtx.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) throw new Error('useAudio must be inside AudioProvider');
    return ctx;
}
