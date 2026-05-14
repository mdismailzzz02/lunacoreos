import React, { useState, useEffect } from 'react';
import { getFaceGroups } from '../../services/api';

/**
 * PeopleView Component
 * Aggregates all saved face groups from all folders.
 */
export default function PeopleView({ folders }) {
    const [allGroups, setAllGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // Fetch groups for each folder in parallel
                const promises = folders.map(f => getFaceGroups(f.folderId));
                const responses = await Promise.all(promises);

                const combined = [];
                responses.forEach((res, i) => {
                    const folderGroups = res.data?.groups || [];
                    folderGroups.forEach(g => {
                        combined.push({
                            ...g,
                            folderName: folders[i].name
                        });
                    });
                });

                // Group by label/name if possible, otherwise keep separate
                setAllGroups(combined);
            } catch (e) {
                console.error('Failed to load combined people view:', e);
            } finally {
                setLoading(false);
            }
        };
        if (folders.length > 0) loadAll();
        else setLoading(false);
    }, [folders]);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Loading people...</div>;

    if (allGroups.length === 0) return (
        <div className="empty-state">
            <div className="empty-emoji">👥</div>
            <p>No people identified yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                Open a folder and click "Scan Faces" to start grouping.
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
                    border-color: rgba(167, 139, 250, 0.4);
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(167, 139, 250, 0.1);
                }
                
                .person-img-wrapper { position: relative; width: 100%; aspectRatio: 1/1; overflow: hidden; }
                .person-img { 
                    width: 100%; height: 100%; object-fit: cover; 
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .person-card:hover .person-img { transform: scale(1.1); }

                .person-card-info { padding: 1.25rem; }
                .person-card-name { margin: 0; fontSize: 1rem; fontWeight: 800; color: white; }
                .person-card-folder { 
                    margin: 0.3rem 0 0; fontSize: 0.7rem; color: rgba(255,255,255,0.35); 
                    textTransform: uppercase; letterSpacing: 0.1em; fontWeight: 600;
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
                {allGroups.map((group, idx) => (
                    <div key={idx} className="person-card">
                        <div className="person-img-wrapper">
                            <img
                                src={`https://drive.google.com/thumbnail?id=${group.coverImageId}&sz=w400`}
                                alt={group.label}
                                referrerPolicy="no-referrer"
                                className="person-img"
                            />
                        </div>
                        <div className="person-card-info">
                            <h4 className="person-card-name">{group.label || 'Unknown Subject'}</h4>
                            <p className="person-card-folder">
                                LOCATED IN {group.folderName}
                            </p>
                            <div className="person-card-stats">
                                <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800 }}>
                                    {group.memberImageIds.length} CAPTURES
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
