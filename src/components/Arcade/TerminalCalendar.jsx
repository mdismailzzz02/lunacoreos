import React, { useState } from 'react';

const TerminalCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const currentDay = today.getDate();

    const renderCalendar = () => {
        let days = [];
        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(<span key={`empty-${i}`} style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}></span>);
        }
        
        // Days of the month
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = isCurrentMonth && d === currentDay;
            days.push(
                <span 
                    key={d} 
                    style={{ 
                        display: 'inline-block', 
                        width: '24px', 
                        textAlign: 'right',
                        color: isToday ? '#4ade80' : '#00f2fe',
                        background: isToday ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                        fontWeight: isToday ? 'bold' : 'normal',
                        textDecoration: isToday ? 'underline' : 'none'
                    }}
                >
                    {d}
                </span>
            );
        }

        // Group into weeks
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(
                <div key={`week-${i}`} style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                    {days.slice(i, i + 7)}
                </div>
            );
        }
        return weeks;
    };

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const resetMonth = () => setCurrentDate(new Date());

    return (
        <div style={{
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '20px',
            width: '280px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            marginTop: '20px',
            fontFamily: 'monospace',
            color: '#00f2fe'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px dashed #333' }}>
                <button onClick={prevMonth} style={btnStyle}>&lt;</button>
                <div style={{ textAlign: 'center', flex: 1, cursor: 'pointer' }} onClick={resetMonth} title="Reset to current month">
                    <span style={{ fontWeight: 'bold' }}>{monthNames[month]}</span> <span style={{ opacity: 0.8 }}>{year}</span>
                </div>
                <button onClick={nextMonth} style={btnStyle}>&gt;</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', color: '#ff5f56', fontWeight: 'bold' }}>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Su</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Mo</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Tu</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>We</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Th</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Fr</span>
                <span style={{ display: 'inline-block', width: '24px', textAlign: 'right' }}>Sa</span>
            </div>

            <div style={{ minHeight: '130px' }}>
                {renderCalendar()}
            </div>
            
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #333', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>
                ismail@lunacore:~$ cal
            </div>
        </div>
    );
};

const btnStyle = {
    background: '#111',
    color: '#00f2fe',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '2px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace'
};

export default TerminalCalendar;
