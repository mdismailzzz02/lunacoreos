import { useState, useEffect, useMemo, useRef } from 'react';
import { useJournal } from '../../hooks/useJournal';
import StudyNotesSidebar from '../StudyNotes/StudyNotesSidebar';
import StudyNotesEditor from '../StudyNotes/StudyNotesEditor';
import DateCalendar from './DateCalendar';
import CustomNameDialog from './CustomNameDialog';
import '../StudyNotes/StudyNotes.css';
import * as api from '../../services/api';
import { OfflineCache } from '../../services/offlineCache';

const FOLDER_KEY = 'luna_journal_folders';
const NOTE_META_KEY = 'luna_journal_note_meta';
const ACTIVE_NOTE_KEY = 'luna_active_journal_note';
const ACTIVE_FOLDER_KEY = 'luna_active_journal_folder';

const loadJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export default function JournalPage() {
    const { entries, loading, create, updateSilently, remove } = useJournal();
    const [activeNoteId, setActiveNoteId] = useState(() => loadJson(ACTIVE_NOTE_KEY, null));
    const [activeFolderId, setActiveFolderId] = useState(() => loadJson(ACTIVE_FOLDER_KEY, null));
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState('');
    const [pendingSaves, setPendingSaves] = useState(0);
    const [folders, setFolders] = useState(() => loadJson(FOLDER_KEY, []));
    const [noteMeta, setNoteMeta] = useState(() => loadJson(NOTE_META_KEY, {}));
    const saveQueue = useRef(Promise.resolve());

    useEffect(() => {
        if (activeNoteId) localStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId);
        else localStorage.removeItem(ACTIVE_NOTE_KEY);
    }, [activeNoteId]);

    useEffect(() => {
        if (activeFolderId) localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderId);
        else localStorage.removeItem(ACTIVE_FOLDER_KEY);
    }, [activeFolderId]);

    useEffect(() => {
        localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
    }, [folders]);

    useEffect(() => {
        localStorage.setItem(NOTE_META_KEY, JSON.stringify(noteMeta));
    }, [noteMeta]);

    useEffect(() => {
        if (!activeNoteId && entries.length > 0) {
            setActiveNoteId(entries[0].entry_id);
        }
    }, [activeNoteId, entries]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (pendingSaves > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [pendingSaves]);

    const journalNotes = useMemo(() => {
        return entries.map(entry => {
            const meta = noteMeta[entry.entry_id] || {};
            return {
                ...entry,
                note_id: entry.entry_id,
                content: entry.text_content || '',
                updated_at: entry.time_modified || entry.time_created || new Date().toISOString(),
                folder_id: entry.folder_id || meta.folder_id || '',
                tags: entry.tags || meta.tags || '',
                audio_urls: entry.audio_urls || '',
                image_urls: entry.image_urls || '',
                file_urls: entry.file_urls || '',
            };
        });
    }, [entries, noteMeta]);

    useEffect(() => {
        if (activeNoteId && !journalNotes.find(n => n.note_id === activeNoteId)) {
            setActiveNoteId(journalNotes[0]?.note_id || null);
        }
    }, [journalNotes, activeNoteId]);

    const filteredNotes = useMemo(() => {
        const query = search.trim().toLowerCase();
        return journalNotes.filter(note => {
            const matchesSearch = !query || (
                (note.title || '').toLowerCase().includes(query) ||
                (note.content || '').toLowerCase().includes(query)
                || (note.tags || '').toLowerCase().includes(query)
            );
            const matchesFolder = !activeFolderId || note.folder_id === activeFolderId;
            const matchesDate = !selectedDate || note.date === selectedDate;
            return matchesSearch && matchesFolder && matchesDate;
        });
    }, [journalNotes, search, activeFolderId, selectedDate]);

    const activeNote = useMemo(() => journalNotes.find(n => n.note_id === activeNoteId) || null, [journalNotes, activeNoteId]);

    const noteCounts = useMemo(() => {
        return folders.reduce((acc, folder) => {
            acc[folder.folder_id] = journalNotes.filter(n => n.folder_id === folder.folder_id).length;
            return acc;
        }, {});
    }, [folders, journalNotes]);

    const saveNoteMeta = (noteId, updates) => {
        setNoteMeta(prev => {
            const next = { ...prev, [noteId]: { ...prev[noteId], ...updates } };
            if (!next[noteId].folder_id && !next[noteId].tags) {
                delete next[noteId];
            }
            return next;
        });
    };

    const handleSave = (params) => {
        const noteId = params.note_id || activeNoteId;
        if (!noteId) return;

        if (params.folder_id !== undefined || params.tags !== undefined) {
            saveNoteMeta(noteId, {
                folder_id: params.folder_id || '',
                tags: params.tags || '',
            });
        }

        const updates = {};
        if (params.content !== undefined) updates.text_content = params.content;
        if (params.title !== undefined) updates.title = params.title;
        if (params.date !== undefined) updates.date = params.date;
        if (params.mood !== undefined) updates.mood = params.mood;
        if (params.energy_level !== undefined) updates.energy_level = String(params.energy_level || '');
        if (params.weather !== undefined) updates.weather = params.weather;
        if (params.is_starred !== undefined) updates.is_starred = String(params.is_starred);
        if (params.folder_id !== undefined) updates.folder_id = params.folder_id || '';
        if (params.tags !== undefined) updates.tags = params.tags || '';
        if (params.audio_urls !== undefined) updates.audio_urls = params.audio_urls || '';
        if (params.image_urls !== undefined) updates.image_urls = params.image_urls || '';
        if (params.file_urls !== undefined) updates.file_urls = params.file_urls || '';
        if (updates.text_content !== undefined) {
            updates.word_count = String((updates.text_content || '').trim().split(/\s+/).filter(Boolean).length);
        } else {
            const currentContent = activeNote?.content || '';
            updates.word_count = String(currentContent.trim().split(/\s+/).filter(Boolean).length);
        }

        setPendingSaves(prev => prev + 1);
        setAutoSaveStatus('saving');

        saveQueue.current = saveQueue.current.then(async () => {
            try {
                // Attach owner id for RLS policies if available
                try {
                    const { data: { session } } = await api.supabase.auth.getSession();
                    const userId = session?.user?.id;
                    if (userId) updates.owner = userId;
                } catch (e) {
                    // ignore session fetch errors — save will proceed and may fail server-side
                }

                await updateSilently({ entry_id: noteId, ...updates });
                setAutoSaveStatus('saved');
            } catch (err) {
                console.error('Failed to save journal note:', err);
                setAutoSaveStatus('error');
            } finally {
                setPendingSaves(prev => Math.max(0, prev - 1));
            }
        });
    };

    const handleNewNote = () => {
        setShowNameDialog(true);
    };

    const handleCreateNoteWithName = async (customName) => {
        setShowNameDialog(false);

        // Generate default title with timestamp
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;

        const title = customName?.trim() 
            ? `${customName}-journal-${timestamp}` 
            : `journal-${timestamp}`;

        const newEntry = {
            entry_id: `JR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: api.getLocalDate(),
            day_of_week: '',
            time_created: new Date().toISOString(),
            time_modified: new Date().toISOString(),
            title: title,
            text_content: '',
            mood: '',
            energy_level: '5',
            weather: '',
            word_count: '0',
            media_refs: '',
            audio_urls: '',
            image_urls: '',
            file_urls: '',
            folder_id: '',
            tags: '',
            is_starred: 'false',
            status: 'draft',
        };

        // Attach owner from current session to satisfy RLS policies
        try {
            const { data: { session } } = await api.supabase.auth.getSession();
            const userId = session?.user?.id;
            if (userId) newEntry.owner = userId;
        } catch (e) {
            // ignore — creation may fail server-side if RLS demands owner
        }

        const created = await create(newEntry);
        setActiveNoteId(created.entry_id);
    };

    const handleDeleteNote = async () => {
        if (!activeNote) return;
        if (!window.confirm('Delete this journal entry?')) return;
        await remove(activeNote.entry_id);
        setActiveNoteId(null);
        OfflineCache.invalidate('journal');
    };

    const handleCreateFolder = (folder) => {
        setFolders(prev => [
            ...prev,
            {
                ...folder,
                folder_id: `JF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            },
        ]);
    };

    const handleDeleteFolder = (folderId) => {
        if (!window.confirm('Are you sure you want to delete this folder? Notes will be moved back to All Notes.')) return;
        setFolders(prev => prev.filter(folder => folder.folder_id !== folderId));
        const notesToUpdate = entries.filter(e => (e.folder_id || noteMeta[e.entry_id]?.folder_id) === folderId);
        notesToUpdate.forEach(note => {
            updateSilently({ entry_id: note.entry_id, folder_id: '' });
        });
        setNoteMeta(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (next[key]?.folder_id === folderId) {
                    next[key] = { ...next[key], folder_id: '' };
                    if (!next[key].folder_id && !next[key].tags) delete next[key];
                }
            });
            return next;
        });
        if (activeFolderId === folderId) setActiveFolderId(null);
    };

    const handleMigrateJournal = async () => {
        if (!window.confirm('This will move all your Journal entries from Google Sheets to Supabase. Continue?')) return;
        setIsMigrating(true);
        setMigrationStatus('Fetching entries from Sheets...');
        try {
            const oldEntries = await api.getEntriesLegacy();
            setMigrationStatus(`Migrating ${oldEntries.length} entries...`);
            const chunkSize = 20;
            for (let i = 0; i < oldEntries.length; i += chunkSize) {
                const chunk = oldEntries.slice(i, i + chunkSize).map(e => ({
                    entry_id: e.entry_id,
                    date: api.sanitizeDate(e.date),
                    day_of_week: e.day_of_week,
                    time_created: e.time_created || new Date().toISOString(),
                    time_modified: e.time_modified || new Date().toISOString(),
                    title: e.title || '',
                    text_content: e.text_content || '',
                    mood: e.mood || '',
                    energy_level: String(e.energy_level || ''),
                    weather: e.weather || e.location || '',
                    word_count: String(e.word_count || 0),
                    media_refs: [e.media_refs, e.audio_refs, e.image_refs, e.file_refs].filter(Boolean).join(','),
                    is_starred: String(e.is_starred || false),
                    status: e.status || 'published',
                }));
                const { error } = await api.supabase.from('journal').upsert(chunk);
                if (error) throw error;
                setMigrationStatus(`Migrated ${Math.min(i + chunkSize, oldEntries.length)} / ${oldEntries.length} entries...`);
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
            <div className="sn-loading-text">Syncing journal...</div>
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
                onMigrate={handleMigrateJournal}
                journalNotes={journalNotes}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                showCalendar={true}
            />

            <section className="sn-editor-panel">
                {activeNote ? (
                    <StudyNotesEditor
                        key={activeNote.note_id}
                        note={activeNote}
                        folders={folders}
                        allNotes={journalNotes}
                        autoSaveStatus={autoSaveStatus}
                        onSave={(updates) => handleSave({ ...updates, note_id: activeNote.note_id })}
                        onTriggerAutoSave={(updates) => handleSave({ ...updates, note_id: activeNote.note_id })}
                        onDelete={handleDeleteNote}
                    />
                ) : (
                    <div className="sn-empty-editor-centered">
                        <div className="sn-empty-icon-lg">📓</div>
                        <h2 className="sn-empty-heading">Your journal entries live here</h2>
                        <p className="sn-empty-subtext">
                            Select an entry or create a new journal note to start using the study-style editor.
                        </p>
                        <button className="sn-empty-btn-quiet" onClick={handleNewNote}>
                            + New Journal Entry
                        </button>
                    </div>
                )}
            </section>

            <CustomNameDialog
                isOpen={showNameDialog}
                onSubmit={handleCreateNoteWithName}
                onCancel={() => setShowNameDialog(false)}
            />
        </div>
    );
}
