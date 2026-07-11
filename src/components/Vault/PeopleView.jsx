import React, { useState, useEffect } from 'react';
import { getVaultFaceGroups, getR2PresignedBatch } from '../../services/api';

/**
 * PeopleView Component
 * Aggregates all saved face groups from all collections.
 */
export default function PeopleView({ collections }) {
    const [allGroups, setAllGroups] = useState([]);
    const [urls, setUrls] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // Fetch groups for each collection in parallel
                const promises = collections.map(c => getVaultFaceGroups(c.id));
                const responses = await Promise.all(promises);

                const combined = [];
                responses.forEach((groups, i) => {
                    (groups || []).forEach(g => {
                        combined.push({
                            ...g,
                            collectionName: collections[i].name
                        });
                    });
                });

                setAllGroups(combined);

                // Fetch presigned URLs for cover images
                const keys = new Set();
                combined.forEach(g => {
                    if (g.cover_file_id) {
                        // We need the r2_key to get the presigned URL.
                        // Wait, vault_face_groups has cover_file_id, but not coverR2Key directly in the DB table.
                        // Actually, if we join vault_files we can get the r2_key.
                        // Let's assume we need to join it or we stored it. Wait! In api.js, getVaultFaceGroups just does select('*').
                        // This means it doesn't return r2_key for the cover.
                        // Hmm, I will update getVaultFaceGroups in api.js to join vault_files.
                    }
                });

            } catch (e) {
                console.error('Failed to load combined people view:', e);
            } finally {
                setLoading(false);
            }
        };
        if (collections?.length > 0) loadAll();
        else setLoading(false);
    }, [collections]);

    // Secondary effect to fetch URLs once groups are loaded
    useEffect(() => {
        const fetchUrls = async () => {
            const keys = new Set();
            allGroups.forEach(g => {
                if (g.vault_files?.r2_key) keys.add(g.vault_files.r2_key);
            });
            const keyArray = Array.from(keys);
            if (keyArray.length === 0) return;

            try {
                const newUrls = {};
                for (let i = 0; i < keyArray.length; i += 100) {
                    const chunk = keyArray.slice(i, i + 100);
                    const { urls: chunkUrls } = await getR2PresignedBatch(chunk);
                    Object.assign(newUrls, chunkUrls);
                }
                setUrls(newUrls);
            } catch (e) {
                console.error("Failed to load cover URLs", e);
            }
        };
        if (allGroups.length > 0) fetchUrls();
    }, [allGroups]);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Loading people...</div>;

    if (allGroups.length === 0) return (
        <div className="empty-state">
            <div style={{ fontSize: '4rem', marginBottom: '1rem', textAlign: 'center' }}>👥</div>
            <p style={{ textAlign: 'center', fontWeight: 700 }}>No people identified yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', textAlign: 'center' }}>
                Open a collection and click "Scan Faces" to start grouping.
            </p>
        </div>
    );

    return (
        <div className="fade-in people-view-container">
            <style>{`
                .people-view-container h2 { 
                    font-size: 1.5rem; fontWeight: 800; margin-bottom: 2rem; 
                    background: linear-gradient(to right, #fff, rgba(255,255,255,0.4));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; }
                
                .person-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .person-card:hover {
                    background: rgba(255, 255, 255, 0.07);
                    border-color: #a78bfa;
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(167, 139, 250, 0.2);
                }
                
                .person-img-wrapper { position: relative; width: 100%; aspect-ratio: 1/1; overflow: hidden; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
                .person-img { 
                    width: 100%; height: 100%; object-fit: cover; 
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .person-card:hover .person-img { transform: scale(1.1); }

                .person-card-info { padding: 1.25rem; }
                .person-card-name { margin: 0; font-size: 1rem; font-weight: 800; color: white; }
                .person-card-folder { 
                    margin: 0.3rem 0 0; font-size: 0.7rem; color: rgba(255,255,255,0.35); 
                    text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
                }
                .person-card-stats {
                    margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;
                    background: rgba(167, 139, 250, 0.1); padding: 4px 10px; border-radius: 20px;
                    width: fit-content; border: 1px solid rgba(167, 139, 250, 0.2);
                }

                @media (max-width: 768px) {
                    .people-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
                    .person-card { border-radius: 18px; }
                    .person-card-info { padding: 1rem; }
                    .person-card-name { font-size: 0.85rem; }
                }
            `}</style>

            <h2><span>👥</span> IDENTIFIED_PERSONNEL</h2>

            <div className="people-grid">
                {allGroups.map((group, idx) => {
                    const r2Key = group.vault_files?.r2_key;
                    const src = r2Key ? urls[r2Key] : null;

                    return (
                        <div key={group.id || idx} className="person-card">
                            <div className="person-img-wrapper">
                                {src ? (
                                    <img
                                        src={src}
                                        alt={group.person_name}
                                        referrerPolicy="no-referrer"
                                        className="person-img"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span style={{ opacity: 0.3, fontSize: '2rem' }}>👤</span>
                                )}
                            </div>
                            <div className="person-card-info">
                                <h4 className="person-card-name">{group.person_name || 'Unknown Subject'}</h4>
                                <p className="person-card-folder">
                                    LOCATED IN {group.collectionName}
                                </p>
                                <div className="person-card-stats">
                                    <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800 }}>
                                        {group.member_file_ids?.length || 0} CAPTURES
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
