import { useEffect, useState, useRef } from 'react';
import * as api from '../../services/api';

export default function LifeMapPage() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [pins, setPins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [selectedPos, setSelectedPos] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', emoji: '📍', color: '#ff4757' });

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        // Initialize Map
        if (!window.L) return;

        mapInstance.current = window.L.map(mapRef.current).setView([20, 0], 2);

        window.L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance.current);

        mapInstance.current.on('click', (e) => {
            setSelectedPos(e.latlng);
            setShowAdd(true);
        });

        // Load pins
        loadPins();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
            }
        };
    }, []);

    const loadPins = async () => {
        try {
            const data = await api.getLifeMap();
            setPins(data || []);
            renderPins(data || []);
        } catch (err) {
            console.error('Failed to load pins', err);
        } finally {
            setLoading(false);
        }
    };

    const renderPins = (items) => {
        if (!mapInstance.current || !window.L) return;

        // Clear existing markers (cheap way for small data)
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof window.L.Marker) {
                mapInstance.current.removeLayer(layer);
            }
        });

        items.forEach(pin => {
            const icon = window.L.divIcon({
                html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${pin.emoji || '📍'}</div>`,
                className: 'custom-div-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            window.L.marker([pin.lat, pin.lng], { icon })
                .addTo(mapInstance.current)
                .bindPopup(`
                    <div style="color: black; min-width: 150px;">
                        <h3 style="margin: 0 0 5px 0">${pin.title}</h3>
                        <p style="margin: 0; font-size: 0.9rem; color: #555;">${pin.description}</p>
                        <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">${new Date(pin.date).toLocaleDateString()}</div>
                    </div>
                `);
        });
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const goToLocation = (item) => {
        if (!mapInstance.current) return;
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        mapInstance.current.setView([lat, lon], 13);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const newPin = {
            id: Date.now().toString(),
            ...formData,
            lat: selectedPos.lat,
            lng: selectedPos.lng,
            date: new Date().toISOString()
        };

        try {
            await api.saveLifeMap(newPin);
            const updated = [...pins, newPin];
            setPins(updated);
            renderPins(updated);
            setShowAdd(false);
            setFormData({ title: '', description: '', emoji: '📍', color: '#ff4757' });
        } catch (err) {
            alert('Failed to save pin');
        }
    };

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🗺️ Life Map</h1>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Search for a place or click to pin a memory</p>
                </div>
            </div>

            <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                {/* Search Bar Overlay */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50px',
                    zIndex: 1000,
                    width: '300px',
                    pointerEvents: 'auto'
                }}>
                    <input
                        type="text"
                        placeholder="Search for a location..."
                        value={searchQuery}
                        onChange={handleSearch}
                        style={{
                            width: '100%',
                            padding: '0.8rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(22, 33, 62, 0.9)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    />
                    {searchResults.length > 0 && (
                        <div style={{
                            marginTop: '5px',
                            background: 'rgba(22, 33, 62, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}>
                            {searchResults.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => goToLocation(item)}
                                    style={{
                                        padding: '0.8rem 1rem',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        borderBottom: i === searchResults.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                        transition: 'background 0.2s',
                                        color: 'white'
                                    }}
                                    className="search-result-item"
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {item.display_name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div ref={mapRef} style={{ height: '100%', width: '100%', background: '#1a1a1a' }} />

                {(loading || searching) && (
                    <div style={{ position: 'absolute', inset: 0, background: loading ? 'rgba(0,0,0,0.5)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, pointerEvents: 'none' }}>
                        <div className="spinner" />
                    </div>
                )}
            </div>

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '20px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>Add Memory</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Emoji (📍)"
                                    style={{ width: '60px', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }}
                                    value={formData.emoji}
                                    onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Title"
                                    required
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <textarea
                                placeholder="Description"
                                rows={3}
                                style={{ padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'none' }}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Save Pin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
