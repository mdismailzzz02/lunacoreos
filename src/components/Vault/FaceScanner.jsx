import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { getVaultFiles, getR2PresignedGet } from '../../services/api';

/**
 * FaceScanner Component
 * Handles ML model loading, image processing, and face clustering via R2.
 */
export default function FaceScanner({ collectionId, images, onComplete, onCancel }) {
    const [status, setStatus] = useState('loading'); // loading | ready | fetching | scanning | clustering | complete
    const [progress, setProgress] = useState(0);
    const [discoveryCount, setDiscoveryCount] = useState(0);
    const [batchesChecked, setBatchesChecked] = useState(0);
    const [faceDetectedCount, setFaceDetectedCount] = useState(0);
    const [log, setLog] = useState('Initializing face-api.js...');

    const [results, setResults] = useState(null);
    const abortRef = useRef(false);

    // 1. Load Models on Mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                setLog('Loading neural networks (SSD Mobilenet, Landmark, Descriptor)...');
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setStatus('ready');
                setLog('Scanner ready.');
            } catch (err) {
                console.error('Face API model load failed:', err);
                setLog('Error loading models. Check your internet connection.');
            }
        };
        loadModels();
        return () => { abortRef.current = true; };
    }, []);

    const startQuickScan = () => {
        // images passed from GooglePhotos (only current page, usually up to 50)
        startScan(images.filter(img => img.mime_type?.startsWith('image/')));
    };

    const startDeepScan = async () => {
        setStatus('fetching');
        setLog('Searching for every image in the collection...');
        let allMedia = [];
        let page = 1;
        let hasMore = true;

        try {
            while (hasMore) {
                if (abortRef.current) return;
                setBatchesChecked(page);
                setLog(`Fetching page ${page}... (${allMedia.length} found)`);

                const res = await getVaultFiles(collectionId, page, 50);
                const items = res.files || [];
                hasMore = res.hasMore;

                const imagesOnly = items.filter(i => i.mime_type?.startsWith('image/'));
                allMedia = [...allMedia, ...imagesOnly];
                setDiscoveryCount(allMedia.length);
                page++;
            }

            setLog(`Found ${allMedia.length} images. Starting scan...`);
            startScan(allMedia);
        } catch (err) {
            console.error('Deep fetch failed:', err);
            setLog('Error fetching images. Try Quick Scan?');
            setStatus('ready');
        }
    };

    const startScan = async (scanItems) => {
        setStatus('scanning');
        const descriptorsFound = [];
        const CONCURRENCY = 3; // Reduced to 3 to ease R2 presign + CPU load
        let completedCount = 0;

        // Helper to process a single image
        const processImage = async (imgData) => {
            if (abortRef.current) return;
            try {
                // Fetch presigned URL just-in-time so it doesn't expire during long scans
                const { url } = await getR2PresignedGet(imgData.r2_key);
                const img = await faceapi.fetchImage(url);
                const detections = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0) {
                    setFaceDetectedCount(prev => prev + detections.length);
                    detections.forEach(det => {
                        descriptorsFound.push({
                            imageId: imgData.id,
                            r2_key: imgData.r2_key,
                            descriptor: Array.from(det.descriptor) // convert Float32Array to normal array for DB
                        });
                    });
                }
            } catch (e) {
                console.warn('Failed to process image:', imgData.id, e);
            } finally {
                completedCount++;
                setProgress(Math.round((completedCount / scanItems.length) * 100));
                setLog(`Scanning faces: ${completedCount}/${scanItems.length} images processed`);
            }
        };

        // Run images in parallel batches
        for (let i = 0; i < scanItems.length; i += CONCURRENCY) {
            if (abortRef.current) return;
            const batch = scanItems.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(item => processImage(item)));
        }

        if (abortRef.current) return;
        setLog(`Clustering ${descriptorsFound.length} faces...`);
        setStatus('clustering');

        const groups = clusterFaces(descriptorsFound);
        setResults(groups);
        setStatus('complete');
        setLog(`Identified ${groups.length} distinct people!`);
    };

    const clusterFaces = (faces) => {
        const groups = [];
        const threshold = 0.55;

        faces.forEach(face => {
            let matchedGroup = null;
            // Re-convert arrays back to Float32Array for faceapi distance calc
            const f32Desc = new Float32Array(face.descriptor);
            
            for (const group of groups) {
                const g32Desc = new Float32Array(group.members[0].descriptor);
                const distance = faceapi.euclideanDistance(f32Desc, g32Desc);
                if (distance < threshold) {
                    matchedGroup = group;
                    break;
                }
            }

            if (matchedGroup) {
                matchedGroup.members.push(face);
            } else {
                groups.push({
                    id: 'GROUP-' + (groups.length + 1),
                    members: [face]
                });
            }
        });

        // Format for FaceGroupsView
        return groups.map(g => ({
            groupId: g.id, // temporary client-side ID
            label: '(unknown)',
            coverImageId: g.members[0].imageId,
            coverR2Key: g.members[0].r2_key,
            memberImageIds: [...new Set(g.members.map(m => m.imageId))],
            descriptor_centroid: g.members[0].descriptor, // use first member's descriptor as centroid for now
            _members: g.members.map(m => ({ id: m.imageId, r2_key: m.r2_key }))
        }));
    };

    return (
        <div className="face-scanner-container">
            <style>{`
                .face-scanner-container {
                    padding: 2.5rem; background: var(--bg-card, #1e1e30); borderRadius: 24px;
                    border: 1px solid rgba(255,255,255,0.1); textAlign: center; maxWidth: 600px; margin: 0 auto;
                }
                .scan-modes { display: flex; gap: 1rem; justifyContent: center; flexWrap: wrap; }
                .scan-card { flex: 1; min-width: 150px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); borderRadius: 16px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; }
                .scan-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.08); }
                .scan-card-deep { background: rgba(167,139,250,0.1) !important; border: 1px solid rgba(167,139,250,0.3) !important; }
                .scan-card-deep:hover { background: rgba(167,139,250,0.2) !important; }
                
                @media (max-width: 768px) {
                    .face-scanner-container { padding: 1.5rem 1rem; border-radius: 16px; }
                    .face-scanner-container h3 { font-size: 1.2rem !important; }
                    .scan-modes { flex-direction: column; }
                    .scan-card { min-width: 100%; padding: 1rem; display: flex; align-items: center; text-align: left; gap: 1rem; }
                    .scan-card div:first-child { font-size: 1.2rem !important; margin-bottom: 0 !important; }
                    .scan-card h4 { font-size: 0.85rem !important; }
                    .scan-card p { margin-top: 0 !important; }
                }
                
                @keyframes loading-slide {
                    0% { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
            `}</style>
            
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.4rem' }}>🧬 AI Face Recognition</h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', minHeight: '3em' }}>
                {log}
            </p>

            {(status === 'fetching' || status === 'scanning' || status === 'clustering') && (
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
                        <div style={{
                            width: (status === 'fetching' || status === 'clustering') ? '100%' : `${progress}%`,
                            height: '100%',
                            background: (status === 'fetching' || status === 'clustering')
                                ? 'linear-gradient(90deg, #a78bfa 0%, #7c3aed 50%, #a78bfa 100%)'
                                : 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                            backgroundSize: '200% 100%',
                            transition: 'width 0.3s ease',
                            animation: (status === 'fetching' || status === 'clustering') ? 'loading-slide 2s linear infinite' : 'none'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {status === 'fetching' ? `Discovery Phase...` :
                                status === 'scanning' ? `Scanning... (${faceDetectedCount} faces)` :
                                    status === 'clustering' ? 'Grouping...' : `${progress}% SCANNED`}
                        </span>
                    </div>
                </div>
            )}

            <div className="scan-modes">
                {status === 'ready' && (
                    <>
                        <div onClick={startQuickScan} className="scan-card">
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Quick Scan</h4>
                                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Loaded {images.filter(i=>i.mime_type?.startsWith('image/')).length} images</p>
                            </div>
                        </div>

                        <div onClick={startDeepScan} className="scan-card scan-card-deep">
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛸</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Deep Scan</h4>
                                <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Entire collection</p>
                            </div>
                        </div>
                    </>
                )}
                {status === 'complete' && (
                    <button style={{ padding: '0.75rem 2rem', background: '#a78bfa', color: '#1a1a2e', borderRadius: '12px', border: 'none', fontWeight: 800, cursor: 'pointer' }} onClick={() => onComplete(results)}>
                        View Results
                    </button>
                )}
                {(status === 'ready' || status === 'complete') && (
                    <button style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', marginLeft: '10px' }} onClick={onCancel}>
                        {status === 'complete' ? 'Discard' : 'Cancel'}
                    </button>
                )}
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                Powered by face-api.js. Client-side processing only.
            </p>
        </div>
    );
}
