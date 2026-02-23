import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { Activity, Shield, MapPin, Power, CheckCircle, Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const VolunteerStatus = () => {
    const [currentStatus, setCurrentStatus] = useState('available');
    const [loading, setLoading] = useState(false);
    const [fetchStatus, setFetchStatus] = useState({ type: '', msg: '' });
    const [targetEventId, setTargetEventId] = useState('1');

    useEffect(() => {
        // Fetch current status and event
        const init = async () => {
            try {
                const [evRes, locRes] = await Promise.all([
                    api.get('/events/'),
                    api.get('/monitoring/responders/')
                ]);
                
                if (evRes.data.length > 0) setTargetEventId(evRes.data[0].id.toString());
                
                // Find my current record
                if (locRes.data.length > 0) {
                    const myLoc = locRes.data[0]; // ResponderLocationViewSet filters by user if not admin
                    setCurrentStatus(myLoc.status || 'available');
                }
            } catch (e) {
                console.error("Failed to load responder status", e);
            }
        };
        init();
    }, []);

    const statuses = [
        { id: 'available', name: 'Available', icon: CheckCircle, color: '#10b981', desc: 'Ready to receive new tasks' },
        { id: 'busy', name: 'Busy', icon: Clock, color: '#6366f1', desc: 'Performing other vital duties' }
    ];

    const handleSave = async () => {
        setLoading(true);
        setFetchStatus({ type: '', msg: '' });

        const sendUpdate = async (lat = 27.7, lng = 85.3) => {
            try {
                await Promise.all([
                    api.post('/monitoring/responders/', {
                        event: targetEventId,
                        status: currentStatus,
                        is_active: true,
                        latitude: Number(lat).toFixed(6),
                        longitude: Number(lng).toFixed(6)
                    }),
                    new Promise(resolve => setTimeout(resolve, 800))
                ]);
                setFetchStatus({ type: 'success', msg: 'Status updated successfully!' });
                
                // Maybe auto hide the message after a while
                setTimeout(() => setFetchStatus({ type: '', msg: '' }), 3000);
            } catch (err) {
                setFetchStatus({ type: 'error', msg: 'Failed to update system status.' });
            } finally {
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => sendUpdate(pos.coords.latitude, pos.coords.longitude),
                err => {
                    console.warn("Location failed, sending with defaults", err);
                    sendUpdate();
                },
                { timeout: 3000, maximumAge: 60000 }
            );
        } else {
            sendUpdate();
        }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px', maxWidth: 800 },
        card: { background: CARD_BG, borderRadius: 16, padding: 32, boxShadow: '0 2px 15px rgba(0,0,0,0.05)', border: `1px solid ${BORDER}` },
        statusItem: (selected, color) => ({
            display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
            borderRadius: 12, border: `2px solid ${selected ? color : BORDER}`,
            background: selected ? color + '08' : '#fff', cursor: 'pointer',
            transition: 'all 0.2s', marginBottom: 12
        }),
        iconWrapper: (color) => ({
            width: 48, height: 48, borderRadius: 12, background: color + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
        }),
        toggle: {
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
            background: '#F8FAFC', borderRadius: 12, marginTop: 24, cursor: 'pointer'
        }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="My Status" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={s.card}>
                        <div style={{ marginBottom: 32 }}>
                            <h3 style={{ margin: '0 0 8px', color: TEXT_DARK }}>Current Availability</h3>
                            <p style={{ margin: 0, fontSize: 13, color: TEXT_MID }}>Your status is visible to organizers and helps in task dispatching.</p>
                        </div>

                        {statuses.map(stat => (
                            <div 
                                key={stat.id} 
                                style={s.statusItem(currentStatus === stat.id, stat.color)}
                                onClick={() => setCurrentStatus(stat.id)}
                            >
                                <div style={s.iconWrapper(stat.color)}>
                                    <stat.icon size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <b style={{ color: TEXT_DARK, fontSize: 15 }}>{stat.name}</b>
                                    <p style={{ margin: '2px 0 0', fontSize: 13, color: TEXT_MID }}>{stat.desc}</p>
                                </div>
                                {currentStatus === stat.id && <CheckCircle size={20} color={stat.color} />}
                            </div>
                        ))}

                        {fetchStatus.msg && (
                            <div style={{ marginTop: 20, padding: '12px', borderRadius: 8, background: fetchStatus.type === 'success' ? '#f0fdf4' : '#fef2f2', color: fetchStatus.type === 'success' ? '#166534' : '#991b1b', fontSize: 13, fontWeight: 600, border: `1px solid ${fetchStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                                {fetchStatus.msg}
                            </div>
                        )}

                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            style={{ width: '100%', marginTop: 32, padding: '16px', borderRadius: 12, background: ACCENT, color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1 }}>
                            {loading ? <><Loader2 size={18} className="animate-spin" /> Saving Status...</> : 'Save Status'}
                        </button>
                    </div>
                </div>
                            <Footer />
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default VolunteerStatus;

