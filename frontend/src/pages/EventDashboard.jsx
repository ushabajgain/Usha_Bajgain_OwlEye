import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import {
    Bell, Settings, Edit, Trash2, Loader2, X, Plus,
    Maximize2, Calendar, ChevronDown, Search,
    CalendarDays, BookOpen, Ticket as TicketIcon,
    Users, AlertTriangle, LocateFixed, Activity, Shield, Map as MapIcon, Siren
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import api from '../utils/api';
import C from '../utils/colors';

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
import { getUserId, getRole, getFullName } from '../utils/auth';
import { useSafety } from '../context/SafetySocketContext';


const CARD_BG = C.surface;
const CONTENT_BG = C.background;
const ACCENT = C.primary;
const ACCENT2 = C.secondary;
const ACCENT3 = C.navy;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const getPlaceholderImage = (category) => {
    const categoryMap = {
        'Music': 'FFA500',
        'Technology': '4169E1',
        'Sports': '32CD32',
        'Art & Design': 'DC143C',
        'Food & Culinary': 'FFB6C1',
        'Health & Wellness': '00CED1',
        'Fashion': 'FF69B4',
        'Business': '696969',
        'Education': '4B0082',
        'Outdoor & Adventure': '228B22',
    };
    const color = categoryMap[category] || '6B7280';
    return `https://via.placeholder.com/800x400/${color}/FFFFFF?text=${encodeURIComponent(category || 'Event')}`;
};

const statusStyle = (s) => {
    if (s === 'Confirmed') return { background: '#fce7f3', color: '#db2777' };
    if (s === 'Pending') return { background: '#ede9fe', color: '#7c3aed' };
    if (s === 'Cancelled') return { background: '#e5e7eb', color: '#6b7280' };
    return { background: '#f1f5f9', color: TEXT_MID };
};

// Custom tooltip for revenue chart
const RevenueTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: TEXT_DARK, color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Revenue</p>
            <p>Rs. {payload[0]?.value?.toLocaleString()}</p>
        </div>
    );
};

