import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export default function SakuraCalculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [memory, setMemory] = useState(0);

    const handleNumber = (num) => {
        setDisplay(display === '0' ? num : display + num);
    };

    const handleOperator = (op) => {
        if (op === '=') {
            try {
                // Safely evaluate simple math using Function instead of eval
                const result = new Function('return ' + display)();
                setEquation(display + ' =');
                setDisplay(String(result));
            } catch (err) {
                setDisplay('Error');
            }
        } else if (op === 'C') {
            setDisplay('0');
            setEquation('');
        } else if (op === '⌫') {
            setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
        } else {
            // Check if last char is already an operator
            const lastChar = display.slice(-1);
            if (['+', '-', '*', '/'].includes(lastChar)) {
                setDisplay(display.slice(0, -1) + op);
            } else {
                setDisplay(display + op);
            }
        }
    };

    const handleSpecial = (type) => {
        try {
            const currentNum = parseFloat(display);
            if (isNaN(currentNum)) return;

            switch (type) {
                case 'sq':
                    setDisplay(String(Math.pow(currentNum, 2)));
                    setEquation(`sq(${currentNum})`);
                    break;
                case 'sqrt':
                    setDisplay(String(Math.sqrt(currentNum)));
                    setEquation(`sqrt(${currentNum})`);
                    break;
                case '%':
                    setDisplay(String(currentNum / 100));
                    setEquation(`${currentNum}%`);
                    break;
                case 'M+':
                    setMemory(memory + currentNum);
                    setDisplay('0');
                    break;
                case 'MR':
                    setDisplay(String(memory));
                    break;
                case 'MC':
                    setMemory(0);
                    break;
            }
        } catch (e) {
            setDisplay('Error');
        }
    };

    const buttonStyle = {
        background: 'rgba(255, 183, 197, 0.15)', // Light sakura pink
        border: '1px solid rgba(255, 183, 197, 0.3)',
        borderRadius: '12px',
        padding: '12px 0',
        fontSize: '1rem',
        color: '#ff9ebb',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui)',
    };

    const actionStyle = {
        ...buttonStyle,
        background: 'rgba(255, 140, 165, 0.25)',
        color: '#ff6b95',
    };

    return (
        <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255, 183, 197, 0.1) 0%, rgba(20, 20, 25, 0.8) 100%)',
            borderColor: 'rgba(255, 183, 197, 0.2)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9ebb', marginBottom: '0.5rem' }}>
                <Calculator size={18} />
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Sakura Calc</h3>
            </div>

            {/* Display Screen */}
            <div style={{ 
                background: 'rgba(0,0,0,0.4)', 
                borderRadius: '16px', 
                padding: '1rem', 
                textAlign: 'right',
                border: '1px solid rgba(255, 183, 197, 0.15)',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 183, 197, 0.6)', minHeight: '16px' }}>{equation}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>{display}</div>
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', flex: 1 }}>
                {/* Row 1 */}
                <button style={actionStyle} onClick={() => handleSpecial('MC')}>MC</button>
                <button style={actionStyle} onClick={() => handleSpecial('MR')}>MR</button>
                <button style={actionStyle} onClick={() => handleSpecial('M+')}>M+</button>
                <button style={{...actionStyle, background: 'rgba(255,107,107,0.2)', color: '#ff7675'}} onClick={() => handleOperator('C')}>C</button>

                {/* Row 2 */}
                <button style={actionStyle} onClick={() => handleSpecial('sqrt')}>√</button>
                <button style={actionStyle} onClick={() => handleSpecial('sq')}>x²</button>
                <button style={actionStyle} onClick={() => handleSpecial('%')}>%</button>
                <button style={actionStyle} onClick={() => handleOperator('/')}>÷</button>

                {/* Row 3 */}
                <button style={buttonStyle} onClick={() => handleNumber('7')}>7</button>
                <button style={buttonStyle} onClick={() => handleNumber('8')}>8</button>
                <button style={buttonStyle} onClick={() => handleNumber('9')}>9</button>
                <button style={actionStyle} onClick={() => handleOperator('*')}>×</button>

                {/* Row 4 */}
                <button style={buttonStyle} onClick={() => handleNumber('4')}>4</button>
                <button style={buttonStyle} onClick={() => handleNumber('5')}>5</button>
                <button style={buttonStyle} onClick={() => handleNumber('6')}>6</button>
                <button style={actionStyle} onClick={() => handleOperator('-')}>-</button>

                {/* Row 5 */}
                <button style={buttonStyle} onClick={() => handleNumber('1')}>1</button>
                <button style={buttonStyle} onClick={() => handleNumber('2')}>2</button>
                <button style={buttonStyle} onClick={() => handleNumber('3')}>3</button>
                <button style={actionStyle} onClick={() => handleOperator('+')}>+</button>

                {/* Row 6 */}
                <button style={buttonStyle} onClick={() => handleNumber('0')}>0</button>
                <button style={buttonStyle} onClick={() => handleNumber('.')}>.</button>
                <button style={actionStyle} onClick={() => handleOperator('⌫')}>⌫</button>
                <button style={{...actionStyle, background: 'rgba(255, 140, 165, 0.8)', color: '#fff'}} onClick={() => handleOperator('=')}>=</button>
            </div>
        </div>
    );
}
