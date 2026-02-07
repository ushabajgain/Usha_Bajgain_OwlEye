import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole } from '../utils/auth';
import { 
    AlertTriangle, ShieldAlert, Clock, MapPin, 
    User, Loader2, CheckCircle, ArrowRight, Search
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const IncidentControlCenter = () => {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') { navigate('/events'); return; }
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/monitoring/incidents/');
            // Only show active-ish incidents in this control center
            setIncidents(res.data.filter(i => i.status !== 'resolved' && i.status !== 'false'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'resolve') {
                await api.patch(`/monitoring/incidents/${id}/`, { status: 'resolved' });
            } else if (action === 'false') {
                await api.patch(`/monitoring/incidents/${id}/`, { status: 'false' });
            } else if (action === 'verify') {
                await api.patch(`/monitoring/incidents/${id}/`, { status: 'verified' });
            }
            
            // Optimistic / Local update
            setIncidents(incidents.filter(i => i.id !== id));
        } catch (err) {
            console.error("Action failed:", err);
            alert("Failed to update incident protocol.");
        }
    };

    const handleDetails = (id) => {
        navigate(`/organizer/incident/${id}`);
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        th: { padding: '14px 20px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: TEXT_MID, textAlign: 'left', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' },
        td: { padding: '16px 20px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` },
        priority: (p) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
            background: p === 'critical' ? '#fee2e2' : p === 'high' ? '#ffedd5' : '#f0f9ff',
            color: p === 'critical' ? '#dc2626' : p === 'high' ? '#ea580c' : '#0369a1'
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Incident Control" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                         <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                <input id="incident-search" name="incident-search" placeholder="Search incidents..." style={{ padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${BORDER}`, outline: 'none', width: 280 }} />
                            </div>
                            <select id="severity-filter" name="severity-filter" value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '0 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff' }}>
                                <option value="all">All Severity</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                            </select>
                        </div>
                    </div>

                    <div style={s.card}>
                        {loading ? (
                            <div style={{ padding: 100, textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color={ACCENT} /></div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Incident', 'Event', 'Severity', 'Reporter', 'Status', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {incidents.map(i => (
                                        <tr key={i.id}>
                                            <td style={s.td}>
                                                <div style={{ fontWeight: 700 }}>{i.title}</div>
                                                <div style={{ fontSize: 11, color: TEXT_MID, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {new Date(i.created_at).toLocaleString()}</div>
                                            </td>
                                            <td style={s.td}>{i.event_name || 'Event #' + i.event}</td>
                                            <td style={s.td}>
                                                <span style={s.priority(i.priority)}>{i.priority}</span>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={12} /></div>
                                                    <span>{i.reported_by_name || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: TEXT_MID }}>{i.status}</div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => handleAction(i.id, 'verify')} title="Verify" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a' }}><CheckCircle size={18} /></button>
                                                    <button onClick={() => handleAction(i.id, 'false')} title="Mark False" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><ShieldAlert size={18} /></button>
                                                    <button onClick={() => handleDetails(i.id)} title="View Details" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                                        <ArrowRight size={14} /> Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default IncidentControlCenter;
