import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { User, Phone, Shield, ShieldCheck, Search, Loader2, MapPin, Clock, Plus, X } from 'lucide-react';
import { useSafetySocket } from '../hooks/useSafetySocket';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const VolunteersList = () => {
    const navigate = useNavigate();
    const { responders } = useSafetySocket();
    
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [allVolunteers, setAllVolunteers] = useState([]);
    const [assignedVolunteers, setAssignedVolunteers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Fetch events and volunteers on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch organizer's events
                const eventsRes = await api.get('/events/');
                console.log('Events fetched:', eventsRes.data);
                
                // Filter to active/draft events (exclude completed/cancelled)
                const organizerEvents = eventsRes.data.filter(e => 
                    e.status !== 'completed' && e.status !== 'cancelled'
                );
                console.log('Filtered events:', organizerEvents);
                
                setEvents(organizerEvents);
                
                // Set first event as default
                if (organizerEvents.length > 0) {
                    console.log('Setting default event:', organizerEvents[0].id);
                    setSelectedEvent(organizerEvents[0].id);
                }
                
                // Fetch all certified volunteers globally
                const volRes = await api.get('/accounts/volunteers/');
                console.log('Volunteers fetched:', volRes.data);
                setAllVolunteers(volRes.data);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                alert('Error loading events: ' + (err.response?.data?.detail || err.message));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch assigned volunteers when event changes
    useEffect(() => {
        const fetchAssigned = async () => {
            if (!selectedEvent) return;
            try {
                const res = await api.get(`/events/${selectedEvent}/volunteers/`);
                setAssignedVolunteers(res.data);
            } catch (err) {
                console.error("Failed to fetch assigned volunteers", err);
            }
        };
        fetchAssigned();
    }, [selectedEvent]);

    // Get volunteers not yet assigned to this event
    const unassignedVolunteers = allVolunteers.filter(
        vol => !assignedVolunteers.some(assigned => assigned.id === vol.id)
    );

    // Filter assigned volunteers by search
    const filteredAssigned = assignedVolunteers.filter(v => 
        v.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        v.email?.toLowerCase().includes(search.toLowerCase()) ||
        v.phone?.includes(search)
    );

    // Get responder status/location data
    const getResponderStatus = (volunteerId) => {
        if (!responders || !responders[volunteerId]) return null;
        return responders[volunteerId];
    };

    // Assign volunteer to event
    const handleAssign = async (volunteerId) => {
        if (!selectedEvent) {
            alert("Please select an event first");
            return;
        }

        setAssigning(volunteerId);
        try {
            await api.post('/monitoring/responders/assign/', {
                volunteer_id: volunteerId,
                event_id: selectedEvent,
                status: 'available'
            });
            
            // Refresh assigned volunteers
            const res = await api.get(`/events/${selectedEvent}/volunteers/`);
            setAssignedVolunteers(res.data);
            
            // Show success message
            setSuccessMsg('Volunteer assigned successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert("Failed to assign volunteer");
            console.error(err);
        } finally {
            setAssigning(null);
        }
    };

    // Unassign volunteer from event
    const handleUnassign = async (volunteerId) => {
        if (!selectedEvent) return;

        setAssigning(volunteerId);
        try {
            await api.post('/monitoring/responders/unassign/', {
                volunteer_id: volunteerId,
                event_id: selectedEvent
            });
            
            // Refresh assigned volunteers
            const res = await api.get(`/events/${selectedEvent}/volunteers/`);
            setAssignedVolunteers(res.data);
            
            // Show success message
            setSuccessMsg('Volunteer unassigned successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert("Failed to unassign volunteer");
            console.error(err);
        } finally {
            setAssigning(null);
        }
    };

    const statusColor = (status) => {
        const colors = {
            'available': { bg: '#DCFCE7', text: '#16A34A', label: 'Available' },
            'busy': { bg: '#FECACA', text: '#DC2626', label: 'Busy' },
            'responding': { bg: '#FED7AA', text: '#EA580C', label: 'Responding' },
            'patrolling': { bg: '#BFDBFE', text: '#1D4ED8', label: 'Patrolling' },
            'offline': { bg: '#F1F5F9', text: TEXT_MID, label: 'Offline' }
        };
        return colors[status] || colors['offline'];
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        eventSelector: {
            background: CARD_BG, padding: '16px 24px', borderRadius: 12, border: `1px solid ${BORDER}`,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12
        },
        select: { 
            flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, 
            fontSize: 14, background: CONTENT_BG, color: TEXT_DARK, outline: 'none', cursor: 'pointer'
        },
        section: { marginBottom: 32 },
        sectionTitle: { fontSize: 16, fontWeight: 800, color: TEXT_DARK, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
        searchBox: { 
            background: CARD_BG, padding: '16px 24px', borderRadius: 12, border: `1px solid ${BORDER}`,
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 
        },
        input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: TEXT_DARK },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
        card: { background: CARD_BG, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
        cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
        avatar: { width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: 20, fontWeight: 700 },
        vName: { fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: 0 },
        statusBadge: (status) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: statusColor(status).bg, color: statusColor(status).text
        }),
        infoItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TEXT_MID, marginBottom: 8 },
        button: (primary) => ({
            width: '100%', marginTop: 16, padding: '10px', borderRadius: 8, border: 'none',
            background: primary ? ACCENT : CARD_BG, color: primary ? '#fff' : ACCENT,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', gap: 6, transition: 'opacity 0.2s'
        })
    };

    if (loading) return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Volunteers" breadcrumb="Dashboard" />
                <div style={s.content}>
                    <div style={{ padding: 100, textAlign: 'center' }}>
                        <Loader2 size={40} className="animate-spin" color={ACCENT} style={{ margin: '0 auto' }} />
                    </div>
                </div>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Volunteers" breadcrumb="Dashboard" />

                {successMsg && (
                    <div style={{ 
                        margin: '20px 32px 16px 32px', 
                        padding: '12px 16px', 
                        background: '#dcfce7', 
                        border: '1px solid #86efac', 
                        borderRadius: 8, 
                        color: '#166534', 
                        fontSize: 14, 
                        fontWeight: 600
                    }}>
                        {successMsg}
                    </div>
                )}

                <div style={s.content}>
                    {!loading && events.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 20px', background: CARD_BG, borderRadius: 12, border: `1px dashed ${BORDER}`, color: TEXT_MID }}>
                            <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No events found</p>
                            <p style={{ fontSize: 13, marginBottom: 16 }}>You don't have any active events yet. Create an event first to assign volunteers.</p>
                            <button onClick={() => navigate('/events')} style={{ padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                View My Events
                            </button>
                        </div>
                    )}

                    {!loading && events.length > 0 && (
                        <>
                            {/* Event Selector */}
                            <div style={s.eventSelector}>
                                <label style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, whiteSpace: 'nowrap' }}>Select Event:</label>
                                <select 
                                    value={selectedEvent || ''} 
                                    onChange={(e) => setSelectedEvent(parseInt(e.target.value))}
                                    style={s.select}
                                >
                                    <option value="">Choose an event...</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.name} ({event.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedEvent ? (
                        <>
                            {/* Assigned Volunteers Section */}
                            <div style={s.section}>
                                <h3 style={s.sectionTitle}>
                                    <ShieldCheck size={18} color={ACCENT} />
                                    Assigned Volunteers ({filteredAssigned.length})
                                </h3>
                                
                                {assignedVolunteers.length > 0 && (
                                    <div style={s.searchBox}>
                                        <Search size={18} color={TEXT_MID} />
                                        <input 
                                            style={s.input} 
                                            placeholder="Filter assigned volunteers..." 
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                )}

                                {filteredAssigned.length > 0 ? (
                                    <div style={s.grid}>
                                        {filteredAssigned.map(vol => {
                                            const responder = getResponderStatus(vol.id);
                                            const status = responder?.status || 'offline';
                                            return (
                                                <div key={vol.id} style={s.card}>
                                                    <div style={s.cardHeader}>
                                                        <div style={s.avatar}>{vol.full_name?.[0] || 'V'}</div>
                                                        <div style={s.statusBadge(status)}>
                                                            {statusColor(status).label}
                                                        </div>
                                                    </div>
                                                    
                                                    <h4 style={s.vName}>{vol.full_name}</h4>
                                                    
                                                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12 }}>
                                                        <div style={s.infoItem}>
                                                            <Phone size={12} /> {vol.phone || 'N/A'}
                                                        </div>
                                                        
                                                        {responder && (
                                                            <>
                                                                <div style={s.infoItem}>
                                                                    <MapPin size={12} /> 
                                                                    {responder.latitude?.toFixed(4)}, {responder.longitude?.toFixed(4)}
                                                                </div>
                                                                <div style={s.infoItem}>
                                                                    <Clock size={12} /> 
                                                                    {new Date(responder.last_updated).toLocaleTimeString()}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <button 
                                                        onClick={() => handleUnassign(vol.id)}
                                                        disabled={assigning === vol.id}
                                                        style={{...s.button(false), opacity: assigning === vol.id ? 0.6 : 1}}
                                                    >
                                                        {assigning === vol.id ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                                <div style={{ width: 14, height: 14, border: '2px solid rgba(79,70,229,0.3)', borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                                Removing...
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <X size={14} /> 
                                                                Unassign
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px', background: CARD_BG, borderRadius: 12, border: `1px dashed ${BORDER}`, color: TEXT_MID }}>
                                        <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                        <p>No assigned volunteers yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Available Volunteers Section */}
                            {unassignedVolunteers.length > 0 && (
                                <div style={s.section}>
                                    <h3 style={s.sectionTitle}>
                                        <User size={18} color={ACCENT} />
                                        Available Volunteers ({unassignedVolunteers.length})
                                    </h3>
                                    
                                    <div style={s.grid}>
                                        {unassignedVolunteers.map(vol => (
                                            <div key={vol.id} style={s.card}>
                                                <div style={s.cardHeader}>
                                                    <div style={s.avatar}>{vol.full_name?.[0] || 'V'}</div>
                                                </div>
                                                
                                                <h4 style={s.vName}>{vol.full_name}</h4>
                                                
                                                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12 }}>
                                                    <div style={s.infoItem}>
                                                        <Phone size={12} /> {vol.phone || 'N/A'}
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleAssign(vol.id)}
                                                    disabled={assigning === vol.id}
                                                    style={{...s.button(true), opacity: assigning === vol.id ? 0.6 : 1}}
                                                >
                                                    {assigning === vol.id ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                            Assigning...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Plus size={14} /> 
                                                            Assign
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 100, color: TEXT_MID }}>
                            <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                            <p>Select an event to manage volunteers</p>
                        </div>
                    )}
                        </>
                    )}
                </div>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default VolunteersList;
