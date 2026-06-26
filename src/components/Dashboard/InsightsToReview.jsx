export default function InsightsToReview({ insights, onNavigate }) {
    if (!insights || insights.length === 0) return null;

    const today = new Date().toISOString().split('T')[0];
    const overdue = insights.filter(i => i.review_date && String(i.review_date).substring(0, 10) <= today);
    if (overdue.length === 0) return null;

    return (
        <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
            <div className="section-title">💡 Insights to Review</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {overdue.map(ins => {
                    const daysOverdue = Math.floor((new Date(today) - new Date(String(ins.review_date).substring(0, 10))) / 86400000);
                    return (
                        <div key={ins.insight_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{ins.title}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>
                                    {daysOverdue === 0 ? 'Due today' : `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('insights')}>
                                Review Now →
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
