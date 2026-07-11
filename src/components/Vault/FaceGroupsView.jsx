import React, { useState, useEffect } from 'react';
import { saveVaultFaceGroup, getR2PresignedBatch } from '../../services/api';

/**
 * FaceGroupsView Component
 * Displays detected groups, allows naming and picking a cover photo.
 */
export default function FaceGroupsView({ collectionId, groups, onSave, onBack }) {
    const [groupState, setGroupState] = useState(groups);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [urls, setUrls] = useState({});

    // Fetch presigned URLs for all members in all groups
    useEffect(() => {
        const fetchUrls = async () => {
            const keys = new Set();
            groups.forEach(g => {
                g._members.forEach(m => keys.add(m.r2_key));
            });
            const keyArray = Array.from(keys);
            if (keyArray.length === 0) return;

            try {
                // Batch fetch (handle > 100 limit by chunking)
                const newUrls = {};
                for (let i = 0; i < keyArray.length; i += 100) {
                    const chunk = keyArray.slice(i, i + 100);
                    const { urls: chunkUrls } = await getR2PresignedBatch(chunk);
                    Object.assign(newUrls, chunkUrls);
                }
                setUrls(newUrls);
            } catch (e) {
                console.error("Failed to load thumbnail URLs", e);
            }
        };
        fetchUrls();
    }, [groups]);

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
            // Save each group sequentially
            for (const g of groupState) {
                // convert back to Float32Array for euclidean distance later? Actually Postgres stores as float array.
                // It was already converted to normal array in FaceScanner.
                await saveVaultFaceGroup({
                    collection_id: collectionId,
                    person_name: g.label,
                    cover_file_id: g.coverImageId,
                    member_file_ids: g.memberImageIds,
                    descriptor_centroid: Array.from(g.descriptor_centroid)
                });
            }
            onSave(groupState);
        } catch (err) {
            setError(`Failed to save groups: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Review Identified Faces</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Name the subjects and pick a cover photo.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onBack} disabled={saving} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                        Cancel
                    </button>
                    <button onClick={handleSaveAll} disabled={saving} style={{ background: '#a78bfa', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '10px', color: '#1a1a2e', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 800 }}>
                        {saving ? 'Saving...' : 'Save Groups'}
                    </button>
                </div>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px' }}>{error}</div>}

            <div className="groups-list">
                <style>{`
                    .group-grid-container { flex: 1; minWidth: 300px; }
                    .group-grid { display: flex; gap: 8px; flexWrap: wrap; }
                    .face-thumb { position: relative; width: 80px; height: 80px; borderRadius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.05); }
                    
                    @media (max-width: 768px) {
                        .group-layout { flex-direction: column; gap: 1rem; }
                        .group-sidebar { width: 100%; }
                        .group-grid-container { min-width: 100%; }
                        .face-thumb { width: 70px; height: 70px; }
                    }
                `}</style>

                {groupState.map((group, idx) => (
                    <div key={group.groupId} className="group-item" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                        <div className="group-layout" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Group Header/Edit */}
                            <div className="group-sidebar" style={{ width: '220px', flexShrink: 0 }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
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
                                        const src = urls[member.r2_key];
                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => pickCover(idx, member.id)}
                                                className="face-thumb"
                                                style={{
                                                    border: isCover ? '3px solid #a78bfa' : '2px solid transparent',
                                                    boxShadow: isCover ? '0 0 15px rgba(167,139,250,0.4)' : 'none'
                                                }}
                                            >
                                                {src && (
                                                    <img
                                                        src={src}
                                                        alt="face"
                                                        referrerPolicy="no-referrer"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                )}
                                                {isCover && (
                                                    <div style={{ position: 'absolute', top: '2px', right: '2px', background: '#a78bfa', color: '#1a1a2e', fontSize: '8px', padding: '2px 4px', borderRadius: '4px', fontWeight: 800 }}>
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
