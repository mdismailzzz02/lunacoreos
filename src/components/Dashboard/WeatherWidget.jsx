import { useEffect, useState } from 'react';
import { 
    Cloud, Sun, Moon, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun, CloudMoon, MapPin, 
    Droplets, Wind, Thermometer, SunDim, Sunrise, Sunset, Search, X, Activity, Settings
} from 'lucide-react';

const CACHE_KEY = 'lunacore_weatherapi_data';
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

// WeatherAPI Condition Code Mapping
const WAPI_MAP = {
    1000: { label: 'Clear', icon: Sun, color: '#f59e0b', anim: 'weather-pulse-slow' },
    1003: { label: 'Partly cloudy', icon: CloudSun, color: '#0ea5e9', anim: 'weather-drift-slow' },
    1006: { label: 'Cloudy', icon: Cloud, color: '#64748b', anim: 'weather-drift-slow' },
    1009: { label: 'Overcast', icon: Cloud, color: '#64748b', anim: 'weather-drift-slow' },
    1030: { label: 'Mist', icon: CloudFog, color: '#94a3b8', anim: 'weather-float-slow' },
    1063: { label: 'Patchy rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1066: { label: 'Patchy snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1069: { label: 'Patchy sleet', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1072: { label: 'Patchy freezing drizzle', icon: CloudRain, color: '#0ea5e9', anim: 'weather-rain' },
    1087: { label: 'Thundery outbreaks', icon: CloudLightning, color: '#8b5cf6', anim: 'weather-flash' },
    1114: { label: 'Blowing snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1117: { label: 'Blizzard', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1135: { label: 'Fog', icon: CloudFog, color: '#94a3b8', anim: 'weather-float-slow' },
    1148: { label: 'Freezing fog', icon: CloudFog, color: '#94a3b8', anim: 'weather-float-slow' },
    1150: { label: 'Patchy light drizzle', icon: CloudRain, color: '#0ea5e9', anim: 'weather-rain' },
    1153: { label: 'Light drizzle', icon: CloudRain, color: '#0ea5e9', anim: 'weather-rain' },
    1168: { label: 'Freezing drizzle', icon: CloudRain, color: '#0ea5e9', anim: 'weather-rain' },
    1171: { label: 'Heavy freezing drizzle', icon: CloudRain, color: '#0284c7', anim: 'weather-rain' },
    1180: { label: 'Patchy light rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1183: { label: 'Light rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1186: { label: 'Moderate rain at times', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1189: { label: 'Moderate rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1192: { label: 'Heavy rain at times', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1195: { label: 'Heavy rain', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1198: { label: 'Light freezing rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1201: { label: 'Moderate freezing rain', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1204: { label: 'Light sleet', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1207: { label: 'Moderate or heavy sleet', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1210: { label: 'Patchy light snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1213: { label: 'Light snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1216: { label: 'Patchy moderate snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1219: { label: 'Moderate snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1222: { label: 'Patchy heavy snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1225: { label: 'Heavy snow', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1237: { label: 'Ice pellets', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1240: { label: 'Light rain shower', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1243: { label: 'Moderate or heavy rain shower', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1246: { label: 'Torrential rain shower', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1249: { label: 'Light sleet showers', icon: CloudRain, color: '#0d9488', anim: 'weather-rain' },
    1252: { label: 'Moderate or heavy sleet showers', icon: CloudRain, color: '#0f766e', anim: 'weather-rain-fast' },
    1255: { label: 'Light snow showers', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1258: { label: 'Moderate or heavy snow showers', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1261: { label: 'Light showers of ice pellets', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1264: { label: 'Moderate or heavy showers of ice pellets', icon: CloudSnow, color: '#93c5fd', anim: 'weather-float-slow' },
    1273: { label: 'Patchy light rain with thunder', icon: CloudLightning, color: '#8b5cf6', anim: 'weather-flash' },
    1276: { label: 'Moderate or heavy rain with thunder', icon: CloudLightning, color: '#7c3aed', anim: 'weather-flash' },
    1279: { label: 'Patchy light snow with thunder', icon: CloudLightning, color: '#8b5cf6', anim: 'weather-flash' },
    1282: { label: 'Moderate or heavy snow with thunder', icon: CloudLightning, color: '#7c3aed', anim: 'weather-flash' }
};

function getWAPI(code, conditionText, isNight) {
    let wapi = WAPI_MAP[code];
    if (!wapi) {
        wapi = { label: conditionText || 'Unknown', icon: isNight ? Moon : Sun, color: isNight ? '#94a3b8' : '#f59e0b', anim: '' };
    }
    
    // Copy the object so we don't mutate the constant map
    wapi = { ...wapi };

    if (isNight) {
        if (wapi.icon === Sun) wapi.icon = Moon;
        if (wapi.icon === CloudSun) wapi.icon = CloudMoon;
    }
    
    return wapi;
}

function getUVColor(uv) {
    if (uv <= 2) return '#22c55e';
    if (uv <= 5) return '#eab308';
    if (uv <= 7) return '#f97316';
    if (uv <= 10) return '#ef4444';
    return '#a855f7';
}

function getEPAInfo(epaIndex) {
    const map = {
        1: { label: 'Good', color: '#22c55e' },
        2: { label: 'Moderate', color: '#eab308' },
        3: { label: 'Unhealthy (Sens)', color: '#f97316' },
        4: { label: 'Unhealthy', color: '#ef4444' },
        5: { label: 'Very Unhealthy', color: '#a855f7' },
        6: { label: 'Hazardous', color: '#7f1d1d' }
    };
    return map[epaIndex] || { label: 'Unknown', color: '#94a3b8' };
}

function formatTimeOnly(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getDayName(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) return 'Today';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function WeatherWidget() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHourly, setIsHourly] = useState(true);
    
    // Search state
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadData = async (forceLoc = null) => {
            const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
            
            if (!apiKey) {
                if (mounted) {
                    setError('MISSING_KEY');
                    setLoading(false);
                }
                return;
            }

            try {
                // Check cache first if no force location
                if (!forceLoc) {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (Date.now() - parsed.timestamp < CACHE_TTL) {
                            if (mounted) { setData(parsed.data); setLoading(false); }
                            return;
                        }
                    }
                }

                setLoading(true);

                let query = 'auto:ip'; // WeatherAPI supports auto IP lookup!
                
                if (forceLoc) {
                    query = `${forceLoc.lat},${forceLoc.lon}`;
                } else {
                    const locPref = localStorage.getItem('lunacore_weather_loc');
                    if (locPref) {
                        const p = JSON.parse(locPref);
                        query = `${p.lat},${p.lon}`;
                    }
                }

                const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${query}&days=7&aqi=yes&alerts=no`;
                const res = await fetch(url);
                
                if (!res.ok) throw new Error('WeatherAPI returned error');
                
                const json = await res.json();

                if (mounted && json) {
                    setData(json);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: json }));
                }
            } catch (err) {
                console.error('Weather error:', err);
                if (mounted) setError('FETCH_ERROR');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => { mounted = false; };
    }, []);

    const handleSearch = async (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.length < 3) { setSearchResults([]); return; }
        
        const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
        if (!apiKey) return;

        setSearching(true);
        try {
            const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(val)}`);
            const json = await res.json();
            setSearchResults(json || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const selectLocation = (loc) => {
        setSearchMode(false);
        setSearchQuery('');
        setSearchResults([]);
        localStorage.setItem('lunacore_weather_loc', JSON.stringify({ lat: loc.lat, lon: loc.lon, name: loc.name }));
        localStorage.removeItem(CACHE_KEY);
        window.location.reload(); 
    };

    if (error === 'MISSING_KEY') {
        return (
            <div className="dashboard-card" style={{ height: '350px', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '50%', color: '#f59e0b' }}>
                    <Settings size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>WeatherAPI Key Required</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
                    We switched to the highly accurate <strong>WeatherAPI.com</strong> model. Please add <code style={{ color: 'var(--accent)', background: 'var(--surface-light)', padding: '2px 6px', borderRadius: '4px' }}>VITE_WEATHERAPI_KEY</code> to your .env file to enable this widget.
                </p>
            </div>
        );
    }

    if (loading && !data) return <div className="dashboard-card pulse" style={{ height: '350px', gridColumn: 'span 2' }}></div>;
    if (!data) return <div className="dashboard-card" style={{ height: '150px', gridColumn: 'span 2' }}>Weather unavailable.</div>;

    const { current, forecast, location } = data;
    const isNight = current.is_day === 0;
    const wapi = getWAPI(current.condition.code, current.condition.text, isNight);
    const PrimaryIcon = wapi.icon;
    
    // Time-of-day gradient (WeatherAPI provides is_day flag!)
    const bgGradient = isNight 
        ? `linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(${hexToRgb(wapi.color)}, 0.05) 100%)`
        : `linear-gradient(135deg, rgba(${hexToRgb(wapi.color)}, 0.1) 0%, rgba(15, 23, 42, 0.2) 100%)`;

    // Quick Stats Logic
    const tempDelta = Math.abs(current.feelslike_c - current.temp_c);
    const showFeelsLike = tempDelta >= 2;

    // Hourly parse (next 8 hours across multiple days if needed)
    const allHours = forecast.forecastday.flatMap(d => d.hour);
    const nowIdx = allHours.findIndex(h => new Date(h.time).getTime() > Date.now()) - 1;
    const safeIdx = Math.max(0, nowIdx);
    const nextHours = allHours.slice(safeIdx, safeIdx + 8).map(h => ({
        time: h.time,
        temp: h.temp_c,
        code: h.condition.code,
        isNight: h.is_day === 0
    }));

    // Daily parse
    const nextDays = forecast.forecastday.map(d => ({
        time: d.date,
        high: d.day.maxtemp_c,
        low: d.day.mintemp_c,
        code: d.day.condition.code
    }));

    const aqi = current.air_quality && current.air_quality['us-epa-index'] ? current.air_quality['us-epa-index'] : null;

    return (
        <div className="dashboard-card fade-in weather-widget" style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem', 
            position: 'relative', 
            overflow: 'hidden',
            background: bgGradient,
            transition: 'all 0.5s ease',
            height: '100%',
            gridColumn: 'span 2' 
        }}>
            {/* SEARCH OVERLAY */}
            {searchMode && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', zIndex: 50, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input 
                            autoFocus
                            placeholder="Search city..." 
                            value={searchQuery}
                            onChange={handleSearch}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }}
                        />
                        <button onClick={() => setSearchMode(false)} className="btn-icon" style={{ background: 'transparent' }}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                        {searching && <span style={{ color: 'var(--text-muted)' }}>Searching...</span>}
                        {searchResults.map((r, i) => (
                            <div key={i} onClick={() => selectLocation(r)} className="interactive-scale" style={{ padding: '12px', background: 'var(--surface-light)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600 }}>{r.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.region || r.country}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TIER 1: HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="icon-backdrop" style={{ background: `rgba(${hexToRgb(wapi.color)}, 0.15)`, color: wapi.color }}>
                            <Cloud size={16} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Weather</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '-2px' }}>
                            {Math.round(current.temp_c)}°<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', verticalAlign: 'top' }}>C</span>
                        </div>
                        <div style={{ fontSize: '1.1rem', color: wapi.color, marginTop: '8px', fontWeight: '700' }}>
                            {wapi.label}
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                    <div className="interactive-scale" onClick={() => setSearchMode(true)} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '6px 10px', background: 'var(--surface-light)', borderRadius: '20px' }}>
                        <MapPin size={12} /> {location.name}
                    </div>
                    <div className={wapi.anim} style={{ color: wapi.color, filter: `drop-shadow(0 0 20px ${wapi.color}66)`, marginTop: '10px' }}>
                        <PrimaryIcon size={64} strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* TIER 2: QUICK STATS */}
            <div style={{ display: 'flex', gap: '1rem', zIndex: 1, flexWrap: 'wrap' }}>
                {showFeelsLike && (
                    <div className="weather-chip tooltip-trigger" title="Feels Like">
                        <Thermometer size={14} /> {Math.round(current.feelslike_c)}°
                    </div>
                )}
                <div className="weather-chip tooltip-trigger" title="Humidity">
                    <Droplets size={14} /> {current.humidity}%
                </div>
                <div className="weather-chip tooltip-trigger" title={`Wind: ${current.wind_kph} km/h`}>
                    <Wind size={14} /> 
                    <span style={{ display: 'inline-block', transform: `rotate(${current.wind_dir}deg)`, transition: 'transform 1s' }}>↑</span> 
                    {Math.round(current.wind_kph)} km/h
                </div>
                <div className="weather-chip tooltip-trigger" title="UV Index">
                    <SunDim size={14} /> 
                    <span style={{ color: getUVColor(current.uv), fontWeight: 800 }}>
                        {current.uv.toFixed(1)}
                    </span>
                </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>

            {/* TIER 3: FORECAST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setIsHourly(true)} style={{ background: 'none', border: 'none', color: isHourly ? 'var(--text)' : 'var(--text-muted)', fontWeight: isHourly ? 800 : 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}>Hourly</button>
                    <button onClick={() => setIsHourly(false)} style={{ background: 'none', border: 'none', color: !isHourly ? 'var(--text)' : 'var(--text-muted)', fontWeight: !isHourly ? 800 : 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}>7-Day</button>
                </div>

                <div style={{ position: 'relative', height: '90px' }}>
                    {/* HOURLY */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '8px', opacity: isHourly ? 1 : 0, pointerEvents: isHourly ? 'auto' : 'none', transition: 'opacity 0.3s ease' }} className="hide-scrollbar">
                        {nextHours.map((h, i) => {
                            const hw = getWAPI(h.code, null, h.isNight);
                            const HIcon = hw.icon;
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '50px', opacity: i === 0 ? 1 : 0.7 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: i===0 ? 800 : 600, color: i===0 ? 'var(--accent)' : 'var(--text-muted)' }}>{i === 0 ? 'Now' : formatTimeOnly(h.time)}</span>
                                    <HIcon size={20} color={hw.color} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.round(h.temp)}°</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* 7-DAY */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '8px', opacity: !isHourly ? 1 : 0, pointerEvents: !isHourly ? 'auto' : 'none', transition: 'opacity 0.3s ease' }} className="hide-scrollbar">
                        {nextDays.map((d, i) => {
                            const dw = getWAPI(d.code);
                            const DIcon = dw.icon;
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '60px', opacity: i === 0 ? 1 : 0.7 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: i===0 ? 800 : 600, color: i===0 ? 'var(--accent)' : 'var(--text-muted)' }}>{getDayName(d.time)}</span>
                                    <DIcon size={20} color={dw.color} />
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: '4px' }}>
                                        <span>{Math.round(d.high)}°</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{Math.round(d.low)}°</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* TIER 4: FOOTER (Sun / AQI) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '12px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Sunrise size={14} color="#f59e0b" /> {forecast.forecastday[0].astro.sunrise}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Sunset size={14} color="#f97316" /> {forecast.forecastday[0].astro.sunset}
                    </div>
                </div>
                
                {aqi !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>AQI</span>
                        <div style={{ background: `${getEPAInfo(aqi).color}22`, color: getEPAInfo(aqi).color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                             {getEPAInfo(aqi).label}
                        </div>
                    </div>
                )}
            </div>

            {/* GHOST ICON */}
            <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.04, pointerEvents: 'none', color: wapi.color, zIndex: 0 }}>
                <PrimaryIcon size={240} />
            </div>

        </div>
    );
}

// Helper
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}
