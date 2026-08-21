import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { CheckSquare } from 'lucide-react';

export default function TodosCompact({ onNavigate }) {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);

    const todayStr = new Date().toLocaleDateString('en-CA'); 

    useEffect(() => {
        let mounted = true;
        api.getTodos({ status: 'pending' }).then(data => {
            if (!mounted) return;
            const pending = (data || []).filter(t => t.status !== 'completed' && t.status !== 'archived');
            setTodos(pending);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load todos:', err);
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    const dueToday = todos.filter(t => {
        if (!t.due_date) return false;
        return t.due_date <= todayStr;
    });

    const displayTodos = dueToday.slice(0, 3);

    const handleToggle = async (todo) => {
        setToggling(todo.todo_id);
        try {
            await api.updateTodo({
                todo_id: todo.todo_id,
                status: 'completed',
                outcome_status: 'completed',
                completion_date: new Date().toLocaleDateString('en-CA'),
                completion_time: new Date().toLocaleTimeString('en-US', { hour12: false })
            });
            setTodos(prev => prev.filter(t => t.todo_id !== todo.todo_id));
        } catch (err) {
            console.error('Failed to complete todo:', err);
        } finally {
            setToggling(null);
        }
    };

    if (loading) return <div className="dashboard-card pulse" style={{ height: '150px' }}></div>;

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                    <CheckSquare size={16} /> Today's Todos
                </h3>
                {dueToday.length > 0 && (
                    <span className="interactive-text" style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => onNavigate('todos')}>
                        View All
                    </span>
                )}
            </div>

            {dueToday.length === 0 ? (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                    <CheckSquare size={24} opacity={0.5} />
                    <div style={{ fontSize: '0.85rem' }}>All caught up for today!</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {displayTodos.map(t => (
                        <div key={t.todo_id} className="interactive-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: toggling === t.todo_id ? 0.5 : 1, padding: '8px', borderRadius: '8px', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                            <input 
                                type="checkbox" 
                                checked={false}
                                onChange={() => handleToggle(t)} 
                                style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                            />
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                <div style={{ fontWeight: '500' }}>{t.task}</div>
                                {t.time_estimate && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {t.time_estimate}m</span>}
                            </div>
                        </div>
                    ))}
                    {dueToday.length > 3 && (
                        <div className="interactive-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '4px', cursor: 'pointer', textAlign: 'center' }} onClick={() => onNavigate('todos')}>
                            + {dueToday.length - 3} more pending today
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


