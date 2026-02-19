import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole } from '../utils/auth';
import { useSafetySocket } from '../hooks/useSafetySocket';
import { Loader2, LocateFixed, Search, Globe } from 'lucide-react';
import { useMap } from 'react-leaflet';

// Map layer components
import IncidentMarkers from '../components/map/IncidentMarkers';
import SOSMarkers from '../components/map/SOSMarkers';
import VolunteerMarkers from '../components/map/VolunteerMarkers';
import AttendeeLayer from '../components/map/AttendeeLayer';
import RiskZoneLayer from '../components/map/RiskZoneLayer';
import LayerControls from '../components/map/LayerControls';
import EventBoundaries from '../components/map/EventBoundaries';

const CONTENT_BG = C.background;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

/* ─────────────────────────────────────────────────────────
   FlyToHandler — Imperatively flies map to a target
   ───────────────────────────────────────────────────────── */
const FlyToHandler = ({ target }) => {
    const map = useMap();
    useEffect(() => {
        if (target && target.lat && target.lng) {
            map.flyTo([target.lat, target.lng], target.zoom || 18, { duration: 0.8 });
        }
    }, [target, map]);
    return null;
};

/* ═════════════════════════════════════════════════════════
   MAIN COMPONENT: LiveMap
   Shows ALL events with boundaries, incidents, SOS, volunteers
   ═════════════════════════════════════════════════════════ */
