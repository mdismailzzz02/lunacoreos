import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './DateCalendar.css';

export default function DateCalendar({ 
    journalNotes, 
    onDateSelect, 
    selectedDate = null 
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const entriesByDate = useMemo(() => {
        const map = {};
        journalNotes.forEach(note => {
            if (note.date) {
                if (!map[note.date]) map[note.date] = 0;
                map[note.date]++;
            }
        });
        return map;
    }, [journalNotes]);

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDate = (day) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const monthName = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    return (
        <div className="date-calendar">
            <div className="dc-header">
                <button className="dc-nav-btn" onClick={handlePrevMonth}>
                    <ChevronLeft size={18} />
                </button>
                <span className="dc-month-year">{monthName}</span>
                <button className="dc-nav-btn" onClick={handleNextMonth}>
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="dc-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="dc-weekday">{day}</div>
                ))}
            </div>

            <div className="dc-days">
                {days.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="dc-day empty" />;
                    }

                    const dateStr = formatDate(day);
                    const entryCount = entriesByDate[dateStr] || 0;
                    const isSelected = selectedDate === dateStr;
                    const hasEntries = entryCount > 0;
                    const intensity = Math.min(entryCount / 5, 1);

                    return (
                        <button
                            key={`day-${day}`}
                            className={`dc-day ${isSelected ? 'selected' : ''} ${hasEntries ? 'has-entries' : ''}`}
                            onClick={() => onDateSelect(dateStr)}
                            style={hasEntries && !isSelected ? {
                                background: `rgba(124, 58, 237, ${0.2 + intensity * 0.5})`,
                            } : {}}
                            title={`${entryCount} entries`}
                        >
                            <span className="dc-day-num">{day}</span>
                            {hasEntries && (
                                <span className="dc-entry-count">{entryCount}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
