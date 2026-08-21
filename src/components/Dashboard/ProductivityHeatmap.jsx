import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Activity } from 'lucide-react';

export default function ProductivityHeatmap() {
    const [activityMap, setActivityMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(true);

    const WEEKS = 12;
    const DAYS = WEEKS * 7; // 84 days

    useEffect(() => {
        let mounted = true;
        
        const fetchActivity = async () => {
            try {
                const todos = await api.getTodos();
                
                const now = new Date();
                const pastDate = new Date(now);
                pastDate.setDate(now.getDate() - (DAYS - 1));
                const pastDateStr = pastDate.toLocaleDateString('en-CA');

                const counts = {};
                let totalCompleted = 0;

                if (todos && todos.length > 0) {
                    todos.forEach(t => {
                        if (t.status === 'completed' && t.completion_date && t.completion_date >= pastDateStr) {
                            counts[t.completion_date] = (counts[t.completion_date] || 0) + 1;
                            totalCompleted++;
                        }
                    });
                }
                
                if (mounted) {
                    setActivityMap(counts);
                    setHasData(totalCompleted > 0);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch activity:", err);
                if (mounted) setLoading(false);
            }
        };

        fetchActivity();
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '180px' }}></div>;

    // Generate grid data
    // We want columns = weeks, rows = day of week (0=Sun, 6=Sat)
    // To align properly, we end on today.
    const now = new Date();
    
    // Find the starting Sunday of the first week we want to show
    // actually, let's just create an array of DAYS length ending today
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days.push({
            date: d.toLocaleDateString('en-CA'),
            dayOfWeek: d.getDay() // 0-6
        });
    }

    // Split into columns (weeks)
    // But since days might not start on Sunday, we pad the first column
    const firstDayOfWeek = days[0].dayOfWeek;
    const paddedDays = [];
    for(let i=0; i<firstDayOfWeek; i++) paddedDays.push(null);
    days.forEach(d => paddedDays.push(d));

    const weeks = [];
    for(let i=0; i<paddedDays.length; i+=7) {
        weeks.push(paddedDays.slice(i, i+7));
    }

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                    <Activity size={16} /> Productivity
                </h3>
            </div>

            {!hasData ? (
                <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                    <Activity size={24} opacity={0.5} />
                    <div style={{ fontSize: '0.85rem' }}>Complete todos to start building your heatmap</div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {weeks.map((week, wIdx) => (
                        <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {week.map((day, dIdx) => {
                                if (!day) return <div key={dIdx} style={{ width: '12px', height: '12px' }} />; // empty slot for padding
                                
                                const count = activityMap[day.date] || 0;
                                
                                // Color scale logic based on CSS var
                                let opacity = 0.05; // base surface color
                                if (count > 0 && count <= 2) opacity = 0.3;
                                else if (count > 2 && count <= 5) opacity = 0.6;
                                else if (count > 5) opacity = 1.0;
                                
                                return (
                                    <div 
                                        key={day.date}
                                        title={`${day.date}: ${count} tasks completed`}
                                        style={{
                                            width: '12px', 
                                            height: '12px', 
                                            borderRadius: '2px',
                                            background: count === 0 ? 'rgba(255, 255, 255, 0.05)' : 'var(--accent)',
                                            opacity: count === 0 ? 1 : opacity,
                                            cursor: 'help',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


