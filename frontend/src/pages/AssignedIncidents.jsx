import React, { useState, useEffect } from 'react';
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

import { useSafetySocket } from '../hooks/useSafetySocket';
import { getUserId } from '../utils/auth';

const AssignedIncidents = () => {
    const navigate = useNavigate();
    const { incidents, loading } = useSafetySocket();
    const myId = getUserId();

    const tasks = React.useMemo(() => 
        Object.values(incidents).filter(i => 
            (i.status === 'verified' || i.status === 'en_route') && 
            Number(i.assigned_volunteer) === Number(myId)
        ), 
    [incidents, myId]);

    const handleAction = async (id, status) => {
        try {
            await api.patch(`/monitoring/incidents/${id}/`, { status });
            // The global context will update automatically via WebSocket
        } catch (err) {
            console.error("Task action failed", err);
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
        actionBtn: (primary) => ({
            padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', border: primary ? 'none' : `1px solid ${BORDER}`,
            background: primary ? ACCENT : '#fff', color: primary ? '#fff' : TEXT_DARK,
            display: 'flex', alignItems: 'center', gap: 8
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
                        <div style={{ textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 20, border: `1px dashed ${BORDER}` }}>
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
                                            <h3 style={{ margin: 0, fontSize: 18, color: TEXT_DARK }}>{task.category_display}</h3>
                                            <span style={s.badge(task.priority)}>{task.priority.toUpperCase()}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 13, color: TEXT_MID }}>UID: #{task.id.toString().padStart(4, '0')}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_MID }}>
                                            <Clock size={14} /> Reported {new Date(task.created_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>


                                <p style={{ fontSize: 14, color: TEXT_DARK, lineHeight: 1.6, marginBottom: 20 }}>
                                    {task.description}
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                                    <MapPin size={16} color={ACCENT} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>Location: {Number(task.latitude).toFixed(4)}, {Number(task.longitude).toFixed(4)} (Main Arena)</span>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => handleAction(task.id, 'en_route')} style={s.actionBtn(true)}>
                                        {task.status === 'en_route' ? 'En Route...' : 'Start Response'}
                                    </button>
                                    <button onClick={() => navigate('/organizer/live-map')} style={s.actionBtn(false)}><Navigation size={14} /> Navigate</button>
                                    <button onClick={() => handleAction(task.id, 'resolved')} style={{ ...s.actionBtn(false), marginLeft: 'auto', border: '1px solid #10b981', color: '#10b981' }}>
                                        <CheckCircle size={14} /> Mark Resolved
                                    </button>
                                </div>

                            </div>
                        ))
                    )}
                </div>
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AssignedIncidents;