const LiveMap = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const routerLocation = useLocation();

    // ── State ──
    const [targetEventId, setTargetEventId] = useState(eventId || '1');
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapSearch, setMapSearch] = useState('');
    const [flyTarget, setFlyTarget] = useState(null);

    // Layer visibility toggles
    const [layers, setLayers] = useState({
        volunteers: true,
        incidents: true,
        sos: true,
        heatmap: true,
        attendees: false,
        riskZones: true,
        boundaries: true
    });

    // ── Data from SafetySocket context (real-time) ──
    const {
        locations: users,
        incidents,
        sosAlerts: sos,
        isConnected,
        loading: contextLoading
    } = useSafetySocket(targetEventId);

    // ── Init: fetch ALL events, resolve default event ──
    useEffect(() => {
        const init = async () => {
            const role = getRole();
            if (!['organizer', 'admin', 'volunteer'].includes(role)) {
                navigate('/events');
                return;
            }

            try {
                const res = await api.get('/events/');
                const events = Array.isArray(res.data) ? res.data : res.data.results || [];
                setAllEvents(events);

                // Set target event for WebSocket subscription
                if (eventId) {
                    setTargetEventId(eventId);
                } else if (events.length > 0) {
                    setTargetEventId(events[0].id.toString());
                }
            } catch (err) {
                console.error('[LiveMap] Failed to fetch events:', err);
            }

            setLoading(false);
        };

        init();
    }, [eventId, navigate]);

    // ── Fly to location if passed via router state ──
    useEffect(() => {
        if (routerLocation.state?.lat && routerLocation.state?.lng) {
            setFlyTarget({
                lat: routerLocation.state.lat,
                lng: routerLocation.state.lng,
                zoom: routerLocation.state.zoom || 18
            });
        }
    }, [routerLocation.state]);

    // ── Computed data ──
    const mapCenter = useMemo(() => {
        // If navigated to a specific event, center on it
        if (eventId) {
            const ev = allEvents.find(e => String(e.id) === String(eventId));
            if (ev) {
                const lat = parseFloat(ev.latitude);
                const lng = parseFloat(ev.longitude);
                if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
            }
        }
        // Otherwise use first event or fallback
        if (allEvents.length > 0) {
            const first = allEvents[0];
            const lat = parseFloat(first.latitude);
            const lng = parseFloat(first.longitude);
            if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
        return [27.7172, 85.3240]; // Kathmandu fallback
    }, [allEvents, eventId]);

    const validUsers = useMemo(() => {
        return Object.values(users || {}).filter(u =>
            u && u.user_id && u.name &&
            !isNaN(parseFloat(u.lat || u.latitude)) &&
            !isNaN(parseFloat(u.lng || u.longitude))
        );
    }, [users]);

    const filteredPanelUsers = useMemo(() => {
        const q = (mapSearch || '').trim().toLowerCase();
        const filtered = validUsers.filter(u =>
            (u.name || '').toLowerCase().includes(q) ||
            (u.role || '').toLowerCase().includes(q)
        );
        return filtered.sort((a, b) => {
            const ta = a.last_seen ? new Date(`1970-01-01 ${a.last_seen}`).getTime() : 0;
            const tb = b.last_seen ? new Date(`1970-01-01 ${b.last_seen}`).getTime() : 0;
            return tb - ta;
        });
    }, [validUsers, mapSearch]);

    const attendeeCount = useMemo(() => validUsers.filter(u => u.role === 'attendee').length, [validUsers]);
    const volunteerCount = useMemo(() => validUsers.filter(u => u.role === 'volunteer').length, [validUsers]);

    // For global map: count ALL incidents/SOS (not filtered by single event)
    const activeIncidentCount = useMemo(() => {
        return Object.values(incidents || {}).filter(inc =>
            ['pending', 'verified', 'responding'].includes(inc.status)
        ).length;
    }, [incidents]);

    const activeSosCount = useMemo(() => {
        return Object.values(sos || {}).filter(s =>
            s.status !== 'resolved' && s.status !== 'cancelled'
        ).length;
    }, [sos]);

    // Layer toggle handler
    const handleToggle = useCallback((key) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Layer stats for toggle badges
    const layerStats = useMemo(() => ({
        volunteers: volunteerCount,
        incidents: activeIncidentCount,
        sos: activeSosCount,
        attendees: attendeeCount,
    }), [volunteerCount, activeIncidentCount, activeSosCount, attendeeCount]);

    // ── Loading state ──
    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Loader2 size={40} className="lm-spin" color={ACCENT} style={{ marginBottom: 16 }} />
                        <p style={{ color: TEXT_MID, fontWeight: 600 }}>Loading map data...</p>
                    </div>
                </main>
                <style>{`.lm-spin { animation: lm-spin-kf 1s linear infinite; } @keyframes lm-spin-kf { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── No events fallback ──
    if (allEvents.length === 0 && !targetEventId) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', maxWidth: 400, padding: 32, background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}` }}>
                        <Globe size={48} color={TEXT_MID} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, marginBottom: 8 }}>No Active Events</h2>
                        <p style={{ color: TEXT_MID, fontSize: 14, marginBottom: 24 }}>
                            No events found to display on the map. Create an event first.
                        </p>
                        <button
                            onClick={() => navigate('/events')}
                            style={{ padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                        >
                            Go to Events
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ── Main Render ──
    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif", background: CONTENT_BG }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <PageHeader title="Live Map" breadcrumb="Dashboard" />

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ═══ LEFT PANEL: Stats + User List ═══ */}
                    <div style={{ width: 360, background: '#f8fafc', borderRight: `1px solid ${BORDER}`, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Stats grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Attendees</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: ACCENT }}>{attendeeCount}</p>
                            </div>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Volunteers</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{volunteerCount}</p>
                            </div>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Incidents</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f97316' }}>{activeIncidentCount}</p>
                            </div>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>SOS Alerts</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{activeSosCount}</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                            <input
                                placeholder="Search user..."
                                value={mapSearch}
                                onChange={e => setMapSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* User Cards */}
                        {filteredPanelUsers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 32, color: TEXT_MID, fontSize: 13 }}>
                                {contextLoading ? 'Loading users...' : 'No users on the map yet.'}
                            </div>
                        )}

                        {filteredPanelUsers.map(user => {
                            const lat = parseFloat(user.lat || user.latitude);
                            const lng = parseFloat(user.lng || user.longitude);
                            const isVol = user.role === 'volunteer';

                            return (
                                <div key={user.user_id} style={{
                                    background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
                                    padding: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <img
                                                src={user.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                                                alt={user.name}
                                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${isVol ? '#3b82f6' : '#f43f5e'}` }}
                                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`; }}
                                            />
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{user.name}</h4>
                                                <span style={{ fontSize: 11, color: TEXT_MID, textTransform: 'capitalize' }}>{user.role}</span>
                                                {isVol && (
                                                    <span style={{
                                                        marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: user.status === 'available' ? '#dcfce7' : user.status === 'responding' ? '#fef3c7' : '#fee2e2',
                                                        color: user.status === 'available' ? '#16a34a' : user.status === 'responding' ? '#d97706' : '#dc2626'
                                                    }}>
                                                        {(user.status || 'available').toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex' }}>
                                        <button
                                            onClick={() => setFlyTarget({ lat, lng, zoom: 18 })}
                                            style={{ flex: 1, padding: '8px 10px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
                                        >
                                            <LocateFixed size={14} /> Locate
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ═══ MAIN: Map ═══ */}
                    <div style={{ flex: 1, position: 'relative', background: '#e8eaed' }}>
                        <MapContainer
                            center={mapCenter}
                            zoom={14}
                            style={{ width: '100%', height: '100%' }}
                            zoomControl={true}
                            attributionControl={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                            {/* Fly-to handler */}
                            <FlyToHandler target={flyTarget} />

                            {/* Event boundaries (all events) */}
                            {layers.boundaries && (
                                <EventBoundaries events={allEvents} />
                            )}

                            {/* Declarative data layers — show across all events */}
                            {layers.incidents && (
                                <IncidentMarkers incidents={incidents} eventId={null} />
                            )}

                            {layers.sos && (
                                <SOSMarkers sosAlerts={sos} eventId={null} />
                            )}

                            {layers.volunteers && (
                                <VolunteerMarkers locations={users} />
                            )}

                            {/* Imperative layers */}
                            <AttendeeLayer
                                locations={users}
                                showHeatmap={layers.heatmap}
                                showMarkers={layers.attendees}
                            />

                            <RiskZoneLayer
                                eventId={targetEventId}
                                visible={layers.riskZones}
                                api={api}
                            />
                        </MapContainer>

                        {/* Layer toggle controls */}
                        <LayerControls
                            layers={layers}
                            onToggle={handleToggle}
                            stats={layerStats}
                        />
                    </div>
                </div>
            </main>

            {/* ═══ Global map CSS ═══ */}
            <style>{`
                /* SOS Marker Animations */
                .sos-marker-wrap {
                    position: relative;
                    width: 44px;
                    height: 44px;
                }
                .sos-pulse-ring {
                    position: absolute;
                    top: 0; left: 0;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.4);
                    animation: sos-pulse-kf 1.5s ease-out infinite;
                }
                .sos-pulse-ring-delayed {
                    position: absolute;
                    top: 0; left: 0;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.25);
                    animation: sos-pulse-kf 1.5s ease-out infinite 0.4s;
                }
                .sos-core-dot {
                    position: absolute;
                    top: 12px; left: 12px;
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    background: #ef4444;
                    border: 3px solid #fff;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.6);
                    z-index: 2;
                }
                @keyframes sos-pulse-kf {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes sos-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                /* Spinner */
                .lm-spin { animation: lm-spin-kf 1s linear infinite; }
                @keyframes lm-spin-kf { to { transform: rotate(360deg); } }

                /* Leaflet popup overrides */
                .leaflet-popup-content-wrapper {
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
                }
                .leaflet-popup-content {
                    margin: 12px 14px !important;
                    font-family: 'Inter','Segoe UI',sans-serif !important;
                }

                /* Marker cluster overrides */
                .marker-cluster-small {
                    background-color: rgba(79, 70, 229, 0.15) !important;
                }
                .marker-cluster-small div {
                    background-color: rgba(79, 70, 229, 0.6) !important;
                    color: #fff !important;
                    font-weight: 700 !important;
                }
                .marker-cluster-medium {
                    background-color: rgba(234, 179, 8, 0.15) !important;
                }
                .marker-cluster-medium div {
                    background-color: rgba(234, 179, 8, 0.6) !important;
                    color: #fff !important;
                    font-weight: 700 !important;
                }
                .marker-cluster-large {
                    background-color: rgba(239, 68, 68, 0.15) !important;
                }
                .marker-cluster-large div {
                    background-color: rgba(239, 68, 68, 0.6) !important;
                    color: #fff !important;
                    font-weight: 700 !important;
                }

                /* Event Boundary Tooltip */
                .leaflet-tooltip.event-boundary-tooltip {
                    background: #4F46E5;
                    color: #ffffff;
                    border: 2px solid #ffffff;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    border-radius: 6px;
                    padding: 4px 10px;
                    font-weight: 800;
                    font-size: 11px;
                    letter-spacing: 0.02em;
                    white-space: nowrap;
                }
                .leaflet-tooltip.event-boundary-tooltip::before {
                    display: none;
                }
                
                /* Risk Zone Tooltip */
                .leaflet-tooltip.risk-zone-tooltip {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid rgba(0,0,0,0.1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #1e293b;
                    font-weight: 800;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .leaflet-tooltip.risk-zone-tooltip::before {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default LiveMap;
