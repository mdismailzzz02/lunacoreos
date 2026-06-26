import { useState } from 'react';
import { 
    LayoutGrid, 
    Plus, 
    Search,
    Trash2,
    ChevronDown
} from 'lucide-react';
import DateCalendar from '../Journal/DateCalendar';

export default function StudyNotesSidebar({
    folders,
    notes,
    activeFolderId,
    activeNoteId,
    search,
    onSearch,
    onSelectFolder,
    onSelectNote,
    onCreateFolder,
    onDeleteFolder,
    onNewNote,
    noteCounts,
    isMigrating,
    migrationStatus,
    onMigrate,
    journalNotes,
    selectedDate,
    onDateSelect,
    showCalendar = false,
}) {
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [calendarExpanded, setCalendarExpanded] = useState(false);

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        onCreateFolder({ folder_name: newFolderName.trim(), color: '#8b5cf6' });
        setNewFolderName('');
        setCreatingFolder(false);
    };

    const stripContent = (html) => {
        if (!html) return '';
        let text = html.replace(/@\[([^\]]+)\]\([^)]+\)/g, '$1');
        text = text.replace(/<[^>]+>/g, ' ');
        return text.trim();
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <aside className="sn-sidebar">
            {/* CALENDAR SECTION — COLLAPSIBLE */}
            {showCalendar && journalNotes && (
                <div className="sn-sidebar-section sn-calendar-section">
                    <div className="sn-calendar-header">
                        <span className="sn-calendar-title">📅 Calendar</span>
                        <button 
                            className={`sn-calendar-toggle ${calendarExpanded ? 'expanded' : ''}`}
                            onClick={() => setCalendarExpanded(!calendarExpanded)}
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>
                    {calendarExpanded && (
                        <div className="sn-calendar-content">
                            <DateCalendar 
                                journalNotes={journalNotes} 
                                onDateSelect={onDateSelect}
                                selectedDate={selectedDate}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 1 — FOLDERS */}
            <div className="sn-sidebar-section">
                <div className="sn-folders-header">
                    <span className="sn-label-folders">FOLDERS</span>
                    <Plus size={20} className="sn-add-folder-btn" onClick={() => setCreatingFolder(v => !v)} />
                </div>

                <div className="sn-folder-list">
                    <div 
                        className={`sn-folder-row ${!activeFolderId ? 'active' : ''}`}
                        onClick={() => onSelectFolder(null)}
                    >
                        <LayoutGrid size={14} />
                        <span className="sn-folder-name">All Notes</span>
                        <span className="sn-folder-qty">{notes.length}</span>
                    </div>
                    {folders.map(f => (
                        <div 
                            key={f.folder_id}
                            className={`sn-folder-row ${activeFolderId === f.folder_id ? 'active' : ''}`}
                            onClick={() => onSelectFolder(f.folder_id)}
                        >
                            <div className="sn-folder-dot" style={{ background: f.color }} />
                            <span className="sn-folder-name">{f.folder_name}</span>
                            <span className="sn-folder-qty">{noteCounts[f.folder_id] || 0}</span>
                            <button 
                                className="sn-folder-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteFolder && onDeleteFolder(f.folder_id);
                                }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    
                    {!creatingFolder && folders.length === 0 && (
                        <div className="sn-new-folder-ghost" onClick={() => setCreatingFolder(true)}>
                            + New folder
                        </div>
                    )}

                    {creatingFolder && (
                        <div style={{ padding: '0 16px' }}>
                            <input 
                                autoFocus
                                className="sn-sidebar-input"
                                placeholder="Folder name..."
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                                onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="sn-sidebar-divider" />

            {/* SECTION 2 — NOTE LIST */}
            <div className="sn-notes-section">
                <div className="sn-search-container">
                    <div className="sn-search-wrapper">
                        <Search size={12} color="#6b6882" />
                        <input 
                            placeholder="Search notes..." 
                            value={search}
                            onChange={e => onSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="sn-note-list-scroll">
                    {notes.map(note => {
                        const isActive = note.note_id === activeNoteId;
                        const tags = note.tags ? note.tags.split('|').filter(Boolean) : [];
                        const preview = stripContent(note.content);

                        return (
                            <div 
                                key={note.note_id}
                                className={`sn-note-card ${isActive ? 'active' : ''}`}
                                onClick={() => onSelectNote(note.note_id)}
                            >
                                <div className="sn-card-row-1">
                                    <span className="sn-card-title">{note.title || 'Untitled'}</span>
                                    <span className="sn-card-date">{formatDate(note.updated_at)}</span>
                                </div>
                                <div className="sn-card-preview">{preview || 'No content'}</div>
                                {tags.length > 0 && (
                                    <div className="sn-card-tags">
                                        {tags.map(t => (
                                            <span key={t} className="sn-tag-chip">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOTTOM PANEL */}
            <div className="sn-sidebar-bottom">
                {isMigrating && (
                    <div className="sn-migration-status" style={{ fontSize: '0.75rem', color: 'var(--accent)', padding: '8px 16px', textAlign: 'center' }}>
                        🔄 {migrationStatus}
                    </div>
                )}
                <div className="sn-new-note-text-btn" onClick={onNewNote}>
                    + New Note
                </div>
            </div>
        </aside>
    );
}
