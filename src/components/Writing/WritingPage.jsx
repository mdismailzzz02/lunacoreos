import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function WritingPage() {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editorData, setEditorData] = useState({ title: '', content: '', tags: '' });

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        try {
            const data = await api.getWritings();
            setDrafts(data || []);
        } catch (err) {
            console.error('Failed to load drafts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setEditingId('new');
        setEditorData({ title: '', content: '', tags: '' });
    };

    const handleSave = async () => {
        if (!editorData.title.trim()) return;

        const isNew = editingId === 'new';
        const newDraft = {
            id: isNew ? Date.now().toString() : editingId,
            ...editorData,
            created_at: isNew ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
            word_count: editorData.content.split(/\s+/).filter(w => w).length.toString()
        };

        try {
            await api.saveWriting(newDraft);
            if (isNew) {
                setDrafts([newDraft, ...drafts]);
            } else {
                setDrafts(drafts.map(d => d.id === editingId ? newDraft : d));
            }
            setEditingId(null);
        } catch (err) {
            alert('Failed to save draft');
        }
    };

    const handleEdit = (draft) => {
        setEditingId(draft.id);
        setEditorData({ title: draft.title, content: draft.content, tags: draft.tags });
    };

    if (editingId) {
        return (
            <div className="fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ← Back to Drafts
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>Auto-saving... (coming soon)</span>
                        <button onClick={handleSave} style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                            Save Draft
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <input
                        type="text"
                        placeholder="Title of your piece..."
                        style={{ fontSize: '2rem', fontWeight: 'bold', background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                        value={editorData.title}
                        onChange={e => setEditorData({ ...editorData, title: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Tags (e.g., Essay, Personal, Sci-Fi)"
                        style={{ fontSize: '0.9rem', opacity: 0.5, background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                        value={editorData.tags}
                        onChange={e => setEditorData({ ...editorData, tags: e.target.value })}
                    />
                    <hr style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
                    <textarea
                        placeholder="Start writing..."
                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', outline: 'none', width: '100%', resize: 'none', fontSize: '1.1rem', lineHeight: '1.7', fontFamily: "'Lora', serif" }}
                        value={editorData.content}
                        onChange={e => setEditorData({ ...editorData, content: e.target.value })}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>✍️ Long-form Writing</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Essays, stories, and deep dives. No distractions.</p>
                </div>
                <button
                    onClick={handleNew}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + New Piece
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {drafts.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            Your writing desk is clear. Ready for a new draft?
                        </div>
                    )}
                    {drafts.map(draft => (
                        <div key={draft.id} onClick={() => handleEdit(draft)} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            transition: 'all 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-color, #a29bfe)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{draft.title}</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {draft.content || 'No content yet...'}
                            </p>
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>
                                    {new Date(draft.updatedAt || draft.created_at || Date.now()).toLocaleDateString()}
                                </div>
                                {draft.tags && (
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                        {draft.tags.split(',')[0]}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
