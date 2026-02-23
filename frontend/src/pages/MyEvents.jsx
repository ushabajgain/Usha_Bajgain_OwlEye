import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { Calendar, MapPin, Ticket, Search, Loader2, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const MyEvents = () => {
    const navigate = useNavigate();
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchJoinedEvents();
    }, []);

    const fetchJoinedEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tickets/my-tickets/');
            // Extract unique events from tickets
            const uniqueEvents = [];
            const eventIds = new Set();
            
            res.data.forEach(ticket => {
                if (ticket.event_details && !eventIds.has(ticket.event_details.id)) {
                    eventIds.add(ticket.event_details.id);
                    uniqueEvents.push(ticket.event_details);
                }
            });
            
            setMyEvents(uniqueEvents);
        } catch (err) {
            console.error("Failed to fetch joined events", err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = myEvents.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.venue_address.toLowerCase().includes(search.toLowerCase())
    );

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 },
        card: { background: CARD_BG, borderRadius: 20, overflow: 'hidden', border: `1px solid ${BORDER}`, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
        img: { width: '100%', height: 180, objectFit: 'cover' },
        cardBody: { padding: 20 },
        title: { fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: '0 0 12px 0' },
        meta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: TEXT_MID, marginBottom: 8 },
        btnRow: { display: 'flex', gap: 12, marginTop: 20 },
        btn: (primary) => ({
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: primary ? 'none' : `1px solid ${BORDER}`,
            background: primary ? ACCENT : '#fff',
            color: primary ? '#fff' : TEXT_DARK,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="My Events" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    <div style={{ marginBottom: 24, position: 'relative', maxWidth: 400 }}>
                        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                        <input 
                            placeholder="Search your events..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: 12, border: `1px solid ${BORDER}`, outline: 'none', fontSize: 14 }} 
                        />
                    </div>

                    {loading ? (
                        <div style={{ padding: 100, textAlign: 'center' }}><Loader2 className="animate-spin" color={ACCENT} /></div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 24, border: `1px dashed ${BORDER}` }}>
                            <Calendar size={48} color={TEXT_MID} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <h3 style={{ color: TEXT_DARK }}>No events found</h3>
                            <p style={{ color: TEXT_MID }}>Search for new events to join!</p>
                            <button onClick={() => navigate('/events')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: ACCENT, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Browse Events</button>
                        </div>
                    ) : (
                        <div style={s.grid}>
                            {filtered.map(e => (
                                <div key={e.id} style={s.card}>
                                    <img src={e.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80'} style={s.img} alt={e.name} onError={(img) => { img.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80'; }} />
                                    <div style={s.cardBody}>
                                        <h3 style={s.title}>{e.name}</h3>
                                        <div style={s.meta}>
                                            <Calendar size={14} color={ACCENT} />
                                            <span>{new Date(e.start_datetime).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                            <Clock size={14} color={ACCENT} style={{ marginLeft: 8 }} />
                                            <span>{new Date(e.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={s.meta}>
                                            <MapPin size={14} color={ACCENT} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.venue_address}</span>
                                        </div>
                                        
                                        <div style={s.btnRow}>
                                            <button onClick={() => navigate(`/events/${e.id}`)} style={s.btn(false)}>View Details</button>
                                            <button onClick={() => navigate(`/event/${e.id}/tickets`)} style={s.btn(true)}><Ticket size={16} /> View Tickets</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                            <Footer />
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default MyEvents;
