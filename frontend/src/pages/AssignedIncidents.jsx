import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { Shield, MapPin, Clock, Navigation, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

import { useFeedback } from '../context/FeedbackContext';
import Footer from '../components/Footer';

const AssignedIncidents = () => {
    const { showToast, confirmAction } = useFeedback();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch assigned incidents DIRECTLY from backend API — never trust local/WS state
    const fetchMyIncidents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/monitoring/incidents/?assigned_to_me=true');
            // Filter to show only active tasks (exclude terminal states if needed, but here we show what's assigned)
            setTasks(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('[AssignedIncidents] Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyIncidents();
    }, [fetchMyIncidents]);

    const handleAction = async (id, action) => {
        if (action === 'false') {
            confirmAction({
                title: "Confirm False Alarm",
                message: "Mark this assigned task as a False Alarm? This will close the incident.",
                type: 'danger',
                onConfirm: () => performAction(id, action)
            });
        } else {
            performAction(id, action);
        }
    };

    const performAction = async (id, action) => {
        try {
            let status = action;
            if (action === 'verify') status = 'verified';
            if (action === 'resolve') status = 'resolved';
            if (action === 'false') status = 'false_alarm';
            
            await api.patch(`/monitoring/incidents/${id}/`, { status });
            
            const msgs = {
                'verify': 'Incident acknowledged and verified.',
                'resolve': 'Incident resolved successfully.',
                'false': 'Incident marked as false alarm.'
            };
            showToast(msgs[action] || 'Status updated.');
            
            // Re-fetch from backend after mutation — never trust local state
            await fetchMyIncidents();
        } catch (err) {
            console.error("Task action failed", err);
            const detail = err.response?.data?.status || err.response?.data?.detail || "Action failed.";
            showToast(Array.isArray(detail) ? detail[0] : detail, 'error');
        }
    };


    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${BORDER}` },
        badge: (priority) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
            background: priority === 'critical' ? '#FEE2E2' : '#FEF3C7',
            color: priority === 'critical' ? '#DC2626' : '#92400E'
        }),
        actionBtn: (type) => ({
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', border: '1px solid transparent',
            background: type === 'primary' ? ACCENT : type === 'success' ? '#f0fdf4' : type === 'danger' ? '#fef2f2' : '#fff',
            color: type === 'primary' ? '#fff' : type === 'success' ? '#16a34a' : type === 'danger' ? '#dc2626' : TEXT_DARK,
            borderColor: type === 'success' ? '#bbf7d0' : type === 'danger' ? '#fecaca' : BORDER,
            display: 'flex', alignItems: 'center', gap: 6
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Assigned Tasks" breadcrumb="Dashboard" />

                <div style={s.content}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 100 }}><Loader2 className="animate-spin" color={ACCENT} /></div>
                    ) : tasks.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 20, border: `1px dashed ${BORDER}` }}>
                            <Shield size={48} color={TEXT_MID} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <h3 style={{ color: TEXT_DARK }}>All Clear</h3>
                            <p style={{ color: TEXT_MID }}>You have no active incident assignments.</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} style={s.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <h3 style={{ margin: 0, fontSize: 17, color: TEXT_DARK }}>{task.category_display || task.category}</h3>
                                            <span style={s.badge(task.priority)}>{task.priority?.toUpperCase()}</span>
                                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#f1f5f9', color: TEXT_MID, fontWeight: 600 }}>{task.status.toUpperCase()}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 13, color: TEXT_MID }}>#{task.id} · Reported {new Date(task.created_at).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => navigate('/organizer/live-map')} style={s.actionBtn('default')}><Navigation size={14} /> Map</button>
                                </div>


                                <p style={{ fontSize: 14, color: TEXT_DARK, lineHeight: 1.6, marginBottom: 20 }}>
                                    {task.description}
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                                    <MapPin size={16} color={ACCENT} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>Location: {task.location_name || `${Number(task.latitude).toFixed(4)}, ${Number(task.longitude).toFixed(4)}`}</span>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    {task.status === 'pending' && (
                                        <button onClick={() => handleAction(task.id, 'verify')} style={s.actionBtn('success')}>
                                            Acknowledge
                                        </button>
                                    )}
                                    {(task.status === 'verified' || task.status === 'responding') && (
                                        <button onClick={() => handleAction(task.id, 'resolve')} style={s.actionBtn('success')}>
                                            Resolve
                                        </button>
                                    )}
                                </div>

                            </div>
                        ))
                    )}
                </div>
                            <Footer />
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AssignedIncidents;
