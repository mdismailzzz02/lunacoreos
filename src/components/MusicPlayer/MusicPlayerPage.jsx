import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { useAudio } from '../../context/AudioContext';
import {
    Play, Pause, Music, RefreshCw, Clock, HardDrive,
    Search, Filter, ChevronRight, SkipBack, SkipForward,
    Volume2, Trash2, ListMusic, Plus, FolderPlus, Link as LinkIcon, Folder,
    Repeat, Repeat1, Database, Shuffle
} from 'lucide-react';
import { initGoogleAuth } from '../../services/googleAuth';

const AudioVisualizer = ({ analyser, playing }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const idleRef = useRef(0); // for idle pulse phase

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;

        if (!analyser || !playing) {
            // ── Idle breathing ring ──
            const drawIdle = () => {
                animationRef.current = requestAnimationFrame(drawIdle);
                idleRef.current += 0.02;
                ctx.clearRect(0, 0, W, H);

                const pulse = Math.sin(idleRef.current) * 0.5 + 0.5; // 0→1
                const r = 64 + pulse * 8;
                const alpha = 0.08 + pulse * 0.12;

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(310, 80%, 65%, ${alpha})`;
                ctx.lineWidth = 3 + pulse * 4;
                ctx.stroke();
            };
            drawIdle();
            return () => cancelAnimationFrame(animationRef.current);
        }

        // ── Live frequency bars ──
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const radius = 64;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, W, H);

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * 50;
                const rads = (Math.PI * 2 / bufferLength) * i;

                const xStart = cx + Math.cos(rads) * radius;
                const yStart = cy + Math.sin(rads) * radius;
                const xEnd   = cx + Math.cos(rads) * (radius + barHeight);
                const yEnd   = cy + Math.sin(rads) * (radius + barHeight);

                const hue = (i / bufferLength) * 360 + 280;
                const alpha = 0.4 + (dataArray[i] / 255) * 0.6;
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(xStart, yStart);
                ctx.lineTo(xEnd, yEnd);
                ctx.stroke();
            }
        };
        draw();
        return () => cancelAnimationFrame(animationRef.current);
    }, [analyser, playing]);

    return <canvas ref={canvasRef} width={260} height={260} className="audio-visualizer-canvas" />;
};

export default function MusicPlayerPage() {
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [search, setSearch] = useState('');
    const [playbackError, setPlaybackError] = useState(null);
    const [bypassLoading, setBypassLoading] = useState(false);

    // Consume Global Audio Context
    const {
        currentTrack, playTrack, playing, 
        playNext, playPrev,
        volume, setMusicVolume,
        library, setLibrary,
        repeatMode, setRepeatMode,
        isShuffle, setIsShuffle,
        currentTime, duration,
        analyser, audioRef
    } = useAudio();

    useEffect(() => {
        initGoogleAuth().catch(console.error);
        loadData();
    }, []);

    // Filter library based on search and folder
    const filteredLibrary = library.filter(t => {
        const tFolderId = t.folder_id || t.FolderID || t.folderId;
        const matchesFolder = selectedFolderId === 'all' || tFolderId === selectedFolderId;
        const matchesSearch = (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.artist || '').toLowerCase().includes(search.toLowerCase());
        return matchesFolder && matchesSearch;
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [libData, folderData] = await Promise.all([
                api.getMusicLibrary(),
                api.getMusicFolders()
            ]);
            setLibrary(libData || []);
            setFolders(folderData || []);
        } catch (err) {
            console.error('Failed to load music data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncStatus('Initializing...');
        try {
            const params = selectedFolderId !== 'all' ? { folderId: selectedFolderId } : {};
            const res = await api.syncMusicLibrary(params, (status) => setSyncStatus(status));
            alert(res.message);
            const libData = await api.getMusicLibrary();
            setLibrary(libData || []);
        } catch (err) {
            alert('Sync failed: ' + err.message);
        } finally {
            setSyncing(false);
            setSyncStatus('');
        }
    };

    const handleAddFolder = async () => {
        let inputStr = prompt("Enter Google Drive Folder Link or ID:");
        if (!inputStr) return;
        let folderId = inputStr.trim();
        const urlMatch = folderId.match(/folders\/([a-zA-Z0-9-_]+)/);
        if (urlMatch) folderId = urlMatch[1];
        const name = prompt("Enter a name for this folder (optional):");
        try {
            await api.addMusicFolder({ folder_id: folderId, name: name || undefined });
            loadData();
        } catch (err) {
            alert("Failed to add folder: " + err.message);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const [showFolderDropdown, setShowFolderDropdown] = useState(false);
    const selectedFolderName = selectedFolderId === 'all'
        ? 'All Folders'
        : folders.find(f => f.folder_id === selectedFolderId)?.name || 'Unknown Folder';

    return (
        <div className="music-page-container">
            <header className="music-page-header">
                <div className="header-left">
                    <h1><Music className="title-icon" /> Music Player</h1>
                    <p>{filteredLibrary.length} tracks in view</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className={`sync-btn ${syncing ? 'syncing' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
                        <span>{syncing ? (syncStatus || 'Syncing...') : 'Sync Now'}</span>
                    </button>
                </div>
            </header>

            <div className="music-control-bar">
                <div className="folder-selector-wrap">
                    <Folder size={18} />
                    <div className="custom-dropdown-trigger" onClick={() => setShowFolderDropdown(!showFolderDropdown)}>
                        <span>{selectedFolderName}</span>
                        <Filter size={14} />
                    </div>

                    {showFolderDropdown && (
                        <div className="custom-dropdown-menu">
                            <div className={`dropdown-option ${selectedFolderId === 'all' ? 'active' : ''}`} onClick={() => { setSelectedFolderId('all'); setShowFolderDropdown(false); }}>
                                <ListMusic size={16} /> All Folders
                            </div>
                            {folders.map(f => (
                                <div key={f.folder_id} className={`dropdown-option ${selectedFolderId === f.folder_id ? 'active' : ''}`} onClick={() => { setSelectedFolderId(f.folder_id); setShowFolderDropdown(false); }}>
                                    <Folder size={16} /> {f.name}
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="icon-btn-add" onClick={handleAddFolder} title="Add New Folder">
                        <FolderPlus size={18} />
                    </button>
                </div>
            </div>

            <div className="music-content-grid">
                <div className="library-column">
                    <div className="table-header">
                        <div className="col-play"></div>
                        <div className="col-info">Track Info</div>
                        <div className="col-size">Size</div>
                        <div className="col-history">Last Played</div>
                    </div>

                    <div className="track-list">
                        {loading ? (
                            <div className="list-status">Loading library...</div>
                        ) : filteredLibrary.length === 0 ? (
                            <div className="list-status">No music found.</div>
                        ) : (
                            filteredLibrary.map(track => (
                                <div key={track.id} className={`track-item ${currentTrack?.id === track.id ? 'active' : ''}`} onClick={() => playTrack(track)}>
                                    <div className="col-play">
                                        {currentTrack?.id === track.id && playing ? (
                                            <div className="playing-bars"><span></span><span></span><span></span></div>
                                        ) : (
                                            <Play size={16} fill="currentColor" />
                                        )}
                                    </div>
                                    <div className="col-info">
                                        <div className="track-title">{track.title}</div>
                                        <div className="track-sub">{track.artist} • {track.album}</div>
                                    </div>
                                    <div className="col-size">{track.file_size_mb} MB</div>
                                    <div className="col-history">
                                        {track.last_played_time > 0 ? (
                                            <span className="history-tag"><Clock size={12} /> {formatTime(track.last_played_time)}</span>
                                        ) : '-'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="now-playing-column">
                    <div className="now-playing-card">
                        <div className="visualizer-area">
                            <AudioVisualizer analyser={analyser} playing={playing} />
                            <div className={`disc-visual ${playing ? 'spinning' : ''}`}>
                                <div className="disc-inner">
                                    {bypassLoading ? <RefreshCw className="spinning" size={20} /> : <Music size={24} />}
                                </div>
                            </div>
                        </div>

                        <div className="track-details">
                            <h2>{currentTrack?.title || 'Cyber-Vault Audio'}</h2>
                            <p>{currentTrack?.artist || 'Select a track to begin'}</p>
                        </div>

                        <div className="playback-controls">
                            <div className="progress-section">
                                <div className="progress-bar-wrap">
                                    <input
                                        type="range" min="0" max={duration || 100} value={currentTime}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            if (audioRef.current) audioRef.current.currentTime = val;
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span className="time">{formatTime(currentTime)}</span>
                                    <span className="time">{formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="main-btns">
                                <button className={`side-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={18} /></button>
                                <button className="side-btn" onClick={playPrev}><SkipBack size={20} /></button>
                                <button className="play-btn-large" onClick={() => playing ? audioRef.current.pause() : audioRef.current.play()}>
                                    {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
                                </button>
                                <button className="side-btn" onClick={playNext}><SkipForward size={20} /></button>
                                <button className={`side-btn ${repeatMode !== 'none' ? 'active' : ''}`} onClick={() => {
                                    if (repeatMode === 'none') setRepeatMode('all');
                                    else if (repeatMode === 'all') setRepeatMode('one');
                                    else setRepeatMode('none');
                                }}>
                                    {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                                </button>
                            </div>

                            <div className="volume-row">
                                <div className="volume-control-pop">
                                    <Volume2 size={16} />
                                    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setMusicVolume(parseFloat(e.target.value))} className="volume-slider" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="history-info-card">
                        <h3><HardDrive size={16} /> SMART_RESUME_SYNC</h3>
                        <p>Large tracks automatically sync progress to your cloud vault.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
