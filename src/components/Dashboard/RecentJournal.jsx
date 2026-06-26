export default function RecentJournal({ entry, onNavigate }) {
    const today = new Date().toISOString().split('T')[0];
    const hasToday = entry && String(entry.date).substring(0, 10) === today;

    if (!entry) return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem' }}>📖</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No journal entries yet</p>
            <button className="btn btn-primary" onClick={() => onNavigate('journal')}>Start Writing ✏️</button>
        </div>
    );

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!hasToday && (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        You haven't written today yet
                    </p>
                    <button className="btn btn-primary" onClick={() => onNavigate('journal')}>Start Writing ✏️</button>
                </div>
            )}
            <div className="section-title">
                {hasToday ? 'Today\'s Entry' : 'Last Entry'}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {String(entry.date).substring(0, 10)} · {entry.day_of_week}
                        </span>
                        <span style={{ fontSize: '1.2rem' }}>{entry.mood === 'happy' ? '😊' : entry.mood === 'sad' ? '😔' : entry.mood === 'excited' ? '🤩' : entry.mood === 'anxious' ? '😰' : entry.mood === 'calm' ? '😌' : '😐'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energy: {entry.energy_level}/10</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-journal)', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {entry.text_content || '(No content)'}
                    </p>
                </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => onNavigate('journal')}>
                Read Full Entry →
            </button>
        </div>
    );
}
