import React, { useState, useEffect } from 'react';

const UnlockSequence = ({ isError, onComplete }) => {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);

    // Ensure we don't start sequence until we know if it's an error or not? 
    // Wait, the sequence should run WHILE we are doing the auth check, OR after?
    // If we run it BEFORE we know the result, we need a way to feed the result into it.
    // If we run it AFTER we know the result (like waiting for the promise to resolve, then playing the sequence),
    // it's easier, but might add 1 extra second on top of the network request.
    // Let's run it AFTER we get the result, to keep it simple and foolproof. 
    // The user will experience: [Hit Enter] -> short pause (network) -> Sequence Plays -> [Access Granted/Denied] -> [Action].

    const steps = [
        { text: "Initiating handshake protocol...", delay: 100 },
        { text: "Verifying cryptographic signature... [OK]", delay: 250 },
        { text: "Decrypting payload... [OK]", delay: 200 },
        { text: "Validating access credentials...", delay: 200 }
    ];

    useEffect(() => {
        if (currentStep < steps.length) {
            const timer = setTimeout(() => {
                setDisplayedLines(prev => [...prev, steps[currentStep].text]);
                setCurrentStep(prev => prev + 1);
            }, steps[currentStep].delay);
            return () => clearTimeout(timer);
        } else {
            // Sequence finished, show outcome
            const finalTimer = setTimeout(() => {
                if (isError) {
                    setDisplayedLines(prev => [...prev, "ERROR: ACCESS DENIED."]);
                } else {
                    setDisplayedLines(prev => [...prev, "ACCESS GRANTED. Unlocking..."]);
                }
                
                // Wait slightly after showing result before completing
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 400);

            }, 250);
            return () => clearTimeout(finalTimer);
        }
    }, [currentStep, isError, onComplete]);

    const renderLine = (line) => {
        // ERROR lines
        if (line.includes('ERROR')) {
            return <span style={{ color: '#ff5f56', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,95,86,0.6)' }}>{line}</span>;
        }
        
        // GRANTED lines
        if (line.includes('GRANTED')) {
            return <span style={{ color: '#4ade80', fontWeight: 'bold', textShadow: '0 0 10px rgba(74,222,128,0.6)' }}>{line}</span>;
        }

        // Status lines with [OK]
        if (line.includes('[OK]')) {
            const parts = line.split('[OK]');
            return (
                <span style={{ color: '#a0a0a0' }}>
                    {parts[0]}
                    <span style={{ color: '#27c93f', fontWeight: 'bold', textShadow: '0 0 8px rgba(39,201,63,0.8)' }}>[OK]</span>
                    {parts[1]}
                </span>
            );
        }

        return <span style={{ color: '#a0a0a0' }}>{line}</span>;
    };

    return (
        <div style={{ fontFamily: 'monospace', color: '#e0e0e0', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {displayedLines.map((line, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                    {renderLine(line)}
                </div>
            ))}
            {currentStep <= steps.length && (
                <div style={{ marginTop: '8px' }}>
                    <span style={{ animation: 'blink 1s step-end infinite', color: '#00f2fe' }}>_</span>
                </div>
            )}
            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default UnlockSequence;
