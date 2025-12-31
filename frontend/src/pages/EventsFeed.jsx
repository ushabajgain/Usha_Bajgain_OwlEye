import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue with Vite
const Leaflet = L.default || L;
import Sidebar from '../components/Sidebar';
import {
    Search, Calendar, MapPin, LayoutGrid, List,
    Users, ArrowRight, Loader2, Plus, TrendingUp, Filter,
    Edit, Trash2, AlertTriangle, X, ChevronDown, Heart
} from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole } from '../utils/auth';

const SIDEBAR_W = 230;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const CATEGORIES = [
    'All Category', 'Music', 'Sports', 'Fashion', 'Art & Design',
    'Food & Culinary', 'Technology', 'Health & Wellness',
    'Outdoor & Adventure', 'Business', 'Education', 'Other'
];


const ModalMap = ({ lat, lng }) => {
    const mapRef = React.useRef(null);
    const mapInst = React.useRef(null);

    React.useEffect(() => {
        if (!mapRef.current) return;
        if (mapInst.current) {
            mapInst.current.remove();
        }
        const Leaflet = L.default || L;
        mapInst.current = Leaflet.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 15);
        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInst.current);
        
        if (Leaflet.Icon) {
            const icon = new Leaflet.Icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41],
            });
            Leaflet.marker([lat, lng], { icon }).addTo(mapInst.current);
        }
        return () => {
            if (mapInst.current) {
                mapInst.current.remove();
                mapInst.current = null;
            }
        };
    }, [lat, lng]);

    return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};

