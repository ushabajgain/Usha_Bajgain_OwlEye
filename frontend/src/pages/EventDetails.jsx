import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import {
    Calendar, MapPin, Users, Edit, Trash2, Share2, Bookmark, Heart,
    Loader2, AlertCircle, Check, X, ChevronLeft, ArrowUpRight,
    Clock, Tag, Maximize2, MoreHorizontal, CheckCircle2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import C from '../utils/colors';
import { getUserId, getRole } from '../utils/auth';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

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

const statusBadgeStyle = (endDate) => {
    const isActive = new Date(endDate) >= new Date();
    return {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: isActive ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.1)',
        color: isActive ? '#16a34a' : '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.02em'
    };
};

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [isTermsExpanded, setIsTermsExpanded] = useState(false);
    const currentUserId = parseInt(getUserId()) || null;
    const currentUserRole = getRole();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [shareMsg, setShareMsg] = useState('');

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const res = await api.get(`/events/${id}/`);
                setEvent(res.data);
                setIsLiked(res.data.is_liked || false);
                setLikeCount(res.data.like_count || 0);
            } catch (err) {
                setError(err.response?.status === 404 ? 'Event not found.' : 'Failed to load event.');
            } finally {
                setLoading(false);
            }
        };
        loadEvent();
    }, [id]);

    const handleLike = async () => {
        try {
            const res = await api.post(`/events/${id}/like/`);
            setIsLiked(res.data.is_liked);
            setLikeCount(res.data.like_count);
        } catch (err) {
            console.error('Like failed', err);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setShareMsg('Link copied!');
        setTimeout(() => setShareMsg(''), 2000);
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG }}>
            <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error || !event) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG, gap: 12 }}>
            <AlertCircle size={44} color="#dc2626" />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT_DARK }}>Event Not Found</h1>
            <p style={{ fontSize: 14, color: TEXT_MID }}>{error}</p>
            <Link to="/events" style={{ marginTop: 8, padding: '10px 24px', background: ACCENT, color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Back to Events</Link>
        </div>
    );

    const canManage = event.organizer === currentUserId || currentUserRole === 'admin';
    const lat = parseFloat(event.latitude);
    const lng = parseFloat(event.longitude);
    const attendeePct = event.capacity > 0 ? Math.round(((event.attendee_count || 0) / event.capacity) * 100) : 0;
    const packages = event.ticket_packages || [];

    const formatDate = (dt) => {
        try {
            return dt ? new Date(dt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
        } catch (e) { return 'TBD'; }
    };
    const formatTime = (dt) => {
        try {
            return dt ? new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
        } catch (e) { return ''; }
    };

    if (loading) return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG }}>
            <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
        </div>
    );

    if (!event) return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG, flexDirection: 'column', gap: 16 }}>
            <AlertCircle size={48} color={C.danger} />
            <h2 style={{ color: TEXT_DARK }}>Event not found</h2>
            <Link to="/events" style={{ color: ACCENT, fontWeight: 600 }}>Back to Events</Link>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                <PageHeader
                    title="Event Details"
                    breadcrumb="Events"
                    breadcrumbPath="/events"
                />

                <div style={{ padding: '28px 32px', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

                        {/* ── LEFT column ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: CARD_BG, borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                <img src={event.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80'}
                                    alt={event.name} style={{ width: '100%', height: 280, objectFit: 'cover' }} />
                                <div style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(30,41,59,0.7)', padding: '3px 10px', borderRadius: 20 }}>{event.category}</span>
                                        <span style={statusBadgeStyle(event.end_datetime)}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: new Date(event.end_datetime) >= new Date() ? '#16a34a' : '#64748b' }} />
                                            {new Date(event.end_datetime) >= new Date() ? 'Active' : 'Past'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, margin: '0 0 10px' }}>{event.name}</h1>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: TEXT_MID }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Calendar size={13} color={ACCENT} /> {formatDate(event.start_datetime)} — {formatTime(event.start_datetime)}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <MapPin size={13} color={ACCENT} /> {event.venue_address}
                                                    </span>
                                                    <button onClick={() => setShowMap(true)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 700, color: '#d946ef',
                                                            background: '#fff', border: `1px solid #f1f5f9`,
                                                            borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#fdf4ff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                                    >
                                                        Show Map
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${isLiked ? '#fecaca' : BORDER}`, background: isLiked ? '#fef2f2' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            <Heart size={16} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : TEXT_MID} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: isLiked ? '#ef4444' : TEXT_MID }}>{likeCount}</span>
                                        </button>
                                        <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer' }}>
                                            <Share2 size={14} color={TEXT_MID} />
                                            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MID }}>{shareMsg || 'Share'}</span>
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content 1fr', gap: '0px 40px', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, alignItems: 'end' }}>
                                        <div style={{ fontSize: 11, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.01em', fontWeight: 600 }}>Tickets Sold</div>
                                        <div style={{ fontSize: 11, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.01em', fontWeight: 600 }}>Starts from</div>
                                        <div />

                                        <div style={{ fontSize: 17, fontWeight: 700, color: TEXT_DARK, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                            {(event.attendee_count || 0).toLocaleString()}
                                            <span style={{ fontSize: 12, color: TEXT_MID, fontWeight: 500 }}>/{event.capacity}</span>
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: ACCENT, whiteSpace: 'nowrap' }}>
                                            Rs. {Number(event.price).toLocaleString()}
                                        </div>
                                        <div style={{ width: '100%', paddingBottom: 6 }}>
                                            <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${attendeePct}%`, background: ACCENT, borderRadius: 3 }} />
                                            </div>
                                            <p style={{ fontSize: 10, color: TEXT_MID, marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>{attendeePct}% sold</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>About Event</p>
                                <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.8 }}>{event.description || 'No description provided.'}</p>
                            </div>

                            {event.terms_conditions && (
                                <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Terms & Conditions</h3>
                                        <Maximize2 size={15} color={TEXT_MID} style={{ cursor: 'pointer' }} onClick={() => setIsTermsExpanded(true)} />
                                    </div>
                                    <div style={{ padding: '16px 20px', maxHeight: 320, overflowY: 'auto' }}>
                                        <div style={{ fontSize: 13, color: TEXT_DARK, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{event.terms_conditions}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT column ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Seat Plan</h3>
                                    <MoreHorizontal size={16} color={TEXT_MID} style={{ cursor: 'pointer' }} />
                                </div>
                                <div style={{ padding: '14px 18px', display: 'flex', gap: 14 }}>
                                    {event.seat_plan_image && (
                                        <img src={event.seat_plan_image} alt="Seat Plan"
                                            style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                                    )}
                                    {packages.length > 0 ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {packages.map((pkg, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: pkg.color, flexShrink: 0, marginTop: 4 }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.name}</span>
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: pkg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>Rs. {Number(pkg.price).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: TEXT_MID }}>({pkg.seating_type})</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 13, color: TEXT_MID }}>No seat categories defined.</p>
                                    )}
                                </div>
                                {event.seat_plan_description && (
                                    <div style={{ padding: '0 18px 14px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_DARK, marginBottom: 4 }}>Notes</p>
                                        <p style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.6 }}>{event.seat_plan_description}</p>
                                    </div>
                                )}
                            </div>

                            {packages.length > 0 && (
                                <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Packages</h3>
                                        <MoreHorizontal size={16} color={TEXT_MID} style={{ cursor: 'pointer' }} />
                                    </div>
                                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {packages.map((pkg, i) => {
                                            return (
                                                <div key={i} style={{ padding: '16px 20px', borderRadius: 12, border: `1px solid ${BORDER}`, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.borderColor = ACCENT;
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.borderColor = BORDER;
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.transform = 'none';
                                                    }}>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{pkg.name}</div>
                                                    <span style={{ fontSize: 18, fontWeight: 800, color: ACCENT, whiteSpace: 'nowrap', marginLeft: 16 }}>Rs. {Number(pkg.price).toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!canManage && new Date(event.end_datetime) >= new Date() && (
                                <Link to={`/events/${event.id}/ticket`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 12px rgba(79,70,229,0.3)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#4338CA'}
                                    onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
                                    Book Ticket <ArrowUpRight size={16} />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {showMap && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', padding: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 640, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', animation: 'fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Location Details</h3>
                                <button onClick={() => setShowMap(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: TEXT_MID, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Location</p>
                                    <p style={{ fontSize: 15, color: TEXT_DARK, fontWeight: 700, margin: '0 0 16px' }}>{(event.venue_address || 'Venue').split(',')[0]}</p>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Address</p>
                                    <p style={{ fontSize: 14, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>{event.venue_address || 'Address not available'}</p>
                                </div>

                                <div style={{ height: 320, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                                    {lat && !isNaN(lat) && lng && !isNaN(lng) ? (
                                        <ModalMap lat={lat} lng={lng} />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MID, background: '#f8fafc', border: `1px dashed ${BORDER}`, borderRadius: 16 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <MapPin size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Map coordinates not available.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>


                            </div>
                        </div>
                    </div>
                )}

                {/* Terms Expansion Modal */}
                {isTermsExpanded && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 800, maxHeight: '85vh', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Terms & Conditions</h3>
                                <button onClick={() => setIsTermsExpanded(false)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#f1f5f9', color: TEXT_MID, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '32px', overflowY: 'auto', flex: 1, fontSize: 15, color: TEXT_DARK, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                {event.terms_conditions}
                            </div>
                        </div>
                    </div>
                )}

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                            <Footer />
            </main>
        </div>
    );
};

export default EventDetails;
