import React, { useState, useEffect, useCallback } from 'react';
import { useAudio } from '../../context/AudioContext';
import {
    Home, Dna, Sparkles, Mail, BookOpen, Music, Diamond,
    Tv, Gamepad2, Plus, X,
    FileText, PenTool, Heart, Users, Image, Library,
    Package, Star, KeyRound, Settings,
    Disc, Play, Pause, SkipForward
} from 'lucide-react';
import './CommandDisk.css';

// ── Primary Ring (9 items + "More") ─────────────────────────────
const PRIMARY_ITEMS = [
    { id: 'dashboard', Icon: Home, label: 'Dashboard' },


    { id: 'journal',   Icon: BookOpen, label: 'Journal' },
    { id: 'musicplayer', Icon: Music, label: 'Music' },
    { id: 'vault',     Icon: Diamond, label: 'Vault', isRed: true },
    { id: 'videos',    Icon: Tv, label: 'YouTube' },


];

// ── Outer Ring ("More" items) ───────────────────────────────────
const OUTER_ITEMS = [
    { id: 'studynotes',   Icon: FileText, label: 'Study Notes' },
    { id: 'writing',      Icon: PenTool, label: 'Writing' },
    { id: 'bookmarks',    Icon: Heart, label: 'Bookmarks' },
    { id: 'delegation',   Icon: Users, label: 'Delegation' },
    { id: 'media',        Icon: Image, label: 'Media' },
    { id: 'readinglist',  Icon: Library, label: 'Reading' },
    { id: 'timecapsule',  Icon: Package, label: 'Capsule' },
    { id: 'yearlyreview', Icon: Star, label: 'Review' },
    { id: 'passwords',    Icon: KeyRound, label: 'Passwords' },
    { id: 'system-settings', Icon: Settings, label: 'Settings' },
];

// ── Helpers ─────────────────────────────────────────────────────
const INNER_RADIUS = 155;
const OUTER_RADIUS = 245;

function getPosition(index, total, radius) {
    const angle = ((2 * Math.PI) / total) * index - Math.PI / 2;
    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
    };
}

// ── Component ───────────────────────────────────────────────────
export default function CommandDisk({ activeTab, onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const { playing, currentTrack, playTrack, playNext, stopTrack } = useAudio();

    const totalPrimary = PRIMARY_ITEMS.length + 1;

    const closeDisk = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setShowMore(false);
        }, 200);
    }, []);

    const toggleDisk = useCallback(() => {
        if (isOpen) closeDisk();
        else setIsOpen(true);
    }, [isOpen, closeDisk]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            const isEditable = e.target.isContentEditable;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

            if (e.code === 'Space' || e.code === 'Escape') {
                e.preventDefault();
                toggleDisk();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleDisk, isOpen, closeDisk]);

    const handleNavigate = (id) => {
        onNavigate(id);
        closeDisk();
    };

    return (
        <>
            <div
                className={`cmd-disk-backdrop ${isOpen && !isClosing ? 'visible' : ''}`}
                onClick={closeDisk}
            />

            <div className={`cmd-disk ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
                <div className="cmd-disk-ring">
                    <div className="cmd-disk-center" onClick={() => handleNavigate('dashboard')}>
                        <img src="/logo.png" alt="LunaCoreOS" />
                    </div>

                    {PRIMARY_ITEMS.map((item, i) => {
                        const pos = getPosition(i, totalPrimary, INNER_RADIUS);
                        return (
                            <div
                                key={item.id}
                                className={`cmd-disk-item ${activeTab === item.id ? 'active' : ''} ${item.isRed ? 'is-red' : ''}`}
                                style={{
                                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                                    transitionDelay: isOpen ? `${i * 0.035}s` : '0s',
                                }}
                                onClick={() => handleNavigate(item.id)}
                                title={item.label}
                            >
                                <span className="cmd-disk-icon"><item.Icon size={22} strokeWidth={1.6} /></span>
                                <span className="cmd-disk-label">{item.label}</span>
                            </div>
                        );
                    })}

                    {(() => {
                        const morePos = getPosition(PRIMARY_ITEMS.length, totalPrimary, INNER_RADIUS);
                        return (
                            <div
                                className={`cmd-disk-item is-more ${showMore ? 'expanded' : ''}`}
                                style={{
                                    transform: `translate(${morePos.x}px, ${morePos.y}px)`,
                                    transitionDelay: isOpen ? `${PRIMARY_ITEMS.length * 0.035}s` : '0s',
                                }}
                                onClick={(e) => { e.stopPropagation(); setShowMore(prev => !prev); }}
                                title="More apps"
                            >
                                <span className="cmd-disk-icon">{showMore ? <X size={22} strokeWidth={1.6} /> : <Plus size={22} strokeWidth={1.6} />}</span>
                                <span className="cmd-disk-label">{showMore ? 'Close' : 'More'}</span>
                            </div>
                        );
                    })()}

                    <div className={`cmd-disk-outer-ring ${showMore ? 'expanded' : ''}`}>
                        {OUTER_ITEMS.map((item, i) => {
                            const pos = getPosition(i, OUTER_ITEMS.length, OUTER_RADIUS);
                            return (
                                <div
                                    key={item.id}
                                    className={`cmd-disk-outer-item ${activeTab === item.id ? 'active' : ''}`}
                                    style={{
                                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                                        transitionDelay: showMore ? `${i * 0.03}s` : '0s',
                                    }}
                                    onClick={() => handleNavigate(item.id)}
                                    title={item.label}
                                >
                                    <span className="cmd-disk-outer-icon"><item.Icon size={18} strokeWidth={1.6} /></span>
                                    <span className="cmd-disk-outer-label">{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isOpen && !isClosing && (
                <div className="cmd-disk-hint">
                    Press <kbd>Space</kbd> or <kbd>Esc</kbd> to close
                </div>
            )}

            {currentTrack && (
                <div className="cmd-music-pill" onClick={() => handleNavigate('musicplayer')}>
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
