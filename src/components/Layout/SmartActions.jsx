import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import {
    Search, ArrowRight, Disc, Play, Pause, SkipForward,
    Home, Dna, Sparkles, Mail, BookOpen, FileText, PenTool,
    Heart, Users, Music, Tv, Gamepad2, Diamond, Image,
    Library, Package, Star, KeyRound, Settings, Wallet, Brain,
    Flame, User, Bell, Info
} from 'lucide-react';
import './SmartActions.css';

// ── All navigable items ─────────────────────────────────────────
const ALL_ITEMS = [
    { id: 'dashboard',      Icon: Home, label: 'Dashboard',     keywords: 'home main overview' },
    { id: 'lifeos',         Icon: Dna, label: 'LifeOS',        keywords: 'life os tracker tasks goals habits daily' },
    { id: 'luna',           Icon: Sparkles, label: 'Luna AI',        keywords: 'ai chat assistant artificial intelligence' },
    { id: 'mail',           Icon: Mail, label: 'Gmail Inbox',    keywords: 'email gmail inbox messages' },
    { id: 'journal',        Icon: BookOpen, label: 'Journal',        keywords: 'diary entry write daily log' },
    { id: 'studynotes',     Icon: FileText, label: 'Study Notes',    keywords: 'notes study learning education' },
    { id: 'writing',        Icon: PenTool, label: 'Writing',        keywords: 'write draft blog essay creative' },
    { id: 'bookmarks',      Icon: Heart, label: 'Bookmarks',      keywords: 'favorites saved links' },
    { id: 'delegation',     Icon: Users, label: 'Delegation',     keywords: 'delegate tasks assign' },
    { id: 'musicplayer',    Icon: Music, label: 'Music Player',   keywords: 'music songs audio player playlist' },
    { id: 'videos',         Icon: Tv, label: 'YouTube',        keywords: 'youtube videos watch' },
    { id: 'twitch',         Icon: Gamepad2, label: 'Twitch',         keywords: 'twitch streams gaming live' },
    { id: 'vault',          Icon: Diamond, label: 'Vault',           keywords: 'vault media private photos', isRed: true },
    { id: 'media',          Icon: Image, label: 'Media Library',  keywords: 'media library images gallery' },
    { id: 'readinglist',    Icon: Library, label: 'Reading List',   keywords: 'books reading list library' },
    { id: 'timecapsule',    Icon: Package, label: 'Time Capsule',   keywords: 'time capsule memories future' },
    { id: 'yearlyreview',   Icon: Star, label: 'Yearly Review',  keywords: 'yearly annual review reflection' },
    { id: 'passwords',      Icon: KeyRound, label: 'Passwords',      keywords: 'passwords security keys credentials' },
    { id: 'finance',        Icon: Wallet, label: 'Finance',        keywords: 'finance money budget expenses' },
    { id: 'thoughtdump',    Icon: Brain, label: 'Thought Dump',   keywords: 'thoughts ideas brainstorm dump' },
    { id: 'streaks',        Icon: Flame, label: 'Streaks',        keywords: 'streaks consistency habits' },
    { id: 'whoami',         Icon: User, label: 'Who Am I',       keywords: 'identity self profile about' },
    { id: 'notifications',  Icon: Bell, label: 'Notifications',  keywords: 'notifications alerts bell' },
    { id: 'information',    Icon: Info, label: 'Information',    keywords: 'info about help' },
    { id: 'system-settings', Icon: Settings, label: 'Settings',     keywords: 'settings preferences config system' },
];

function fuzzyMatch(query, item) {
    const q = query.toLowerCase();
    const label = item.label.toLowerCase();
    const id = item.id.toLowerCase();
    const kw = (item.keywords || '').toLowerCase();
    return label.includes(q) || id.includes(q) || kw.includes(q);
}

// ── Component ───────────────────────────────────────────────────
export default function SmartActions({ activeTab, onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef(null);
    const { playing, currentTrack, playTrack, playNext } = useAudio();

    const results = query.length >= 3
        ? ALL_ITEMS.filter(item => fuzzyMatch(query, item))
        : [];

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
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
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

    if (!isOpen && !isClosing) {
        return (
            <>
                {currentTrack && (
                    <div className="cmd-music-pill" onClick={() => onNavigate('musicplayer')}>
                        <div className={`pill-disc ${playing ? 'spinning' : ''}`}>
                            <Disc size={18} />
                        </div>
                        <div className="pill-info">
                            <span className="pill-title">{currentTrack.title}</span>
                            <span className="pill-artist">{currentTrack.artist}</span>
                        </div>
                        <div className="pill-controls" onClick={e => e.stopPropagation()}>
                            <button className="pill-btn" onClick={() => playTrack(currentTrack)}>
                                {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
                            </button>
                            <button className="pill-btn" onClick={playNext}>
                                <SkipForward size={14} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <div
                className={`sa-backdrop ${isOpen && !isClosing ? 'visible' : ''}`}
                onClick={closeSA}
            />

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

                    {query.length >= 3 && results.length > 0 && (
                        <div className="sa-results">
                            {results.map((item, i) => (
                                <div
                                    key={item.id}
                                    className={`sa-result ${i === highlighted ? 'highlighted' : ''} ${item.isRed ? 'is-red' : ''}`}
                                    onClick={() => handleSelect(item.id)}
                                    onMouseEnter={() => setHighlighted(i)}
                                >
                                    <div className="sa-result-icon"><item.Icon size={20} strokeWidth={1.6} /></div>
                                    <div className="sa-result-info">
                                        <div className="sa-result-label">{item.label}</div>
                                        <div className="sa-result-id">{item.id}</div>
                                    </div>
                                    {activeTab === item.id && (
                                        <span className="sa-active-badge">Active</span>
                                    )}
                                    <ArrowRight size={14} className="sa-result-arrow" />
                                </div>
                            ))}
                        </div>
                    )}

                    {query.length >= 3 && results.length === 0 && (
                        <div className="sa-empty">
                            No apps match "{query}"
                        </div>
                    )}

                    {query.length < 3 && (
                        <div className="sa-hint">
                            Type at least <kbd>3</kbd> characters to search
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
                        <button className="pill-btn" onClick={() => playTrack(currentTrack)}>
                            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
                        </button>
                        <button className="pill-btn" onClick={playNext}>
                            <SkipForward size={14} fill="currentColor" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
