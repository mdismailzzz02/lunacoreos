import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { useAudio } from '../../context/AudioContext';
import {
    Play, Pause, Music, RefreshCw,
    Search, ChevronDown, SkipBack, SkipForward,
    Volume2, ListMusic, FolderPlus, Folder,
    Repeat, Repeat1, Shuffle, X, Plus, Trash2, 
    MoreVertical, ListVideo, Check
} from 'lucide-react';
import './MusicPlayerPage.css';

// ── Audio Visualizer ──────────────────────────────────────────────────
const AudioVisualizer = ({ analyser, playing }) => {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const phaseRef  = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const cy = H / 2;
        
        const numBars = 48;
        const barWidth = 4;
        const spacing = 2;
        const totalWidth = numBars * (barWidth + spacing);
        const startX = (W - totalWidth) / 2;

        if (!analyser || !playing) {
            const drawIdle = () => {
                animRef.current = requestAnimationFrame(drawIdle);
                phaseRef.current += 0.03;
                ctx.clearRect(0, 0, W, H);
                
                for (let i = 0; i < numBars; i++) {
                    const wave = Math.sin(phaseRef.current + i * 0.15) * 0.5 + 0.5;
                    const barHeight = 2 + wave * 12;
                    
                    const hue = (i / numBars) * 300;
                    ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.4)`;
                    
                    const x = startX + i * (barWidth + spacing);
                    
                    ctx.fillRect(x, cy - barHeight - 1, barWidth, barHeight);
                    ctx.fillRect(x, cy + 1, barWidth, barHeight);
                }
            };
            drawIdle();
            return () => cancelAnimationFrame(animRef.current);
        }

        const bufLen = analyser.frequencyBinCount;
        const data   = new Uint8Array(bufLen);
        const step   = Math.max(1, Math.floor(bufLen / (numBars * 1.5))); 

        const draw = () => {
            animRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(data);
            ctx.clearRect(0, 0, W, H);
            
            for (let i = 0; i < numBars; i++) {
                let sum = 0;
                for(let j = 0; j < step; j++) {
                    sum += data[i * step + j] || 0;
                }
                const avg = sum / step;
                const barHeight = Math.max(2, (avg / 255) * (H / 2.2));
                
                const hue = (i / numBars) * 300; 
                ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
                
                const x = startX + i * (barWidth + spacing);
                
                ctx.fillRect(x, cy - barHeight - 1, barWidth, barHeight);
                ctx.fillRect(x, cy + 1, barWidth, barHeight);
            }
        };
        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [analyser, playing]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={canvasRef} width={280} height={160} style={{ display: 'block', maxWidth: '100%' }} />
        </div>
    );
};

// ── Add Folder Modal ──────────────────────────────────────────────────
function AddFolderModal({ onClose, onAdded }) {
    const [name, setName]        = useState('');
    const [display, setDisplay]  = useState('');
    const [saving, setSaving]    = useState(false);
    const [err, setErr]          = useState('');

    const handleAdd = async () => {
        if (!name.trim()) return setErr('Folder name required');
        setSaving(true);
        try {
            const folder = await api.addMusicFolder({
                name: name.trim(),
                display_name: display.trim() || name.trim(),
            });
            onAdded(folder);
            onClose();
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="mp-modal">
                <div className="mp-modal-header">
                    <h3>Add Music Folder</h3>
                    <button onClick={onClose}><X size={18} /></button>
                </div>
                <p className="mp-modal-hint">
                    Create a folder entry that maps to your R2 path:<br />
                    <code>music_player/<strong>{name || 'folder_name'}</strong>/</code>
                </p>
                <div className="mp-form-row">
                    <label>Folder key (used in R2 path)</label>
                    <input
                        className="mp-input"
                        placeholder="e.g. english_songs"
                        value={name}
                        onChange={e => setName(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                    />
                </div>
                <div className="mp-form-row">
                    <label>Display name (optional)</label>
                    <input
                        className="mp-input"
                        placeholder="e.g. English Songs"
                        value={display}
                        onChange={e => setDisplay(e.target.value)}
                    />
                </div>
                {err && <div className="mp-error">{err}</div>}
                <div className="mp-modal-actions">
                    <button className="mp-btn mp-btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="mp-btn mp-btn-primary" onClick={handleAdd} disabled={saving}>
                        {saving ? 'Adding...' : 'Add Folder'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main MusicPlayerPage ──────────────────────────────────────────────
export default function MusicPlayerPage() {
    const [folders, setFolders]               = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(() => sessionStorage.getItem('mp_selectedFolder') || 'all');
    
    // Playlists
    const [playlists, setPlaylists]           = useState([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(() => sessionStorage.getItem('mp_selectedPlaylist') || 'none');
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
    const [showAddPlaylist, setShowAddPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [activeTrackPopover, setActiveTrackPopover] = useState(null); // Track ID
    const playlistMenuRef = useRef(null);

    const [loading, setLoading]               = useState(true);
    const [syncing, setSyncing]               = useState(false);
    const [syncStatus, setSyncStatus]         = useState('');
    const [search, setSearch]                 = useState('');
    const [showAddFolder, setShowAddFolder]   = useState(false);
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const folderMenuRef = useRef(null);

    const {
        currentTrack, playTrack, playing,
        playNext, playPrev,
        volume, setMusicVolume,
        library, setLibrary,
        repeatMode, setRepeatMode,
        isShuffle, setIsShuffle,
        currentTime, duration,
        analyser, audioRef,
    } = useAudio();

    // Close menus on outside click
    useEffect(() => {
        const handler = e => {
            if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) {
                setShowFolderMenu(false);
            }
            if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target)) {
                setShowPlaylistMenu(false);
            }
            if (!e.target.closest('.mp-track-popover-wrap')) {
                setActiveTrackPopover(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        // Reload library when filter changes
        sessionStorage.setItem('mp_selectedFolder', selectedFolderId);
        sessionStorage.setItem('mp_selectedPlaylist', selectedPlaylistId);
        if (!loading) loadLibrary(selectedFolderId, selectedPlaylistId);
    }, [selectedFolderId, selectedPlaylistId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [folderData, playlistData, libData] = await Promise.all([
                api.getMusicFolders(),
                api.getMusicPlaylists().catch(() => []),
                api.getMusicLibrary(
                    selectedFolderId === 'all' ? null : selectedFolderId, 
                    selectedPlaylistId === 'none' ? null : selectedPlaylistId
                ),
            ]);
            setFolders(folderData || []);
            setPlaylists(playlistData || []);
            setLibrary(libData || []);
        } catch (err) {
            console.error('Failed to load music data', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLibrary = async (folderId, playlistId) => {
        setLoading(true);
        try {
            const libData = await api.getMusicLibrary(
                folderId === 'all' ? null : folderId, 
                playlistId === 'none' ? null : playlistId
            );
            setLibrary(libData || []);
        } catch (err) {
            console.error('Failed to reload library', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncStatus('Starting...');
        try {
            const res = await api.syncMusicLibrary(
                { folderId: selectedFolderId },
                status => setSyncStatus(status)
            );
            setSyncStatus(res.message);
            await loadLibrary(selectedFolderId);
            setTimeout(() => setSyncStatus(''), 3000);
        } catch (err) {
            setSyncStatus('Error: ' + err.message);
            setTimeout(() => setSyncStatus(''), 5000);
        } finally {
            setSyncing(false);
        }
    };

    const handleFolderAdded = (folder) => {
        setFolders(prev => [...prev, folder]);
    };

    const handleRemoveFolder = async (folderId, e) => {
        e.stopPropagation();
        if (!confirm('Remove this folder? (Tracks will remain in library)')) return;
        try {
            await api.removeMusicFolder(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
            if (selectedFolderId === folderId) {
                setSelectedFolderId('all');
            }
        } catch (err) {
            console.error('Failed to remove folder', err);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            const pl = await api.createMusicPlaylist(newPlaylistName);
            setPlaylists([...playlists, pl]);
            setNewPlaylistName('');
            setShowAddPlaylist(false);
        } catch (err) {
            console.error('Failed to create playlist', err);
        }
    };

    const handleAddToPlaylist = async (playlistId, track) => {
        try {
            await api.addTrackToPlaylist(playlistId, track.id);
            setActiveTrackPopover(null);
        } catch (err) {
            console.error('Failed to add to playlist', err);
        }
    };

    const handleRemoveFromPlaylist = async (playlistId, trackId, e) => {
        e.stopPropagation();
        try {
            await api.removeTrackFromPlaylist(playlistId, trackId);
            if (selectedPlaylistId === playlistId) {
                setLibrary(prev => prev.filter(t => t.id !== trackId));
            }
        } catch (err) {
            console.error('Failed to remove from playlist', err);
        }
    };

    // Capture duration when track metadata loads
    useEffect(() => {
        const audio = audioRef?.current;
        if (!audio) return;
        const onMeta = () => {
            if (currentTrack && audio.duration && !isNaN(audio.duration)) {
                api.updateMusicHistory({
                    id: currentTrack.id,
                    last_played_time: 0,
                    duration: Math.round(audio.duration),
                }).catch(() => {});
            }
        };
        audio.addEventListener('loadedmetadata', onMeta);
        return () => audio.removeEventListener('loadedmetadata', onMeta);
    }, [currentTrack, audioRef]);

    // Filtered library
    const filteredLibrary = library.filter(t => {
        const matchSearch = !search ||
            (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.artist || '').toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    const fmt = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    const selectedFolder = folders.find(f => f.id === selectedFolderId);
    const selectedFolderName = selectedFolderId === 'all'
        ? 'All Folders'
        : (selectedFolder?.display_name || selectedFolder?.name || 'Unknown');

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="mp-page">
            {showAddFolder && (
                <AddFolderModal
                    onClose={() => setShowAddFolder(false)}
                    onAdded={handleFolderAdded}
                />
            )}

            {/* ── Header ── */}
            <div className="mp-header">
                <div className="mp-header-left">
                    <Music size={22} className="mp-title-icon" />
                    <div>
                        <h1>Music Player</h1>
                        <p>{filteredLibrary.length} track{filteredLibrary.length !== 1 ? 's' : ''} · Cloudflare R2</p>
                    </div>
                </div>
                <div className="mp-header-right">
                    <div className="mp-search-bar">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search tracks..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
                    </div>
                    <button
                        className={`mp-btn mp-btn-sync ${syncing ? 'syncing' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                        title="Refresh library from Supabase (or trigger R2 worker sync)"
                    >
                        <RefreshCw size={16} className={syncing ? 'mp-spin' : ''} />
                        {syncStatus || (syncing ? 'Syncing...' : 'Sync')}
                    </button>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="mp-folder-bar" style={{ display: 'flex', gap: 16 }}>
                <div className="mp-folder-selector" ref={folderMenuRef}>
                    <Folder size={16} />
                    <button className="mp-folder-trigger" onClick={() => { setShowFolderMenu(!showFolderMenu); setShowPlaylistMenu(false); }}>
                        <span>{selectedFolderName}</span>
                        <ChevronDown size={14} />
                    </button>
                    {showFolderMenu && (
                        <div className="mp-folder-menu">
                            <div
                                className={`mp-folder-option ${selectedFolderId === 'all' ? 'active' : ''}`}
                                onClick={() => { setSelectedFolderId('all'); setShowFolderMenu(false); }}
                            >
                                <ListMusic size={14} /> All Folders
                            </div>
                            {folders.map(f => (
                                <div
                                    key={f.id}
                                    className={`mp-folder-option ${selectedFolderId === f.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedFolderId(f.id); setShowFolderMenu(false); }}
                                >
                                    <Folder size={14} />
                                    <span>{f.display_name || f.name}</span>
                                    <button
                                        className="mp-folder-remove"
                                        onClick={e => handleRemoveFolder(f.id, e)}
                                        title="Remove folder"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            <div className="mp-folder-option mp-folder-add" onClick={() => { setShowAddFolder(true); setShowFolderMenu(false); }}>
                                <Plus size={14} /> Add Folder
                            </div>
                        </div>
                    )}
                </div>
                <button className="mp-btn mp-btn-ghost mp-icon-btn" onClick={() => setShowAddFolder(true)} title="Add new folder">
                    <FolderPlus size={18} />
                </button>

                {/* Playlist Selector */}
                <div className="mp-folder-selector" ref={playlistMenuRef}>
                    <ListVideo size={16} />
                    <button className="mp-folder-trigger" onClick={() => { setShowPlaylistMenu(!showPlaylistMenu); setShowFolderMenu(false); }}>
                        <span>{selectedPlaylistId === 'none' ? 'Playlists (All)' : playlists.find(p => p.id === selectedPlaylistId)?.name || 'Unknown Playlist'}</span>
                        <ChevronDown size={14} />
                    </button>
                    {showPlaylistMenu && (
                        <div className="mp-folder-menu" style={{ width: 220 }}>
                            <div
                                className={`mp-folder-option ${selectedPlaylistId === 'none' ? 'active' : ''}`}
                                onClick={() => { setSelectedPlaylistId('none'); setShowPlaylistMenu(false); }}
                            >
                                <ListMusic size={14} /> None (Folder View)
                            </div>
                            {playlists.map(pl => (
                                <div
                                    key={pl.id}
                                    className={`mp-folder-option ${selectedPlaylistId === pl.id ? 'active' : ''}`}
                                    onClick={() => { 
                                        setSelectedPlaylistId(pl.id); 
                                        setSelectedFolderId('all'); // Clear folder if picking a playlist
                                        setShowPlaylistMenu(false); 
                                    }}
                                >
                                    <ListVideo size={14} />
                                    <span>{pl.name}</span>
                                </div>
                            ))}
                            <div className="mp-folder-option mp-folder-add" onClick={(e) => { e.stopPropagation(); setShowAddPlaylist(true); }}>
                                <Plus size={14} /> Create Playlist
                            </div>
                            {showAddPlaylist && (
                                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="text" 
                                        value={newPlaylistName} 
                                        onChange={e => setNewPlaylistName(e.target.value)} 
                                        placeholder="Playlist Name" 
                                        style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 4, marginBottom: 8 }}
                                        onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                                    />
                                    <button onClick={handleCreatePlaylist} className="mp-btn mp-btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '4px' }}>Save</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div className="mp-content-grid">

                {/* Track List */}
                <div className="mp-library-col">
                    <div className="mp-list-header">
                        <span className="mp-col-play"></span>
                        <span className="mp-col-info">Track</span>
                        <span className="mp-col-meta">Duration</span>
                    </div>

                    <div className="mp-track-list">
                        {loading ? (
                            <div className="mp-list-status">Loading library...</div>
                        ) : filteredLibrary.length === 0 ? (
                            <div className="mp-list-status mp-empty">
                                <Music size={32} />
                                <p>No tracks found.</p>
                                <p className="mp-empty-hint">
                                    Upload MP3s to your R2 bucket under <code>music_player/</code> then add them to Supabase via the SQL editor or sync worker.
                                </p>
                            </div>
                        ) : (
                            filteredLibrary.map((track, index) => {
                                const isActive = currentTrack?.id === track.id;
                                const isNearBottom = index >= Math.max(0, filteredLibrary.length - 3);
                                return (
                                    <div
                                        key={track.id}
                                        className={`mp-track-item ${isActive ? 'active' : ''}`}
                                        onClick={() => playTrack(track)}
                                    >
                                        <div className="mp-col-play">
                                            {isActive && playing ? (
                                                <div className="mp-bars">
                                                    <span /><span /><span />
                                                </div>
                                            ) : (
                                                <Play size={14} fill="currentColor" />
                                            )}
                                        </div>
                                        <div className="mp-col-info">
                                            <div className="mp-track-title">{track.title}</div>
                                            <div className="mp-track-sub">{track.artist || 'Unknown'}{track.album && track.album !== 'Unknown' ? ` · ${track.album}` : ''}</div>
                                        </div>
                                        <div className="mp-col-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                                            <span>{track.duration ? fmt(track.duration) : track.file_size_mb ? `${track.file_size_mb} MB` : '—'}</span>
                                            
                                            {selectedPlaylistId !== 'none' ? (
                                                <button 
                                                    className="mp-track-action-btn" 
                                                    onClick={(e) => handleRemoveFromPlaylist(selectedPlaylistId, track.id, e)}
                                                    title="Remove from playlist"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <div className="mp-track-popover-wrap" style={{ position: 'relative' }}>
                                                    <button 
                                                        className="mp-track-action-btn"
                                                        onClick={(e) => { e.stopPropagation(); setActiveTrackPopover(activeTrackPopover === track.id ? null : track.id); }}
                                                        title="Add to Playlist"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                    {activeTrackPopover === track.id && (
                                                        <div className="mp-track-popover" style={{ 
                                                            position: 'absolute', 
                                                            right: 0, 
                                                            top: isNearBottom ? 'auto' : '100%', 
                                                            bottom: isNearBottom ? '100%' : 'auto',
                                                            zIndex: 50, 
                                                            background: '#1c1c21', 
                                                            border: '1px solid #333', 
                                                            borderRadius: 8, 
                                                            padding: 4, 
                                                            width: 160, 
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
                                                        }}>
                                                            <div style={{ fontSize: '0.65rem', color: '#888', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Add to Playlist</div>
                                                            {playlists.length === 0 && <div style={{ fontSize: '0.75rem', padding: '8px', color: '#aaa' }}>No playlists exist</div>}
                                                            {playlists.map(pl => (
                                                                <div 
                                                                    key={pl.id} 
                                                                    className="mp-folder-option" 
                                                                    style={{ padding: '6px 8px', borderRadius: 4 }}
                                                                    onClick={(e) => { e.stopPropagation(); handleAddToPlaylist(pl.id, track); }}
                                                                >
                                                                    {pl.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Now Playing Panel */}
                <div className="mp-now-playing-col">
                    <div className="mp-now-playing-card">

                        {/* Vertical EQ Visualizer */}
                        <div className="mp-visualizer-wrap">
                            <AudioVisualizer analyser={analyser} playing={playing} />
                        </div>

                        {/* Track Info */}
                        <div className="mp-track-details">
                            <div className="mp-now-title">{currentTrack?.title || 'No track selected'}</div>
                            <div className="mp-now-sub">{currentTrack?.artist || 'Select a track to begin'}</div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mp-progress-section">
                            <div className="mp-progress-track">
                                <div className="mp-progress-fill" style={{ width: `${progressPct}%` }} />
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    className="mp-progress-range"
                                    onChange={e => {
                                        const newTime = parseFloat(e.target.value);
                                        if (!audioRef?.current) return;
                                        
                                        // Smooth seek transition
                                        const audio = audioRef.current;
                                        const originalVolume = volume; // Target volume from context
                                        let currentVol = audio.volume;
                                        
                                        // Clear any existing seek fades
                                        if (window._seekFadeOut) clearInterval(window._seekFadeOut);
                                        if (window._seekFadeIn) clearInterval(window._seekFadeIn);
                                        
                                        // Rapid fade out
                                        window._seekFadeOut = setInterval(() => {
                                            currentVol -= 0.15;
                                            if (currentVol <= 0) {
                                                currentVol = 0;
                                                audio.volume = 0;
                                                clearInterval(window._seekFadeOut);
                                                
                                                // Change time while silent
                                                audio.currentTime = newTime;
                                                
                                                // Rapid fade in
                                                window._seekFadeIn = setInterval(() => {
                                                    currentVol += 0.15;
                                                    if (currentVol >= originalVolume) {
                                                        currentVol = originalVolume;
                                                        clearInterval(window._seekFadeIn);
                                                    }
                                                    audio.volume = currentVol;
                                                }, 15);
                                            } else {
                                                audio.volume = currentVol;
                                            }
                                        }, 15);
                                    }}
                                />
                            </div>
                            <div className="mp-time-row">
                                <span>{fmt(currentTime)}</span>
                                <span>{fmt(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mp-controls">
                            <button
                                className={`mp-side-btn ${isShuffle ? 'active' : ''}`}
                                onClick={() => setIsShuffle(!isShuffle)}
                                title="Shuffle"
                            >
                                <Shuffle size={18} />
                            </button>
                            <button className="mp-side-btn" onClick={playPrev} title="Previous">
                                <SkipBack size={20} />
                            </button>
                            <button
                                className="mp-play-btn"
                                onClick={() => {
                                    if (!audioRef?.current) return;
                                    if (playing) audioRef.current.pause();
                                    else audioRef.current.play();
                                }}
                            >
                                {playing
                                    ? <Pause size={26} fill="currentColor" />
                                    : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />
                                }
                            </button>
                            <button className="mp-side-btn" onClick={playNext} title="Next">
                                <SkipForward size={20} />
                            </button>
                            <button
                                className={`mp-side-btn ${repeatMode !== 'none' ? 'active' : ''}`}
                                onClick={() => {
                                    if (repeatMode === 'none') setRepeatMode('all');
                                    else if (repeatMode === 'all') setRepeatMode('one');
                                    else setRepeatMode('none');
                                }}
                                title={`Repeat: ${repeatMode}`}
                            >
                                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="mp-volume-row">
                            <Volume2 size={16} />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                className="mp-volume-slider"
                                onChange={e => setMusicVolume(parseFloat(e.target.value))}
                            />
                            <span className="mp-vol-label">{Math.round(volume * 100)}%</span>
                        </div>
                    </div>

                    {/* R2 Path Info */}
                    {selectedFolder && (
                        <div className="mp-folder-info-card">
                            <div className="mp-fi-label">R2 Path</div>
                            <code className="mp-fi-path">
                                {selectedFolder.r2_prefix || `music_player/${selectedFolder.name}`}/
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
