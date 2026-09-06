import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Activity } from 'lucide-react';

export default function LofiRadio({ channel = 1 }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const playIntentRef = useRef(false);

    const channels = [
        { name: "LOFI_CORE", url: "https://lofi.stream.laut.fm/lofi?t=1" }, 
        { name: "SYNTH_MAINFRAME", url: "https://stream.nightride.fm/nightride.mp3" },
        { name: "8BIT_SECTOR", url: "https://a5.asurahosting.com:8150/radio.mp3" },
        { name: "AMBIENT_PILL", url: "https://streaming.radio.co/s5c5da6a36/listen" },
        { name: "SPACE_DRONE", url: "https://ice1.somafm.com/dronezone-128-mp3" } 
    ];

    const currentChannel = channels[(channel - 1) % channels.length];

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        audio.volume = isMuted ? 0 : volume;
        
        const drawVisualizer = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const chars = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
            
            ctx.fillStyle = '#ff6b95';
            ctx.font = '14px monospace';
            
            const barWidth = 15;
            const numBars = Math.floor(canvas.width / barWidth);
            
            for (let i = 0; i < numBars; i++) {
                let value = 0;
                
                // Math-based procedural visualizer (Looks awesome, ignores CORS)
                // Only animate if actually playing (not buffering) and has volume
                if (!audio.paused && audio.readyState >= 3 && audio.volume > 0) {
                   value = Math.abs(Math.sin(Date.now() / 300 + i)) * 100 + Math.random() * 50;
                   if (value > 255) value = 255;
                }
                
                let charIndex = Math.floor((value / 255) * chars.length);
                if (charIndex < 0) charIndex = 0;
                if (charIndex >= chars.length) charIndex = chars.length - 1;
                
                const barHeight = Math.floor((value / 255) * (canvas.height / 14));
                for (let j = 0; j < barHeight; j++) {
                    ctx.fillText(chars[charIndex], i * barWidth, canvas.height - (j * 14));
                }
            }
            
            requestRef.current = requestAnimationFrame(drawVisualizer);
        };

        const handlePlay = () => {
            setIsPlaying(true);
            setError('');
            if (!requestRef.current) {
                drawVisualizer();
            }
        };
        
        const handlePause = () => {
            setIsPlaying(false);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };
        
        const handleError = (e) => {
            console.error("Audio stream error:", e);
            setError('Stream offline or blocked. Try a different network.');
            handlePause();
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);

        audio.load();
        
        if (playIntentRef.current) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Autoplay blocked or stream error", e);
                    setError('ACTION REQUIRED: Click Play');
                    playIntentRef.current = false;
                });
            }
        } else {
            handlePause();
        }

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError);
            audio.pause();
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, [channel]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            playIntentRef.current = false;
            audioRef.current.pause();
        } else {
            playIntentRef.current = true;
            audioRef.current.play().catch(e => {
                setError('Failed to play.');
                playIntentRef.current = false;
            });
        }
    };

    const toggleMute = () => setIsMuted(!isMuted);

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1, minWidth: 0, color: '#ff6b95', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <Activity size={14} style={{ flexShrink: 0, color: isPlaying ? '#ff6b95' : '#555' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>[CH_{channel}] {currentChannel.name}</span>
                </div>
                <div style={{ flexShrink: 0, paddingLeft: '10px', color: isPlaying ? '#ff6b95' : '#888', fontSize: '0.65rem', letterSpacing: '1px' }}>
                    {isPlaying ? 'LIVE STREAM' : 'STANDBY'}
                </div>
            </div>
            
            {/* Visualizer Display */}
            <div style={{ position: 'relative', width: '100%', height: '90px', background: '#0a0a0f', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <canvas 
                    ref={canvasRef}
                    width={400}
                    height={100}
                    style={{ width: '100%', height: '100%', display: 'block', opacity: isPlaying ? 1 : 0.3, transition: 'opacity 0.3s ease' }}
                />
                {!isPlaying && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', letterSpacing: '2px' }}>
                        {error ? 'STREAM ERROR' : 'SYSTEM PAUSED'}
                    </div>
                )}
            </div>
            
            {/* Custom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                    onClick={togglePlay}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: isPlaying ? 'rgba(255, 107, 149, 0.1)' : '#fff', color: isPlaying ? '#ff6b95' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0 }}
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex' }}>
                        {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={isMuted ? 0 : volume}
                        onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                        style={{ flex: 1, height: '4px', appearance: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', cursor: 'pointer', outline: 'none' }}
                    />
                </div>
            </div>
            
            <audio 
                ref={audioRef}
                src={currentChannel.url}
                preload="auto"
            />
        </div>
    );
}
