import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import Sidebar from '../components/Sidebar';
import { AlertTriangle, Clock, MapPin, User, ArrowLeft, CheckCircle, Shield, History, Info } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole } from '../utils/auth';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

import { useSafetySocket } from '../hooks/useSafetySocket';

const IncidentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [logs, setLogs] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);

    const { incidents } = useSafetySocket();



    const fetchDetails = async () => {
        try {
            // Step 1: Fetch incident and logs first
            const [incRes, logRes] = await Promise.all([
                api.get(`/monitoring/incidents/${id}/`),
                api.get(`/monitoring/incident-logs/?incident=${id}`)
            ]);
            
            setIncident(incRes.data);
            setLogs(logRes.data);
            
            // Step 2: Fetch event-specific volunteers using incident's event_id
            const volRes = await api.get(`/events/${incRes.data.event_id}/volunteers/`);
            setVolunteers(volRes.data);
        } catch (err) {
            console.error('Failed to fetch details', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') { navigate('/events'); return; }
        fetchDetails();
    }, [id]);

    // Live Sync from Socket Context
    useEffect(() => {
        if (incidents[id]) {
            setIncident(prev => ({ ...prev, ...incidents[id] }));
            // Also refresh logs if it's a major status change
            api.get(`/monitoring/incident-logs/?incident=${id}`).then(res => setLogs(res.data));
        }
    }, [incidents[id]]);


    const updateStatus = async (newStatus) => {
        try {
            await api.patch(`/monitoring/incidents/${id}/`, { status: newStatus });
            fetchDetails();
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    const assignVolunteer = async (volunteerId) => {
        try {
            await api.patch(`/monitoring/incidents/${id}/`, { assigned_volunteer: volunteerId || null });
            fetchDetails();
        } catch (err) {
            alert("Failed to assign volunteer.");
        }
    };


    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!incident) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, marginBottom: 16 }}>Incident not found</h1>
            <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Go Back</button>
        </div>
    );

    const statusColor = incident.status === 'resolved' ? '#16a34a' : incident.status === 'verified' ? '#2563eb' : '#d97706';
    const statusBg = incident.status === 'resolved' ? '#dcfce7' : incident.status === 'verified' ? '#eff6ff' : '#fef3c7';

    const s = {
        shell: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" },
        main: { flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' },
        topBar: { background: HEADER_BG, color: '#fff', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100 },
        backBtn: { padding: 6, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center' },
        content: { padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' },
        card: { background: CARD_BG, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, overflow: 'hidden' },
        cardPad: { padding: '20px 24px' },
        sectionLabel: { fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 },
        metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 },
        metaItem: { display: 'flex', flexDirection: 'column', gap: 4 },
        metaLabel: { fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.08em' },
        metaValue: { fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: 'flex', alignItems: 'center', gap: 6 },
        timelineCard: { background: CARD_BG, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, overflow: 'hidden', position: 'sticky', top: 76 },
        timelineHeader: { padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: TEXT_DARK },
        timelineBody: { padding: '20px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' },
        exportBtn: { width: '100%', padding: '10px', borderRadius: 0, border: 'none', borderTop: `1px solid ${BORDER}`, background: '#f8fafc', color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Incident Details" breadcrumb="Dashboard/Incident History" />

                <div style={s.content}>
                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Summary */}
                        <div style={s.card}>
                            <div style={s.cardPad}>
                                <p style={s.sectionLabel}><Info size={13} /> Summary</p>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
                                    {incident.category_display}: {incident.title}
                                </h2>
                                <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.7, background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                                    {incident.description}
                                </p>
                                <div style={s.metaGrid}>
                                    <div style={s.metaItem}>
                                        <span style={s.metaLabel}>Reported By</span>
                                        <span style={s.metaValue}><User size={12} color={ACCENT} /> {incident.reporter_name}</span>
                                    </div>
                                    <div style={s.metaItem}>
                                        <span style={s.metaLabel}>Reputation</span>
                                        <span style={{...s.metaValue, color: incident.is_flagged_reporter ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                                            {incident.is_flagged_reporter ? 'FLAGGED' : 'TRUSTED'} ({incident.reporter_false_count} False)
                                        </span>
                                    </div>
                                    <div style={s.metaItem}>
                                        <span style={s.metaLabel}>Date & Time</span>
                                        <span style={s.metaValue}><Clock size={12} color={ACCENT} /> {new Date(incident.created_at).toLocaleString()}</span>
                                    </div>
                                    <div style={s.metaItem}>
                                        <span style={s.metaLabel}>Location</span>
                                        <span style={s.metaValue}><MapPin size={12} color={ACCENT} /> {parseFloat(incident.latitude).toFixed(4)}, {parseFloat(incident.longitude).toFixed(4)}</span>
                                    </div>
                                    <div style={s.metaItem}>
                                        <span style={s.metaLabel}>Responder</span>
                                        <span style={s.metaValue}><Shield size={12} color={ACCENT} /> {incident.volunteer_name || 'None'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div style={s.card}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>
                                <MapPin size={14} color={ACCENT} /> Location on Map
                            </div>
                            <div style={{ height: 280 }}>
                                <MapContainer center={[incident.latitude, incident.longitude]} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[incident.latitude, incident.longitude]} />
                                </MapContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right column — Timeline & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 76 }}>
                        
                        {/* Actions Card */}
                        <div style={s.card}>
                            <div style={s.timelineHeader}>
                                <Shield size={14} color={ACCENT} /> Management Actions
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {incident.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button 
                                            onClick={() => updateStatus('verified')}
                                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                            Verify Incident
                                        </button>
                                        <button 
                                            onClick={() => updateStatus('false')}
                                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#f8fafc', color: TEXT_MID, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                            Mark False
                                        </button>
                                    </div>
                                )}

                                {incident.status === 'verified' && (
                                    <button 
                                        onClick={() => updateStatus('resolved')}
                                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                        Mark as Resolved
                                    </button>
                                )}

                                {incident.status !== 'resolved' && incident.status !== 'false' && (
                                    <div style={{ marginTop: 8 }}>
                                        <label style={{ ...s.metaLabel, marginBottom: 8, display: 'block' }}>Assign Volunteer</label>
                                        <select 
                                            value={incident.assigned_volunteer || ''} 
                                            onChange={(e) => assignVolunteer(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', background: '#f8fafc' }}>
                                            <option value="">Choose Volunteer...</option>
                                            {volunteers.map(v => (
                                                <option key={v.id} value={v.id}>{v.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(incident.status === 'resolved' || incident.status === 'false') && (
                                    <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: 8, border: `1px dashed ${BORDER}` }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MID }}>This incident is closed.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={s.timelineCard}>
                            <div style={s.timelineHeader}>
                                <History size={14} color={ACCENT} /> Activity Timeline
                            </div>
                            <div style={s.timelineBody}>
                                {logs.length > 0 ? logs.map((log, idx) => (
                                    <div key={log.id} style={{ position: 'relative', paddingLeft: 28, marginBottom: idx < logs.length - 1 ? 24 : 0 }}>
                                        {idx < logs.length - 1 && (
                                            <div style={{ position: 'absolute', left: 10, top: 22, bottom: -24, width: 1, background: BORDER }} />
                                        )}
                                        <div style={{
                                            position: 'absolute', left: 0, top: 2, width: 20, height: 20, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: log.action_type === 'resolved' ? '#16a34a' : log.action_type === 'reported' ? ACCENT : '#d97706',
                                        }}>
                                            {log.action_type === 'resolved'
                                                ? <CheckCircle size={10} color="#fff" />
                                                : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                                            }
                                        </div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, marginBottom: 3 }}>{new Date(log.timestamp).toLocaleTimeString()} · {log.action_display}</p>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, marginBottom: 2 }}>{log.performed_by_name}</p>
                                        <p style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.6 }}>{log.notes}</p>
                                    </div>
                                )) : (
                                    <p style={{ fontSize: 13, color: TEXT_MID, textAlign: 'center', padding: '20px 0' }}>No activity recorded yet.</p>
                                )}
                            </div>
                            <button style={s.exportBtn} onClick={() => window.print()}>Export Log</button>
                        </div>
                    </div>
                </div>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default IncidentDetails;
