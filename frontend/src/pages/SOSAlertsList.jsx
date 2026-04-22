import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { usePagination, Pagination } from '../components/Pagination';
import { Bell, AlertTriangle, Clock, MapPin, User, ChevronRight, Loader2, Siren, Navigation, ShieldCheck, Activity, Search } from 'lucide-react';
import { getRole } from '../utils/auth';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const DANGER = '#EF4444';
const WARNING = '#F59E0B';
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const SOSAlertsList = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dispatchingId, setDispatchingId] = useState(null);
    const [dispatchMessage, setDispatchMessage] = useState({});
    
    // Manual assignment states
    const [allVolunteers, setAllVolunteers] = useState([]);
    const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
    const [showManualDispatch, setShowManualDispatch] = useState(null); // ID of alert

    const fetchVolunteers = async () => {
        try {
            const res = await api.get('/accounts/volunteers/');
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setAllVolunteers(data);
        } catch (err) {
            console.error("Failed to fetch all volunteers", err);
        }
    };

    const handleDispatch = async (sosId) => {
        setDispatchingId(sosId);
        try {
            const res = await api.post(`/monitoring/sos/${sosId}/dispatch_assistance/`);
            if (res.data.success) {
                setDispatchMessage({ [sosId]: { text: res.data.message, type: 'success' } });
                const updated = await api.get('/monitoring/sos/');
                setAlerts(updated.data);
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Dispatch failed.";
            setDispatchMessage({ [sosId]: { text: msg, type: 'error' } });
            
            // If failed due to no volunteers or busy volunteer, offer manual dispatch
            if (err.response?.status === 404 || err.response?.status === 409) {
                setShowManualDispatch(sosId);
                fetchVolunteers();
            }
        } finally {
            setDispatchingId(null);
        }
    };

    const handleManualAssign = async (sosId) => {
        if (!selectedVolunteerId) return;
        setDispatchingId(sosId);
        try {
            // PATCH the SOS alert with the selected volunteer
            // ⚠️ Using 'assigned' which is a valid choice in backend SOSAlert models
            const res = await api.patch(`/monitoring/sos/${sosId}/`, {
                assigned_volunteer: parseInt(selectedVolunteerId),
                status: 'assigned'
            });
            
            setDispatchMessage({ [sosId]: { text: `Successfully assigned to ${allVolunteers.find(v => v.id == selectedVolunteerId)?.full_name}`, type: 'success' } });
            setShowManualDispatch(null);
            
            // Refresh
            const updated = await api.get('/monitoring/sos/');
            setAlerts(updated.data);
        } catch (err) {
            const errorDetail = err.response?.data?.assigned_volunteer || err.response?.data?.error || "Manual assignment failed.";
            setDispatchMessage({ [sosId]: { text: Array.isArray(errorDetail) ? errorDetail[0] : errorDetail, type: 'error' } });
        } finally {
            setDispatchingId(null);
        }
    };

    const handleAccept = async (sosId) => {
        setDispatchingId(sosId);
        try {
            await api.post(`/monitoring/sos/${sosId}/accept/`);
            setDispatchMessage({ [sosId]: { text: "Emergency Accepted! Proceed to user location.", type: 'success' } });
            // Re-fetch
            const updated = await api.get('/monitoring/sos/');
            setAlerts(updated.data);
        } catch (err) {
            setDispatchMessage({ [sosId]: { text: "Failed to accept alert.", type: 'error' } });
        } finally {
            setDispatchingId(null);
        }
    };

    const handleConvert = async (sosId) => {
        if (!window.confirm("Convert this SOS into a formal incident report?")) return;
        setDispatchingId(sosId);
        try {
            const res = await api.post(`/monitoring/sos/${sosId}/convert_to_incident/`);
            setDispatchMessage({ [sosId]: { text: res.data.message, type: 'success' } });
            setTimeout(() => navigate(`/organizer/incident/${res.data.incident_id}`), 1500);
        } catch (err) {
            setDispatchMessage({ [sosId]: { text: "Conversion failed.", type: 'error' } });
        } finally {
            setDispatchingId(null);
        }
    };

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/monitoring/sos/');
                setAlerts(res.data);
            } catch (err) {
                console.error("Failed to fetch SOS alerts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
        
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, []);

    const filtered = alerts.filter(a => {
        const matchesSearch = 
            a.user_name?.toLowerCase().includes(search.toLowerCase()) ||
            a.sos_type_display?.toLowerCase().includes(search.toLowerCase()) ||
            a.location_name?.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || a.status === 'active';
        return matchesSearch && matchesStatus;
    });

    const { page, setPage, slicedItems: paginatedAlerts } = usePagination(filtered, itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, filterStatus, setPage]);

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        controls: { display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' },
        searchBox: { 
            flex: 1, background: CARD_BG, padding: '10px 16px', borderRadius: 10, border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 10 
        },
        filterBar: { display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 10 },
        filterTab: (active) => ({
            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', background: active ? '#FFF' : 'transparent',
            color: active ? TEXT_DARK : TEXT_MID, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
        }),
        card: (status) => ({
            background: CARD_BG, borderRadius: 16, border: `1px solid ${status === 'active' ? DANGER : BORDER}`,
            padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24,
            transition: 'all 0.3s ease',
            boxShadow: status === 'active' ? '0 4px 20px rgba(239, 68, 68, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            animation: status === 'active' ? 'pulse-border 2s infinite' : 'none'
        }),
        pulseIcon: {
            width: 56, height: 56, borderRadius: 14, background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: DANGER
        },
        infoBlock: { flex: 1 },
        title: { fontSize: 16, fontWeight: 800, color: TEXT_DARK, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 },
        meta: { display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: TEXT_MID },
        badge: (status) => ({
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
            background: status === 'active' ? DANGER : status === 'responder_acknowledged' ? '#3b82f6' : '#E2E8F0',
            color: status === 'active' || status === 'responder_acknowledged' ? '#FFF' : TEXT_MID,
            textTransform: 'uppercase'
        }),
        actionBtn: {
            padding: '10px 20px', borderRadius: 10, background: DANGER, color: '#FFF',
            fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s',
            opacity: 1
        },
        manualSelect: {
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, 
            fontSize: 13, outline: 'none', background: '#F8FAFC', color: TEXT_DARK,
            marginRight: 8, minWidth: 200
        }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="SOS Alerts" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={s.controls}>
                        <div style={s.searchBox}>
                            <Search size={18} color={TEXT_MID} />
                            <input 
                                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }}
                                placeholder="Search by name, type, or location..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div style={s.filterBar}>
                            <div style={s.filterTab(filterStatus === 'all')} onClick={() => setFilterStatus('all')}>All Alerts</div>
                            <div style={s.filterTab(filterStatus === 'active')} onClick={() => setFilterStatus('active')}>Active SOS</div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: 100, textAlign: 'center' }}>
                            <Loader2 size={40} className="animate-spin" color={ACCENT} style={{ margin: '0 auto' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 20, border: `1px dashed ${BORDER}` }}>
                            <Siren size={48} color={TEXT_MID} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                            <h2 style={{ color: TEXT_DARK, fontWeight: 800 }}>No Alerts Found</h2>
                            <p style={{ color: TEXT_MID }}>Adjust your search or filter to see more.</p>
                        </div>
                    ) : (
                        paginatedAlerts.map(alert => (
                            <div key={alert.id} style={s.card(alert.status)}>
                                <div style={s.pulseIcon}>
                                    <Bell size={24} className={alert.status === 'active' ? 'animate-pulse' : ''} />
                                </div>
                                <div style={s.infoBlock}>
                                    <div style={s.title}>
                                        EMERGENCY: {alert.sos_type_display}
                                        <span style={s.badge(alert.status)}>{alert.status_display}</span>
                                    </div>
                                    <div style={s.meta}>
                                        <span><User size={13} style={{verticalAlign:'middle', marginRight:4}}/> {alert.user_name}</span>
                                        <span><Clock size={13} style={{verticalAlign:'middle', marginRight:4}}/> {new Date(alert.created_at).toLocaleTimeString()}</span>
                                        <span><MapPin size={13} style={{verticalAlign:'middle', marginRight:4}}/> {alert.location_name || `${Number(alert.latitude).toFixed(4)}, ${Number(alert.longitude).toFixed(4)}`}</span>
                                    </div>
                                    
                                    {dispatchMessage[alert.id] && (
                                        <div style={{ 
                                            marginTop: 10, fontSize: 13, fontWeight: 600, 
                                            padding: '4px 0',
                                            color: dispatchMessage[alert.id].type === 'success' ? '#10b981' : DANGER 
                                        }}>
                                            {dispatchMessage[alert.id].text}
                                        </div>
                                    )}

                                    {showManualDispatch === alert.id && (
                                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center' }}>
                                            <select 
                                                style={s.manualSelect}
                                                value={selectedVolunteerId}
                                                onChange={e => setSelectedVolunteerId(e.target.value)}
                                            >
                                                <option value="">-- Choose Volunteer --</option>
                                                {allVolunteers.map(v => (
                                                    <option key={v.id} value={v.id}>{v.full_name} ({v.email})</option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => handleManualAssign(alert.id)}
                                                disabled={!selectedVolunteerId || dispatchingId === alert.id}
                                                style={{ ...s.actionBtn, background: '#1e293b', padding: '8px 16px' }}
                                            >
                                                Assign Manually
                                            </button>
                                        </div>
                                    )}

                                    {alert.assigned_volunteer_name && (
                                        <div style={{ marginTop: 12, background: '#f0fdf4', padding: '8px 16px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #dcfce7' }}>
                                            <ShieldCheck size={16} color="#16a34a" />
                                            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
                                                Currently Assigned: {alert.assigned_volunteer_name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    {getRole() === 'volunteer' ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                             {alert.status === 'active' && (
                                                 <button 
                                                     disabled={dispatchingId === alert.id}
                                                     onClick={() => handleAccept(alert.id)}
                                                     style={{ ...s.actionBtn, background: '#10b981' }}
                                                 >
                                                     {dispatchingId === alert.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} 
                                                     {dispatchingId === alert.id ? "Accepting..." : "Accept"}
                                                 </button>
                                             )}
                                             <button 
                                                 disabled={dispatchingId === alert.id}
                                                 onClick={() => handleConvert(alert.id)}
                                                 style={{ ...s.actionBtn, background: '#f59e0b' }}
                                             >
                                                 {dispatchingId === alert.id ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} Convert
                                             </button>
                                             <button 
                                                 onClick={() => navigate('/organizer/live-map', { state: { lat: alert.latitude, lng: alert.longitude, zoom: 18 } })}
                                                 style={{ ...s.actionBtn, background: '#fff', color: TEXT_DARK, border: `1px solid ${BORDER}`, padding: '10px 12px' }}
                                             >
                                                 <Navigation size={16} color={ACCENT} />
                                             </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {alert.status !== 'resolved' && alert.status !== 'false' && (
                                                <button 
                                                    onClick={() => handleDispatch(alert.id)}
                                                    disabled={dispatchingId === alert.id}
                                                    style={{ ...s.actionBtn, opacity: dispatchingId === alert.id ? 0.7 : 1 }}
                                                >
                                                    {dispatchingId === alert.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Siren size={16} />
                                                    )}
                                                    {dispatchingId === alert.id ? "Dispatching..." : "Dispatch Assistance"}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate('/organizer/live-map', { state: { lat: alert.latitude, lng: alert.longitude, zoom: 18 } })}
                                                style={{ ...s.actionBtn, background: 'transparent', color: TEXT_MID, border: `1px solid ${BORDER}` }}
                                            >
                                                View Map
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {filtered.length > 0 && (
                        <Pagination 
                            page={page}
                            totalItems={filtered.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setPage}
                        />
                    )}
                </div>
                            <Footer />
            </main>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-border { 0% { border-color: #EF4444; } 50% { border-color: rgba(239, 68, 68, 0.2); } 100% { border-color: #EF4444; } }
                .animate-spin { animation: spin 1s linear infinite; }
                .animate-pulse { animation: pulse 1s infinite alternate; }
                @keyframes pulse { from { opacity: 1; transform: scale(1); } to { opacity: 0.6; transform: scale(1.1); } }
            `}</style>
        </div>
    );
};

export default SOSAlertsList;
