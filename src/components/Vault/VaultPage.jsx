import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import VaultMediaGrid from './VaultMediaGrid';
import PeopleView from './PeopleView';
import TrashView from './TrashView';
import VaultLock from './VaultLock';
import SecondaryVaultLock from './SecondaryVaultLock';
import {
    getVaultCollections,
    createVaultCollection,
    deleteVaultCollection,
} from '../../services/api';
import { 
    Image, FileText, Code, Plus, Lock, Ghost, EyeOff, 
    RefreshCw, Search, Users, Trash2, Folder, X, PlusCircle 
} from 'lucide-react';

// ─── Bytes → Human-Readable ────────────────────────────────────
function fmtBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const TYPE_ICONS = { gallery: <Image size={16} />, documents: <FileText size={16} />, code: <Code size={16} /> };
const TOTAL_FREE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

// ─── Create Collection Modal ────────────────────────────────────
function CreateCollectionModal({ onAdd, onClose, vaultMode }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('gallery');
    const [isSpecial, setIsSpecial] = useState(false);
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setErr('Please enter a collection name.'); return; }
        setSaving(true);
        try {
            const is_secret = vaultMode === 'secret' ? isSpecial : false;
            const col = await createVaultCollection({ name: name.trim(), type, is_secret });
            onAdd(col);
            onClose();
        } catch (e) {
            setErr('Failed to create collection. Check Supabase connection.');
        } finally { setSaving(false); }
    };

    return ReactDOM.createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card, #1a1a2e)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontWeight: 700 }}><PlusCircle size={20} /> New Collection</h3>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Collection name" value={name} onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }} />

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                        {Object.entries(TYPE_ICONS).map(([t, icon]) => (
                            <button
                                key={t} type="button"
                                onClick={() => setType(t)}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid',
                                    borderColor: type === t ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                                    background: type === t ? 'rgba(167,139,250,0.15)' : 'rgba(0,0,0,0.2)',
                                    color: type === t ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {icon} {t}
                            </button>
                        ))}
                    </div>

                    {vaultMode === 'secret' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px' }}>
                            <input type="checkbox" id="special-col" checked={isSpecial} onChange={e => setIsSpecial(e.target.checked)} style={{ cursor: 'pointer' }} />
                            <label htmlFor="special-col" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                                <><EyeOff size={14} /> Make this collection secret</>
                            </label>
                        </div>
                    )}

                    {err && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{err}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
                        <button className="btn btn-ghost" type="button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ─── Nav Button Styles (hoisted — injected once, not per-instance) ────────
const NAV_BTN_STYLES = `
    .nav-btn-container { animation: none; }
    .vault-nav-btn {
        flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem;
        padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid transparent;
        text-align: left; cursor: pointer; font-size: 0.75rem; font-weight: 500;
        background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.7);
        transition: none;
        backdrop-filter: blur(10px);
    }
    .vault-nav-btn:hover {
        background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.7);
        border-color: transparent; transform: none;
    }
    .vault-nav-btn.active {
        background: linear-gradient(135deg, #a78bfa, #7c3aed);
        color: white; box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
        border-color: rgba(255,255,255,0.2); font-weight: 600;
    }
    .vault-remove-btn {
        background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
        color: #f87171; border-radius: 10px; width: 28px; height: 28px;
        cursor: pointer; font-size: 10px; display: flex; align-items: center;
        justify-content: center; transition: none;
        opacity: 1; transform: none;
    }
    .nav-btn-container:hover .vault-remove-btn { opacity: 1; transform: none; }
    .vault-remove-btn:hover { background: #ef4444; color: white; border-color: transparent; }
    .nav-text-container { flex: 1; min-width: 0; overflow: hidden; }
    .nav-text-static {
        white-space: nowrap; width: 100%;
        overflow: hidden; text-overflow: ellipsis; vertical-align: bottom;
    }
`;

// ─── Sidebar Nav Button ─────────────────────────────────────────
function NavBtn({ active, onClick, icon, label, subLabel, onRemove, indent = 0 }) {
    return (
        <div className="nav-btn-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingLeft: `${indent * 1.5}rem` }}>
            <button 
                onClick={onClick} 
                className={`vault-nav-btn ${active ? 'active' : ''}`}
                title={label}
            >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>{icon}</span>
                <div className="nav-text-container">
                    <div className="nav-text-static">{label}</div>
                    {subLabel && <div style={{ fontSize: '0.55rem', opacity: 0.55, marginTop: '2px' }}>{subLabel}</div>}
                </div>
            </button>
            {onRemove && (
                <button onClick={onRemove} className="vault-remove-btn" title="Remove Collection"><X size={12} /></button>
            )}
        </div>
    );
}

// ─── Storage Usage Bar ──────────────────────────────────────────
function StorageBar({ collections }) {
    const usedBytes = collections.reduce((sum, c) => sum + (c.size_bytes || 0), 0);
    const pct = Math.min(100, (usedBytes / TOTAL_FREE_BYTES) * 100);
    const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#a78bfa';

    return (
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                <span>STORAGE</span>
                <span>{fmtBytes(usedBytes)} / 10 GB</span>
            </div>
            <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'none' }} />
            </div>
        </div>
    );
}

