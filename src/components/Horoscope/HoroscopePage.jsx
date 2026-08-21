import { useState, useEffect } from 'react';
import {
    fetchNatalChart, fetchNatalSvg, fetchDailyHoroscope,
    fetchMoonPhase, fetchVedicChart, fetchNumerology,
    fetchDailySignHoroscope,
} from './HoroscopeService';
import PortraitTab from './PortraitTab';

// 3-letter sign abbreviation → full name (for natal chart response)
const SIGN_FULL = {
    Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
    Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
    Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};
function fullSign(s) { return SIGN_FULL[s] || s || '—'; }

const SIGN_EMOJI = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const MOON_PHASES = {
    'New Moon': '🌑', 'Waxing Crescent': '🌒', 'First Quarter': '🌓',
    'Waxing Gibbous': '🌔', 'Full Moon': '🌕', 'Waning Gibbous': '🌖',
    'Last Quarter': '🌗', 'Waning Crescent': '🌘',
};

const PLANET_COLORS = {
    Sun: '#f59e0b', Moon: '#94a3b8', Mercury: '#22c55e', Venus: '#ec4899',
    Mars: '#ef4444', Jupiter: '#f97316', Saturn: '#8b5cf6', Uranus: '#0ea5e9',
    Neptune: '#6366f1', Pluto: '#78716c', 'North Node': '#a78bfa', Chiron: '#34d399',
    Lilith: '#fb7185',
};

const NUM_COLORS = ['#f59e0b', '#ec4899', '#0ea5e9', '#22c55e', '#8b5cf6', '#f97316', '#ef4444', '#94a3b8', '#6366f1'];

const ASPECT_COLORS = { conjunction: '#f59e0b', opposition: '#ef4444', square: '#f97316', trine: '#22c55e', sextile: '#0ea5e9' };

// ── Shared helpers ────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }) {
    return (
        <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color }}>{value}</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 1.2s ease' }} />
            </div>
        </div>
    );
}

function Chip({ label, value, color = 'var(--accent)' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'var(--surface-light)', borderRadius: '12px', padding: '12px 16px', border: `1px solid ${color}33`, minWidth: '90px' }}>
            <span style={{ fontSize: '1.1rem' }}>{SIGN_EMOJI[value] || '✨'}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{value}</span>
        </div>
    );
}

function SectionHeader({ icon, title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>{title}</h2>
        </div>
    );
}

function LoadingCard({ height = '200px' }) {
    return <div className="dashboard-card" style={{ height, borderRadius: '16px', marginBottom: '1.2rem', opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }}></div>;
}

function ErrorCard({ message }) {
    return (
        <div className="dashboard-card" style={{ padding: '1.2rem', borderRadius: '16px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.2rem', borderLeft: '3px solid #ef4444' }}>
            ⚠️ {message}
        </div>
    );
}

// ── Tab list ──────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: '✨ Today' },
    { id: 'moon', label: '🌕 Moon' },
    { id: 'natal', label: '🌟 Western' },
    { id: 'vedic', label: '🕉️ Vedic' },
    { id: 'numerology', label: '🔢 Numbers' },
    { id: 'portrait', label: '👤 Portrait' },
];

