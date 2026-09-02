import React, { useState, useEffect, useRef } from 'react';

export default function Hollywood() {
    const [logs, setLogs] = useState([]);
    const containerRef = useRef(null);
    
    // Fake hacker log lines
    const codeLines = [
        "Connecting to remote server...",
        "Bypassing firewall [OK]",
        "Decrypting payload... 0x1A4B9F",
        "ACCESS GRANTED",
        "char *buf = malloc(1024);",
        "int main(int argc, char **argv) {",
        "    if (ptr == NULL) return -1;",
        "0x00000000  48 83 EC 08 48 83 C4 08  H...H...",
        "Establishing secure connection to 192.168.1.104...",
        "Injection successful.",
        "Downloading internal files [####################] 100%",
        "rm -rf /var/log/syslog",
        "sudo chmod -R 777 /",
        "void handle_request(struct client *c) {",
        "0x00000010  E8 00 00 00 00 48 8B 05  .....H..",
        "Parsing RSA headers...",
        "Brute forcing AES-256 key...",
        "Key found: 9f86d081884c7d659a2feaa0c55ad015",
        "ACCESS GRANTED"
    ];

    const audioCtxRef = useRef(null);

    useEffect(() => {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();

        const interval = setInterval(() => {
            if (audioCtxRef.current) {
                if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
                
                const osc = audioCtxRef.current.createOscillator();
                const gain = audioCtxRef.current.createGain();
                
                osc.type = 'square';
                osc.frequency.setValueAtTime(1000 + Math.random() * 3000, audioCtxRef.current.currentTime);
                
                gain.gain.setValueAtTime(0.015, audioCtxRef.current.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, audioCtxRef.current.currentTime + 0.04);
                
                osc.connect(gain);
                gain.connect(audioCtxRef.current.destination);
                
                osc.start();
                osc.stop(audioCtxRef.current.currentTime + 0.05);
            }

            setLogs(prev => {
                const newLogs = [...prev, codeLines[Math.floor(Math.random() * codeLines.length)]];
                // Keep only the last 40 logs to prevent memory leaks and DOM bloat
                if (newLogs.length > 40) return newLogs.slice(newLogs.length - 40);
                return newLogs;
            });
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        }, 80); // Fast scrolling
        
        return () => {
            clearInterval(interval);
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '600px', height: '300px', overflowY: 'hidden', color: '#0f0', fontFamily: 'monospace', fontSize: '13px', margin: '20px 0', background: '#000', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
            {logs.map((log, i) => (
                <div key={i} style={{ 
                    color: log.includes("ACCESS GRANTED") ? '#000' : (log.includes("0x") ? '#888' : '#0f0'),
                    background: log.includes("ACCESS GRANTED") ? '#0f0' : 'transparent',
                    padding: log.includes("ACCESS GRANTED") ? '0 5px' : '0',
                    display: log.includes("ACCESS GRANTED") ? 'inline-block' : 'block',
                    width: log.includes("ACCESS GRANTED") ? 'auto' : '100%',
                    marginBottom: '2px'
                }}>
                    {log}
                </div>
            ))}
        </div>
    );
}
