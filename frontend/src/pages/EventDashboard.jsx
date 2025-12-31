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


// ── palette (mapped to design-system tokens) ─────────────────────────────
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const ACCENT2 = C.secondary;
const ACCENT3 = C.navy;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

// ── helpers ────────────────────────────────────────────────────────────────────
const getPlaceholderImage = (category) => {
    // Generate a placeholder image based on category using a placeholder service
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

// ── main component ─────────────────────────────────────────────────────────────
import { useSafetySocket } from '../hooks/useSafetySocket';

const EventDashboard = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [bookings, setBookings] = useState([]);
    const [bookingSearch, setBookingSearch] = useState('');
    const [targetEventId, setTargetEventId] = useState('1');
    const [timeframe, setTimeframe] = useState('This Year');
    
    // Safety Data from Global Context
    const { incidents, sosAlerts, locations = {}, loading: safetyLoading, tickets, events: eventsContext } = useSafetySocket(targetEventId);

    // Derive safety stats from context data
    const safetyStats = useMemo(() => {
        const locationValues = Object.values(locations);
        const volunteers = locationValues.filter(l => l.role === 'volunteer').length;
        const activeUsers = locationValues.length;
        return {
            active_volunteers: volunteers,
            active_users: activeUsers
        };
    }, [locations]);

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
                }
            }
        } catch (err) {
            console.error("Dashboard primary init failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') {
            navigate('/events');
            return;
        }
        fetchAll();
    }, [navigate]);




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
                
                // Show active events first
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                
                if (aActive) {
                    // Active: soonest first
                    return new Date(a.start_datetime) - new Date(b.start_datetime);
                } else {
                    // Past: most recent first
                    return new Date(b.end_datetime) - new Date(a.end_datetime);
                }
            });
    }, [events, searchQuery]);

    // Filtered incidents and SOS for display
    const activeIncidents = useMemo(() => Object.values(incidents), [incidents]);
    const activeSOS = useMemo(() => Object.values(sosAlerts), [sosAlerts]);

    // Derived stats
    const upcomingEvents = events.filter(e => !e.is_past).length;
    const totalBookings = filteredBookingsByTime.length;
    
    // Calculate tickets sold including real-time scans/updates
    const ticketsSold = useMemo(() => {
        const initial = filteredBookingsByTime.reduce((a, c) => a + (c.tickets?.length || 0), 0);
        // If we have real-time tickets in context, we could sync them here, 
        // but for now we'll stick to initial + live SOS/Incident counts
        return initial;
    }, [filteredBookingsByTime]);
    
    const totalCapacity = filteredEventsByTime.reduce((a, c) => a + (c.capacity || 0), 0);


    // Donut data for ticket sales
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

                <PageHeader title="Dashboard" />

                {/* Loading State */}
                {loading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Loader2 size={40} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 16 }} />
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading your dashboard...</p>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && events.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
                        <div style={{ textAlign: 'center', maxWidth: 400 }}>
                            <div style={{ width: 80, height: 80, background: CARD_BG, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `2px solid ${BORDER}` }}>
                                <CalendarDays size={40} color={TEXT_MID} />
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: '0 0 8px 0' }}>No Events Yet</h2>
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: '0 0 20px 0' }}>Create your first event to get started and manage attendees, bookings, and safety.</p>
                            <Link to="/organizer/create-event" style={{ display: 'inline-block', padding: '10px 24px', background: ACCENT, color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Create Event</Link>
                        </div>
                    </div>
                )}

                {/* Main Content - Analytics Dashboard */}
                {!loading && events.length > 0 && (
                    <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                        
                        {/* ── TOP 3 STAT CARDS ──────────────────────────────────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 32 }}>
                            {/* Upcoming Events */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <CalendarDays size={24} color={ACCENT} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 12, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600 }}>Upcoming Events</p>
                                    <p style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{upcomingEvents}</p>
                                </div>
                            </div>

                            {/* Total Bookings */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: ACCENT2 + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <BookOpen size={24} color={ACCENT2} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 12, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600 }}>Total Bookings</p>
                                    <p style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{totalBookings}</p>
                                </div>
                            </div>

                            {/* Tickets Sold */}
                            <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: ACCENT3 + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <TicketIcon size={24} color={ACCENT3} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 12, color: TEXT_MID, margin: '0 0 6px 0', fontWeight: 600 }}>Tickets Sold</p>
                                    <p style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{ticketsSold}</p>
                                </div>
                            </div>
                        </div>

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
                                <div style={{ position: 'relative', height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
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
                                <ResponsiveContainer width="100%" height={220}>
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
                                    <div key={ev.id} style={{ background: CARD_BG, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
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
