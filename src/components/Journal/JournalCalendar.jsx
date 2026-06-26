import { useState, useMemo } from 'react';
import { getLocalDate, sanitizeDate } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function JournalCalendar({ entries = [], onSelect, activeDate }) {
    const today = new Date();
    const [viewDate, setViewDate] = useState(activeDate ? new Date(activeDate) : today);

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    // Map entries to a quick lookup: { "2025-01-28": entryObj }
    const entryMap = useMemo(() => {
        const map = {};
        entries.forEach(e => {
            if (e.date) {
                const d = sanitizeDate(e.date);
                map[d] = e;
            }
        });
        return map;
    }, [entries]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const calendarDays = [];
    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
        calendarDays.push({ day: null });
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        calendarDays.push({
            day: d,
            dateStr,
            hasEntry: !!entryMap[dateStr],
            entry: entryMap[dateStr],
            isToday: dateStr === getLocalDate()
        });
    }

    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));

    // Mood colors for dots
    const getMoodColor = (mood) => {
        const map = {
            '😊': '#E8A045', // accent
            '😌': '#4ade80', // success
            '😐': '#94a3b8', // muted
            '😰': '#f87171', // danger
            '😔': '#60a5fa', // info
            '🤩': '#fbbf24', // warning/gold
            '😤': '#f472b6',
            '🥱': '#a78bfa'
        };
        return map[mood] || 'var(--accent)';
    };

    return (
        <div className="journal-calendar fade-in">
            <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                <div className="cal-title">{MONTHS[month]} {year}</div>
                <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>

            <div className="cal-grid-header">
                {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
            </div>

            <div className="cal-grid">
                {calendarDays.map((item, i) => {
                    if (!item.day) return <div key={`empty-${i}`} className="cal-cell empty" />;
                    
                    const isActive = activeDate === item.dateStr;
                    const moodColor = item.hasEntry ? getMoodColor(item.entry.mood) : null;
                    
                    return (
                        <div 
                            key={item.dateStr}
                            className={`cal-cell ${item.hasEntry ? 'has-entry' : ''} ${item.isToday ? 'is-today' : ''} ${isActive ? 'active' : ''}`}
                            style={moodColor ? { '--mood-color': moodColor } : {}}
                            onClick={() => onSelect(item.dateStr, item.entry)}
                        >
                            <span className="cal-day-num">{item.day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
