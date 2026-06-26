import React from 'react';

export default function DashboardActivityGraph({ activity = [], title = "Activity", color = "var(--accent)" }) {
    if (!activity || activity.length === 0) return null;

    const maxCount = Math.max(...activity.map(a => a.count), 1);

    return (
        <div className="activity-graph-card" style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            padding: '1.2rem',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            width: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {title}
                </h3>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                    {activity.reduce((sum, a) => sum + a.count, 0)} total
                </span>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: '40px',
                padding: '2px 0'
            }}>
                {activity.map((day, idx) => {
                    const height = (day.count / maxCount) * 100;
                    const opacity = day.count > 0 ? 0.3 + (day.count / maxCount) * 0.7 : 0.05;

                    return (
                        <div
                            key={idx}
                            title={`${day.date}: ${day.count}`}
                            style={{
                                flex: 1,
                                height: `${Math.max(height, 5)}%`,
                                background: color,
                                borderRadius: '2px',
                                opacity: opacity,
                                transition: 'all 0.3s ease',
                                cursor: 'help'
                            }}
                        />
                    );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>30d ago</span>
                <span>Today</span>
            </div>
        </div>
    );
}
