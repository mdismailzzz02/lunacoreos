import React, { useState, useEffect, useRef } from 'react';

export default function SelfDestruct({ onComplete }) {
    const [logs, setLogs] = useState([]);
    const [countdown, setCountdown] = useState(5);
    const [complete, setComplete] = useState(false);
    const containerRef = useRef(null);

    const audioCtxRef = useRef(null);

    useEffect(() => {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        const playAlarm = () => {
            if (!audioCtxRef.current) return;
            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
            
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtxRef.current.currentTime);
            osc.frequency.linearRampToValueAtTime(200, audioCtxRef.current.currentTime + 0.2);
            gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            osc.start();
            osc.stop(audioCtxRef.current.currentTime + 0.2);
        };

        const playBlip = () => {
            if (!audioCtxRef.current) return;
            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
            
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800 + Math.random() * 2000, audioCtxRef.current.currentTime);
            gain.gain.setValueAtTime(0.015, audioCtxRef.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtxRef.current.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            osc.start();
            osc.stop(audioCtxRef.current.currentTime + 0.05);
        };

        playAlarm(); // Play initial alarm at T-5

        let logInterval;
        let countInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countInterval);
                    clearInterval(logInterval);
                    setComplete(true);
                    
                    // Final reboot chime
                    if (audioCtxRef.current) {
                        const osc = audioCtxRef.current.createOscillator();
                        const gain = audioCtxRef.current.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(600, audioCtxRef.current.currentTime);
                        gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 1);
                        osc.connect(gain);
                        gain.connect(audioCtxRef.current.destination);
                        osc.start();
                        osc.stop(audioCtxRef.current.currentTime + 1);
                    }
                    
                    setTimeout(() => onComplete(), 1500); // 1.5s delay before returning to menu
                    return 0;
                }
                playAlarm(); // Play alarm on every tick
                return prev - 1;
            });
        }, 1000);

        logInterval = setInterval(() => {
            playBlip(); // Play blip for every log line
            const sectors = ['7G', '4B', '1A', '9X', 'Omega', 'Alpha', 'Delta'];
            const files = ['/boot/vmlinuz', '/etc/shadow', '/var/core.db', '/home/user/memory.img', '/sys/firmware/efi'];
            const r = Math.random();
            let text = "";
            
            if (r < 0.3) text = `Purging sector ${sectors[Math.floor(Math.random() * sectors.length)]}...`;
            else if (r < 0.6) text = `Erasing ${files[Math.floor(Math.random() * files.length)]}... OK`;
            else text = `WARNING: Thermal limits exceeded! [${Math.floor(Math.random() * 50 + 90)}C]`;

            setLogs(prev => {
                const newLogs = [...prev, text];
                if (newLogs.length > 15) return newLogs.slice(newLogs.length - 15);
                return newLogs;
            });
            
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        }, 80);

        return () => {
            clearInterval(countInterval);
            clearInterval(logInterval);
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, [onComplete]);

    if (complete) {
        return (
            <div style={{ color: '#00f2fe', margin: '20px 0', fontSize: '16px', fontFamily: 'monospace' }}>
                <p>System restart initiated...</p>
                <p>Rebooting.</p>
            </div>
        );
    }

    return (
        <div style={{ margin: '20px 0', color: '#f00', fontFamily: 'monospace', width: '600px' }}>
            <h2 style={{ fontSize: '24px', animation: 'blink 0.5s infinite', margin: '0 0 10px 0', textShadow: '0 0 10px #f00' }}>SELF DESTRUCT IMMINENT</h2>
            <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0' }}>T-{countdown}</div>
            <div ref={containerRef} style={{ height: '150px', overflow: 'hidden', borderTop: '1px solid #f00', paddingTop: '10px' }}>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
            <style>{`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
