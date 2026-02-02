import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    Users, Shield, Globe, Activity, 
    TrendingUp, ShieldAlert, Database, 
    Settings, LogOut, Loader2, ArrowUpRight,
    Siren, AlertTriangle, Map
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
    PieChart, Pie, Cell
} from 'recharts';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const eventIcon = L.divIcon({
    className: 'event-marker',
    html: `<div style="width: 12px; height: 12px; background: #3b82f6; border: 2px solid white; border-radius: 50%;"></div>`,
    iconSize: [12, 12]
});

const sosIcon = L.divIcon({
    className: 'sos-marker',
    html: `<div style="width: 14px; height: 14px; background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #ef4444;" class="sos-pulse"></div>`,
    iconSize: [14, 14]
});

import { useSafetySocket } from '../hooks/useSafetySocket';

const HeatmapLayer = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !points.length) return;
        const heat = L.heatLayer(points, {
            radius: 18,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);
        return () => map.removeLayer(heat);
    }, [map, points]);
    return null;
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [targetEventId, setTargetEventId] = useState('1');
    const { incidents, sosAlerts: realTimeSos, locations, isConnected, loading: socketLoading } = useSafetySocket(targetEventId);

    const [stats, setStats] = useState({
        total_users: 0,
        active_events: 0,
        total_revenue: 0,
        security_alerts: 0
    });
    const [events, setEvents] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventsRes, usersRes, ordersRes] = await Promise.all([
                    api.get('/events/'),
                    api.get('/accounts/all-users/'),
                    api.get('/tickets/organizer-orders/')
                ]);
                
                setEvents(eventsRes.data);
                
                // Calculate stats - handle both paginated and non-paginated responses
                const totalUsers = typeof usersRes.data.count === 'number' 
                    ? usersRes.data.count 
                    : (Array.isArray(usersRes.data) ? usersRes.data.length : 0);
                
                const ordersData = ordersRes.data.results || (Array.isArray(ordersRes.data) ? ordersRes.data : []);
                const totalBookings = ordersData;
                const totalRevenue = totalBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
                
                setStats({
                    total_users: totalUsers,
                    active_events: eventsRes.data.length,
                    total_revenue: Math.round(totalRevenue),
                    security_alerts: 0
                });
                
                if (!targetEventId && eventsRes.data.length > 0) {
                    setTargetEventId(eventsRes.data[0].id.toString());
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();

        // Poll for changes every 30 seconds
        const pollInterval = setInterval(() => {
            fetchData();
        }, 30000);

        // Listen for cross-tab deletions
        const handleStorageChange = () => {
            fetchData();
        };
        window.addEventListener('storage', handleStorageChange);

        // Listen for visibility changes (when user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Sync stats with real-time data
    const derivedStats = useMemo(() => ({
        ...stats,
        active_events: events.length,
        security_alerts: Object.keys(realTimeSos).length,
        active_incidents: Object.keys(incidents).length,
        active_users: Object.keys(locations).length
    }), [stats, events, realTimeSos, incidents, locations]);

    const activeSosList = useMemo(() => Object.values(realTimeSos), [realTimeSos]);

    const activityData = [];

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
        card: { background: CARD_BG, borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: `1px solid ${BORDER}` }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Safety Operation Center" />

                {loading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Loader2 size={40} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 16 }} />
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading dashboard data...</p>
                        </div>
                    </div>
                )}

                {!loading && (
                <div style={s.content}>
                    {/* Top Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Total Users', value: derivedStats.total_users, Icon: Users, color: ACCENT },
                            { label: 'Active Events', value: derivedStats.active_events, Icon: Globe, color: '#3b82f6' },
                            { label: 'Incidents Total', value: derivedStats.active_incidents, Icon: AlertTriangle, color: '#f59e0b' },
                            { label: 'Active SOS', value: derivedStats.security_alerts, Icon: Siren, color: '#ef4444' },
                        ].map((card, i) => (
                            <div key={i} style={{ ...s.card, padding: '16px 20px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: card.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, marginBottom: 12 }}>
                                    <card.Icon size={18} />
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.02em' }}>{card.label}</p>
                                <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Analytics Section */}
                    {activityData.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 28 }}>
                        <div style={{ ...s.card, padding: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Platform Participation Trend</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_MID }}>Daily login activity and incident report frequency</p>
                                </div>
                                <TrendingUp size={20} color={ACCENT} />
                            </div>
                            <div style={{ height: 300, minHeight: 300 }}>
                                <ResponsiveContainer width="100%" height={300} minWidth={200}>
                                    <AreaChart data={activityData}>
                                        <defs>
                                            <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor={ACCENT} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: TEXT_MID }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: TEXT_MID }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="logins" stroke={ACCENT} strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                                        <Area type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={3} fill="transparent" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
                        {/* Global Monitoring Map */}
                        <div style={s.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Global Safety Monitoring</h3>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TEXT_MID }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Events
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TEXT_MID }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> SOS
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: 300, background: '#1e293b', borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                                <MapContainer center={[27.7, 85.3]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                     <HeatmapLayer points={Object.values(locations).map(u => [u.lat, u.lng, u.intensity || 0.5])} />
                                     {events.map((e, idx) => (
                                         <Marker key={`ev-${idx}`} position={[e.latitude || 27.7, e.longitude || 85.3]} icon={eventIcon}>
                                             <Popup><b>{e.name}</b><br/>{e.venue_name}</Popup>
                                         </Marker>
                                     ))}
                                     {activeSosList.map((s, idx) => (
                                         <Marker key={`sos-${idx}`} position={[s.latitude || 27.7, s.longitude || 85.3]} icon={sosIcon}>
                                             <Popup><b style={{color: 'red'}}>SOS: {s.user_name}</b><br/>{s.sos_type_display}</Popup>
                                         </Marker>
                                     ))}
                                 </MapContainer>
                                 <div style={{ position: 'absolute', bottom: 10, right: 10, background: isConnected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(239, 68, 68, 0.9)', padding: '4px 10px', borderRadius: 4, color: '#fff', fontSize: 10, zIndex: 1000, fontWeight: 900 }}>
                                     {isConnected ? 'LIVE FEED' : 'RECONNECTING...'}
                                 </div>
                            </div>
                        </div>

                        {/* Real-time Activity Feed */}
                        <div style={s.card}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK, marginBottom: 20 }}>Live System Activity</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {activityLogs && activityLogs.length > 0 ? (
                                    activityLogs.map((log, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, borderBottom: i === activityLogs.length - 1 ? 'none' : `1px solid ${BORDER}`, paddingBottom: 12 }}>
                                            <div style={{ width: 4, borderRadius: 2, background: log.color, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: log.color }}>{log.cat}</span>
                                                    <span style={{ fontSize: 10, color: TEXT_MID }}>{log.time}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{log.title}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ margin: 0, fontSize: 13, color: TEXT_MID }}>No activity logs available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Control Center */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 24, maxWidth: 900, margin: '24px auto 0' }}>
                        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => navigate('/admin/sos')}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>SOS Monitor</h4>
                                <p style={{ margin: 0, fontSize: 11, color: TEXT_MID }}>Real-time event safety</p>
                            </div>
                        </div>
                        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Settings size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>System Settings</h4>
                                <p style={{ margin: 0, fontSize: 11, color: TEXT_MID }}>Configure platform rules</p>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .sos-pulse {
                    animation: pulse-red 1.5s infinite;
                }
                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .leaflet-container {
                    filter: grayscale(0.2) contrast(1.1);
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
