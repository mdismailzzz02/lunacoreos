import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import GooglePhotos from './GooglePhotos';
import PeopleView from './PeopleView';
import VaultLock from './VaultLock';
import { getVaultFolders, addVaultFolder, removeVaultFolder, getAppPassword, setAppPassword } from '../../services/api';
import { requestDriveAccess, clearDriveToken } from '../../services/googleAuth';

const extractFolderId = (input) => {
    if (!input) return '';
    const urlMatch = input.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) return urlMatch[1];
    const queryMatch = input.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (queryMatch) return queryMatch[1];
    return input.trim();
};

// ─── Add Folder Modal ────────────────────────────────────────
function AddFolderModal({ onAdd, onClose }) {
    const [name, setName] = useState('');
    const [link, setLink] = useState('');
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const folderId = extractFolderId(link);
        if (!folderId) { setErr('Invalid Drive folder link or ID.'); return; }
        if (!name.trim()) { setErr('Please enter a name.'); return; }
        setSaving(true);
        try {
            const res = await addVaultFolder({ name: name.trim(), folder_id: folderId });
            // Ensure we map the response correctly for immediate UI update
            const newFolder = {
                id: res.id || res.ID,
                name: res.name || res.Name,
                folder_id: res.folder_id || res.FolderID
            };
            onAdd(newFolder);
            onClose();
        } catch (err) { 
            console.error('Add folder error:', err);
            setErr('Failed to save. Make sure your SQL table is ready!'); 
        }
        finally { setSaving(false); }
    };

    return ReactDOM.createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card, #1a1a2e)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>➕ Add Drive Folder</h3>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Folder name" value={name} onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="Google Drive folder link or ID" value={link} onChange={e => setLink(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />
                    {err && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{err}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
                        <button className="btn btn-ghost" type="button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ─── Sidebar Nav Button ──────────────────────────────────────
function NavBtn({ active, onClick, icon, label, onRemove }) {
    return (
        <div className="nav-btn-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <style>{`
                .nav-btn-container { animation: vault-fade-in 0.3s ease-out forwards; }
                .vault-nav-btn {
                    flex: 1; display: flex; alignItems: center; gap: 0.75rem;
                    padding: 0.75rem 1rem; border-radius: 14px; border: 1px solid transparent;
                    text-align: left; cursor: pointer; font-size: 0.88rem; font-weight: 600;
                    background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(10px);
                }
                .vault-nav-btn:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                    border-color: rgba(255,255,255,0.1);
                    transform: translateX(4px);
                }
                .vault-nav-btn.active {
                    background: linear-gradient(135deg, #a78bfa, #7c3aed);
                    color: white;
                    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
                    border-color: rgba(255,255,255,0.2);
                }
                .vault-remove-btn {
                    background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #f87171; border-radius: 10px; width: 28px; height: 28px;
                    cursor: pointer; font-size: 10px; display: flex; align-items: center;
                    justify-content: center; transition: all 0.2s;
                    opacity: 0; transform: scale(0.8);
                }
                .nav-btn-container:hover .vault-remove-btn { opacity: 1; transform: scale(1); }
                .vault-remove-btn:hover { background: #ef4444; color: white; border-color: transparent; }
            `}</style>
            <button
                onClick={onClick}
                className={`vault-nav-btn ${active ? 'active' : ''}`}
            >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            </button>
            {onRemove && (
                <button onClick={onRemove} className="vault-remove-btn" title="Remove Folder">
                    ✕
                </button>
            )}
        </div>
    );
}

// ─── Main VaultPage ──────────────────────────────────────────
function VaultPage() {
    const [folders, setFolders] = useState([]);
    const [activeTab, setActiveTab] = useState('liked');
    const [showAdd, setShowAdd] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [isGoogleAuth, setIsGoogleAuth] = useState(false);

    useEffect(() => {
        // Monitor our specific GSI token in localStorage
        const checkAuth = () => {
            const token = localStorage.getItem('luna_drive_token');
            const expiry = parseInt(localStorage.getItem('luna_drive_token_expiry') || '0', 10);
            setIsGoogleAuth(!!token && Date.now() < expiry);
        };
        const timer = setInterval(checkAuth, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            await requestDriveAccess();
            setIsGoogleAuth(true);
        } catch (err) {
            console.error("Google Login Failed:", err);
        }
    };

    const loadFolders = () => {
        setLoadingFolders(true);
        getVaultFolders()
            .then(res => {
                const folderList = Array.isArray(res) ? res : (res.data?.folders || []);
                setFolders(folderList);
                localStorage.setItem('vault_folders_cache', JSON.stringify({
                    folders: folderList,
                    cachedAt: Date.now()
                }));
            })
            .catch(() => {
                const cached = localStorage.getItem('vault_folders_cache');
                if (cached) {
                    try {
                        const { folders: cachedFolders } = JSON.parse(cached);
                        setFolders(cachedFolders);
                    } catch (e) { }
                }
            })
            .finally(() => setLoadingFolders(false));
    };

    useEffect(() => {
        loadFolders();
    }, []);

    const handleAddFolder = (folder) => {
        setFolders(prev => [...prev, folder]);
        setActiveTab(folder.id);
    };

    const handleRemoveFolder = async (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        if (!window.confirm(`Remove "${folder?.name || 'this folder'}" from your Vault?`)) return;
        try { await removeVaultFolder(folderId); } catch { }
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (activeTab === folderId) setActiveTab('folders_menu');
    };

    const isFolderActive = folders.some(f => f.id === activeTab);
    const activeFolder = folders.find(f => f.id === activeTab);

    return (
        <div className="vault-layout" style={{ 
            display: 'flex', height: '100vh', width: '100%', background: 'transparent', color: 'white',
            overflow: 'hidden',
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0
        }}>
            <style>{`
                .vault-sidebar {
                    width: 280px; background: rgba(15, 15, 25, 0.5);
                    backdrop-filter: blur(30px); border-right: 1px solid rgba(255,255,255,0.08);
                    display: flex; flex-direction: column; padding: 1.5rem;
                    flex-shrink: 0; height: 100%;
                }
                .vault-title { 
                    font-size: 1.25rem; font-weight: 800; margin-bottom: 2rem; 
                    background: linear-gradient(to right, #fff, rgba(255,255,255,0.4));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    display: flex; align-items: center; gap: 10px;
                }
                .vault-nav-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
                .vault-content { 
                    flex: 1; flex-basis: 0; min-width: 0;
                    overflow-y: auto; overflow-x: hidden; 
                    padding: 2rem; position: relative; height: 100%; 
                    box-sizing: border-box; 
                }
                
                .vault-add-btn {
                    margin-top: 1rem; width: 100%; padding: 0.85rem; border-radius: 14px;
                    border: 1px dashed rgba(167,139,250,0.4); background: rgba(167,139,250,0.05);
                    color: #a78bfa; font-size: 0.85rem; font-weight: 700; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: center;
                }
                .vault-add-btn:hover {
                    background: rgba(167,139,250,0.15); border-color: #a78bfa;
                    transform: translateY(-2px); box-shadow: 0 10px 20px rgba(167,139,250,0.1);
                    color: white;
                }
                
                @keyframes vault-fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .vault-content > div { animation: vault-fade-in 0.4s ease-out forwards; }
                
                /* Mobile Overrides */
                @media (max-width: 768px) {
                    .vault-layout { flex-direction: column; }
                    .vault-sidebar { display: none; }
                }
            `}</style>

            {/* ─── Mobile Segmented Control ─── */}
            <div className={`vault-mobile-nav mobile-only ${isFolderActive ? 'hidden' : ''}`} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                <div className="vault-segments" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
                    <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'liked' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('liked')}>❤️ Liked</button>
                    <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'folders_menu' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('folders_menu')}>🗂️ Folders</button>
                    <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'people' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('people')}>👥 People</button>
                </div>
            </div>

            {/* ─── Mobile Folder Top Bar ─── */}
            {isFolderActive && (
                <div className="vault-mobile-folder-header mobile-only" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="back-btn" onClick={() => setActiveTab('folders_menu')} style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '1rem', cursor: 'pointer' }}>
                        ‹ Back
                    </button>
                    <span className="folder-title" style={{ fontWeight: 700 }}>{activeFolder?.name}</span>
                </div>
            )}

            {/* ─── Left Sidebar (Desktop Only) ─── */}
            <div className="vault-sidebar desktop-only">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 className="vault-title" style={{ margin: 0 }}><span>🔒</span> VAULT_CORE</h2>
                    <button onClick={loadFolders} className="btn btn-ghost btn-xs" title="Sync Database" style={{ padding: '4px', opacity: 0.5 }}>🔄</button>
                </div>

                <div className="vault-nav-scroll">
                    <NavBtn
                        active={activeTab === 'liked'}
                        onClick={() => setActiveTab('liked')}
                        icon="❤️"
                        label="Liked Items"
                    />

                    <NavBtn
                        active={activeTab === 'people'}
                        onClick={() => setActiveTab('people')}
                        icon="👥"
                        label="People & Groups"
                    />

                    {!isGoogleAuth && (
                        <button 
                            onClick={handleGoogleLogin}
                            style={{ 
                                margin: '1rem 0.5rem', padding: '0.8rem', borderRadius: '14px', 
                                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                                border: 'none', color: 'white', fontWeight: 800, fontSize: '0.75rem',
                                cursor: 'pointer', boxShadow: '0 10px 20px rgba(66,133,244,0.3)',
                                animation: 'vault-fade-in 0.5s ease-out'
                            }}
                        >
                            🔑 CONNECT_GOOGLE_DRIVE
                        </button>
                    )}

                    {folders.length > 0 && (
                        <div className="vault-divider" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', padding: '1.25rem 0.9rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}>
                            Secure Folders
                        </div>
                    )}

                    {loadingFolders ? (
                        <div className="vault-loading" style={{ padding: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Decrypting...</div>
                    ) : (
                        folders.map(folder => (
                            <NavBtn
                                key={folder.id}
                                active={activeTab === folder.id}
                                onClick={() => setActiveTab(folder.id)}
                                icon="📁"
                                label={folder.name}
                                onRemove={() => handleRemoveFolder(folder.id)}
                            />
                        ))
                    )}

                    <button
                        className="vault-add-btn"
                        onClick={() => setShowAdd(true)}
                    >
                        + Add Folder Link
                    </button>
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <div className={`vault-content ${activeTab === 'folders_menu' ? 'mobile-only' : ''}`}>
                {activeTab === 'folders_menu' ? (
                    <div className="mobile-folders-grid-view">
                        <h3 className="mobile-folders-title">My Folders</h3>
                        <div className="mobile-folders-grid">
                            <div className="add-folder-card" onClick={() => setShowAdd(true)}>
                                <div className="add-icon">+</div>
                                <span>Add Folder</span>
                            </div>
                            {loadingFolders ? (
                                <div className="vault-loading" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem' }}>Loading folders...</div>
                            ) : (
                                folders.map(folder => (
                                    <div key={folder.id} className="folder-card" onClick={() => setActiveTab(folder.id)}>
                                        <div className="folder-icon-wrapper">📁</div>
                                        <div className="folder-name">{folder.name}</div>
                                        <button className="folder-remove" onClick={(e) => { e.stopPropagation(); handleRemoveFolder(folder.id); }}>✕</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : activeTab === 'people' ? (
                    <PeopleView folders={folders} />
                ) : (
                    <GooglePhotos
                        activeTab={activeTab === 'folders_menu' ? 'liked' : activeTab}
                        folders={folders}
                        onTabChange={setActiveTab}
                    />
                )}
            </div>

            {showAdd && <AddFolderModal onAdd={handleAddFolder} onClose={() => setShowAdd(false)} />}
        </div>
    );
}

const LockedVaultPage = () => <VaultLock><VaultPage /></VaultLock>;
export default LockedVaultPage;
