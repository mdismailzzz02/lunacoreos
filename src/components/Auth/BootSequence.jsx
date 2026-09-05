import React, { useState, useEffect } from 'react';

const BOOT_LINES = [
    "INITIALIZING LUNACORE OS KERNEL...",
    "Mounting encrypted file systems........ [OK]",
    "Loading security daemon........ [OK]",
    "Establishing neural link via AI Orb........ [OK]",
    "Verifying integrity of modules........ [OK]",
    "System boot successful.",
    "Awaiting user authentication."
];

const BootSequence = ({ onComplete }) => {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);

    useEffect(() => {
        if (currentLineIndex >= BOOT_LINES.length) {
            // Brief pause before finishing
            const timeout = setTimeout(() => {
                if (onComplete) onComplete();
            }, 300);
            return () => clearTimeout(timeout);
        }

        const currentFullLine = BOOT_LINES[currentLineIndex];

        if (currentCharIndex < currentFullLine.length) {
            // Type the next character — fast but still feels like a real terminal
            const charDelay = Math.floor(Math.random() * 8) + 5; // 5–12ms per char
            
            const timeout = setTimeout(() => {
                setDisplayedLines(prev => {
                    const newLines = [...prev];
                    if (newLines[currentLineIndex] === undefined) {
                        newLines[currentLineIndex] = currentFullLine[currentCharIndex];
                    } else {
                        newLines[currentLineIndex] += currentFullLine[currentCharIndex];
                    }
                    return newLines;
                });
                setCurrentCharIndex(prev => prev + 1);
            }, charDelay);
            return () => clearTimeout(timeout);
        } else {
            // Short pause between lines
            const lineDelay = Math.floor(Math.random() * 80) + 80; // 80–160ms
            
            const timeout = setTimeout(() => {
                setCurrentLineIndex(prev => prev + 1);
                setCurrentCharIndex(0);
            }, lineDelay);
            return () => clearTimeout(timeout);
        }
    }, [currentLineIndex, currentCharIndex, onComplete]);

    const renderLine = (line, index) => {
        const fullLine = BOOT_LINES[index];
        
        // Header line
        if (fullLine.startsWith('INITIALIZING')) {
            return <span style={{ color: '#00f2fe', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,242,254,0.6)' }}>{line}</span>;
        }
        
        // Success / Auth lines
        if (fullLine.includes('successful')) {
            return <span style={{ color: '#27c93f', fontWeight: 'bold', textShadow: '0 0 8px rgba(39,201,63,0.5)' }}>{line}</span>;
        }
        if (fullLine.includes('Awaiting')) {
            return <span style={{ color: '#ffbd2e', textShadow: '0 0 8px rgba(255,189,46,0.4)' }}>{line}</span>;
        }

        // Status lines with [OK]
        if (fullLine.includes('[OK]')) {
            if (line.includes('[OK]')) {
                const parts = line.split('[OK]');
                return (
                    <span style={{ color: '#a0a0a0' }}>
                        {parts[0]}
                        <span style={{ color: '#27c93f', fontWeight: 'bold', textShadow: '0 0 8px rgba(39,201,63,0.8)' }}>[OK]</span>
                        {parts[1]}
                    </span>
                );
            } else {
                return <span style={{ color: '#a0a0a0' }}>{line}</span>;
            }
        }

        return <span style={{ color: '#e0e0e0' }}>{line}</span>;
    };

    return (
        <div style={{ fontFamily: 'monospace', color: '#e0e0e0', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {displayedLines.map((line, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                    {renderLine(line, index)}
                    {index === currentLineIndex && <span style={{ animation: 'blink 1s step-end infinite', color: '#00f2fe' }}>_</span>}
                </div>
            ))}
            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default BootSequence;
