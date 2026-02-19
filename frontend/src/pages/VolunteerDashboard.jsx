import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    Shield, AlertTriangle, Siren, Activity, 
    ChevronRight, MapPin, Clock, Navigation, 
    CheckCircle, MessageSquare, Bell, Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useSafety } from '../context/SafetySocketContext';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

// ── heatmap component ────────────────────────────────────────────────────────
const HeatmapLayer = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !points.length) return;
        const heat = L.heatLayer(points, {
            radius: 20,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);
        return () => map.removeLayer(heat);
    }, [map, points]);
    return null;
};

const VolunteerDashboard = () => {
    const navigate = useNavigate();
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [nearbySOS, setNearbySOS] = useState([]);
    const [status, setStatus] = useState('Available');
    const [loading, setLoading] = useState(true);
    const [acceptingSOSId, setAcceptingSOSId] = useState(null); // ✅ Track which SOS is accepting
    const [sosError, setSosError] = useState(null); // ✅ Track SOS errors
    const { incidents, sosAlerts, nearbySosAlerts, locations = {}, loading: contextLoading, unreadCount } = useSafety();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const incRes = await api.get('/monitoring/incidents/');
                // In a real app, we'd filter by 'assigned_volunteer == me'
                setAssignedTasks(incRes.data.filter(i => i.status === 'verified').slice(0, 2));

                const locRes = await api.get('/monitoring/responders/');
                if (locRes.data.length > 0) {
                    const myLoc = locRes.data[0];
                    if (myLoc.status) {
                        setStatus(myLoc.status.charAt(0).toUpperCase() + myLoc.status.slice(1));
                    }
                }
            } catch (err) {
                console.error("Dashboard fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ✅ STEP 5.3.4: Sync nearby SOS alerts from WebSocket context
    useEffect(() => {
        if (nearbySosAlerts) {
            setNearbySOS(Object.values(nearbySosAlerts).slice(0, 5));
        }
    }, [nearbySosAlerts]);

    const activeIncidents = React.useMemo(() => Object.values(incidents).filter(i => i.latitude && i.longitude), [incidents]);
    const activeSOS = React.useMemo(() => Object.values(sosAlerts || {}).filter(s => s.latitude && s.longitude), [sosAlerts]);

    // ✅ STEP 5.3.4: Handle SOS acceptance
    const handleAcceptSOS = async (sosId) => {
        setAcceptingSOSId(sosId);
        setSosError(null);
        try {
            const res = await api.post(`/monitoring/sos/${sosId}/accept/`);
            if (res.status === 200 || res.status === 201) {
                // Remove from nearby SOS list
                setNearbySOS(prev => prev.filter(s => s.id !== sosId));
                console.log(`[SOS_ACCEPT] ✓ Successfully accepted SOS ${sosId}`);
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            
            if (status === 409) {
                // Another volunteer accepted first - remove from list
                // ⚠️ PRODUCTION: Backend could return assigned_volunteer_name for better UX
                const assignedBy = errorData.assigned_volunteer_name || "another volunteer";
                const errorMsg = `Already accepted by ${assignedBy}`;
                console.log(`[SOS_ACCEPT] ✗ SOS ${sosId} already taken`);
                setSosError(errorMsg);
                setTimeout(() => {
                    setNearbySOS(prev => prev.filter(s => s.id !== sosId));
                    setSosError(null);
                }, 2000);
            } else if (status === 403) {
                setSosError(errorData.error || "You cannot accept this SOS.");
            } else {
                setSosError(errorData.error || "Failed to accept SOS. Please try again.");
                console.error(`[SOS_ACCEPT] Error:`, err);
            }
        } finally {
            setAcceptingSOSId(null);
        }
    };

    const handleIgnoreSOS = (sosId) => {
        // ✅ STEP 5.3.4: Allow volunteers to dismiss SOS
        setNearbySOS(prev => prev.filter(s => s.id !== sosId));
        console.log(`[SOS_IGNORE] Volunteer dismissed SOS ${sosId}`);
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
        card: { background: CARD_BG, borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: `1px solid ${BORDER}` },
        sectionTitle: { fontSize: 15, fontWeight: 800, color: TEXT_DARK, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 },
        taskCard: { background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${BORDER}` },
        sosCard: { background: 'rgba(239, 68, 68, 0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(239, 68, 68, 0.1)', marginBottom: 12 },
        qBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Volunteer Dashboard" breadcrumb="Home" notificationBadge={unreadCount} />

                {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Loader2 size={40} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 16 }} />
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading your volunteer dashboard...</p>
                        </div>
                    </div>
                ) : (
                <div style={s.content}>
                    {/* Stat Highights */}
                    <div style={s.statRow}>
                        <div style={s.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: status.toLowerCase() === 'available' ? '#10b981' : '#6366f1' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: status.toLowerCase() === 'available' ? '#10b98115' : '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={20} color={status.toLowerCase() === 'available' ? '#10b981' : '#6366f1'} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Duty Status</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: status.toLowerCase() === 'available' ? '#10b981' : '#6366f1' }}>{status}</p>
                                </div>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#ef4444' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>My Tasks</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{assignedTasks.length} Active</p>
                                </div>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#dc2626' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Siren size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>SOS Priority</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{nearbySOS.length} Nearby</p>
                                </div>
                            </div>
                        </div>
                        <div style={s.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#f59e0b' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Navigation size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Nearest Goal</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{assignedTasks.length > 0 ? "Tracking" : "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                        {/* Task Panel */}
                        <div style={s.card}>
                            <h3 style={s.sectionTitle}><Shield size={18} color={ACCENT} /> Assigned Incidents</h3>
                            {assignedTasks.length > 0 ? assignedTasks.map(task => (
                                <div key={task.id} style={s.taskCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <b style={{ fontSize: 14 }}>{task.category_display}: {task.title}</b>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{task.priority.toUpperCase()}</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: TEXT_MID, margin: '4px 0 12px' }}>{task.description}</p>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button onClick={() => navigate('/organizer/live-map')} style={{ ...s.qBtn, background: ACCENT, color: '#fff', border: 'none' }}>
                                            <Navigation size={14} /> Go to Incident
                                        </button>
                                        <button onClick={() => navigate('/volunteer/assigned')} style={{ ...s.qBtn, background: '#fff', border: `1px solid ${BORDER}`, color: TEXT_DARK }}>
                                            Update Status
                                        </button>

                                    </div>
                                </div>
                            )) : <p style={{ textAlign: 'center', color: TEXT_MID, fontSize: 13, padding: 20 }}>No tasks currently assigned.</p>}
                        </div>

                        {/* SOS Alert Panel */}
                        <div style={s.card}>
                            <h3 style={s.sectionTitle}><Siren size={18} color="#ef4444" /> Urgent SOS Nearby</h3>
                            {sosError && (
                                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                                    {sosError}
                                </div>
                            )}
                            {nearbySOS.length > 0 ? nearbySOS.map(sos => (
                                <div key={sos.id} style={s.sosCard}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <Bell size={16} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#991b1b' }}>{sos.user_name}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>
                                                {sos.sos_type_display} · {sos.distance_text || 'nearby'}
                                            </p>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 12, color: TEXT_MID, margin: '8px 0 12px', lineHeight: 1.4 }}>
                                        {sos.location_name || 'Unknown location'}
                                    </p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button 
                                            onClick={() => handleAcceptSOS(sos.id)}
                                            disabled={acceptingSOSId === sos.id}
                                            style={{ 
                                                flex: 1, 
                                                padding: '10px', 
                                                borderRadius: 8, 
                                                background: acceptingSOSId === sos.id ? '#dc2626' : '#ef4444', 
                                                color: '#fff', 
                                                border: 'none', 
                                                fontWeight: 700, 
                                                fontSize: 12, 
                                                cursor: acceptingSOSId === sos.id ? 'wait' : 'pointer',
                                                opacity: acceptingSOSId === sos.id ? 0.8 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6
                                            }}>
                                            {acceptingSOSId === sos.id && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                            {acceptingSOSId === sos.id ? 'Accepting...' : 'Accept'}
                                        </button>
                                        <button 
                                            onClick={() => handleIgnoreSOS(sos.id)}
                                            disabled={acceptingSOSId === sos.id}
                                            style={{ 
                                                flex: 1, 
                                                padding: '10px', 
                                                borderRadius: 8, 
                                                background: '#fff', 
                                                color: '#991b1b', 
                                                border: '1px solid #fca5a5', 
                                                fontWeight: 700, 
                                                fontSize: 12, 
                                                cursor: acceptingSOSId === sos.id ? 'not-allowed' : 'pointer',
                                                opacity: acceptingSOSId === sos.id ? 0.5 : 1
                                            }}>
                                            Ignore
                                        </button>
                                    </div>
                                </div>
                            )) : <p style={{ textAlign: 'center', color: TEXT_MID, fontSize: 13, padding: 20 }}>No active SOS signals nearby.</p>}
                        </div>
                    </div>

                    {/* Operational Map Preview */}
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, marginTop: 24 }}>
                        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Navigation size={18} color={ACCENT} />
                                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK }}>Operational Map</span>
                            </div>
                            <Link to="/organizer/live-map" style={{ fontSize: 12, color: ACCENT, textDecoration: 'none', fontWeight: 700 }}>Full Map View</Link>
                        </div>
                        <div style={{ height: 350, background: '#f1f5f9' }}>
                            <MapContainer center={[27.7, 85.3]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <HeatmapLayer points={Object.values(locations).map(u => [u.lat, u.lng, u.intensity || 0.5])} />
                                
                                {/* Incident Markers (orange) */}
                                {activeIncidents.map(inc => (
                                    <Marker key={`inc-${inc.id}`} position={[inc.latitude, inc.longitude]} icon={L.divIcon({
                                        className: '', html: `<div style="background:#f59e0b; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow: 0 0 6px rgba(245,158,11,0.6);"></div>`
                                    })}>
                                        <Popup><b style="color:#f59e0b">⚠ {inc.title}</b><br/><span style="font-size:11px">{inc.category_display || inc.category} · {inc.status}</span></Popup>
                                    </Marker>
                                ))}

                                {/* SOS Markers (red pulsing) */}
                                {activeSOS.map(sos => (
                                    <Marker key={`sos-${sos.id}`} position={[sos.latitude, sos.longitude]} icon={L.divIcon({
                                        className: 'sos-map-pulse', html: `<div style="background:#ef4444; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px rgba(239,68,68,0.8);"></div>`
                                    })}>
                                        <Popup><b style="color:#ef4444">🚨 SOS: {sos.user_name}</b><br/><span style="font-size:11px">{sos.location_name || 'Unknown'}</span></Popup>
                                    </Marker>
                                ))}
                                
                                {/* Volunteer/User location markers */}
                                {Object.values(locations).map(u => (
                                    <Marker key={`u-${u.user_id}`} position={[u.lat, u.lng]} icon={L.divIcon({
                                        className: '', html: `<div style="background:${u.role === 'volunteer' ? '#3b82f6' : '#6366f1'}; width:8px; height:8px; border-radius:50%; border:1.5px solid white;"></div>`
                                    })} />
                                ))}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div style={{ ...s.card, marginTop: 24 }}>
                        <h3 style={s.sectionTitle}><Activity size={18} color="#10b981" /> Responder Tools</h3>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <button onClick={() => navigate('/organizer/live-map')} style={{ ...s.qBtn, background: '#f8fafc', border: `1px solid ${BORDER}`, color: TEXT_DARK }}>
                                <MapPin size={16} color={ACCENT} /> Live Operations Map
                            </button>
                            <button onClick={() => navigate('/volunteer/status')} style={{ ...s.qBtn, background: '#f8fafc', border: `1px solid ${BORDER}`, color: TEXT_DARK }}>
                                <Activity size={16} color="#f59e0b" /> Change My Status
                            </button>
                        </div>
                    </div>
                </div>
                )}
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VolunteerDashboard;
