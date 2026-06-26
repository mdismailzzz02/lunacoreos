import { useState } from 'react';
import ConclusionModal from '../Todos/ConclusionModal';
import { useTodos } from '../../hooks/useTodos';

export default function TodayTodos({ todos, onNavigate }) {
    const { complete } = useTodos();
    const [completing, setCompleting] = useState(null);

    const handleComplete = async (params) => {
        await complete({ todo_id: completing.todo_id, ...params });
        setCompleting(null);
    };

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="section-title">Today's Todos</div>

            {todos.length > 0 && (
                <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${Math.round(todos.filter(t => t.status === 'completed').length / todos.length * 100)}%` }} />
                </div>
            )}

            {todos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-emoji">🌿</div>
                    <p>Nothing due today — enjoy the space</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {todos.map(todo => (
                        <div
                            key={todo.todo_id}
                            className={`todo-card ${parseInt(todo.rollover_count) > 0 ? 'rolled' : ''}`}
                            style={{ padding: '0.6rem 0.75rem' }}
                        >
                            <button
                                className={`check-circle ${todo.status === 'completed' ? 'checked' : ''}`}
                                onClick={() => todo.status !== 'completed' && setCompleting(todo)}
                                disabled={todo.status === 'completed'}
                            >
                                {todo.status === 'completed' ? '✓' : ''}
                            </button>
                            <div className="todo-title" style={{ flex: 1, fontSize: '0.85rem' }}>{todo.title}</div>
                            <div className={`priority-dot ${todo.priority}`} />
                            {parseInt(todo.rollover_count) > 0 && (
                                <span className="rollover-badge">↩ {todo.rollover_count}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('todos')}>+ Add Todo</button>

            {completing && (
                <ConclusionModal
                    todo={completing}
                    onComplete={handleComplete}
                    onClose={() => setCompleting(null)}
                />
            )}
        </div>
    );
}
