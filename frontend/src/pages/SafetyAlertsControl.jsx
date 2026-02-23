import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    Bell, Send, Info, AlertTriangle, 
    ShieldAlert, Users, Globe, Map,
    History, CheckCircle, Loader2
} from 'lucide-react';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const SafetyAlertsControl = () => {
    const [events, setEvents] = useState([]);
    const [history, setHistory] = useState([]);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        event: 'all',
        title: '',
        message: '',
        severity: 'info',
        target: 'all'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [evRes, histRes] = await Promise.all([
                api.get('/events/'),
                api.get('/monitoring/alerts/')
            ]);
            setEvents(evRes.data);
            const alerts = Array.isArray(histRes.data) ? histRes.data : histRes.data.results || [];
            setHistory(alerts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            const payload = {
                title: form.title,
                message: form.message,
                severity: form.severity,
                audience_type: form.target,
                event: form.event === 'all' ? null : form.event
            };
            await api.post('/monitoring/alerts/', payload);
            alert('Platform Alert Broadcasted Successfully!');
            setForm({ event: 'all', title: '', message: '', severity: 'info', target: 'all' });
            fetchData(); // Refresh history
        } catch (err) {
            console.error(err);
            alert('Failed to broadcast alert. Check console for details.');
        } finally {
            setSending(false);
        }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 },
        card: { background: CARD_BG, borderRadius: 16, padding: 28, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
        input: { width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 20, fontSize: 14, outline: 'none' },
        label: { display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_DARK, marginBottom: 8, textTransform: 'uppercase' },
        broadcastBtn: { width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Safety Alerts" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    {/* Alert Composer */}
                    <div style={s.card}>
                        <h3 style={{ fontSize: 18, fontWeight: 900, color: TEXT_DARK, marginBottom: 24 }}>Alert Composer</h3>
                        <form onSubmit={handleSubmit}>
                            <label style={s.label}>Target Event</label>
                            <select style={s.input} value={form.event} onChange={e => setForm({...form, event: e.target.value})}>
                                <option value="all">Platform-wide (All Events)</option>
                                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>

                            <label style={s.label}>Alert Title</label>
                            <input style={s.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Weather Warning, System Update..." required />

                            <label style={s.label}>Message Body</label>
                            <textarea style={{ ...s.input, minHeight: 120, resize: 'none' }} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Write the alert message details here..." required />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label style={s.label}>Severity</label>
                                    <select style={s.input} value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                                        <option value="info">Information</option>
                                        <option value="warning">Warning</option>
                                        <option value="critical">Critical Emergency</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Target Audience</label>
                                    <select style={s.input} value={form.target} onChange={e => setForm({...form, target: e.target.value})}>
                                        <option value="all">All Users</option>
                                        <option value="organizers">Organizers & Staff</option>
                                        <option value="attendees">Attendees Only</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" disabled={sending} style={{ ...s.broadcastBtn, opacity: sending ? 0.7 : 1 }}>
                                {sending ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Broadcast Alert Now</>}
                            </button>
                        </form>
                    </div>

                    {/* Alert History */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <History size={20} color={TEXT_MID} />
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Recent Broadcasts</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {loading && history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" color={ACCENT} /></div>
                            ) : history.length === 0 ? (
                                <div style={{ textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 16, padding: 30, color: TEXT_MID }}>
                                    No previous broadcasts found.
                                </div>
                            ) : (
                                history.map((a, i) => (
                                    <div key={a.id || i} style={{ background: CARD_BG, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: a.severity === 'critical' ? '#fee2e2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Bell size={18} color={a.severity === 'critical' ? '#ef4444' : ACCENT} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <b style={{ fontSize: 13, color: TEXT_DARK }}>{a.title}</b>
                                            <p style={{ margin: '2px 0 0', fontSize: 11, color: TEXT_MID }}>
                                                Target: {a.event_name || 'All Events'} · {new Date(a.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: a.is_active ? '#16a34a' : TEXT_MID, textTransform: 'uppercase' }}>
                                            {a.is_active ? 'Active' : 'Expired'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                            <Footer />
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default SafetyAlertsControl;