// ── Today Tab ─────────────────────────────────────────────────────────────────
function TodayTab() {
    const [signDaily, setSignDaily] = useState(null);
    const [personal, setPersonal] = useState(null);
    const [natal, setNatal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        Promise.all([fetchDailySignHoroscope(), fetchDailyHoroscope(), fetchNatalChart()])
            .then(([s, p, n]) => { if (mounted) { setSignDaily(s); setPersonal(p); setNatal(n); setLoading(false); } })
            .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
        return () => { mounted = false; };
    }, []);

    if (loading) return <><LoadingCard height="180px" /><LoadingCard height="220px" /><LoadingCard height="160px" /></>;
    if (error) return <ErrorCard message={error} />;

    // Daily sign response: data.content.text, data.scores, data.lucky, data.astro
    const sd = signDaily?.data || signDaily;
    const scores = sd?.scores;
    const content = sd?.content;
    const lucky = sd?.lucky;
    const astro = sd?.astro;

    // Personal V3 response: data.data.scores, active_windows
    const pd = personal?.data || personal;
    const windows = pd?.personal?.active_windows || pd?.active_windows || [];
    const nextShift = pd?.personal?.next_shift || pd?.next_shift;
    const dominant = pd?.personal?.dominant_topics?.[0] || pd?.dominant_topics?.[0];

    // Natal Big Three
    const planets = natal?.planets || [];
    const find = (name) => planets.find(p => p.name === name || p.id === name.toLowerCase());
    const sunSign = fullSign(find('Sun')?.sign);
    const moonSign = fullSign(find('Moon')?.sign);
    const rising = fullSign(natal?.angles_details?.asc?.sign || '—');

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div>
            {/* Date + sign strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{today}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[['☀️', sunSign], ['🌙', moonSign], ['⬆️', rising]].map(([icon, val]) => (
                        <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-light)', borderRadius: '20px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {icon} {val}
                        </div>
                    ))}
                </div>
            </div>

            {/* Plain text horoscope */}
            {content?.text && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem', borderLeft: '3px solid #f59e0b' }}>
                    <SectionHeader icon="📖" title="Daily Reading · Aries" />
                    <p style={{ margin: 0, lineHeight: 1.9, fontSize: '1rem', color: 'var(--text)' }}>{content.text}</p>
                    {content.theme && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '20px' }}>🎯 {content.theme}</span>
                            {content.keywords?.map(k => (
                                <span key={k} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--surface-light)', padding: '4px 10px', borderRadius: '20px' }}>{k}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Moon sign context */}
            {astro?.moon_sign && (
                <div className="dashboard-card fade-in" style={{ padding: '1rem 1.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, rgba(148,163,184,0.06) 0%, transparent 100%)' }}>
                    <span style={{ fontSize: '2.2rem' }}>{MOON_PHASES[astro.moon_phase?.key || astro.moon_phase?.label || astro.moon_phase] || '🌙'}</span>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cosmic Context</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>Moon in {astro.moon_sign?.label || astro.moon_sign} · {astro.moon_phase?.label || astro.moon_phase}</div>
                        {astro.highlights?.length > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{astro.highlights[0]?.label || astro.highlights[0]}</div>}
                    </div>
                </div>
            )}

            {/* Score bars */}
            {scores && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="📊" title="Today's Scores" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {[['Overall', scores.overall, '#f59e0b'], ['Love', scores.love, '#ec4899'], ['Career', scores.career, '#22c55e'], ['Money', scores.money, '#0ea5e9'], ['Health', scores.health, '#ef4444']].map(([label, val, color]) => val != null && (
                            <ScoreBar key={label} label={label} value={val} color={color} />
                        ))}
                    </div>
                </div>
            )}

            {/* Lucky */}
            {lucky && (
                <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <SectionHeader icon="🍀" title="Lucky Today" />
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {lucky.number != null && (
                            <div style={{ textAlign: 'center', background: 'var(--surface-light)', borderRadius: '12px', padding: '10px 18px' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Number</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{lucky.number}</div>
                            </div>
                        )}
                        {lucky.color?.label && (
                            <div style={{ textAlign: 'center', background: 'var(--surface-light)', borderRadius: '12px', padding: '10px 18px' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Color</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>🎨 {lucky.color.label}</div>
                            </div>
                        )}
                        {lucky.time_window?.display && (
                            <div style={{ textAlign: 'center', background: 'var(--surface-light)', borderRadius: '12px', padding: '10px 18px' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Peak Time</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>⏰ {lucky.time_window.display}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Active transits */}
            {windows.length > 0 && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="🌌" title="Active Transits" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {windows.slice(0, 6).map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'var(--surface-light)', borderRadius: '10px', borderLeft: `3px solid ${ASPECT_COLORS[w.aspect_type] || '#6366f1'}` }}>
                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{w.label}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px' }}>{w.aspect_type}</span>
                            </div>
                        ))}
                    </div>
                    {(nextShift || dominant) && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {nextShift && <div style={{ fontSize: '0.78rem', color: '#0ea5e9', fontWeight: 600 }}>⏭ Next shift: {nextShift.label}</div>}
                            {dominant && <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>🔥 Focus: {dominant.title}</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Moon Tab ──────────────────────────────────────────────────────────────────
function MoonTab() {
    const [moon, setMoon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchMoonPhase()
            .then(m => { if (mounted) { setMoon(m); setLoading(false); } })
            .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
        return () => { mounted = false; };
    }, []);

    if (loading) return <><LoadingCard height="180px" /><LoadingCard height="300px" /></>;
    if (error) return <ErrorCard message={error} />;

    const phase = moon?.phase;
    const zodiac = moon?.zodiac;
    const nextPhases = moon?.next_phases;
    const special = moon?.special_moon || moon?.eclipse;
    const illumPct = phase?.illumination != null ? Math.round(phase.illumination * 100) : null;

    const upcomingPhases = nextPhases ? [
        { label: 'Full Moon', icon: '🌕', date: nextPhases.full_moon },
        { label: 'Last Quarter', icon: '🌗', date: nextPhases.last_quarter },
        { label: 'New Moon', icon: '🌑', date: nextPhases.new_moon },
        { label: 'First Quarter', icon: '🌓', date: nextPhases.first_quarter },
    ].filter(p => p.date).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    return (
        <div>
            {/* Big Moon Hero */}
            <div className="dashboard-card fade-in" style={{ padding: '2rem', marginBottom: '1.2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(100,116,139,0.04) 100%)' }}>
                <div style={{ fontSize: '6rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 30px rgba(148,163,184,0.3))', display: 'inline-block', animation: 'weather-float-slow 8s ease-in-out infinite' }}>
                    {MOON_PHASES[phase?.name] || '🌕'}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '4px' }}>{phase?.name || 'Moon Phase'}</div>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                    {illumPct != null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#94a3b8' }}>{illumPct}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Illuminated</div>
                        </div>
                    )}
                    {phase?.age_days != null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8b5cf6' }}>{phase.age_days.toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Days Old</div>
                        </div>
                    )}
                    {phase?.distance_km != null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0ea5e9' }}>{Math.round(phase.distance_km / 1000)}K</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>km Away</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Zodiac sign */}
            {zodiac && (
                <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>{SIGN_EMOJI[zodiac.sign] || '⭐'}</span>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Moon Sign (Tropical)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Moon in {zodiac.sign}</div>
                        {zodiac.degree != null && <div style={{ fontSize: '0.8rem', color: '#8b5cf6', fontFamily: 'monospace' }}>{zodiac.degree.toFixed(2)}°</div>}
                    </div>
                </div>
            )}

            {/* Upcoming phases calendar */}
            {upcomingPhases.length > 0 && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="📅" title="Upcoming Moon Phases" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {upcomingPhases.map((p, i) => {
                            const d = new Date(p.date);
                            const daysUntil = Math.round((d - new Date()) / 86400000);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: 'var(--surface-light)', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '1.6rem' }}>{p.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: daysUntil <= 3 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 700 }}>
                                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Eclipse / Special */}
            {special && (
                <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="🌒" title="Special Events" />
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[['Supermoon', special.is_supermoon], ['Blood Moon', special.is_blood_moon], ['Blue Moon', special.is_blue_moon], ['Micromoon', special.is_micromoon]].filter(([, v]) => v).map(([label]) => (
                            <span key={label} style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(139,92,246,0.3)' }}>✨ {label}</span>
                        ))}
                        {!['is_supermoon', 'is_blood_moon', 'is_blue_moon', 'is_micromoon'].some(k => special[k]) && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No special moon events this phase.</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Natal Chart Tab ───────────────────────────────────────────────────────────
function NatalTab() {
    const [natal, setNatal] = useState(null);
    const [svg, setSvg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        Promise.all([fetchNatalChart(), fetchNatalSvg().catch(() => null)])
            .then(([n, s]) => { if (mounted) { setNatal(n); setSvg(s); setLoading(false); } })
            .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
        return () => { mounted = false; };
    }, []);

    if (loading) return <><LoadingCard height="400px" /><LoadingCard height="300px" /></>;
    if (error) return <ErrorCard message={error} />;

    const planets = natal?.planets || [];

    return (
        <div>
            {/* SVG Chart Wheel */}
            {svg?.svg && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="🔵" title="Natal Chart Wheel" />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '480px', aspectRatio: '1/1' }} dangerouslySetInnerHTML={{ __html: svg.svg }} />
                    </div>
                </div>
            )}

            {/* Planet Positions */}
            {planets.length > 0 && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="🪐" title="Planet Positions" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {planets.map((p, i) => {
                            const name = p.name;
                            const sign = fullSign(p.sign);
                            const deg = p.pos != null ? `${parseFloat(p.pos).toFixed(1)}°` : '';
                            const color = PLANET_COLORS[name] || '#94a3b8';
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--surface-light)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
                                    <span style={{ fontWeight: 800, color, minWidth: '78px', fontSize: '0.88rem' }}>{name}</span>
                                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{SIGN_EMOJI[sign] || ''} {sign}</span>
                                    {deg && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{deg}</span>}
                                    {p.house != null && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>H{p.house}</span>}
                                    {p.retrograde && <span style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 800 }}>℞</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Angles */}
            {natal?.angles_details && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="📐" title="Chart Angles" />
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[['ASC (Rising)', natal.angles_details.asc, '#0ea5e9'], ['MC (Career)', natal.angles_details.mc, '#22c55e'], ['DSC', natal.angles_details.dc, '#ec4899'], ['IC', natal.angles_details.ic, '#f97316']].map(([label, angle, color]) => angle && (
                            <Chip key={label} label={label} value={fullSign(angle.sign)} color={color} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Vedic Tab ─────────────────────────────────────────────────────────────────
function VedicTab() {
    const [vedic, setVedic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchVedicChart()
            .then(d => { if (mounted) { setVedic(d); setLoading(false); } })
            .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
        return () => { mounted = false; };
    }, []);

    if (loading) return <LoadingCard height="400px" />;
    if (error) return <ErrorCard message={error} />;

    const planets = vedic?.planets || [];
    const lagna = vedic?.lagna || vedic?.ascendant;
    const moon = planets.find(p => p.name === 'Moon' || p.id === 'moon');

    return (
        <div>
            <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                <SectionHeader icon="🕉️" title="Vedic Identity" />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {lagna && <Chip label="Lagna (Rising)" value={fullSign(lagna?.sign || lagna?.sign_name || lagna)} color="#f59e0b" />}
                    {moon && <Chip label="Rashi (Moon)" value={fullSign(moon.sign)} color="#94a3b8" />}
                    {moon?.nakshatra && <Chip label="Nakshatra" value={moon.nakshatra} color="#8b5cf6" />}
                    {moon?.nakshatra_pada && <Chip label="Pada" value={`Pada ${moon.nakshatra_pada}`} color="#0ea5e9" />}
                </div>
            </div>

            {planets.length > 0 && (
                <div className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
                    <SectionHeader icon="🪐" title="Graha Positions (Vedic)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {planets.map((p, i) => {
                            const name = p.name;
                            const sign = fullSign(p.sign || p.rashi);
                            const color = PLANET_COLORS[name] || '#94a3b8';
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--surface-light)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
                                    <span style={{ fontWeight: 800, color, minWidth: '78px', fontSize: '0.88rem' }}>{name}</span>
                                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{SIGN_EMOJI[sign] || ''} {sign}</span>
                                    {p.nakshatra && <span style={{ color: '#8b5cf6', fontSize: '0.72rem', fontWeight: 600 }}>{p.nakshatra}</span>}
                                    {p.house != null && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>H{p.house}</span>}
                                    {p.retrograde && <span style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 800 }}>℞</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Numerology Tab ────────────────────────────────────────────────────────────
function NumerologyTab() {
    const [num, setNum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchNumerology()
            .then(d => { if (mounted) { setNum(d); setLoading(false); } })
            .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
        return () => { mounted = false; };
    }, []);

    if (loading) return <LoadingCard height="400px" />;
    if (error) return <ErrorCard message={error} />;

    const profile = num?.data?.core || num?.profile || num?.data || num;
    const entries = [
        { key: 'life_path', label: 'Life Path', desc: profile?.life_path?.content?.summary || '' },
        { key: 'expression', label: 'Expression / Destiny', desc: profile?.expression?.content?.summary || '' },
        { key: 'soul_urge', label: 'Soul Urge', desc: profile?.soul_urge?.content?.summary || '' },
        { key: 'personality', label: 'Personality', desc: profile?.personality?.content?.summary || '' },
        { key: 'birthday', label: 'Birthday Number', desc: profile?.birthday?.content?.summary || '' },
    ].filter(e => profile?.[e.key] != null);

    return (
        <div>
            {entries.length === 0 ? (
                <div className="dashboard-card" style={{ padding: '2rem' }}>
                    <pre style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(num, null, 2).slice(0, 2000)}
                    </pre>
                </div>
            ) : entries.map((e, i) => {
                const value = profile[e.key]?.value ?? profile[e.key];
                const color = NUM_COLORS[i % NUM_COLORS.length];
                return (
                    <div key={e.key} className="dashboard-card fade-in" style={{ padding: '1.5rem', marginBottom: '1.2rem', borderLeft: `4px solid ${color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.8rem' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color, border: `2px solid ${color}44`, flexShrink: 0 }}>{value}</div>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{e.label}</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color }}>Number {value}</div>
                            </div>
                        </div>
                        {e.desc && <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.8 }}>{e.desc}</p>}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HoroscopePage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.8rem' }}>♾️</span>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px' }}>Horoscope</h1>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Ismail · ♈ Aries · Born 18 Apr 1997, 1:00 AM · Lucknow, India
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.8rem', flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            background: activeTab === t.id ? 'var(--accent)' : 'var(--surface-light)',
                            color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
                            fontWeight: activeTab === t.id ? 800 : 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div key={activeTab} style={{ animation: 'fadeInUp 0.25s ease' }}>
                {activeTab === 'overview' && <TodayTab />}
                {activeTab === 'moon' && <MoonTab />}
                {activeTab === 'natal' && <NatalTab />}
                {activeTab === 'vedic' && <VedicTab />}
                {activeTab === 'numerology' && <NumerologyTab />}
                {activeTab === 'portrait' && <PortraitTab />}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.2; }
                }
            `}</style>
        </div>
    );
}
