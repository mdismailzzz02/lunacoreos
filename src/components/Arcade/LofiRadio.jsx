import React, { useState, useEffect, useRef } from 'react';

export default function LofiRadio({ channel = 1 }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

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
        
        audio.volume = 0.15; // Set default volume to 15%
        
        const drawVisualizer = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const chars = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
            
            ctx.fillStyle = '#0F0';
            ctx.font = '14px monospace';
            
            const barWidth = 15;
            const numBars = Math.floor(canvas.width / barWidth);
            
            for (let i = 0; i < numBars; i++) {
                let value = 0;
                
                // Math-based procedural visualizer (Looks awesome, ignores CORS)
                if (!audio.paused) {
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

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log("Autoplay blocked, waiting for interaction");
                setError('Autoplay blocked. Click play below.');
            });
        }

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError);
            audio.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [channel]);

    return (
        <div style={{ margin: '20px 0', border: '1px solid #333', borderRadius: '8px', padding: '15px', background: '#000', width: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ color: '#00f2fe', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        background: isPlaying ? '#0f0' : '#f00',
                        boxShadow: isPlaying ? '0 0 10px #0f0' : 'none'
                    }}></div>
                    [CH_{channel}] {currentChannel.name}_STREAM
                </div>
                <div style={{ color: isPlaying ? '#0f0' : '#888', fontFamily: 'monospace', fontSize: '12px' }}>
                    {isPlaying ? 'CONNECTED - 128kbps' : 'OFFLINE'}
                </div>
            </div>
            
            {error && <div style={{ color: '#f00', fontFamily: 'monospace', marginBottom: '10px', fontSize: '12px' }}>{error}</div>}
            
            <canvas 
                ref={canvasRef}
                width={560}
                height={150}
                style={{ width: '100%', height: '150px', background: '#050505', borderRadius: '4px', border: '1px solid #111' }}
            />
            
            <audio 
                ref={audioRef}
                src={currentChannel.url}
                preload="auto"
                autoPlay
                controls
                style={{ width: '100%', marginTop: '15px', height: '35px', filter: 'invert(1) hue-rotate(180deg) grayscale(1)', opacity: 0.8 }}
            />
        </div>
    );
}
