const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeeklyStrip({ days }) {
    const today = new Date().toISOString().split('T')[0];

    if (!days || days.length === 0) return null;

    return (
        <div className="card" style={{ padding: '1rem' }}>
            <div className="weekly-strip">
                {days.map((day, i) => {
                    const isToday = day.date === today;
                    const d = new Date(day.date + 'T00:00:00');
                    const dayLabel = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]; // Mon-based
                    return (
                        <div key={day.date} className={`week-day ${isToday ? 'today' : ''}`} title={day.date}>
                            <span className="week-day-label">{dayLabel}</span>
                            <span className="week-day-num">{d.getDate()}</span>
                            <div className="week-dots">
                                <div className={`week-dot ${day.has_journal ? 'amber' : ''}`} title="Journal" />
                                <div className={`week-dot ${day.habit_pct >= 100 ? 'green' : day.habit_pct >= 50 ? 'green' : ''}`} title="Habits" style={day.habit_pct > 0 && day.habit_pct < 100 ? { opacity: 0.5, background: 'var(--success)' } : {}} />
                                <div className={`week-dot ${day.has_todo ? 'blue' : ''}`} title="Todos" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
