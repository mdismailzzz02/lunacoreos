import React, { useState } from 'react';
import { saveFaceGroups } from '../../services/api';

/**
 * FaceGroupsView Component
 * Displays detected groups, allows naming and picking a cover photo.
 */
export default function FaceGroupsView({ folderId, groups, onSave, onBack }) {
    const [groupState, setGroupState] = useState(groups);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const updateGroupName = (index, name) => {
        const next = [...groupState];
        next[index].label = name;
        setGroupState(next);
    };

    const pickCover = (groupIndex, imageId) => {
        const next = [...groupState];
        next[groupIndex].coverImageId = imageId;
        setGroupState(next);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setError(null);
        try {
            await saveFaceGroups(folderId, groupState);
            onSave(groupState);
        } catch (err) {
            setError('Failed to save to Sheets. The data might be too large.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="groups-list">
                <style>{`
                    .group-grid-container { flex: 1; minWidth: 300px; }
                    .group-grid { display: flex; gap: 8px; flexWrap: wrap; }
                    .face-thumb { position: relative; width: 80px; height: 80px; borderRadius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
                    
                    @media (max-width: 768px) {
                        .group-layout { flex-direction: column; gap: 1rem; }
                        .group-sidebar { width: 100%; }
                        .group-grid-container { min-width: 100%; }
                        .face-thumb { width: 70px; height: 70px; }
                        .results-header { flex-direction: column; align-items: stretch !important; gap: 1rem; }
                        .results-header-text h2 { font-size: 1.1rem !important; }
                        .results-header-btns { width: 100%; }
                        .results-header-btns button { flex: 1; font-size: 0.8rem; }
                    }
                `}</style>

                {groupState.map((group, idx) => (
                    <div key={group.groupId} className="group-item" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                        <div className="group-layout" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Group Header/Edit */}
                            <div className="group-sidebar" style={{ width: '220px', flexShrink: 0 }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                    Person Name / Label
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter name..."
                                    value={group.label === '(unknown)' ? '' : group.label}
                                    onChange={(e) => updateGroupName(idx, e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {group.memberImageIds.length} photos found.
                                </p>
                            </div>

                            {/* Members Grid */}
                            <div className="group-grid-container">
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                                    Select Cover Photo
                                </label>
                                <div className="group-grid">
                                    {group._members.map(member => {
                                        const isCover = group.coverImageId === member.id;
                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => pickCover(idx, member.id)}
                                                className="face-thumb"
                                                style={{
                                                    border: isCover ? '3px solid var(--accent, #a78bfa)' : '2px solid transparent',
                                                    boxShadow: isCover ? '0 0 15px rgba(167,139,250,0.4)' : 'none'
                                                }}
                                            >
                                                <img
                                                    src={member.src}
                                                    alt="face"
                                                    referrerPolicy="no-referrer"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {isCover && (
                                                    <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--accent, #a78bfa)', color: 'white', fontSize: '8px', padding: '2px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                                        COVER
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
