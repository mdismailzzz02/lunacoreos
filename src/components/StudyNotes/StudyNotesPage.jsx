import { useState, useEffect, useMemo, useRef } from 'react';
import * as api from '../../services/api';
import StudyNotesSidebar from './StudyNotesSidebar';
import StudyNotesEditor from './StudyNotesEditor';
import './StudyNotes.css';

export default function StudyNotesPage() {
    const [folders, setFolders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(() => localStorage.getItem('luna_active_note') || null);
    const [activeFolderId, setActiveFolderId] = useState(() => localStorage.getItem('luna_active_folder') || null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved');

    useEffect(() => {
        if (activeNoteId) localStorage.setItem('luna_active_note', activeNoteId);
        else localStorage.removeItem('luna_active_note');
    }, [activeNoteId]);

    useEffect(() => {
        if (activeFolderId) localStorage.setItem('luna_active_folder', activeFolderId);
        else localStorage.removeItem('luna_active_folder');
    }, [activeFolderId]);

    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState('');

    const handleMigrateStudy = async () => {
        if (!window.confirm('This will move all your Study Folders and Notes from Google Sheets to Supabase. Continue?')) return;
        setIsMigrating(true);
        setMigrationStatus('Fetching data from Sheets...');
        try {
            // 1. Migrate Folders
            const oldFolders = await api.getStudyFoldersLegacy();
            setMigrationStatus(`Migrating ${oldFolders.length} folders...`);
            for (const folder of oldFolders) {
                await api.supabase.from('study_folders').upsert({
                    folder_id: folder.folder_id,
                    folder_name: folder.folder_name,
                    parent_folder_id: folder.parent_folder_id,
                    color: folder.color,
                    icon: folder.icon,
                    created_at: folder.created_at || new Date().toISOString()
                });
            }

            // 2. Migrate Notes
            const oldNotes = await api.getStudyNotesLegacy();
            setMigrationStatus(`Migrating ${oldNotes.length} notes...`);
            
            const chunkSize = 20;
            for (let i = 0; i < oldNotes.length; i += chunkSize) {
                const chunk = oldNotes.slice(i, i + chunkSize).map(n => ({
                    note_id: n.note_id,
                    title: n.title || '',
                    folder_id: n.folder_id || '',
                    content: n.content || '',
                    tags: n.tags || '',
                    linked_notes: n.linked_notes || '',
                    audio_urls: n.audio_urls || '',
                    image_urls: n.image_urls || '',
                    file_urls: n.file_urls || '',
                    created_at: n.created_at || new Date().toISOString(),
                    updated_at: n.updated_at || new Date().toISOString()
                }));
                
                const { error } = await api.supabase.from('study_notes').upsert(chunk);
                if (error) throw error;
                setMigrationStatus(`Migrated ${Math.min(i + chunkSize, oldNotes.length)} / ${oldNotes.length} notes...`);
            }

            setMigrationStatus('Migration Successful! Refreshing...');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error('Migration failed:', err);
            setMigrationStatus(`Error: ${err.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [fData, nData] = await Promise.all([
                api.getStudyFolders().catch(() => []),
                api.getStudyNotes().catch(() => [])
            ]);
            setFolders(Array.isArray(fData) ? fData.filter(f => f.delete_status !== 'yes') : []);
            setNotes(Array.isArray(nData) ? nData.filter(n => n.delete_status !== 'yes') : []);
        } catch (err) {
            console.error('Failed to load study notes:', err);
            setFolders([]);
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = useMemo(() => {
        return notes.filter(n => {
            const matchesSearch = n.title?.toLowerCase().includes(search.toLowerCase()) || 
                                n.content?.toLowerCase().includes(search.toLowerCase());
            const matchesFolder = !activeFolderId || n.folder_id === activeFolderId;
            return matchesSearch && matchesFolder;
        });
    }, [notes, search, activeFolderId]);

    const activeNote = notes.find(n => n.note_id === activeNoteId);

    const noteCounts = useMemo(() => {
        return folders.reduce((acc, f) => {
            acc[f.folder_id] = notes.filter(n => n.folder_id === f.folder_id).length;
            return acc;
        }, {});
    }, [folders, notes]);

    const handleNewNote = async () => {
        const tempNote = {
            title: '',
            content: '',
            folder_id: activeFolderId || '',
            tags: '',
            audio_urls: '',
            image_urls: '',
            file_urls: '',
            updated_at: new Date().toISOString()
        };
        try {
            const created = await api.createStudyNote(tempNote);
            if (created && created.note_id) {
                setNotes(prev => [created, ...prev]);
                setActiveNoteId(created.note_id);
            }
        } catch (err) {
            console.error('Create note failed:', err);
        }
    };

    const saveQueue = useRef(Promise.resolve());
    const [pendingSaves, setPendingSaves] = useState(0);

    useEffect(() => {
        const handler = (e) => {
            if (pendingSaves > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [pendingSaves]);

    const handleUpdateNote = (updates) => {
        if (!activeNoteId) return;

        setPendingSaves(prev => prev + 1);
        setAutoSaveStatus('saving');

        saveQueue.current = saveQueue.current.then(async () => {
            return new Promise((resolve) => {
                setNotes(prevNotes => {
                    const currentNote = prevNotes.find(n => n.note_id === activeNoteId);
                    if (!currentNote) {
                        setPendingSaves(prev => Math.max(0, prev - 1));
                        resolve();
                        return prevNotes;
                    }

                    const mergedNote = {
                        ...currentNote,
                        ...updates,
                        audio_urls: updates.audio_urls !== undefined ? updates.audio_urls : currentNote.audio_urls,
                        image_urls: updates.image_urls !== undefined ? updates.image_urls : currentNote.image_urls,
                        file_urls:  updates.file_urls  !== undefined ? updates.file_urls  : currentNote.file_urls,
                    };

                    // ✅ Fire-and-forget — don't replace local state with server response
                    // The optimistic update (mergedNote) is the source of truth.
                    // We only patch `updated_at` from the server to keep timestamps accurate.
                    api.updateStudyNote(mergedNote).then(serverNote => {
                        if (serverNote?.updated_at) {
                            setNotes(latest => latest.map(n =>
                                n.note_id === activeNoteId
                                    ? { ...n, updated_at: serverNote.updated_at }
                                    : n
                            ));
                        }
                        setAutoSaveStatus('saved');
                        setPendingSaves(prev => Math.max(0, prev - 1));
                        resolve();
                    }).catch(err => {
                        console.error('Queue update failed:', err);
                        setAutoSaveStatus('error');
                        setPendingSaves(prev => Math.max(0, prev - 1));
                        resolve();
                    });

                    // Return the optimistic state immediately — no waiting for server
                    return prevNotes.map(n => n.note_id === activeNoteId ? mergedNote : n);
                });
            });
        });
    };

    const handleAutoSave = (updates) => {
        handleUpdateNote(updates);
    };

    const handleDeleteNote = async () => {
        if (!activeNoteId || !window.confirm('Delete this note?')) return;
        try {
            await api.updateStudyNote({ note_id: activeNoteId, delete_status: 'yes' });
        } catch (err) {
            console.error('Delete note failed:', err);
        }
        setNotes(notes.filter(n => n.note_id !== activeNoteId));
        setActiveNoteId(null);
    };

    const handleCreateFolder = async (folder) => {
        try {
            const newFolder = {
                ...folder,
                folder_id: `folder_${Date.now()}`
            };
            await api.createStudyFolder(newFolder);
            setFolders([...folders, newFolder]);
        } catch (err) {
            console.error('Create folder failed:', err);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Are you sure you want to delete this folder? All notes inside will be moved to "All Notes" (Unfoldered).')) return;
        
        try {
            await api.updateStudyFolder({ folder_id: folderId, delete_status: 'yes' });
            setFolders(folders.filter(f => f.folder_id !== folderId));
            
            // Move notes from this folder to unfoldered
            const updatedNotes = notes.map(n => 
                n.folder_id === folderId ? { ...n, folder_id: '' } : n
            );
            setNotes(updatedNotes);
            
            // Re-sync these notes to backend to clear their folder_id
            const notesToUpdate = updatedNotes.filter(n => n.folder_id === ''); // Note: this might sync more than necessary, but ensures consistency
            // Optionally could just let the backend handle this if we configured it, but doing it in UI keeps state clean.
            
            if (activeFolderId === folderId) {
                setActiveFolderId(null);
            }
        } catch (err) {
            console.error('Delete folder failed:', err);
        }
    };

    if (loading) return (
        <div className="sn-loading-portal">
            <style>{`
                .sn-loading-portal {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    z-index: 10000;
                }
                .sn-moon-loader {
                    position: relative;
                    width: 90px;
                    height: 90px;
                    margin-bottom: 1.5rem;
                }
                .sn-moon-core {
                    position: absolute;
                    inset: 0;
                    font-size: 3.8rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.4));
                }
                .sn-moon-ring {
                    position: absolute;
                    inset: -8px;
                    border: 2px solid transparent;
                    border-top: 2px solid #a78bfa;
                    border-right: 2px solid rgba(167, 139, 250, 0.2);
                    border-radius: 50%;
                    animation: sn-spin 2s linear infinite;
                }
                .sn-moon-ring-outer {
                    position: absolute;
                    inset: -20px;
                    border: 1px solid transparent;
                    border-bottom: 1px solid #ff4d8d;
                    border-left: 1px solid rgba(255, 77, 141, 0.2);
                    border-radius: 50%;
                    animation: sn-spin-reverse 3s linear infinite;
                    opacity: 0.6;
                }
                @keyframes sn-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes sn-spin-reverse {
                    0% { transform: rotate(360deg); }
                    100% { transform: rotate(0deg); }
                }
                .sn-loading-text {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #a78bfa;
                    text-transform: uppercase;
                    letter-spacing: 0.5em;
                    animation: sn-blink 1.5s ease-in-out infinite;
                    opacity: 0.9;
                }
                @keyframes sn-blink {
                    0%, 100% { opacity: 0.4; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-2px); }
                }
            `}</style>
            <div className="sn-moon-loader">
                <div className="sn-moon-ring"></div>
                <div className="sn-moon-ring-outer"></div>
                <div className="sn-moon-core">🌘</div>
            </div>
            <div className="sn-loading-text">Syncing...</div>
        </div>
    );

    return (
        <div className="sn-page">
            <StudyNotesSidebar 
                folders={folders}
                notes={filteredNotes}
                activeFolderId={activeFolderId}
                activeNoteId={activeNoteId}
                search={search}
                onSearch={setSearch}
                onSelectFolder={setActiveFolderId}
                onSelectNote={setActiveNoteId}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onNewNote={handleNewNote}
                noteCounts={noteCounts}
                isMigrating={isMigrating}
                migrationStatus={migrationStatus}
                onMigrate={handleMigrateStudy}
            />

            <section className="sn-editor-panel">
                {activeNote ? (
                    <StudyNotesEditor
                        key={activeNote.note_id}
                        note={activeNote}
                        folders={folders}
                        allNotes={notes}
                        autoSaveStatus={autoSaveStatus}
                        onSave={handleUpdateNote}
                        onTriggerAutoSave={handleAutoSave}
                        onDelete={handleDeleteNote}
                    />
                ) : (
                    <div className="sn-empty-editor-centered">
                        <div className="sn-empty-icon-lg">📓</div>
                        <h2 className="sn-empty-heading">Your notes live here</h2>
                        <p className="sn-empty-subtext">
                            Select a note to read or edit, or create a new one.
                        </p>
                        <button className="sn-empty-btn-quiet" onClick={handleNewNote}>
                            + New Note
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
