import React, { useState, useEffect } from 'react';

const TerminalCalculator = () => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [justCalculated, setJustCalculated] = useState(false);

    const handleNumber = (num) => {
        if (display === '0' || justCalculated) {
            setDisplay(num);
            setJustCalculated(false);
        } else {
            setDisplay(display + num);
        }
    };

    const handleOperator = (op) => {
        if (justCalculated) setJustCalculated(false);
        setEquation(equation + display + ' ' + op + ' ');
        setDisplay('0');
    };

    const handleEqual = () => {
        try {
            // Safe eval for basic math
            const fullEquation = equation + display;
            // eslint-disable-next-line
            const result = new Function('return ' + fullEquation)();
            const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
            setDisplay(formattedResult);
            setEquation('');
            setJustCalculated(true);
        } catch (e) {
            setDisplay('ERR');
            setEquation('');
            setJustCalculated(true);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setEquation('');
        setJustCalculated(false);
    };

    const handleBackspace = () => {
        if (justCalculated) return;
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    };

    const buttonStyle = {
        background: '#111',
        color: '#00f2fe',
        border: '1px solid #333',
        padding: '15px',
        fontSize: '1.2rem',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    };

    const handleKeyDown = (e) => {
        const key = e.key;
        if (/[0-9.]/.test(key)) handleNumber(key);
        else if (['+', '-', '*', '/'].includes(key)) handleOperator(key);
        else if (key === 'Enter' || key === '=') handleEqual();
        else if (key === 'Backspace') handleBackspace();
        else if (key === 'Escape' || key === 'c' || key === 'C') handleClear();
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, equation, justCalculated]);

    return (
        <div style={{
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '20px',
            width: '320px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            marginTop: '20px',
            fontFamily: 'monospace'
        }}>
            <div style={{
                background: '#000',
                border: '1px solid #444',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'right',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '4px'
            }}>
                <div style={{ color: '#666', fontSize: '0.9rem', minHeight: '1.2rem' }}>
                    {equation}
                </div>
                <div style={{ color: '#4ade80', fontSize: '2rem', overflow: 'hidden' }}>
                    {display}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px'
            }}>
                <button style={{...buttonStyle, color: '#ff5f56'}} onClick={handleClear} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>C</button>
                <button style={buttonStyle} onClick={handleBackspace} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>⌫</button>
                <button style={buttonStyle} onClick={() => handleOperator('/')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>/</button>
                <button style={{...buttonStyle, color: '#f7c000'}} onClick={() => handleOperator('*')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>*</button>

                <button style={buttonStyle} onClick={() => handleNumber('7')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>7</button>
                <button style={buttonStyle} onClick={() => handleNumber('8')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>8</button>
                <button style={buttonStyle} onClick={() => handleNumber('9')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>9</button>
                <button style={{...buttonStyle, color: '#f7c000'}} onClick={() => handleOperator('-')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>-</button>

                <button style={buttonStyle} onClick={() => handleNumber('4')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>4</button>
                <button style={buttonStyle} onClick={() => handleNumber('5')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>5</button>
                <button style={buttonStyle} onClick={() => handleNumber('6')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>6</button>
                <button style={{...buttonStyle, color: '#f7c000'}} onClick={() => handleOperator('+')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>+</button>

                <button style={buttonStyle} onClick={() => handleNumber('1')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>1</button>
                <button style={buttonStyle} onClick={() => handleNumber('2')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>2</button>
                <button style={buttonStyle} onClick={() => handleNumber('3')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>3</button>
                <button style={{...buttonStyle, gridRow: 'span 2', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)'}} onClick={handleEqual} onMouseOver={e => e.target.style.background = 'rgba(0, 242, 254, 0.2)'} onMouseOut={e => e.target.style.background = 'rgba(0, 242, 254, 0.1)'}>=</button>

                <button style={{...buttonStyle, gridColumn: 'span 2'}} onClick={() => handleNumber('0')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>0</button>
                <button style={buttonStyle} onClick={() => handleNumber('.')} onMouseOver={e => e.target.style.background = '#222'} onMouseOut={e => e.target.style.background = '#111'}>.</button>
            </div>
        </div>
    );
};

export default TerminalCalculator;
