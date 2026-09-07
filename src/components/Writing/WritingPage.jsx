import { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { PenTool, Lock } from 'lucide-react';
import SecondaryVaultLock from '../Vault/SecondaryVaultLock';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    Strikethrough, 
    Code, 
    List, 
    ListOrdered, 
    Table as TableIcon,
    Trash2
} from 'lucide-react';
import './Writing.css';

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
    const [contentWidth, setContentWidth] = useState('1060px');
    const [searchQuery, setSearchQuery] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown,
            Underline,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: editorData.content,
        editorProps: {
            attributes: {
                spellcheck: 'false',
                style: 'outline: none; font-size: 1.1rem; line-height: 1.7; font-family: "Lora", serif; color: rgba(255,255,255,0.9); flex: 1; height: 100%; min-height: 300px;'
            }
        },
        onUpdate: ({ editor }) => {
            setEditorData(prev => ({ ...prev, content: editor.getHTML() }));
        }
    });

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
        if (editor) {
            editor.commands.setContent('');
        }
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
        setEditorData({ title: draft.title || '', content: draft.content || '', tags: draft.tags || '' });
        if (editor) {
            editor.commands.setContent(draft.content || '');
        }
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
            <div className="fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1c1e', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                    <div style={{ flex: 1 }}>
                        <button onClick={() => { setEditingId(null); editingIdRef.current = null; }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ← Back to Drafts
                        </button>
                    </div>

                    {/* INLINE FORMATTING TOOLBAR */}
                    <div className="sn-editor-toolbar-inline" style={{ margin: '0 1rem' }}>
                        <button className={`sn-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={14} /></button>
                        <button className={`sn-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={14} /></button>
                        <button className={`sn-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></button>
                        <button className={`sn-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></button>
                        <button className={`sn-toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code size={14} /></button>
                        
                        <div className="sn-toolbar-sep" />
                        <button className={`sn-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={14} /></button>
                        <button className={`sn-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
                        
                        <div className="sn-toolbar-sep" />
                        <button className="sn-toolbar-btn" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table"><TableIcon size={14} /></button>
                        
                        {editor?.isActive('table') && (
                            <>
                                <div className="sn-toolbar-sep" />
                                <button className="sn-toolbar-btn" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">+C</button>
                                <button className="sn-toolbar-btn" onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column">-C</button>
                                <button className="sn-toolbar-btn" onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">+R</button>
                                <button className="sn-toolbar-btn" onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row">-R</button>
                                <button className="sn-toolbar-btn danger" onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 size={14} /></button>
                            </>
                        )}
                        <div className="sn-toolbar-sep" />
                        <select
                            className="sn-custom-select-dark minimal"
                            style={{ width: '90px' }}
                            value={contentWidth}
                            onChange={e => setContentWidth(e.target.value)}
                            title="Document Width"
                        >
                            <option value="760px">Standard</option>
                            <option value="1060px">Wide</option>
                            <option value="100%">Full</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{saveStatus}</span>
                        <button onClick={handleDelete} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} title="Delete Draft">
                            🗑️ Delete
                        </button>
                        <button onClick={() => saveDraft(true)} style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                            Close & Save
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--card-bg)', padding: '1rem 2rem', margin: '1rem auto', width: '100%', maxWidth: contentWidth, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <input
                        type="text"
                        placeholder="Title of your piece..."
                        style={{ fontSize: '1.4rem', fontWeight: 'bold', background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', padding: '0', lineHeight: '1.3' }}
                        value={editorData.title}
                        onChange={e => setEditorData({ ...editorData, title: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Tags (e.g., Essay, Personal, Sci-Fi)"
                        style={{ fontSize: '0.8rem', opacity: 0.4, background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', padding: '0' }}
                        value={editorData.tags}
                        onChange={e => setEditorData({ ...editorData, tags: e.target.value })}
                    />
                    <hr style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.25rem 0' }} />
                    <EditorContent 
                        editor={editor} 
                        style={{ flex: 1, overflowY: 'auto', minHeight: '0', height: '100%' }}
                        className="writing-tiptap-editor"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#1c1c1e', padding: '0.9rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 -50px 0 0 #1c1c1e' }}>
                {/* Title */}
                <div 
                    onClick={handleSecretClick} 
                    style={{ cursor: writingMode === 'normal' ? 'pointer' : 'default', userSelect: 'none', flexShrink: 0 }}
                >
                    <h1 style={{ margin: 0, fontSize: '1.2rem', transition: 'color 0.3s', color: writingMode === 'secret' ? '#ef4444' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {writingMode === 'secret' ? <Lock size={20} color="#ef4444" strokeWidth={2} /> : <PenTool size={20} color="var(--accent)" strokeWidth={2} />}
                        {writingMode === 'secret' ? 'Secret Writings' : 'Long-form Writing'}
                    </h1>
                </div>

                {/* Search Bar - center */}
                <div style={{ flex: 1, maxWidth: '480px', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.45rem 0.9rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input
                        type="text"
                        placeholder="Search drafts..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>✕</button>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                    {writingMode === 'secret' && (
                        <button
                            onClick={() => setWritingMode('normal')}
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Lock & Exit
                        </button>
                    )}
                    <button
                        onClick={handleNew}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: writingMode === 'secret' ? '#ef4444' : 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        + New Piece
                    </button>
                </div>
            </div>

            {pendingUnlock && (
                <SecondaryVaultLock 
                    lockId="writing_secret" 
                    title="Secret Writing"
                    icon="✍"
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
                <div style={{ padding: '1.5rem 1.5rem 2rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {drafts.filter(d => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                            (d.title || '').toLowerCase().includes(q) ||
                            (d.tags || '').toLowerCase().includes(q) ||
                            (d.content || '').toLowerCase().includes(q)
                        );
                    }).length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            {searchQuery ? `No drafts match "${searchQuery}"` : 'Your writing desk is clear. Ready for a new draft?'}
                        </div>
                    )}
                    {drafts.filter(d => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                            (d.title || '').toLowerCase().includes(q) ||
                            (d.tags || '').toLowerCase().includes(q) ||
                            (d.content || '').toLowerCase().includes(q)
                        );
                    }).map(draft => (
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
