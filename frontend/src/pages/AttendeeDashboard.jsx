import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import {
    CalendarDays, Ticket as TicketIcon, MapPin, 
    ArrowRight, Star, Clock, Heart, 
    LayoutDashboard, TrendingUp, Search, ChevronDown, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole, getFullName } from '../utils/auth';
import { useSafetySocket } from '../hooks/useSafetySocket';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const ACCENT2 = C.secondary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const AttendeeDashboard = () => {
    const navigate = useNavigate();
    const fullName = getFullName() || 'User';
    const [events, setEvents] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { safetyAlerts, isConnected } = useSafetySocket('1');

    useEffect(() => {
        const role = getRole();
        if (role !== 'attendee' && role !== 'admin') {
            navigate('/events');
            return;
        }
        fetchData();

        // Poll for changes every 30 seconds
        const pollInterval = setInterval(() => {
            fetchData();
        }, 30000);

        // Listen for visibility changes (when user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [evRes, tkRes] = await Promise.all([
                api.get('/events/'),
                api.get('/tickets/my-tickets/')
            ]);
            setEvents(Array.isArray(evRes.data) ? evRes.data : []);
            setTickets(Array.isArray(tkRes.data) ? tkRes.data : []);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Stats
    const totalSpent = useMemo(() => {
        return tickets.reduce((acc, t) => acc + parseFloat(t.price_at_purchase || 0), 0);
    }, [tickets]);

    const upcomingEvent = useMemo(() => {
        const now = new Date();
        const active = tickets
            .filter(t => t.event_details && new Date(t.event_details.start_datetime) > now)
            .map(t => t.event_details)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        return active[0];
    }, [tickets]);

    // Chart Data (Events attended per month)
    const chartData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = months.map(m => ({ month: m, count: 0 }));
        tickets.forEach(t => {
            const date = new Date(t.created_at);
            data[date.getMonth()].count += 1;
        });
        return data;
    }, [tickets]);

    // Pie chart (Category distribution)
    const pieData = useMemo(() => {
        const cats = {};
        tickets.forEach(t => {
            const c = t.event_details?.category || 'Other';
            cats[c] = (cats[c] || 0) + 1;
        });
        const colors = [ACCENT, ACCENT2, '#F59E0B', '#10B981', '#6366F1'];
        const data = Object.entries(cats).map(([name, value], i) => ({
            name, value, color: colors[i % colors.length]
        }));
        return data.length > 0 ? data : [{ name: 'No Data', value: 0, color: '#e2e8f0' }];
    }, [tickets]);

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG, overflowX: 'hidden' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <PageHeader title="Dashboard" />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 size={40} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG, overflowX: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PageHeader title="Dashboard" />
                
                <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                        {[
                            { label: 'Total Tickets', value: tickets.length, icon: TicketIcon, color: ACCENT },
                            { label: 'Upcoming', value: tickets.filter(t => new Date(t.event_details?.start_datetime) > new Date()).length, icon: CalendarDays, color: ACCENT2 },
                            { label: 'Spent', value: `Rs. ${totalSpent.toLocaleString()}`, icon: TrendingUp, color: '#10B981' },
                            { label: 'Saved', value: 0, icon: Heart, color: '#EF4444' }
                        ].map((s, i) => (
                            <div key={i} style={{ background: CARD_BG, borderRadius: 16, padding: '22px 24px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <s.icon size={20} color={s.color} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
                        {/* Left Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
                            {/* Upcoming Events */}
                            <div style={{ background: CARD_BG, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, marginBottom: 20 }}>Upcoming Events</h3>
                                <div style={{ display: 'grid', gap: 16 }}>
                                    {(events || [])
                                        .filter(ev => !ev.is_past)
                                        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                                        .slice(0, 3).map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', gap: 16, padding: 12, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => navigate(`/events/${ev.id}`)}>
                                            <div style={{ position: 'relative' }}>
                                                {ev.image ? (
                                                    <img src={ev.image} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: 80, height: 80, borderRadius: 10, background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <CalendarDays size={24} color={ACCENT} />
                                                    </div>
                                                )}
                                                {ev.is_sold_out && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Sold Out</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px 0' }}>{ev.name}</h4>
                                                <p style={{ fontSize: 12, color: TEXT_MID, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={12} /> {new Date(ev.start_datetime).toLocaleDateString()}</p>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase' }}>{ev.category}</div>
                                            </div>
                                            <div style={{ alignSelf: 'center' }}><ArrowRight size={18} color={TEXT_MID} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommended for You */}
                            <div style={{ background: CARD_BG, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, marginBottom: 20 }}>Recommended for You</h3>
                                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                                    {events.slice(3, 7).map(ev => (
                                        <div key={ev.id} style={{ minWidth: 200, borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }} onClick={() => navigate(`/events/${ev.id}`)}>
                                            <img src={ev.image_url} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                                            <div style={{ padding: 12 }}>
                                                <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</h4>
                                                <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>{ev.category}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
                             {/* Event Announcements */}
                             <div style={{ background: '#FFF7ED', borderRadius: 20, padding: 24, border: '1px solid #FFEDD5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <div style={{ position: 'relative' }}>
                                        <TrendingUp size={18} color="#EA580C" />
                                        {isConnected && <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid #FFF7ED' }} />}
                                    </div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#9A3412', margin: 0 }}>Announcements</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {safetyAlerts.length > 0 ? safetyAlerts.slice(0, 3).map((a, i) => (
                                        <div key={i} style={{ borderBottom: i < 2 ? '1px solid #FFEDD5' : 'none', paddingBottom: i < 2 ? 12 : 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <b style={{ fontSize: 13, color: '#9A3412' }}>{a.title}</b>
                                                <span style={{ fontSize: 10, color: '#C2410C' }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 12, color: '#C2410C', lineHeight: 1.4 }}>{a.message}</p>
                                        </div>
                                    )) : (
                                        <p style={{ margin: 0, fontSize: 12, color: '#C2410C', opacity: 0.6 }}>No new announcements at this time.</p>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats Summary */}
                            <div style={{ background: CARD_BG, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK, marginBottom: 16, margin: 0 }}>My Activity</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: TEXT_MID }}>Total Bookings</span>
                                        <b style={{ fontSize: 15, color: TEXT_DARK }}>{tickets.length}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: TEXT_MID }}>Joined Events</span>
                                        <b style={{ fontSize: 15, color: TEXT_DARK }}>{[...new Set(tickets.map(t => t.event_details?.id))].length}</b>
                                    </div>
                                </div>
                            </div>

                            {/* Discover More */}
                            <div style={{ background: ACCENT, borderRadius: 20, padding: 24, color: '#fff', textAlign: 'center' }}>
                                <Search size={32} color="#fff" style={{ marginBottom: 16, opacity: 0.8 }} />
                                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Discover more events?</h4>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>Explore trending events in your city and book your spot.</p>
                                <button onClick={() => navigate('/events')} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#fff', color: ACCENT, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Explore Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AttendeeDashboard;