// ─── Main VaultPage ─────────────────────────────────────────────
function VaultPage() {
    const [collections, setCollections] = useState([]);
    const [activeTab, setActiveTab] = useState(window.innerWidth < 768 ? 'folders_menu' : null);
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [vaultMode, setVaultMode] = useState('normal'); // 'normal', 'secret'
    const [pendingMode, setPendingMode] = useState(null); // mode to unlock
    const [secretClicks, setSecretClicks] = useState(0);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [collectionSearch, setCollectionSearch] = useState('');

    const loadCollections = () => {
        setLoading(true);
        getVaultCollections(vaultMode)
            .then(data => {
                const cols = Array.isArray(data) ? data : [];
                setCollections(cols);
                setActiveTab(prev => {
                    if (!prev || (prev === 'folders_menu' && window.innerWidth >= 768)) {
                        return cols.length > 0 ? cols[0].id : 'people';
                    }
                    if (prev !== 'people' && prev !== 'trash' && prev !== 'folders_menu') {
                        if (!cols.some(c => c.id === prev)) {
                            return cols.length > 0 ? cols[0].id : 'people';
                        }
                    }
                    return prev;
                });
                localStorage.setItem('vault_collections_cache', JSON.stringify({ data: cols, cachedAt: Date.now() }));
            })
            .catch(() => {
                const cached = localStorage.getItem('vault_collections_cache');
                if (cached) {
                    try { setCollections(JSON.parse(cached).data || []); } catch (_) {}
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { 
        setActiveTab(null);
        loadCollections(); 
    }, [vaultMode]);

    const handleSecretClick = (mode) => {
        if (vaultMode !== 'normal') {
            setVaultMode('normal');
            return;
        }
        
        // mode is 'secret'
        const newClicks = secretClicks + 1;
        setSecretClicks(newClicks);
        if (newClicks >= 3) {
            setPendingMode('secret');
            setSecretClicks(0);
        }
        setTimeout(() => setSecretClicks(0), 3000);
    };

    const handleAddCollection = (col) => {
        setCollections(prev => [...prev, col]);
        setActiveTab(col.id);
    };

    const handleRemoveCollection = async (colId) => {
        const col = collections.find(c => c.id === colId);
        if (!window.confirm(`Remove "${col?.name || 'this collection'}" from your Vault?\n\nFiles in R2 are NOT deleted — only the index is removed.`)) return;
        setPendingDelete(colId);
    };

    const confirmDelete = async () => {
        const colId = pendingDelete;
        setPendingDelete(null);
        try { await deleteVaultCollection(colId); } catch (_) {}
        setCollections(prev => prev.filter(c => c.id !== colId));
        if (activeTab === colId) {
            setActiveTab(window.innerWidth < 768 ? 'folders_menu' : (collections[0]?.id || 'people'));
        }
    };

    const isCollectionActive = collections.some(c => c.id === activeTab);
    const activeCollection = collections.find(c => c.id === activeTab);

    return (
        <div className="vault-layout" style={{
            display: 'flex', height: '100vh', width: '100%', background: 'transparent', color: 'white',
            overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0
        }}>
            <style>{`
                .vault-sidebar {
                    width: 280px; background: rgba(15, 15, 25, 0.5);
                    backdrop-filter: blur(30px); border-right: 1px solid rgba(255,255,255,0.08);
                    display: flex; flex-direction: column; padding: 0;
                    flex-shrink: 0; height: 100%;
                }
                .vault-sidebar-header {
                    padding: 1.5rem 1.5rem 0.75rem;
                    flex-shrink: 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .vault-sidebar-body {
                    flex: 1; min-height: 0; display: flex; flex-direction: column;
                    padding: 0.75rem 1.5rem 1rem;
                    overflow: hidden;
                }
                .vault-title {
                    font-size: 1.25rem; font-weight: 800; margin-bottom: 0;
                    background: linear-gradient(to right, #fff, rgba(255,255,255,0.4));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    display: flex; align-items: center; gap: 10px;
                }
                .vault-search-bar {
                    width: 100%; padding: 0.55rem 0.85rem;
                    border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(0,0,0,0.3); color: white; font-size: 0.8rem;
                    outline: none; box-sizing: border-box;
                    margin-bottom: 0.5rem;
                    transition: border-color 0.2s;
                }
                .vault-search-bar::placeholder { color: rgba(255,255,255,0.3); }
                .vault-search-bar:focus { border-color: rgba(167,139,250,0.5); }
                .vault-nav-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
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
                    transition: none; text-align: center; flex-shrink: 0;
                }
                .vault-add-btn:hover {
                    background: rgba(167,139,250,0.15); border-color: #a78bfa;
                    transform: none; box-shadow: 0 10px 20px rgba(167,139,250,0.1); color: white;
                }
                .vault-no-results {
                    padding: 1rem; text-align: center; color: rgba(255,255,255,0.25);
                    font-size: 0.78rem;
                }
                @keyframes vault-fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .vault-content > div { animation: none; }
                @media (max-width: 768px) {
                    .vault-layout { flex-direction: column; }
                    .vault-sidebar { display: none; }
                }
            `}</style>
            <style>{NAV_BTN_STYLES}</style>

            {/* ─── Mobile Segmented Control ─── */}
            <div className={`vault-mobile-nav mobile-only ${isCollectionActive ? 'hidden' : ''}`} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                <div className="vault-segments" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>

                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'folders_menu' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('folders_menu')}><Folder size={14} /> Collections</button>
                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'people' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('people')}><Users size={14} /> People</button>
                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'trash' ? '#a78bfa' : 'transparent', color: 'white' }} onClick={() => setActiveTab('trash')}><Trash2 size={14} /> Trash</button>
                </div>
            </div>

            {/* ─── Mobile Collection Top Bar ─── */}
            {isCollectionActive && (
                <div className="vault-mobile-folder-header mobile-only" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="back-btn" onClick={() => setActiveTab('folders_menu')} style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '1rem', cursor: 'pointer' }}>
                        ‹ Back
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>{TYPE_ICONS[activeCollection?.type] || <Folder size={16} />} {activeCollection?.name}</span>
                </div>
            )}

            {/* ─── Left Sidebar (Desktop Only) ─── */}
            <div className="vault-sidebar desktop-only">
                {/* Sticky header section */}
                <div className="vault-sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                                style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                                title={vaultMode === 'secret' ? "Secret Vault Active" : "Normal Vault"}
                            >
                                {vaultMode === 'secret' ? <EyeOff size={20} color="#a78bfa" /> : <Lock size={20} color="#f59e0b" />}
                            </span>
                            <h2 className="vault-title" style={{ margin: 0 }}>VAULT</h2>
                            {vaultMode === 'normal' && (
                                <span 
                                    onClick={() => handleSecretClick('secret')} 
                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', opacity: 0.5, marginLeft: '4px' }}
                                    title="Secret Mode"
                                >
                                    <EyeOff size={16} />
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={loadCollections} className="btn btn-ghost btn-xs" title="Reload collections" style={{ padding: '4px', opacity: 0.5 }}><RefreshCw size={14} /></button>
                        </div>
                    </div>
                    {/* Search bar */}
                    <input
                        className="vault-search-bar"
                        type="text"
                        placeholder="Search collections…"
                        value={collectionSearch}
                        onChange={e => setCollectionSearch(e.target.value)}
                    />
                </div>

                {/* Scrollable body */}
                <div className="vault-sidebar-body">
                    <div className="vault-nav-scroll">
                        <NavBtn
                            active={activeTab === 'people'}
                            onClick={() => setActiveTab('people')}
                            icon={<Users size={16} />}
                            label="People & Groups"
                        />

                        <NavBtn
                            active={activeTab === 'trash'}
                            onClick={() => setActiveTab('trash')}
                            icon={<Trash2 size={16} />}
                            label="Trash"
                        />

                        {collections.length > 0 && (
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', padding: '1.25rem 0.9rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}>
                                Collections
                            </div>
                        )}

                        {loading ? (
                            <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Loading...</div>
                        ) : (() => {
                            const filtered = collections
                                .filter(c => !c.parent_id && !c.name?.toLowerCase().includes('trash'))
                                .filter(c => !collectionSearch.trim() || c.name?.toLowerCase().includes(collectionSearch.toLowerCase()));
                            return filtered.length === 0 && collectionSearch.trim() ? (
                                <div className="vault-no-results">No collections match "{collectionSearch}"</div>
                            ) : (
                                filtered.map(col => (
                                    <NavBtn
                                        key={col.id}
                                        active={activeTab === col.id}
                                        onClick={() => setActiveTab(col.id)}
                                        icon={TYPE_ICONS[col.type] || <Folder size={16} />}
                                        label={col.name}
                                        subLabel={col.file_count ? `${col.file_count.toLocaleString()} files · ${fmtBytes(col.size_bytes)}` : null}
                                        onRemove={() => handleRemoveCollection(col.id)}
                                    />
                                ))
                            );
                        })()}

                        <button className="vault-add-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setShowAdd(true)}>
                            <Plus size={16} /> New Collection
                        </button>
                    </div>

                    <StorageBar collections={collections} />
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <div className={`vault-content ${activeTab === 'folders_menu' ? 'mobile-only' : ''}`}>
                {activeTab === 'folders_menu' ? (
                    <div className="mobile-folders-grid-view">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 className="mobile-folders-title" style={{ margin: 0 }}>My Collections</h3>
                        </div>
                        {/* Mobile search bar */}
                        <input
                            type="text"
                            placeholder="Search collections…"
                            value={collectionSearch}
                            onChange={e => setCollectionSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '0.65rem 1rem', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)',
                                color: 'white', fontSize: '0.85rem', outline: 'none',
                                boxSizing: 'border-box', marginBottom: '1rem',
                            }}
                        />
                        <div className="mobile-folders-grid">
                            <div className="add-folder-card" onClick={() => setShowAdd(true)}>
                                <div className="add-icon"><Plus size={24} /></div>
                                <span>New Collection</span>
                            </div>
                            {loading ? (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem' }}>Loading...</div>
                            ) : (() => {
                                const filtered = collections
                                    .filter(c => !c.parent_id && !c.name?.toLowerCase().includes('trash'))
                                    .filter(c => !collectionSearch.trim() || c.name?.toLowerCase().includes(collectionSearch.toLowerCase()));
                                return filtered.length === 0 && collectionSearch.trim() ? (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                                        No collections match "{collectionSearch}"
                                    </div>
                                ) : (
                                    filtered.map(col => (
                                        <div key={col.id} className="folder-card" onClick={() => setActiveTab(col.id)}>
                                            <div className="folder-icon-wrapper">{TYPE_ICONS[col.type] || <Folder size={24} />}</div>
                                            <div className="folder-name">{col.name}</div>
                                            {col.file_count > 0 && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{col.file_count} files</div>}
                                            <button className="folder-remove" onClick={(e) => { e.stopPropagation(); handleRemoveCollection(col.id); }}><X size={12} /></button>
                                        </div>
                                    ))
                                );
                            })()}
                        </div>
                    </div>
                ) : activeTab === 'people' ? (
                    <PeopleView collections={collections} />
                ) : activeTab === 'trash' ? (
                    <TrashView />
                ) : (
                    <VaultMediaGrid
                        activeTab={activeTab}
                        collections={collections}
                        onTabChange={setActiveTab}
                        onCollectionsChanged={loadCollections}
                    />
                )}
            </div>

            {showAdd && <CreateCollectionModal onAdd={handleAddCollection} onClose={() => setShowAdd(false)} vaultMode={vaultMode} />}
            {pendingMode && (
                <SecondaryVaultLock 
                    lockId="vault_secret" 
                    title="Secret Vault"
                    onSuccess={() => { setVaultMode(pendingMode); setPendingMode(null); }} 
                    onClose={() => setPendingMode(null)} 
                />
            )}
            {pendingDelete && (
                <SecondaryVaultLock 
                    lockId="vault" 
                    title="Delete Folder"
                    onSuccess={confirmDelete} 
                    onClose={() => setPendingDelete(null)} 
                />
            )}
        </div>
    );
}

const LockedVaultPage = () => <VaultLock><VaultPage /></VaultLock>;
export default LockedVaultPage;
