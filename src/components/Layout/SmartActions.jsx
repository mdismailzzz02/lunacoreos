import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import {
    Search, ArrowRight, Disc, Play, Pause, SkipForward,
    Home, Dna, Sparkles, Mail, BookOpen, FileText, PenTool,
    Heart, Users, Music, Tv, Gamepad2, Diamond, Image,
    Library, Package, Star, KeyRound, Settings, Wallet, Brain,
    Flame, User, Bell, Info, X, Film, Radio, MonitorPlay
} from 'lucide-react';
import LofiRadio from '../Arcade/LofiRadio';
import './SmartActions.css';

// ── All navigable items ─────────────────────────────────────────
const ALL_ITEMS = [
    { id: 'dashboard',      Icon: Home, label: 'Dashboard',     keywords: 'home main overview' },



    { id: 'journal',        Icon: BookOpen, label: 'Journal',        keywords: 'diary entry write daily log' },
    { id: 'studynotes',     Icon: FileText, label: 'Study Notes',    keywords: 'notes study learning education' },
    { id: 'writing',        Icon: PenTool, label: 'Writing',        keywords: 'write draft blog essay creative' },
    { id: 'bookmarks',      Icon: Heart, label: 'Bookmarks',      keywords: 'favorites saved links' },
    { id: 'delegation',     Icon: Users, label: 'Delegation',     keywords: 'delegate tasks assign' },
    { id: 'musicplayer',    Icon: Music, label: 'Music Player',   keywords: 'music songs audio player playlist' },
    { id: 'videos',         Icon: Tv, label: 'YouTube',        keywords: 'youtube videos watch' },

    { id: 'vault',          Icon: Diamond, label: 'Vault',           keywords: 'vault media private photos', isRed: true },
    { id: 'media',          Icon: Image, label: 'Media Library',  keywords: 'media library images gallery' },
    { id: 'readinglist',    Icon: Library, label: 'Reading List',   keywords: 'books reading list library' },
    { id: 'watchlist',      Icon: Film, label: 'Watchlist',         keywords: 'movies tv shows watch film' },
    { id: 'timecapsule',    Icon: Package, label: 'Time Capsule',   keywords: 'time capsule memories future' },
    { id: 'yearlyreview',   Icon: Star, label: 'Yearly Review',  keywords: 'yearly annual review reflection' },
    { id: 'passwords',      Icon: KeyRound, label: 'Passwords',      keywords: 'passwords security keys credentials' },
    { id: 'finance',        Icon: Wallet, label: 'Finance',        keywords: 'finance money budget expenses' },


    { id: 'information',    Icon: Info, label: 'Information',    keywords: 'info about help' },
    { id: 'system-settings', Icon: Settings, label: 'Settings',     keywords: 'settings preferences config system' },
];

function fuzzyMatch(query, item) {
    const q = query.toLowerCase();
    const label = item.label.toLowerCase();
    const id = item.id.toLowerCase();
    const kw = (item.keywords || '').toLowerCase();
    // Force HMR: SmartActions updated
    return label.includes(q) || id.includes(q) || kw.includes(q);
}