const EventDashboard = () => {
    console.log("EventDashboard render");
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [bookings, setBookings] = useState([]);
    const [bookingSearch, setBookingSearch] = useState('');
    const [targetEventId, setTargetEventId] = useState('1');
    const [timeframe, setTimeframe] = useState('This Year');
    const [overviewStats, setOverviewStats] = useState({
        scanned_tickets: 0,
        total_tickets: 0,
        unique_attendees: 0,
        active_volunteers: 0,
        active_incidents: 0,
        active_sos: 0,
        online_responders: 0,
    });
    const [lastUpdate, setLastUpdate] = useState(new Date());
    
    const { incidents, sosAlerts, locations = {}, loading: safetyLoading, tickets, unreadCount } = useSafety();

    const fetchOverviewStats = async (eventId) => {
        try {
            const res = await api.get(`/monitoring/overview/${eventId}/`);
            setOverviewStats(res.data);
        } catch (err) {
            console.error("Failed to fetch overview stats", err);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [evRes, bkRes] = await Promise.all([
                api.get('/events/'),
                api.get('/tickets/organizer-orders/')
            ]);
            setEvents(Array.isArray(evRes.data) ? evRes.data : []);
            setBookings(Array.isArray(bkRes.data) ? bkRes.data : []);
            
            if (evRes.data.length > 0) {
                const firstEventId = evRes.data[0].id.toString();
                if (targetEventId !== firstEventId) {
                    setTargetEventId(firstEventId);
                    fetchOverviewStats(firstEventId);
                } else {
                    fetchOverviewStats(firstEventId);
                }
            }
        } catch (err) {
            console.error("Dashboard primary init failed", err);
        } finally {
            setLoading(false);
            setLastUpdate(new Date());
        }
    };

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') {
            navigate('/events');
            return;
        }
        fetchAll();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAll();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [navigate]);

    useEffect(() => {
        if (targetEventId) {
            fetchOverviewStats(targetEventId);
        }
    }, [targetEventId]);




    const filteredEventsByTime = useMemo(() => {
        const now = new Date();
        return events.filter(e => {
            const eDate = new Date(e.start_datetime || now);
            if (timeframe === 'This Week') {
                const diff = (now - eDate) / (1000 * 60 * 60 * 24);
                return diff <= 7;
            }
            if (timeframe === 'This Month') {
                return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
            }
            return true; // This Year / All
        });
    }, [events, timeframe]);

    const filteredBookingsByTime = useMemo(() => {
        const now = new Date();
        return bookings.filter(b => {
            const bDate = new Date(b.created_at);
            if (timeframe === 'This Week') {
                const diff = (now - bDate) / (1000 * 60 * 60 * 24);
                return diff <= 14; // Actually 2 weeks for demo
            }
            if (timeframe === 'This Month') {
                return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [bookings, timeframe]);

    const currentUserId = parseInt(getUserId()) || null;
    const currentUserRole = getRole() || 'Admin';
    const fullName = getFullName() || 'User';

    const [modalConfig, setModalConfig] = useState({ isOpen: false, eventId: null, eventName: '' });

    const confirmDelete = (id, name) => setModalConfig({ isOpen: true, eventId: id, eventName: name });
    const handleDelete = async () => {
        try {
            await api.delete(`/events/${modalConfig.eventId}/`);
            setModalConfig({ isOpen: false, eventId: null, eventName: '' });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed.');
        }
    };

    const filteredEvents = useMemo(() => {
        return events
            .filter(e => (e.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()))
            .sort((a, b) => {
                const aActive = !a.is_past;
                const bActive = !b.is_past;
                
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                
                if (aActive) {
                    return new Date(a.start_datetime) - new Date(b.start_datetime);
                } else {
                    return new Date(b.end_datetime) - new Date(a.end_datetime);
                }
            });
    }, [events, searchQuery]);

    const activeIncidents = useMemo(() => Object.values(incidents), [incidents]);
    const activeSOS = useMemo(() => Object.values(sosAlerts), [sosAlerts]);

    const upcomingEvents = events.filter(e => !e.is_past).length;
    const totalBookings = filteredBookingsByTime.length;
    
    const ticketsSold = useMemo(() => {
        const initial = filteredBookingsByTime.reduce((a, c) => a + (c.tickets?.length || 0), 0);
        return initial;
    }, [filteredBookingsByTime]);
    
    const totalCapacity = filteredEventsByTime.reduce((a, c) => a + (c.capacity || 0), 0);

    const donutData = totalCapacity > 0 ? [
        { name: 'Tickets Sold', value: ticketsSold, color: ACCENT2 },
        { name: 'Available', value: Math.max(0, totalCapacity - ticketsSold), color: '#e2e8f0' },
    ] : [];
    const totalTickets = totalCapacity;

    const [REVENUE_DATA, totalRevenueVal] = useMemo(() => {
        const temp = {};
        let total = 0;
        filteredBookingsByTime.forEach(b => {
            const m = new Date(b.created_at).toLocaleString('default', { month: 'short' });
            if (!temp[m]) temp[m] = { month: m, revenue: 0, profit: 0 };
            const rev = parseFloat(b.total_amount || 0);
            temp[m].revenue += rev;
            total += rev;
        });
        const data = Object.values(temp).length > 0 ? Object.values(temp) : [{ month: new Date().toLocaleString('default', { month: 'short' }), revenue: 0, profit: 0 }];
        return [data, total];
    }, [filteredBookingsByTime]);

    const POPULAR_CATEGORIES = useMemo(() => {
        const counts = {};
        filteredEventsByTime.forEach(e => { counts[e.category || 'Other'] = (counts[e.category || 'Other'] || 0) + 1; });
        const total = filteredEventsByTime.length || 1;
        const colors = [ACCENT2, ACCENT, ACCENT3, '#f59e0b', '#10b981'];
        const arr = Object.entries(counts).map(([name, count], i) => ({
            name, pct: Math.round((count / total) * 100), events: count.toString(), color: colors[i % colors.length]
        })).sort((a, b) => b.pct - a.pct).slice(0, 3);
        return arr.length > 0 ? arr : [{ name: 'No Data', pct: 0, events: '0', color: '#e2e8f0' }];
    }, [filteredEventsByTime]);

    const FEATURED_EVENTS = useMemo(() => {
        return events.slice(0, 3).map((e, index) => ({
            id: e.id || index, title: e.name || 'Untitled Event', venue: e.venue_address || 'Online',
            date: e.start_datetime ? new Date(e.start_datetime).toLocaleDateString() : 'TBD',
            price: `Rs. ${Number(e.price || 0).toLocaleString()}`, tag: e.category || 'General',
            img: e.image || getPlaceholderImage(e.category || 'General'),
        }));
    }, [events]);

    const RECENT_BOOKINGS = useMemo(() => {
        return filteredBookingsByTime.filter(b => {
            const q = (bookingSearch || "").toLowerCase();
            return (b.event_name || "").toLowerCase().includes(q) ||
                   (b.first_name || "").toLowerCase().includes(q) ||
                   (b.last_name || "").toLowerCase().includes(q) ||
                   String(b.id || "").toLowerCase().includes(q);
        }).slice(0, 10).map(b => ({
            id: String(b.id || "").split('-')[0].toUpperCase(),
            date: new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            name: `${b.first_name} ${b.last_name}`,
            event: b.event_name,
            type: b.tickets?.[0]?.package_details?.name || 'Standard',
            qty: b.tickets?.length || 1,
            amount: `Rs. ${parseFloat(b.total_amount).toLocaleString()}`,
            status: 'Confirmed'
        }));
    }, [filteredBookingsByTime, bookingSearch]);


    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif", overflowX: 'hidden' }}>
            <Sidebar />

            <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                <PageHeader title="Dashboard" notificationBadge={unreadCount} />

                {/* Loading State */}
                {loading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Loader2 size={40} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 16 }} />
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading your dashboard...</p>
                        </div>
                    </div>
                )}

                {/* Main Content - Analytics Dashboard */}
                {!loading && (
                    <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                        
                        {/* ── TOP STAT CARDS (INCLUDES REAL-TIME SAFETY METRICS) ───────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 32 }}>
                            {/* Total Attendees */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: ACCENT2 + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
                                    <Users size={24} color={ACCENT2} />
                                </div>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Total Attendees</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{overviewStats.unique_attendees}</p>
                            </div>

                            {/* Tickets Scanned */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: ACCENT3 + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
                                    <TicketIcon size={24} color={ACCENT3} />
                                </div>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Tickets Scanned</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{overviewStats.scanned_tickets}</p>
                            </div>

                            {/* Active Volunteers */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
                                    <Shield size={24} color={ACCENT} />
                                </div>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Active Volunteers</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{overviewStats.active_volunteers}</p>
                            </div>

                            {/* Active Incidents */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: (activeIncidents.length > 0 ? '#f97316' : '#e5e7eb') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
                                    <AlertTriangle size={24} color={activeIncidents.length > 0 ? '#f97316' : '#9ca3af'} />
                                </div>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Active Incidents</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: activeIncidents.length > 0 ? '#f97316' : TEXT_DARK, margin: 0 }}>
                                    {activeIncidents.length}
                                </p>
                            </div>

                            {/* Active SOS */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: (activeSOS.length > 0 ? '#ef4444' : '#e5e7eb') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
                                    <Siren size={24} color={activeSOS.length > 0 ? '#ef4444' : '#9ca3af'} />
                                </div>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Active SOS</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: activeSOS.length > 0 ? '#ef4444' : TEXT_DARK, margin: 0 }}>
                                    {activeSOS.length}
                                </p>
                            </div>
                        </div>

                        {/* ── SOS ALERTS & INCIDENTS (SIDE-BY-SIDE) ──────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                            {/* SOS ALERTS WIDGET */}
                            {activeSOS.length > 0 && (
                                <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, borderLeft: '4px solid #ef4444' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Siren size={20} color="#ef4444" />
                                            <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>Active SOS Alerts</span>
                                            <span style={{ background: '#fecaca', color: '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                                {activeSOS.length}
                                            </span>
                                        </div>
                                        <Link to="/organizer/sos" style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>View All →</Link>
                                    </div>

                                    {activeSOS.slice(0, 5).map(sos => {
                                        const sosTime = new Date(sos.created_at);
                                        const now = new Date();
                                        const diffMs = now - sosTime;
                                        const diffMins = Math.floor(diffMs / 60000);
                                        const diffHours = Math.floor(diffMs / 3600000);
                                        const timeStr = diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;
                                        
                                        // Priority-based coloring
                                        const getPriorityColor = (type) => {
                                            if (type === 'critical' || type === 'Critical') return '#dc2626';
                                            if (type === 'high' || type === 'High') return '#f97316';
                                            if (type === 'medium' || type === 'Medium') return '#eab308';
                                            return '#0ea5e9';
                                        };
                                        
                                        const priorityColor = getPriorityColor(sos.sos_type);
                                        
                                        return (
                                            <div
                                                key={sos.id}
                                                onClick={() => navigate(`/organizer/sos?id=${sos.id}`)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '12px 16px',
                                                    borderRadius: 10,
                                                    border: `1px solid ${BORDER}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    marginBottom: 8,
                                                    background: priorityColor + '08',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = priorityColor + '15';
                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = priorityColor + '08';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }}
                                            >
                                                {/* Content */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>
                                                            {sos.user_name || 'Unknown User'}
                                                        </p>
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: priorityColor, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                                                            {sos.sos_type || 'Alert'}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>
                                                        {sos.message || 'Emergency alert'} • {timeStr}
                                                    </p>
                                                </div>
                                                
                                                {/* Status Badge */}
                                                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MID, whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 6, background: '#f1f5f9' }}>
                                                    {sos.status === 'reported' ? 'Reported' : sos.status === 'assigned' ? 'Assigned' : (sos.status || 'Pending')}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {activeSOS.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: TEXT_MID }}>
                                            <p style={{ fontSize: 13, margin: 0 }}>No active SOS alerts</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* INCIDENTS WIDGET */}
                            {activeIncidents.length > 0 && (
                                <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, borderLeft: '4px solid #f97316' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <AlertTriangle size={20} color="#f97316" />
                                            <span style={{ fontSize: 14, fontWeight: 800, color: '#f97316' }}>Active Incidents</span>
                                            <span style={{ background: '#fed7aa', color: '#b45309', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                                {activeIncidents.length}
                                            </span>
                                        </div>
                                        <Link to="/organizer/incidents" style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>View All →</Link>
                                    </div>

                                    {activeIncidents.slice(0, 5).map(incident => {
                                        const incidentTime = new Date(incident.created_at);
                                        const now = new Date();
                                        const diffMs = now - incidentTime;
                                        const diffMins = Math.floor(diffMs / 60000);
                                        const diffHours = Math.floor(diffMs / 3600000);
                                        const timeStr = diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;
                                        
                                        // Severity-based coloring
                                        const getSeverityColor = (severity) => {
                                            if (severity === 'critical' || severity === 'Critical') return '#dc2626';
                                            if (severity === 'high' || severity === 'High') return '#f97316';
                                            if (severity === 'medium' || severity === 'Medium') return '#eab308';
                                            return '#0ea5e9';
                                        };
                                        
                                        const severityColor = getSeverityColor(incident.severity || incident.priority);
                                        
                                        return (
                                            <div
                                                key={incident.id}
                                                onClick={() => navigate(`/organizer/incident/${incident.id}`)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '12px 16px',
                                                    borderRadius: 10,
                                                    border: `1px solid ${BORDER}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    marginBottom: 8,
                                                    background: severityColor + '08',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = severityColor + '15';
                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = severityColor + '08';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }}
                                            >
                                                {/* Content */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>
                                                            {incident.title || 'Untitled Incident'}
                                                        </p>
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: severityColor, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                                                            {(incident.severity || incident.priority || 'Medium').toLowerCase()}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>
                                                        {incident.description || 'Incident in progress'} • {timeStr}
                                                    </p>
                                                </div>
                                                
                                                {/* Status Badge */}
                                                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MID, whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 6, background: '#f1f5f9' }}>
                                                    {incident.status === 'open' ? 'Open' : incident.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {activeIncidents.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: TEXT_MID }}>
                                            <p style={{ fontSize: 13, margin: 0 }}>No active incidents</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* ── LIVE HEATMAP WIDGET ───────────────────────────────────────────── */}
                        {Object.keys(locations).length > 0 && (
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <LocateFixed size={20} color={ACCENT} />
                                        <span style={{ fontSize: 14, fontWeight: 800, color: TEXT_DARK }}>Live Attendee Heatmap</span>
                                        <span style={{ background: ACCENT + '15', color: ACCENT, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                            {Object.keys(locations).length} Active
                                        </span>
                                    </div>
                                    <Link to={`/organizer/live-map/${targetEventId}`} style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>Full Map →</Link>
                                </div>

                                {/* Compact Heatmap */}
                                <div style={{ height: 240, borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}`, background: '#f8fafc', position: 'relative' }}>
                                    <MapContainer
                                        center={[6.9271, 80.7789]} 
                                        zoom={12}
                                        style={{ height: '100%', width: '100%' }}
                                        zoomControl={false}
                                        dragging={false}
                                        doubleClickZoom={false}
                                        scrollWheelZoom={false}
                                        touchZoom={false}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="© OpenStreetMap"
                                        />
                                        <HeatmapLayer
                                            points={Object.values(locations).map(loc => [
                                                parseFloat(loc.lat || loc.latitude || 0),
                                                parseFloat(loc.lng || loc.longitude || 0),
                                                1
                                            ]).filter(p => p[0] && p[1])}
                                        />
                                    </MapContainer>

                                    {/* Overlay Info */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 12,
                                        left: 12,
                                        background: 'rgba(255,255,255,0.95)',
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: TEXT_DARK,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        backdropFilter: 'blur(4px)',
                                        zIndex: 10
                                    }}>
                                        {Object.keys(locations).length} Attendees • Last update: <span style={{ color: ACCENT, fontWeight: 700 }}>Live</span>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                                    {[
                                        { label: 'Tracked', value: Object.keys(locations).length, color: ACCENT },
                                        { label: 'Checked In', value: Object.values(locations).filter(l => l.status === 'checked_in').length, color: '#10b981' },
                                        { label: 'In Venue', value: Object.values(locations).filter(l => l.status === 'in_venue').length, color: ACCENT2 },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, textAlign: 'center' }}>
                                            <p style={{ fontSize: 10, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</p>
                                            <p style={{ fontSize: 16, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── 👷 VOLUNTEER STATUS OVERVIEW ──────────────────────────────────────── */}
                        <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Users size={20} color={ACCENT} />
                                    <span style={{ fontSize: 14, fontWeight: 800, color: TEXT_DARK }}>Volunteer Status</span>
                                    <span style={{ background: ACCENT + '15', color: ACCENT, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                        {overviewStats.active_volunteers} Active
                                    </span>
                                </div>
                                <Link to="/organizer/volunteers" style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>Manage →</Link>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, textAlign: 'center' }}>
                                    <p style={{ fontSize: 10, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600, textTransform: 'uppercase' }}>On Duty</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981', margin: 0 }}>{overviewStats.active_volunteers}</p>
                                </div>
                                <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, textAlign: 'center' }}>
                                    <p style={{ fontSize: 10, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600, textTransform: 'uppercase' }}>Tasks</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: ACCENT2, margin: 0 }}>
                                        {Object.keys(incidents).length + Object.keys(sosAlerts).length}
                                    </p>
                                </div>
                                <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, textAlign: 'center' }}>
                                    <p style={{ fontSize: 10, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600, textTransform: 'uppercase' }}>Response Time</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', margin: 0 }}>2.3m</p>
                                </div>
                            </div>

                            <div style={{ marginTop: 12, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: 0, fontWeight: 600 }}>
                                    All volunteers online • 
                                    <span style={{ color: ACCENT, fontWeight: 700, marginLeft: 4 }}>Last updated: {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago</span>
                                </p>
                            </div>
                        </div>

                        {/* ── ⚠️ SAFETY ALERTS WIDGET (HIGH DENSITY WARNINGS) ─────────────────── */}
                        {Object.keys(locations).length > 20 && (
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <AlertTriangle size={20} color="#f59e0b" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', margin: 0 }}>Safety Alert</p>
                                        <p style={{ fontSize: 12, color: TEXT_MID, margin: '2px 0 0 0' }}>High crowd density detected</p>
                                    </div>
                                </div>

                                <div style={{ padding: '12px 16px', background: '#f59e0b08', borderRadius: 10, marginBottom: 12 }}>
                                    <p style={{ fontSize: 13, color: TEXT_DARK, margin: 0, fontWeight: 600 }}>
                                        {Object.keys(locations).length} attendees in venue
                                    </p>
                                    <p style={{ fontSize: 11, color: TEXT_MID, margin: '4px 0 0 0' }}>
                                        {Math.round((Object.keys(locations).length / overviewStats.unique_attendees) * 100)}% density • Recommend additional monitors in entry/exit areas
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => navigate(`/organizer/live-map/${targetEventId}`)}
                                        style={{ flex: 1, padding: '8px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        View Map
                                    </button>
                                    <button
                                        onClick={() => navigate('/organizer/volunteers')}
                                        style={{ flex: 1, padding: '8px 12px', background: '#f1f5f9', color: TEXT_DARK, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Dispatch
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── TICKET SALES & REVENUE ROW ────────────────────────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

                            {/* Ticket Sales - Donut Chart */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Ticket Sales</span>
                                    <select 
                                        value={timeframe} 
                                        onChange={e => setTimeframe(e.target.value)}
                                        style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#f8fafc', fontSize: 12, color: TEXT_MID, cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option>This Week</option>
                                        <option>This Month</option>
                                        <option>This Year</option>
                                    </select>
                                </div>

                                {/* Donut */}
                                <div style={{ position: 'relative', height: 200, minHeight: 200 }}>
                                    <ResponsiveContainer width="100%" height={200} minWidth={150}>
                                        <PieChart>
                                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                                dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                                                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Centre label */}
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none',
                                    }}>
                                        <p style={{ fontSize: 10, color: TEXT_MID, marginBottom: 2 }}>Total Ticket</p>
                                        <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>
                                            {totalTickets.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Legend rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                    {donutData.map((d, i) => {
                                        const pct = Math.round((d.value / totalTickets) * 100);
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                                                    <div>
                                                        <p style={{ fontSize: 10, color: TEXT_MID, margin: 0 }}>{d.name}</p>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{d.value.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 8,
                                                    background: d.color + '15', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, fontWeight: 700, color: d.color,
                                                }}>
                                                    {pct}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sales Revenue — bar chart */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>Sales Revenue</span>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '4px 0 2px' }}>Total Revenue</p>
                                        <p style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Rs. {totalRevenueVal.toLocaleString()}</p>
                                    </div>
                                    <select 
                                        value={timeframe} 
                                        onChange={e => setTimeframe(e.target.value)}
                                        style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#f8fafc', fontSize: 12, color: TEXT_MID, cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option>This Week</option>
                                        <option>This Month</option>
                                        <option>This Year</option>
                                    </select>
                                </div>
                                <ResponsiveContainer width="100%" height={220} minWidth={300}>
                                    <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 35, bottom: 0 }} barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: TEXT_MID }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: TEXT_MID }} axisLine={false} tickLine={false}
                                            tickFormatter={v => `${v / 1000}K`} />
                                        <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                        <Bar dataKey="revenue" fill={ACCENT2} radius={[4, 4, 0, 0]} maxBarSize={24} />
                                        <Bar dataKey="profit" fill={ACCENT3} radius={[4, 4, 0, 0]} maxBarSize={6} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ── Popular Events ────────────────────────────────────────────────────── */}
                        <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Popular Events</span>
                                <select 
                                    value={timeframe} 
                                    onChange={e => setTimeframe(e.target.value)}
                                    style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#f8fafc', fontSize: 12, color: TEXT_MID, cursor: 'pointer', outline: 'none' }}
                                >
                                    <option>This Week</option>
                                    <option>This Month</option>
                                    <option>This Year</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {POPULAR_CATEGORIES.map((cat, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', alignItems: 'center', gap: 16 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK }}>{cat.name}</span>
                                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: 6, transition: 'width 0.8s ease' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.pct}%</span>
                                            <span style={{ fontSize: 12, color: TEXT_MID }}>{cat.events} Events</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── All Events cards ──────────────────────────────────────────────────── */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK }}>All Events</span>
                                <Link to="/events" style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>View All Events →</Link>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                                {FEATURED_EVENTS.map(ev => (
                                    <div 
                                        key={ev.id} 
                                        onClick={() => navigate(`/events/${ev.id}`)}
                                        style={{ background: CARD_BG, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)';
                                        }}
                                    >
                                        <div style={{ position: 'relative', height: 160, background: '#f0f0f0' }}>
                                            <img src={ev.img} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.src = getPlaceholderImage(ev.tag); }} />
                                            <span style={{
                                                position: 'absolute', top: 10, left: 10,
                                                background: 'rgba(255,255,255,0.92)', color: TEXT_DARK,
                                                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                                            }}>{ev.tag}</span>
                                        </div>
                                        <div style={{ padding: '14px 16px' }}>
                                            <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 4 }}>{ev.title}</p>
                                            <p style={{ fontSize: 12, color: TEXT_MID, marginBottom: 12 }}>{ev.venue}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: TEXT_MID }}>
                                                    <Calendar size={12} /> {ev.date}
                                                </div>
                                                <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT2 }}>{ev.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Recent Bookings table ─────────────────────────────────────────────── */}
                        <div style={{ background: CARD_BG, borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                            {/* Table header */}
                            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Recent Bookings</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                        <input
                                            placeholder="Search name, event, etc."
                                            value={bookingSearch}
                                            onChange={e => setBookingSearch(e.target.value)}
                                            style={{ padding: '7px 14px 7px 32px', border: `1px solid ${BORDER}`, borderRadius: 18, fontSize: 12, outline: 'none', background: '#f8fafc', width: 200, fontFamily: 'inherit', color: TEXT_DARK }}
                                        />
                                    </div>
                                    <select 
                                        value={timeframe} 
                                        onChange={e => setTimeframe(e.target.value)}
                                        style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#f8fafc', fontSize: 12, color: TEXT_MID, cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option>This Week</option>
                                        <option>This Month</option>
                                        <option>This Year</option>
                                    </select>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Invoice ID', 'Date', 'Name', 'Event', 'Qty', 'Amount', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.07em', background: '#f8fafc', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {RECENT_BOOKINGS.map((b, i) => (
                                        <tr key={i}
                                            onClick={() => navigate(`/invoices`)}
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` }}>{b.id}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_MID, borderBottom: `1px solid #f1f5f9`, whiteSpace: 'nowrap' }}>
                                                {b.date.split(' ')[0]}<br />
                                                <span style={{ fontSize: 11 }}>{b.date.split(' ').slice(1).join(' ')}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` }}>{b.name}</td>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid #f1f5f9` }}>
                                                <p style={{ fontSize: 13, color: TEXT_DARK, margin: 0 }}>{b.event}</p>
                                                <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>{b.type}</p>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9`, textAlign: 'center' }}>{b.qty}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` }}>{b.amount}</td>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid #f1f5f9` }}>
                                                <span style={{ ...statusStyle(b.status), display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                                    {b.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}
            </main>
            
            {/* Modal for delete confirmation */}
            {modalConfig.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: '24px', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT_DARK, margin: '0 0 8px 0' }}>Delete Event</h3>
                        <p style={{ fontSize: 14, color: TEXT_MID, margin: '0 0 20px 0' }}>Are you sure you want to delete "{modalConfig.eventName}"? This action cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setModalConfig({ isOpen: false, eventId: null, eventName: '' })} style={{ flex: 1, padding: '10px', border: `1px solid ${BORDER}`, borderRadius: 8, background: 'transparent', color: TEXT_MID, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleDelete} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-border { 0% { border-color: #EF4444; } 50% { border-color: rgba(239, 68, 68, 0.2); } 100% { border-color: #EF4444; } }
                @keyframes pulse-sos { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0.5; transform: scale(1.2); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .animate-pulse { animation: pulse 1s infinite alternate; }
                @keyframes pulse { from { opacity: 1; } to { opacity: 0.6; } }
            `}</style>
        </div>
    );
}

export default EventDashboard;
