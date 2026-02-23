import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import {
    CalendarDays, Ticket as TicketIcon, MapPin, 
    ArrowRight, Star, Clock, Heart, 
    LayoutDashboard, TrendingUp, Search, ChevronDown, Loader2,
    Bell, AlertTriangle, Shield, User
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole, getFullName } from '../utils/auth';
import { useSafetySocket } from '../hooks/useSafetySocket';
import { useSafety } from '../context/SafetySocketContext';
import Footer from '../components/Footer';

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
    const { safetyAlerts, isConnected, unreadCount, incidents, sosAlerts } = useSafety();
    
    const hasFetched = useRef(false);
    const pollIntervalRef = useRef(null);
    
    const activeEventId = useMemo(() => {
        const now = new Date();
        const activeTicket = tickets.find(t => 
            t.event_details && new Date(t.event_details.start_datetime) > now
        );
        return activeTicket?.event_details?.id || null;
    }, [tickets]);
    
    useSafetySocket(activeEventId || '1');

    const fetchData = useCallback(async (isInitial = false) => {
        if (isInitial) {
            console.log("[Dashboard] Initial fetch");
        } else {
            console.log("[Dashboard] Background fetch");
        }
        
        try {
            const [evRes, tkRes] = await Promise.all([
                api.get('/events/'),
                api.get('/tickets/my-tickets/')
            ]);
            setEvents(Array.isArray(evRes.data) ? evRes.data : []);
            setTickets(Array.isArray(tkRes.data) ? tkRes.data : []);
        } catch (err) {
            console.error("[Dashboard] Fetch error:", err);
        } finally {
            if (isInitial) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        console.log("[Dashboard] Mount - checking role");
        const role = getRole();
        if (role !== 'attendee') {
            navigate('/events');
            return;
        }

        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchData(true);
        }
    }, [navigate, fetchData]);

    useEffect(() => {
        console.log("[Dashboard] WebSocket connected:", isConnected);
        
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        if (!isConnected) {
            console.log("[Dashboard] Starting polling fallback");
            pollIntervalRef.current = setInterval(() => {
                fetchData(false);
            }, 30000);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isConnected, fetchData]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isConnected) {
                console.log("[Dashboard] Tab visible - refreshing data");
                fetchData(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isConnected, fetchData]);

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

    const chartData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = months.map(m => ({ month: m, count: 0 }));
        tickets.forEach(t => {
            const date = new Date(t.created_at);
            data[date.getMonth()].count += 1;
        });
        return data;
    }, [tickets]);

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
                    <PageHeader title="Dashboard" notificationBadge={unreadCount} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 size={40} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                                <Footer />
            </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG, overflowX: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PageHeader title="Dashboard" notificationBadge={unreadCount} />
                
                <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Total Tickets', value: tickets.length, icon: TicketIcon, color: ACCENT },
                            { label: 'Upcoming', value: tickets.filter(t => new Date(t.event_details?.start_datetime) > new Date()).length, icon: CalendarDays, color: ACCENT2 },
                            { label: 'Spent', value: `Rs. ${totalSpent.toLocaleString()}`, icon: TrendingUp, color: '#10B981' },
                            { label: 'Saved', value: 0, icon: Heart, color: '#EF4444' }
                        ].map((s, i) => (
                            <div key={i} style={{ background: CARD_BG, borderRadius: 16, padding: 20, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <s.icon size={18} color={s.color} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_MID, textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 }}>{s.label}</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                            <div style={{ background: CARD_BG, borderRadius: 16, padding: 20, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 16 }}>Quick Actions</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <button 
                                        onClick={() => navigate('/attendee/sos')}
                                        style={{
                                            background: '#FEF2F2',
                                            border: '1px solid #FECACA',
                                            borderRadius: 12,
                                            padding: 16,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            transition: 'all 0.2s',
                                            height: 72
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <AlertTriangle size={20} color="#fff" />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C', margin: '0 0 2px 0' }}>Trigger SOS</h4>
                                            <p style={{ fontSize: 11, color: '#DC2626', margin: 0 }}>Emergency</p>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/report-incident')}
                                        style={{
                                            background: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: 12,
                                            padding: 16,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            transition: 'all 0.2s',
                                            height: 72
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Shield size={20} color="#fff" />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 2px 0' }}>Report Incident</h4>
                                            <p style={{ fontSize: 11, color: '#2563EB', margin: 0 }}>Safety issue</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {upcomingEvent && (
                                <div style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT2} 100%)`, borderRadius: 16, padding: 20, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.85, margin: '0 0 6px 0', letterSpacing: 0.5 }}>Current Event</p>
                                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{upcomingEvent.name}</h3>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                            <Clock size={14} color="#fff" style={{ marginBottom: 2 }} />
                                            <p style={{ fontSize: 10, fontWeight: 600, margin: 0 }}>{new Date(upcomingEvent.start_datetime).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                                        <MapPin size={14} color="#fff" />
                                        <p style={{ fontSize: 12, margin: 0, opacity: 0.95 }}>{upcomingEvent.location || upcomingEvent.venue || 'Location TBD'}</p>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/events/${upcomingEvent.id}`)}
                                        style={{ 
                                            background: '#fff', 
                                            color: ACCENT, 
                                            border: 'none', 
                                            borderRadius: 8, 
                                            padding: '10px 20px', 
                                            fontWeight: 600, 
                                            fontSize: 12, 
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        View Details <ArrowRight size={14} />
                                    </button>
                                </div>
                            )}

                            <div style={{ background: CARD_BG, borderRadius: 16, padding: 20, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 16 }}>Upcoming Events</h3>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {(events || [])
                                        .filter(ev => {
                                            const hasTicket = tickets.some(t => t.event_details?.id === ev.id);
                                            return hasTicket && !ev.is_past;
                                        })
                                        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                                        .slice(0, 3).map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(`/events/${ev.id}`)} onMouseEnter={e => e.currentTarget.style.background = `${BORDER}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                {ev.image ? (
                                                    <img src={ev.image} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: 64, height: 64, borderRadius: 10, background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <CalendarDays size={22} color={ACCENT} />
                                                    </div>
                                                )}
                                                {ev.is_sold_out && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Sold Out</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px 0' }}>{ev.name}</h4>
                                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={11} /> {new Date(ev.start_datetime).toLocaleDateString()}</p>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: ACCENT, textTransform: 'uppercase' }}>{ev.category}</div>
                                            </div>
                                            <div style={{ alignSelf: 'center', flexShrink: 0 }}><ArrowRight size={16} color={TEXT_MID} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: CARD_BG, borderRadius: 16, padding: 20, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 16 }}>Quick Picks</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                    {events
                                        .filter(ev => !tickets.some(t => t.event_details?.id === ev.id))
                                        .slice(0, 3).map(ev => (
                                        <div key={ev.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate(`/events/${ev.id}`)} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                            <img src={ev.image_url} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                                            <div style={{ padding: 10 }}>
                                                <h4 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</h4>
                                                <p style={{ fontSize: 10, color: TEXT_MID, margin: 0 }}>{ev.category}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
                            {(Object.values(sosAlerts).length > 0 || Object.values(incidents).length > 0) && (
                                <div style={{ background: CARD_BG, borderRadius: 16, padding: 18, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 14 }}>Safety Alerts</h3>
                                    {Object.values(sosAlerts).length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <AlertTriangle size={14} color="#DC2626" />
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>SOS Alerts</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {Object.values(sosAlerts).slice(0, 2).map((sos, i) => (
                                                    <div key={i} style={{ background: '#FEF2F2', borderRadius: 8, padding: 10, border: '1px solid #FECACA' }}>
                                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#B91C1C', margin: '0 0 3px 0' }}>
                                                            {sos.sos_type_display || sos.sos_type || 'Emergency'}
                                                        </p>
                                                        <p style={{ fontSize: 10, color: '#DC2626', margin: 0 }}>
                                                            {sos.message ? (sos.message.length > 40 ? sos.message.slice(0, 40) + '...' : sos.message) : 'No details'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Object.values(incidents).length > 0 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <Shield size={14} color="#2563EB" />
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Incidents</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {Object.values(incidents).slice(0, 2).map((inc, i) => (
                                                    <div key={i} style={{ background: '#EFF6FF', borderRadius: 8, padding: 10, border: '1px solid #BFDBFE' }}>
                                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', margin: '0 0 3px 0' }}>
                                                            {inc.incident_type || 'Incident'}
                                                        </p>
                                                        <p style={{ fontSize: 10, color: '#2563EB', margin: 0 }}>
                                                            {inc.description ? (inc.description.length > 40 ? inc.description.slice(0, 40) + '...' : inc.description) : 'No details'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ background: CARD_BG, borderRadius: 16, padding: 18, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 14 }}>Recent Bookings</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {tickets.slice(0, 5).map((ticket, i) => (
                                        <div key={i} style={{ borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none', paddingBottom: i < 4 ? 12 : 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                <h4 style={{ fontSize: 12, fontWeight: 600, color: TEXT_DARK, margin: 0 }}>
                                                    {ticket.event_details?.name ? (ticket.event_details.name.length > 25 ? ticket.event_details.name.slice(0, 25) + '...' : ticket.event_details.name) : 'Unknown Event'}
                                                </h4>
                                                <span style={{ 
                                                    fontSize: 10, 
                                                    fontWeight: 600, 
                                                    padding: '3px 8px', 
                                                    borderRadius: 4, 
                                                    background: ACCENT + '15',
                                                    color: ACCENT
                                                }}>
                                                    {ticket.status || 'Confirmed'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>
                                                {ticket.event_details?.start_datetime 
                                                    ? new Date(ticket.event_details.start_datetime).toLocaleDateString()
                                                    : 'Date TBD'}
                                            </p>
                                        </div>
                                    ))}
                                    {tickets.length === 0 && (
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: 0, textAlign: 'center' }}>No bookings yet</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ flex: 1, minHeight: 20 }} />

                            <div style={{ background: ACCENT, borderRadius: 16, padding: 36, color: '#fff', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                <Search size={40} color="#fff" style={{ marginBottom: 24, opacity: 0.9 }} />
                                <h4 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Discover Events?</h4>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 28, maxWidth: 220 }}>Explore trending events near you</p>
                                <button onClick={() => navigate('/events')} style={{ width: '100%', padding: '14px', borderRadius: 8, background: '#fff', color: ACCENT, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Explore Now</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Recommended for You</h3>
                            <button 
                                onClick={() => navigate('/events')}
                                style={{ 
                                    background: ACCENT + '12', 
                                    color: ACCENT, 
                                    border: 'none', 
                                    borderRadius: 8, 
                                    padding: '8px 14px', 
                                    fontWeight: 600, 
                                    fontSize: 12, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                See All <ArrowRight size={14} />
                            </button>
                        </div>
                        <div 
                            style={{ 
                                display: 'flex', 
                                gap: 16, 
                                overflowX: 'auto', 
                                paddingBottom: 16,
                                scrollSnapType: 'x mandatory',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}
                            className="recommended-scroll"
                        >
                            <style>{`
                                .recommended-scroll::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            {events
                                .filter(ev => !tickets.some(t => t.event_details?.id === ev.id))
                                .slice(0, 6).map((ev, index) => (
                                    <div 
                                        key={ev.id}
                                        style={{ 
                                            minWidth: 260,
                                            scrollSnapAlign: 'start',
                                            animation: `staggerReveal 0.5s ease-out ${index * 0.08}s both`,
                                            animationFillMode: 'both'
                                        }}
                                    >
                                        <div 
                                            style={{ 
                                                borderRadius: 16, 
                                                overflow: 'hidden', 
                                                border: `1px solid ${BORDER}`, 
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                position: 'relative',
                                                background: CARD_BG,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                            }}
                                            onClick={() => navigate(`/events/${ev.id}`)}
                                            onMouseEnter={(e) => {
                                                const card = e.currentTarget;
                                                card.style.transform = 'translateY(-6px) scale(1.02)';
                                                card.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
                                                const overlay = card.querySelector('.why-overlay');
                                                if (overlay) overlay.style.opacity = '1';
                                            }}
                                            onMouseLeave={(e) => {
                                                const card = e.currentTarget;
                                                card.style.transform = 'translateY(0) scale(1)';
                                                card.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                                                const overlay = card.querySelector('.why-overlay');
                                                if (overlay) overlay.style.opacity = '0';
                                            }}
                                        >
                                            <div style={{ position: 'relative', overflow: 'hidden' }}>
                                                <img 
                                                    src={ev.image_url} 
                                                    style={{ 
                                                        width: '100%', 
                                                        height: 140, 
                                                        objectFit: 'cover',
                                                        transition: 'transform 0.3s ease'
                                                    }} 
                                                />
                                                <div 
                                                    className="why-overlay"
                                                    style={{ 
                                                        position: 'absolute', 
                                                        inset: 0, 
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.3s ease',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'flex-end',
                                                        padding: 14
                                                    }}
                                                >
                                                    <div style={{ 
                                                        background: 'rgba(255,255,255,0.15)',
                                                        backdropFilter: 'blur(10px)',
                                                        borderRadius: 8,
                                                        padding: 10,
                                                        animation: 'fadeInOverlay 0.3s ease-out 0.1s both'
                                                    }}>
                                                        <p style={{ fontSize: 10, fontWeight: 600, color: '#fff', margin: '0 0 3px 0' }}>Why Recommended</p>
                                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                                                            {index === 0 ? 'Trending in your area' : 
                                                             index === 1 ? 'Matches your interests' : 
                                                             index === 2 ? 'Highly rated by attendees' : 
                                                             index === 3 ? 'Near your location' : 
                                                             index === 4 ? 'Similar to events you like' : 
                                                             'Curated for you'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ padding: 14 }}>
                                                <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</h4>
                                                <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 8px 0' }}>{ev.category}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT }}>
                                                        {ev.price ? `Rs. ${ev.price}` : 'Free'}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: TEXT_MID }}>
                                                        {ev.start_datetime ? new Date(ev.start_datetime).toLocaleDateString() : 'Date TBD'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            {events.filter(ev => !tickets.some(t => t.event_details?.id === ev.id)).length === 0 && (
                                <div style={{ minWidth: '100%', padding: 40, textAlign: 'center', borderRadius: 16, border: `1px dashed ${BORDER}`, background: `${BORDER}08` }}>
                                    <p style={{ fontSize: 13, color: TEXT_MID, margin: 0 }}>No recommendations available at the moment</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                            <Footer />
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes staggerReveal {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes fadeInOverlay {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

export default AttendeeDashboard;
