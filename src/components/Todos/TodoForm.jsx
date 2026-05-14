import { useState } from 'react';

export default function TodoForm({ onSave, onCancel, initial = {} }) {
    const [form, setForm] = useState({
        title: initial.title || '',
        description: initial.description || '',
        priority: initial.priority || 'medium',
        category: initial.category || '',
        due_date: initial.due_date || new Date().toISOString().split('T')[0],
        is_recurring: initial.is_recurring || false,
        recur_freq: initial.recur_freq || '',
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave(form);
    };

    return (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="field-group">
                <label className="field-label">Title *</label>
                <input className="field-input" placeholder="What needs to be done?" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="field-group">
                <label className="field-label">Description</label>
                <textarea className="field-input" placeholder="Details..." value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field-group">
                    <label className="field-label">Priority</label>
                    <select className="field-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                </div>
                <div className="field-group">
                    <label className="field-label">Category</label>
                    <input className="field-input" placeholder="e.g. work, personal" value={form.category} onChange={e => set('category', e.target.value)} />
                </div>
                <div className="field-group">
                    <label className="field-label">Due Date</label>
                    <input type="date" className="field-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                </div>
                <div className="field-group">
                    <label className="field-label">Recurring</label>
                    <select className="field-input" value={form.recur_freq} onChange={e => set('recur_freq', e.target.value)}>
                        <option value="">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Todo ✅</button>
            </div>
        </form>
    );
}
