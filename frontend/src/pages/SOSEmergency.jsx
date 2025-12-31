import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { Siren, AlertTriangle, ShieldCheck, Loader2, MapPin } from 'lucide-react';
import { useParams } from 'react-router-dom';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const DANGER = '#ef4444';
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;

const SOSEmergency = () => {
    const { id: eventId } = useParams();
    const [status, setStatus] = useState('idle'); // 'idle', 'locating', 'cancelling', 'loading', 'sent'
    const [error, setError] = useState('');
    const [targetEventId, setTargetEventId] = useState(eventId || '');
    const [eventName, setEventName] = useState('');
    const [countdown, setCountdown] = useState(5);
    const cancelRef = useRef(null);

    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        const fetchSOSContext = async () => {
            try {
                if (eventId) {
                    const res = await api.get(`/events/${eventId}/`);
                    setEventName(res.data.name);
                } else {
                    const [tkRes, evRes] = await Promise.all([
                        api.get('/tickets/my-tickets/'),
                        api.get('/events/')
                    ]);
                    
                    if (tkRes.data.length > 0) {
                        const evt = tkRes.data[0].event_details;
                        setTargetEventId(evt.id.toString());
                        setEventName(evt.name);
                    } else if (evRes.data.length > 0) {
                        setTargetEventId(evRes.data[0].id.toString());
                        setEventName(evRes.data[0].name);
                    }
                }
            } catch (e) {
                console.error("SOS Context Fetch Error:", e);
            }
        };
        fetchSOSContext();
        
        return () => {
             if (cancelRef.current) clearInterval(cancelRef.current);
        };
    }, [eventId]);

    const triggerSOS = async () => {
        setStatus('locating');
        setError('');
        
        if (!navigator.geolocation) {
            setError('Geolocation not supported. Call local emergency services.');
            setStatus('idle');
            return;
        }

        if (!targetEventId) {
            setError('No active event identified. Please join an event first.');
            setStatus('idle');
            return;
        }

        const options = { 
            enableHighAccuracy: true, 
            timeout: 20000, 
            maximumAge: 5000 
        };

        const executeSOS = async (lat, lng) => {
            setStatus('loading');
            try {
                let resolvedLocationName = locationName;
                try {
                    const geo = await api.get(`/monitoring/reverse-geocode/?lat=${lat}&lon=${lng}`);
                    resolvedLocationName = geo.data.location_name;
                    setLocationName(resolvedLocationName);
                } catch {}

                await api.post('/monitoring/sos/', {
                    event: parseInt(targetEventId),
                    latitude: Number(lat.toFixed(6)),
                    longitude: Number(lng.toFixed(6)),
                    sos_type: 'panic',
                    priority: 'critical',
                    location_name: resolvedLocationName || null
                });
                setStatus('sent');
            } catch (err) {
                console.error("SOS Dispatch Error:", err.response?.data || err.message);
                setError(err.response?.data?.detail || "Connection failed. Help might not be dispatched.");
                setStatus('idle');
            }
        };

        const errorHandler = (err) => {
            console.warn("SOS GPS Error:", err);
            setStatus('idle');
            switch (err.code) {
                case 1: setError("Location permission denied"); break;
                case 2: setError("Location unavailable. Check GPS."); break;
                case 3: setError("GPS timeout. Move to an open area and try again."); break;
                default: setError("Unknown location error"); break;
            }
        };

        // Pre-fetch location immediately to avoid lag, then hold into countdown
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setStatus('cancelling');
                setCountdown(5);
                cancelRef.current = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(cancelRef.current);
                            executeSOS(pos.coords.latitude, pos.coords.longitude);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            },
            (err) => {
                if (err.code === 3) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            setStatus('cancelling');
                            setCountdown(5);
                            cancelRef.current = setInterval(() => {
                                setCountdown(prev => {
                                    if (prev <= 1) {
                                        clearInterval(cancelRef.current);
                                        executeSOS(pos.coords.latitude, pos.coords.longitude);
                                        return 0;
                                    }
                                    return prev - 1;
                                });
                            }, 1000);
                        },
                        errorHandler,
                        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
                    );
                } else {
                    errorHandler(err);
                }
            },
            options
        );
    };

    const cancelSOS = () => {
        if (cancelRef.current) clearInterval(cancelRef.current);
        setStatus('idle');
        setCountdown(5);
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 },
        panicCard: {
            background: CARD_BG, borderRadius: 32, padding: 48, border: `1px solid ${C.border}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 450, width: '100%',
            animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        panicBtn: {
            width: 180, height: 180, borderRadius: '50%', background: DANGER, color: '#fff',
            border: `12px solid ${DANGER}33`, cursor: 'pointer', outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px',
            animation: status === 'idle' ? 'pulse-sos 2s infinite' : 'none',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        },
        sentBadge: {
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
            background: '#f0fdf4', color: '#166534', borderRadius: 30, fontWeight: 800, fontSize: 13, border: '1px solid #bbf7d0'
        }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="SOS Panic Signal" breadcrumb={eventName || "Safety"} />
                
                <div style={s.content}>
                    <div style={s.panicCard}>
                        {status === 'cancelling' ? (
                            <div>
                                <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#fff0f0', border: '4px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <span style={{ fontSize: 48, fontWeight: 900, color: DANGER }}>{countdown}</span>
                                </div>
                                <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT_DARK, marginBottom: 12 }}>SOS Armed.</h1>
                                <p style={{ fontSize: 15, color: TEXT_MID, marginBottom: 32 }}>
                                    Location acquired. Dispatching emergency unit to your position in {countdown} seconds...
                                </p>
                                <button onClick={cancelSOS} style={{ padding: '14px 40px', borderRadius: 30, background: '#f1f5f9', color: TEXT_DARK, border: `1px solid ${C.border}`, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                                    CANCEL DISPATCH
                                </button>
                            </div>
                        ) : status === 'sent' ? (
                            <div>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <ShieldCheck size={40} />
                                </div>
                                <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT_DARK, marginBottom: 12 }}>Signal Received.</h1>
                                <p style={{ fontSize: 16, color: TEXT_MID, lineHeight: 1.6, marginBottom: 32 }}>
                                    Emergency services have your precise location at <b>{locationName || eventName || 'the venue'}</b>. Help is moving to you now.
                                </p>
                                <div style={s.sentBadge}>
                                    <MapPin size={16} /> GPS CONFIRMED
                                </div>
                                <div style={{ marginTop: 40 }}>
                                    <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', color: TEXT_MID, fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
                                        Reset Form
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button style={s.panicBtn} onClick={triggerSOS} disabled={status === 'locating' || status === 'loading'}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    {(status === 'locating' || status === 'loading') ? <Loader2 size={64} className="spin" /> : <Siren size={72} />}
                                </button>
                                <h1 style={{ fontSize: 28, fontWeight: 950, color: TEXT_DARK, marginBottom: 12, letterSpacing: '-0.5px' }}>
                                    {(status === 'locating' || status === 'loading') ? 'Connecting...' : 'Emergency SOS'}
                                </h1>
                                <p style={{ fontSize: 15, color: TEXT_MID, lineHeight: 1.7, marginBottom: 0 }}>
                                    {(status === 'locating' || status === 'loading')
                                        ? "Establishing satellite lock and securing connection..." 
                                        : "Tap the button to request immediate medical or security assistance. Your location will be shared automatically."}
                                </p>
                                {error && (
                                    <div style={{ marginTop: 24, padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: DANGER, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <AlertTriangle size={18} /> {error}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
            <style>{`
                @keyframes pulse-sos {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 35px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default SOSEmergency;
