import { useState, useEffect, useRef } from 'react';

function CountUp({ value }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const target = parseInt(value) || 0;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 20));
        clearInterval(ref.current);
        ref.current = setInterval(() => {
            cur = Math.min(cur + step, target);
            setDisplay(cur);
            if (cur >= target) clearInterval(ref.current);
        }, 40);
        return () => clearInterval(ref.current);
    }, [value]);
    return <span className="count-up">{display}</span>;
}

function RingProgress({ value, max }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    const r = 22, circ = 2 * Math.PI * r;
    const filled = circ * (1 - pct / 100);
    return (
        <div className="ring-wrap" style={{ width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx="28" cy="28" r={r} fill="none" stroke="var(--success)" strokeWidth="4"
                    strokeDasharray={circ} strokeDashoffset={filled} strokeLinecap="round" />
            </svg>
            <span className="ring-text">{pct}%</span>
        </div>
    );
}

export default function StatsRow({ stats, onNavigate }) {
    const cfg = stats?.config || {};
    const todos = stats?.today_todos || [];
    const habits = stats?.active_habits || [];
    const logs = stats?.today_habit_logs || [];

    const todoDone = todos.filter(t => t.status === 'completed').length;
    const habitsDone = logs.filter(l => l.status === 'completed').length;
    const rolled = todos.filter(t => parseInt(t.rollover_count) > 0).length;
    const noJournal = !stats?.latest_entry || stats?.latest_entry?.date !== new Date().toISOString().split('T')[0];

    return (
        <div className="stats-row">
            {/* Journal Streak */}
            <div className={`stat-card ${noJournal ? 'amber-pulse' : ''}`}>
                <div className="stat-icon">🔥</div>
                <div className="stat-value"><CountUp value={cfg.journal_streak || 0} /> days</div>
                <div className="stat-label">Journal Streak</div>
                <div className="stat-sub">Best: {cfg.longest_journal_streak || 0} days</div>
            </div>

            {/* Todos Today */}
            <div className={`stat-card ${todoDone === todos.length && todos.length > 0 ? '' : ''}`}>
                <div className="stat-icon">{todoDone === todos.length && todos.length > 0 ? '✅' : '📋'}</div>
                <div className="stat-value" style={todoDone === todos.length && todos.length > 0 ? { color: 'var(--success)' } : {}}>
                    {todoDone} / {todos.length}
                </div>
                <div className="stat-label">Todos Today</div>
                <div className="stat-sub">{rolled > 0 ? `↩ ${rolled} rolled over` : 'All fresh!'}</div>
            </div>

            {/* Insights this month */}
            <div className="stat-card clickable" onClick={() => onNavigate('insights')}>
                <div className="stat-icon">💡</div>
                <div className="stat-value"><CountUp value={cfg.total_insights || 0} /></div>
                <div className="stat-label">Insights (All Time)</div>
                <div className="stat-sub">Click to view →</div>
            </div>

            {/* Habit score */}
            <div className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div className="stat-icon">🌿</div>
                    <div className="stat-value">{habitsDone} / {habits.length}</div>
                    <div className="stat-label">Habits Today</div>
                </div>
                <RingProgress value={habitsDone} max={habits.length} />
            </div>
        </div>
    );
}