const EventsFeed = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Active');
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Category');
    const [page, setPage] = useState(1);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mapEvent, setMapEvent] = useState(null);
    const [likesMap, setLikesMap] = useState({});
    const PER_PAGE = 8;

    const userRole = getRole();
    const isOrganizer = userRole === 'organizer' || userRole === 'admin';

    // Sync initial like states from API
    useEffect(() => {
        const map = {};
        events.forEach(e => { map[e.id] = { liked: e.is_liked || false, count: e.like_count || 0 }; });
        setLikesMap(map);
    }, [events]);

    const handleLike = async (e, eventId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await api.post(`/events/${eventId}/like/`);
            setLikesMap(prev => ({ ...prev, [eventId]: { liked: res.data.is_liked, count: res.data.like_count } }));
        } catch (err) {
            console.error('Like failed', err);
        }
    };

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events/');
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch events:', err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/events/${deleteConfirmId}/`);
            setEvents(events.filter(e => e.id !== deleteConfirmId));
            setDeleteConfirmId(null);
        } catch (err) {
            alert('Failed to delete event.');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredEvents = events.filter(evt => {
        const matchesSearch =
            evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (evt.venue_address || '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (selectedCategory !== 'All Category' && evt.category !== selectedCategory) return false;

        if (activeTab === 'Active') return !evt.is_past;
        if (activeTab === 'Past') return evt.is_past;
        return true;
    }).sort((a, b) => {
        if (activeTab === 'Active') {
            return new Date(a.start_datetime) - new Date(b.start_datetime);
        } else if (activeTab === 'Past') {
            return new Date(b.end_datetime) - new Date(a.end_datetime);
        }
        return 0;
    });

    const tabCounts = {
        Active: events.filter(e => !e.is_past).length,
        Past: events.filter(e => e.is_past).length,
    };

    const totalPages = Math.ceil(filteredEvents.length / PER_PAGE);
    const pagedEvents = filteredEvents.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const getCapacityPct = (evt) => {
        const cap = parseInt(evt.capacity);
        const count = parseInt(evt.attendee_count) || 0;
        if (!cap || cap <= 0) return 0;
        return Math.round((count / cap) * 100);
    };

    const CardView = ({ evt }) => {
        const pct = getCapacityPct(evt);
        return (
            <Link to={`/events/${evt.id}`}
                style={{ background: CARD_BG, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, textDecoration: 'none', color: TEXT_DARK, display: 'block', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = ''; }}>
                <div style={{ position: 'relative', height: 170, overflow: 'hidden' }}>
                    {evt.image ? (
                        <img src={evt.image} alt={evt.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={48} color={ACCENT} style={{ opacity: 0.3 }} />
                        </div>
                    )}
                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '3px 10px', borderRadius: 20 }}>{evt.category}</span>
                        {evt.is_sold_out && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#ef4444', padding: '3px 10px', borderRadius: 20, boxShadow: '0 2px 4px rgba(239,68,68,0.3)' }}>SOLD OUT</span>
                        )}
                    </div>
                    {isOrganizer && (
                        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                            <Link to={`/organizer/edit-event/${evt.id}`} onClick={e => e.stopPropagation()}
                                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                                <Edit size={14} />
                            </Link>
                            <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(evt.id); }}
                                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: TEXT_MID, marginBottom: 4 }}>
                        {(() => {
                            try {
                                return evt.start_datetime 
                                    ? new Date(evt.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' — ' + new Date(evt.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) 
                                    : 'TBD';
                            } catch (e) { return 'TBD'; }
                        })()}
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, marginBottom: 6, lineHeight: 1.3 }}>{evt.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: TEXT_MID, fontSize: 12, marginBottom: 12 }}>
                        <MapPin size={11} />
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.venue_address}</div>
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMapEvent(evt); }}
                            style={{ fontSize: 10, fontWeight: 700, color: '#d946ef', background: '#fff', border: `1px solid #f1f5f9`, borderRadius: 20, padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            Show Map
                        </button>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ height: 4, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: ACCENT, borderRadius: 4, transition: 'width 0.4s' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={(e) => handleLike(e, evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'transform 0.2s' }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <Heart size={16} fill={likesMap[evt.id]?.liked ? '#ef4444' : 'none'} color={likesMap[evt.id]?.liked ? '#ef4444' : TEXT_MID} />
                                <span style={{ fontSize: 12, color: TEXT_MID, fontWeight: 600 }}>{likesMap[evt.id]?.count || 0}</span>
                            </button>
                            <span style={{ fontSize: 12, color: TEXT_MID, marginLeft: 8 }}>{pct}%</span>
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>Rs. {Number(evt.price).toLocaleString()}</span>
                    </div>
                </div>
            </Link>
        );
    };

    const ListView = ({ evt }) => (
        <Link to={`/events/${evt.id}`}
            style={{ background: CARD_BG, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, textDecoration: 'none', color: TEXT_DARK, display: 'flex', alignItems: 'center', gap: 16, padding: 14, transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}>
            <img src={evt.image || 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=200&q=80'} alt={evt.name}
                style={{ width: 88, height: 66, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT }}>{evt.category}</span>
                    {evt.is_sold_out && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>• Sold Out</span>
                    )}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.name}</h3>
                <div style={{ display: 'flex', gap: 16, color: TEXT_MID, fontSize: 12, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} /> 
                        {(() => {
                            try {
                                return evt.start_datetime ? new Date(evt.start_datetime).toLocaleDateString() : 'TBD';
                            } catch (e) { return 'TBD'; }
                        })()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {evt.venue_address}</span>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMapEvent(evt); }}
                        style={{ fontSize: 10, fontWeight: 700, color: '#d946ef', background: '#fff', border: `1px solid #f1f5f9`, borderRadius: 20, padding: '2px 8px', cursor: 'pointer' }}
                    >
                        Show Map
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={(e) => handleLike(e, evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Heart size={16} fill={likesMap[evt.id]?.liked ? '#ef4444' : 'none'} color={likesMap[evt.id]?.liked ? '#ef4444' : TEXT_MID} />
                    <span style={{ fontSize: 12, color: TEXT_MID, fontWeight: 600 }}>{likesMap[evt.id]?.count || 0}</span>
                </button>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: ACCENT }}>Rs. {Number(evt.price).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: TEXT_MID }}>{evt.capacity.toLocaleString()} seats</div>
                </div>
                {isOrganizer && (
                    <div style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/organizer/edit-event/${evt.id}`} onClick={e => e.stopPropagation()}
                            style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit size={14} />
                        </Link>
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(evt.id); }}
                            style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
                <ArrowRight size={16} color={TEXT_MID} />
            </div>
        </Link>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: SIDEBAR_W, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                <PageHeader title="Events" breadcrumb="Dashboard" />
                <div style={{ padding: '24px 32px', flex: 1 }}>

                    {/* Top bar: tabs + Add button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
                            {['Active', 'Past'].map(tab => (
                                <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
                                    style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === tab ? ACCENT : 'transparent', color: activeTab === tab ? '#fff' : TEXT_MID, transition: 'all 0.15s' }}>
                                    {tab} {tabCounts[tab] > 0 && <span style={{ fontSize: 11, marginLeft: 3, opacity: 0.8 }}>({tabCounts[tab]})</span>}
                                </button>
                            ))}
                        </div>

                        {/* Search + filters + Add button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative', height: 32 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                                    placeholder="Search event, location, etc"
                                    style={{ height: '100%', padding: '0 14px 0 32px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, width: 220, outline: 'none', background: CARD_BG, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ position: 'relative', height: 32 }}>
                                <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
                                    style={{ height: '100%', padding: '0 32px 0 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, background: CARD_BG, outline: 'none', cursor: 'pointer', boxSizing: 'border-box', appearance: 'none' }}>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID, pointerEvents: 'none' }} />
                            </div>
                            <button onClick={() => setViewMode('grid')}
                                style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: viewMode === 'grid' ? ACCENT : CARD_BG, color: viewMode === 'grid' ? '#fff' : TEXT_MID, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
                                <LayoutGrid size={15} />
                            </button>
                            <button onClick={() => setViewMode('list')}
                                style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: viewMode === 'list' ? ACCENT : CARD_BG, color: viewMode === 'list' ? '#fff' : TEXT_MID, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
                                <List size={15} />
                            </button>
                            {isOrganizer && (
                                <Link to="/organizer/create-event"
                                    style={{ height: 32, display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(79,70,229,0.3)', transition: 'background 0.15s', boxSizing: 'border-box' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#4338CA'}
                                    onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
                                    <Plus size={15} /> Add New Event
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Events grid/list */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                            <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : pagedEvents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: TEXT_MID }}>
                            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
                            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No {activeTab.toLowerCase()} events found.</p>
                            <p style={{ fontSize: 13 }}>
                                {isOrganizer
                                    ? <Link to="/organizer/create-event" style={{ color: ACCENT, fontWeight: 600 }}>Create your first event →</Link>
                                    : 'Check back later for upcoming events.'}
                            </p>
                        </div>
                    ) : (
                        <div style={viewMode === 'grid'
                            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }
                            : { display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {pagedEvents.map(evt =>
                                viewMode === 'grid'
                                    ? <CardView key={evt.id} evt={evt} />
                                    : <ListView key={evt.id} evt={evt} />
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
                            <div style={{ fontSize: 13, color: TEXT_MID }}>
                                Showing <select value={PER_PAGE} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 6px', fontSize: 13 }}><option>8</option></select> out of {filteredEvents.length}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setPage(n)}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${n === page ? ACCENT : BORDER}`, background: n === page ? ACCENT : CARD_BG, color: n === page ? '#fff' : TEXT_MID, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                        {n}
                                    </button>
                                ))}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, background: page === totalPages ? ACCENT : CARD_BG, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === totalPages ? '#fff' : TEXT_MID }}>
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Delete Modal */}
                {deleteConfirmId && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', position: 'relative', animation: 'fadeInDown 0.3s ease-out' }}>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f8fafc', color: TEXT_MID, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} />
                            </button>

                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertTriangle size={32} />
                            </div>

                            <h3 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>Delete Event?</h3>
                            <p style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.6, marginBottom: 28, padding: '0 10px' }}>
                                Are you sure you want to delete this event? This action cannot be undone and all event data will be permanently removed.
                            </p>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={() => setDeleteConfirmId(null)}
                                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#fff', color: TEXT_MID, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                    No, Keep it
                                </button>
                                <button onClick={handleDelete} disabled={isDeleting}
                                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isDeleting ? 0.7 : 1 }}>
                                    {isDeleting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : 'Yes, Delete Content'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Map Modal */}
                {mapEvent && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', padding: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 640, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', animation: 'fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Location Details</h3>
                                <button onClick={() => setMapEvent(null)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: TEXT_MID, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Location</p>
                                    <p style={{ fontSize: 15, color: TEXT_DARK, fontWeight: 700, margin: '0 0 16px' }}>{(mapEvent.venue_address || 'Venue').split(',')[0]}</p>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Address</p>
                                    <p style={{ fontSize: 14, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>{mapEvent.venue_address}</p>
                                </div>

                                <div style={{ height: 320, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                                    {mapEvent && !isNaN(parseFloat(mapEvent.latitude)) && !isNaN(parseFloat(mapEvent.longitude)) ? (
                                        <ModalMap lat={parseFloat(mapEvent.latitude)} lng={parseFloat(mapEvent.longitude)} />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MID, background: '#f8fafc' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <MapPin size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Coordinates not available for this event.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>


                            </div>
                        </div>
                    </div>
                )}
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default EventsFeed;

