import { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { PenTool, Lock } from 'lucide-react';
import SecondaryVaultLock from '../Vault/SecondaryVaultLock';

export default function WritingPage() {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editorData, setEditorData] = useState({ title: '', content: '', tags: '' });
    const [saveStatus, setSaveStatus] = useState('');
    const timeoutRef = useRef(null);
    const editingIdRef = useRef(null);
    
    const [writingMode, setWritingMode] = useState('normal'); // 'normal' | 'secret'
    const [secretClicks, setSecretClicks] = useState(0);
    const [pendingUnlock, setPendingUnlock] = useState(false);

    useEffect(() => {
        loadDrafts(writingMode);
    }, [writingMode]);

    useEffect(() => {
        if (!editingId || !editorData.title.trim()) return;
        
        setSaveStatus('Saving...');
        timeoutRef.current = setTimeout(() => {
            saveDraft(false);
        }, 1500);
        
        return () => clearTimeout(timeoutRef.current);
    }, [editorData, editingId]);

    const loadDrafts = async (mode = writingMode) => {
        try {
            setLoading(true);
            const data = await api.getWritings(mode);
            setDrafts(data || []);
        } catch (err) {
            console.error('Failed to load drafts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSecretClick = () => {
        if (writingMode === 'secret') return;
        const newClicks = secretClicks + 1;
        setSecretClicks(newClicks);
        if (newClicks >= 3) {
            setPendingUnlock(true);
            setSecretClicks(0);
        }
        setTimeout(() => setSecretClicks(0), 3000);
    };

    const handleNew = () => {
        setEditingId('new');
        editingIdRef.current = 'new';
        setEditorData({ title: '', content: '', tags: '' });
    };

    const saveDraft = async (closeEditor = false) => {
        if (!editorData.title.trim()) return;

        // Prevent race conditions with pending autosaves
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const currentId = editingIdRef.current;
        if (!currentId) return; // Editor already closed

        const isNew = currentId === 'new';
        const generatedId = isNew ? Date.now().toString() : currentId;
        
        // Always update the ref for new items so any concurrent saves use the same ID
        if (isNew) {
            editingIdRef.current = generatedId;
            // Only update the state if we are keeping the editor open
            if (!closeEditor) {
                setEditingId(generatedId);
            }
        }

        const newDraft = {
            id: generatedId,
            ...editorData,
            mode: writingMode,
            created_at: isNew ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
            word_count: editorData.content.split(/\s+/).filter(w => w).length.toString()
        };

        try {
            await api.saveWriting(newDraft);
            if (isNew) {
                setDrafts(prev => [newDraft, ...prev]);
            } else {
                setDrafts(prev => prev.map(d => d.id === currentId ? newDraft : d));
            }
            
            setSaveStatus('Saved');
            if (closeEditor) {
                setEditingId(null);
                editingIdRef.current = null;
            } else {
                setTimeout(() => setSaveStatus(''), 2000);
            }
        } catch (err) {
            setSaveStatus('Failed to save');
            // Revert ref if it failed and we wanted to keep it open
            if (isNew && !closeEditor) {
                editingIdRef.current = 'new';
                setEditingId('new');
            }
        }
    };

    const handleEdit = (draft) => {
        setEditingId(draft.id);
        editingIdRef.current = draft.id;
        setEditorData({ title: draft.title, content: draft.content, tags: draft.tags });
    };

    const handleDelete = async () => {
        if (editingId === 'new') {
            setEditingId(null);
            editingIdRef.current = null;
            return;
        }
        const confirmText = window.prompt('Type "delete" to confirm removal of this draft:');
        if (confirmText?.toLowerCase() !== 'delete') return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        try {
            const idToDelete = editingId;
            await api.deleteWriting(idToDelete);
            setDrafts(prev => prev.filter(d => d.id !== idToDelete));
            setEditingId(null);
            editingIdRef.current = null;
        } catch (err) {
            alert('Failed to delete draft');
        }
    };

    if (editingId) {
        return (
            <div className="fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => { setEditingId(null); editingIdRef.current = null; }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ← Back to Drafts
                    </button>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{saveStatus}</span>
                        <button onClick={handleDelete} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} title="Delete Draft">
                            🗑️ Delete
                        </button>
                        <button onClick={() => saveDraft(true)} style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                            Close & Save
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
                <div 
                    onClick={handleSecretClick} 
                    style={{ cursor: writingMode === 'normal' ? 'pointer' : 'default', userSelect: 'none' }}
                >
                    <h1 style={{ margin: 0, fontSize: '2rem', transition: 'color 0.3s', color: writingMode === 'secret' ? '#ef4444' : 'inherit', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {writingMode === 'secret' ? <Lock size={32} color="#ef4444" strokeWidth={2} /> : <PenTool size={32} color="var(--accent)" strokeWidth={2} />}
                        {writingMode === 'secret' ? 'Secret Writings' : 'Long-form Writing'}
                    </h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6, color: writingMode === 'secret' ? '#fca5a5' : 'inherit' }}>
                        {writingMode === 'secret' ? 'For your eyes only. Fully encrypted.' : 'Essays, stories, and deep dives. No distractions.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {writingMode === 'secret' && (
                        <button
                            onClick={() => setWritingMode('normal')}
                            style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Lock & Exit
                        </button>
                    )}
                    <button
                        onClick={handleNew}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: writingMode === 'secret' ? '#ef4444' : 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        + New Piece
                    </button>
                </div>
            </div>

            {pendingUnlock && (
                <SecondaryVaultLock 
                    lockId="writing_secret" 
                    title="Secret Writing"
                    icon="🤫"
                    onSuccess={() => {
                        setPendingUnlock(false);
                        setWritingMode('secret');
                    }}
                    onClose={() => setPendingUnlock(false)}
                />
            )}

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