// ── Component ───────────────────────────────────────────────────
export default function SmartActions({ activeTab, onNavigate, tabHistory, onCloseTab }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [lofiChannel, setLofiChannel] = useState(1);
    const inputRef = useRef(null);
    const { playing, currentTrack, playTrack, playNext, stopTrack } = useAudio();

    const results = query
        ? ALL_ITEMS.filter(item => fuzzyMatch(query, item))
        : ALL_ITEMS;

    const closeSA = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setQuery('');
            setHighlighted(0);
        }, 150);
    }, []);

    const openSA = useCallback(() => {
        setIsOpen(true);
        setQuery('');
        setHighlighted(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const toggleSA = useCallback(() => {
        if (isOpen) closeSA();
        else openSA();
    }, [isOpen, closeSA, openSA]);

    const handleSelect = useCallback((id) => {
        onNavigate(id);
        closeSA();
    }, [onNavigate, closeSA]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Escape') {
                if (isOpen) {
                    e.preventDefault();
                    closeSA();
                    return;
                }
                const tag = e.target.tagName;
                const isEditable = e.target.isContentEditable;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

                e.preventDefault();
                openSA();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeSA, openSA]);

    const handleInputKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            setHighlighted(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            setHighlighted(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            handleSelect(results[highlighted]?.id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSA();
        }
    };

    useEffect(() => {
        setHighlighted(0);
    }, [query]);

    // No early return so background components like LofiRadio remain mounted

    return (
        <>
            <div
                className={`sa-backdrop ${isOpen && !isClosing ? 'visible' : ''}`}
                onClick={closeSA}
            />

            {/* Left-side History Panel */}
            {tabHistory && tabHistory.length > 0 && (
                <div className={`sa-history-overlay ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
                    <div className="sa-history-glass">
                        <div className="sa-history-header">Recent History</div>
                        <div className="sa-history-list">
                            {tabHistory.map((historyId, idx) => {
                                const tabDef = ALL_ITEMS.find(t => t.id === historyId);
                                if (!tabDef) return null;
                                return (
                                    <div
                                        key={`sa-hist-${historyId}-${idx}`}
                                        className={`sa-history-item ${activeTab === historyId ? 'highlighted' : ''}`}
                                        onClick={() => handleSelect(historyId)}
                                    >
                                        <div className="sa-history-icon-wrap">
                                            <tabDef.Icon size={18} strokeWidth={1.8} className="sa-history-icon" />
                                        </div>
                                        <div className="sa-history-info">
                                            <div className="sa-history-label">{tabDef.label}</div>
                                            <div className="sa-history-id">{historyId}</div>
                                        </div>
                                        <div 
                                            className="sa-history-close"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCloseTab && onCloseTab(historyId);
                                            }}
                                            title="Remove from history"
                                        >
                                            <X size={14} strokeWidth={2} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Right-side Lofi Radio Panel */}
            <div className={`sa-lofi-overlay ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
                <div className="sa-history-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(10, 12, 20, 0.85)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.8)', height: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff6b95', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', textShadow: '0 0 15px rgba(255,107,149,0.4)', paddingBottom: '4px' }}>
                        <Radio size={16} /> LOFI_TERMINAL
                    </div>

                    <div style={{ width: '100%' }}>
                        <LofiRadio channel={lofiChannel} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Network Uplinks</div>
                        
                        {[
                            { id: 1, name: 'Lofi Core', color: '#ff6b95' },
                            { id: 2, name: 'Synthwave', color: '#ff6b95' }
                        ].map(ch => (
                            <button 
                                key={ch.id}
                                onClick={(e) => { e.stopPropagation(); setLofiChannel(ch.id); }}
                                style={{ 
                                    padding: '12px 16px', 
                                    background: lofiChannel === ch.id ? `linear-gradient(90deg, ${ch.color}22 0%, transparent 100%)` : 'rgba(255,255,255,0.02)', 
                                    color: lofiChannel === ch.id ? ch.color : 'rgba(255,255,255,0.6)', 
                                    border: '1px solid', 
                                    borderColor: lofiChannel === ch.id ? `${ch.color}55` : 'rgba(255,255,255,0.05)', 
                                    borderLeftWidth: lofiChannel === ch.id ? '3px' : '1px',
                                    borderRadius: '6px', 
                                    cursor: 'pointer', 
                                    textAlign: 'left', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.8rem'
                                }}
                            >
                                <MonitorPlay size={14} style={{ opacity: lofiChannel === ch.id ? 1 : 0.5 }} /> 
                                <span style={{ flex: 1 }}>[CH_{ch.id}]</span>
                                <span>{ch.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={`sa-container ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
                <div className="sa-glass">
                    <div className="sa-input-wrap">
                        <Search size={18} className="sa-search-icon" />
                        <input
                            ref={inputRef}
                            className="sa-input"
                            type="text"
                            placeholder="Search apps…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <span className="sa-shortcut-hint">Esc</span>
                    </div>

                    {results.length > 0 && (
                        <div className="sa-grid-results">
                            {results.map((item, i) => (
                                <div
                                    key={item.id}
                                    className={`sa-grid-item ${i === highlighted ? 'highlighted' : ''} ${item.isRed ? 'is-red' : ''}`}
                                    onClick={() => handleSelect(item.id)}
                                    onMouseEnter={() => setHighlighted(i)}
                                >
                                    <div className="sa-grid-icon-wrap">
                                        <item.Icon size={28} strokeWidth={1.5} className="sa-grid-icon" />
                                        {activeTab === item.id && <div className="sa-grid-active-dot"></div>}
                                    </div>
                                    <div className="sa-grid-label">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {query.length > 0 && results.length === 0 && (
                        <div className="sa-empty">
                            No apps match "{query}"
                        </div>
                    )}

                    <div className="sa-footer">
                        <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
                        <span><kbd>↵</kbd> open</span>
                        <span><kbd>Esc</kbd> close</span>
                    </div>
                </div>
            </div>

            {currentTrack && (
                <div className="cmd-music-pill" onClick={() => { closeSA(); onNavigate('musicplayer'); }}>
                    <div className={`pill-disc ${playing ? 'spinning' : ''}`}>
                        <Disc size={18} />
                    </div>
                    <div className="pill-info">
                        <span className="pill-title">{currentTrack.title}</span>
                        <span className="pill-artist">{currentTrack.artist}</span>
                    </div>
                    <div className="pill-controls" onClick={e => e.stopPropagation()}>
                        <button className="pill-btn" onClick={() => playTrack(currentTrack)} title={playing ? 'Pause' : 'Play'}>
                            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
                        </button>
                        <button className="pill-btn" onClick={playNext} title="Next">
                            <SkipForward size={14} fill="currentColor" />
                        </button>
                        <button className="pill-btn" onClick={stopTrack} title="Close Player" style={{ marginLeft: 4, opacity: 0.7 }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
