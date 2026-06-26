import { useState } from 'react';
import { useInsights } from '../../hooks/useInsights';
import { SkeletonCard } from '../Shared/Skeleton';

const IMPACT_LEVELS = ['high', 'medium', 'low'];
const CATEGORIES = ['Personal Growth', 'Career', 'Health', 'Relationships', 'Finance', 'Creativity', 'Learning', 'Other'];

export default function InsightsPage() {
    const { insights, loading, create, update, linkToTodo } = useInsights();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filter, setFilter] = useState('all');
    const [form, setForm] = useState({ title: '', body: '', category: '', impact_level: 'medium', tags: '', source: '', review_date: '' });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const filtered = insights.filter(i => {
        if (filter === 'all') return true;
        if (filter === 'review') return i.review_date && String(i.review_date).substring(0, 10) <= new Date().toISOString().split('T')[0];
        return i.impact_level === filter;
    });

    const submit = async (e) => {
        e.preventDefault();
        if (editing) {
            await update({ insight_id: editing.insight_id, ...form });
        } else {
            await create(form);
        }
        setShowForm(false); setEditing(null); setForm({ title: '', body: '', category: '', impact_level: 'medium', tags: '', source: '', review_date: '' });
    };

    const openEdit = (ins) => {
        setEditing(ins);
        setForm({ title: ins.title || '', body: ins.body || '', category: ins.category || '', impact_level: ins.impact_level || 'medium', tags: ins.tags || '', source: ins.source || '', review_date: ins.review_date || '' });
        setShowForm(true);
    };

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>💡 Insights</h2>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ title: '', body: '', category: '', impact_level: 'medium', tags: '', source: '', review_date: '' }); setShowForm(true); }}>+ Capture Insight</button>
            </div>

            <div className="filter-bar">
                {['all', 'high', 'medium', 'low', 'review'].map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'review' ? '📅 To Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-emoji">💡</div><p>Capture your insights, learnings, and "aha!" moments here</p></div>
            ) : (
                <div className="masonry-grid">
                    {filtered.map(ins => (
                        <div key={ins.insight_id} className="masonry-item">
                            <div className="insight-card" onClick={() => openEdit(ins)}>
                                <div className="insight-title">{ins.title}</div>
                                <div className="insight-body">{ins.body}</div>
                                <div className="insight-footer">
                                    <div className={`impact-bar ${ins.impact_level}`} />
                                    {ins.category && <span className="pill" style={{ fontSize: '0.68rem' }}>{ins.category}</span>}
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                        {String(ins.created_date).substring(0, 10)}
                                    </span>
                                    {ins.review_date && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>📅 {String(ins.review_date).substring(0, 10)}</span>
                                    )}
                                </div>
                                {ins.tags && (
                                    <div className="tags-row" style={{ marginTop: '0.5rem' }}>
                                        {String(ins.tags).split(',').filter(Boolean).map(t => (
                                            <span key={t} className="pill" style={{ fontSize: '0.65rem' }}>{t.trim()}</span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); linkToTodo({ insight_id: ins.insight_id }); }}>→ Todo</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">{editing ? 'Edit Insight' : 'Capture Insight 💡'}</div>
                        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div className="field-group">
                                <label className="field-label">Title *</label>
                                <input className="field-input" placeholder="Concise title for this insight" value={form.title} onChange={e => set('title', e.target.value)} required />
                            </div>
                            <div className="field-group">
                                <label className="field-label">Body</label>
                                <textarea className="field-input" rows={4} placeholder="What did you learn or realize?" value={form.body} onChange={e => set('body', e.target.value)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="field-group">
                                    <label className="field-label">Category</label>
                                    <select className="field-input" value={form.category} onChange={e => set('category', e.target.value)}>
                                        <option value="">Select...</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Impact Level</label>
                                    <select className="field-input" value={form.impact_level} onChange={e => set('impact_level', e.target.value)}>
                                        {IMPACT_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Source</label>
                                    <input className="field-input" placeholder="Book, person, experience..." value={form.source} onChange={e => set('source', e.target.value)} />
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Review Date</label>
                                    <input type="date" className="field-input" value={form.review_date} onChange={e => set('review_date', e.target.value)} />
                                </div>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Tags (comma separated)</label>
                                <input className="field-input" placeholder="growth, mindset, productivity" value={form.tags} onChange={e => set('tags', e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save 💡</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
