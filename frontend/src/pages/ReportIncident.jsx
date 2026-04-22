import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    AlertTriangle, ShieldAlert, MapPin, Loader2, Send, CheckCircle,
    Flame, Ambulance, PersonStanding, Search as SearchIcon, UserRound, Wrench, Navigation
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const categories = [
    { id: 'fire', label: 'Fire Hazard', priority: 'high', Icon: Flame },
    { id: 'medical', label: 'Medical Emergency', priority: 'high', Icon: Ambulance },
    { id: 'violence', label: 'Violence', priority: 'high', Icon: AlertTriangle },
    { id: 'stampede', label: 'Crowd Stampede', priority: 'critical', Icon: PersonStanding },
    { id: 'suspicious', label: 'Suspicious Activity', priority: 'medium', Icon: SearchIcon },
    { id: 'lost_person', label: 'Lost Person', priority: 'medium', Icon: UserRound },
    { id: 'technical', label: 'Technical Problem', priority: 'low', Icon: Wrench },
];

const ReportIncident = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [lastSubmitTime, setLastSubmitTime] = useState(0);

    const [targetEventId, setTargetEventId] = useState(eventId || '');
    const [eventName, setEventName] = useState('');
    const [bookedEvents, setBookedEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    // Auto-sync offline drafts
    useEffect(() => {
        const syncDrafts = async () => {
            if (!navigator.onLine) return;
            const drafts = JSON.parse(localStorage.getItem('incident_drafts') || '[]');
            if (drafts.length === 0) return;
            
            const remaining = [];
            let hasSyncedDrafts = false;
            
            for (let d of drafts) {
                try {
                    await api.post('/monitoring/incidents/', d);
                    hasSyncedDrafts = true;
                } catch (e) {
                    // Only abandon draft if it failed 5 times
                    if (d.retryCount < 5) remaining.push({ ...d, retryCount: (d.retryCount || 0) + 1 });
                }
            }
            
            if (hasSyncedDrafts) {
                setStatus({ type: 'success', message: 'Offline drafts synchronized successfully!' });
                setTimeout(() => setStatus({ type: '', message: '' }), 4000);
            }
            localStorage.setItem('incident_drafts', JSON.stringify(remaining));
        };
        
        const interval = setInterval(syncDrafts, 15000); // Poll every 15s
        window.addEventListener('online', syncDrafts); // React to connection change
        
        return () => { 
            clearInterval(interval); 
            window.removeEventListener('online', syncDrafts); 
        };
    }, []);

    useEffect(() => {
        const fetchEventContext = async () => {
            try {
                setIsLoadingEvents(true);
                const tkRes = await api.get('/tickets/my-tickets/');
                
                // Extract unique events from booked tickets
                const eventsMap = {};
                if (tkRes.data && tkRes.data.length > 0) {
                    tkRes.data.forEach(ticket => {
                        if (ticket.event_details && ticket.event_details.id) {
                            const eventId = ticket.event_details.id;
                            if (!eventsMap[eventId]) {
                                eventsMap[eventId] = {
                                    id: ticket.event_details.id,
                                    name: ticket.event_details.name,
                                    venue_address: ticket.event_details.venue_address,
                                    start_datetime: ticket.event_details.start_datetime
                                };
                            }
                        }
                    });
                }
                
                const uniqueEvents = Object.values(eventsMap);
                setBookedEvents(uniqueEvents);
                
                // Set the event from URL param, or first booked event, or empty
                if (eventId) {
                    const event = uniqueEvents.find(e => e.id.toString() === eventId);
                    if (event) {
                        setTargetEventId(event.id.toString());
                        setEventName(event.name);
                    }
                } else if (uniqueEvents.length > 0) {
                    setTargetEventId(uniqueEvents[0].id.toString());
                    setEventName(uniqueEvents[0].name);
                }
                
                setIsLoadingEvents(false);
            } catch (e) {
                console.error("Failed to load booked events:", e);
                setIsLoadingEvents(false);
            }
        };
        fetchEventContext();
    }, [eventId]);

    const fetchLocation = () => {
        setIsLocating(true);
        setStatus({ type: '', message: '' });
        
        if (!navigator.geolocation) { 
            setStatus({ type: 'error', message: 'Location not supported on this device.' }); 
            setIsLocating(false); 
            return; 
        }
        
        const options = { 
            enableHighAccuracy: true, 
            timeout: 20000, 
            maximumAge: 5000 // Allow slight caching for speed
        };

        const tryGetPosition = (config) => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, config);
            });
        };

        const resolveAddress = async (lat, lon) => {
             try {
                 const res = await api.get(`/monitoring/reverse-geocode/?lat=${lat}&lon=${lon}`);
                 const fullName = res.data.location_name || '';
                 
                 // Extract English part only (before Nepali script)
                 // Nepali script starts at U+0900, so split at first non-Latin/ASCII character
                 let englishPart = fullName.split(/[\u0900-\u097F]/)[0].trim().replace(/,+$/, '');
                 
                 // If we got an English part, use it; otherwise use coordinates
                 if (englishPart && englishPart.length > 0) {
                     // Clean up duplicative "Nepal" occurrences
                     const parts = englishPart.split(',').map(s => s.trim());
                     const cleanParts = parts.filter((part, idx) => part !== '' && part.toLowerCase() !== 'nepal' && part !== parts[idx - 1]);
                     cleanParts.push('Nepal');
                     return cleanParts.join(', ');
                 }
                 return `Nepal`;
             } catch (e) {
                 return 'Nepal';
             }
        };

        const handleError = (err) => {
            let msg = "Unknown location error.";
            switch (err.code) {
                case 1: msg = "Location permission denied."; break;
                case 2: msg = "Location unavailable. Check GPS/network."; break;
                case 3: msg = "GPS timeout. Try moving to a clear area or checking permissions."; break;
                default: msg = "Unknown location issue."; break;
            }
            return msg;
        };

        const runFetch = async () => {
            try {
                // Phase 1: High Accuracy
                const pos = await tryGetPosition(options);
                const displayName = await resolveAddress(pos.coords.latitude, pos.coords.longitude);
                setLocation({ 
                    lat: pos.coords.latitude, 
                    lng: pos.coords.longitude, 
                    accuracy: pos.coords.accuracy,
                    display_name: displayName 
                });
                setIsLocating(false);
            } catch (err) {
                console.warn("High accuracy failed, retrying with balanced...", err);
                try {
                    // Phase 2: Lower Accuracy (Retry with extreme timeout)
                    const pos = await tryGetPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
                    const displayName = await resolveAddress(pos.coords.latitude, pos.coords.longitude);
                    setLocation({ 
                        lat: pos.coords.latitude, 
                        lng: pos.coords.longitude, 
                        accuracy: pos.coords.accuracy,
                        display_name: displayName 
                    });
                    setIsLocating(false);
                } catch (err2) {
                    // Phase 3: Fallback to Cached (Last Known)
                    const cachedLocName = localStorage.getItem('user_location_name');
                    const lastLat = localStorage.getItem('last_user_lat');
                    const lastLng = localStorage.getItem('last_user_lng');

                    if (lastLat && lastLng) {
                        setLocation({ 
                            lat: parseFloat(lastLat), 
                            lng: parseFloat(lastLng), 
                            accuracy: 150, // Conservatively low for cached
                            display_name: cachedLocName ? cachedLocName : 'Nepal' 
                        });
                        setStatus({ type: 'info', message: 'Using last known location due to weak GPS signal.' });
                    } else {
                        // Dynamically bubble the explicit GPS error to the UI
                        setStatus({ type: 'error', message: handleError(err2) });
                    }
                    setIsLocating(false);
                }
            }
        };

        runFetch();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Spam Protection (10s lock)
        const timeSinceLast = Date.now() - lastSubmitTime;
        if (timeSinceLast < 10000) {
            setStatus({ type: 'error', message: `Please wait ${Math.ceil((10000 - timeSinceLast)/1000)}s before sending another report.` });
            return;
        }

        setFieldErrors({});

        const fErrors = {};
        if (!selectedCategory) fErrors.category = 'Category is required.';
        if (!location) fErrors.location = 'Location is required.';
        if (!targetEventId) fErrors.event = 'No active event found to report for.';

        if (Object.keys(fErrors).length > 0) {
            setFieldErrors(fErrors);
            setStatus({ type: 'error', message: fErrors.event || 'Required fields missing.' });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        const cat = categories.find(c => c.id === selectedCategory);
        const payload = { 
            event: parseInt(targetEventId), 
            category: selectedCategory, 
            priority: cat.priority, 
            title: cat.label, 
            description: description.trim() || `Emergency: ${cat.label}`, 
            latitude: Number(location.lat.toFixed(6)), 
            longitude: Number(location.lng.toFixed(6)),
            gps_accuracy: location.accuracy || 0,
            location_name: location.display_name || 'Nepal'
        };

        try {
            await Promise.all([
                api.post('/monitoring/incidents/', payload),
                new Promise(resolve => setTimeout(resolve, 800))
            ]);
            
            setStatus({ type: 'success', message: 'Report sent successfully. Help is standby.' });
            setLastSubmitTime(Date.now());
            setIsSubmitting(false);
            
            // Redirect/Reset after delay
            setTimeout(() => {
                setStatus({ type: '', message: '' });
                setSelectedCategory('');
                setDescription('');
                setLocation(null); // Reset location to force fresh capture if needed
                setFieldErrors({});
            }, 3000);
        } catch (err) {
            console.error("Submission failed:", err);
            
            // If the server responded with a validation error (e.g. duplicate), show it directly
            if (err.response && err.response.data) {
                const serverMsg = typeof err.response.data === 'string' 
                    ? err.response.data 
                    : (Array.isArray(err.response.data) ? err.response.data[0] : (err.response.data.detail || err.response.data.message || JSON.stringify(err.response.data)));
                setStatus({ type: 'error', message: serverMsg });
            } else {
                // Offline / Network error: Save to Draft Queue
                const drafts = JSON.parse(localStorage.getItem('incident_drafts') || '[]');
                drafts.push({ ...payload, id: Date.now(), retryCount: 0 });
                localStorage.setItem('incident_drafts', JSON.stringify(drafts));
                setStatus({ type: 'error', message: 'Network unstable. Report saved as draft and will retry automatically when online.' });
            }
            setIsSubmitting(false);
        }
    };

    const s = {
        shell: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" },
        main: { flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' },
        content: { padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 },
        card: { background: CARD_BG, borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, overflow: 'hidden', width: '100%', maxWidth: 860 },
        inner: { padding: '28px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28 },
        label: { display: 'block', fontSize: 13, fontWeight: 700, color: TEXT_DARK, marginBottom: 8 },
        catBtn: (active, hasError) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10,
            border: active ? `2px solid ${ACCENT}` : (hasError ? '1px solid #ef4444' : `1px solid ${BORDER}`),
            background: active ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s'
        }),
        textarea: { width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, resize: 'vertical', minHeight: 120, outline: 'none', fontFamily: 'inherit', color: TEXT_DARK, background: '#f8fafc' },
        submitBtn: { width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
        locCard: { background: location ? '#f0fdf4' : (fieldErrors.location ? '#fef2f2' : '#f8fafc'), borderRadius: 10, padding: '16px', border: `1px solid ${location ? '#86efac' : (fieldErrors.location ? '#fecaca' : BORDER)}`, textAlign: 'center', marginBottom: 12 },
        locBtn: { width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#f8fafc', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: TEXT_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
        historyItem: { padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        badge: (status) => ({
            fontSize: 10, padding: '4px 8px', borderRadius: 20, fontWeight: 800, textTransform: 'uppercase',
            background: status === 'resolved' ? '#dcfce7' : (status === 'pending' ? '#fef9c3' : '#dbeafe'),
            color: status === 'resolved' ? '#166534' : (status === 'pending' ? '#854d0e' : '#1e40af')
        })
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Report Incident" breadcrumb={eventName || "General"} />
                <div style={s.content}>
                    <div style={s.card}>
                        <div style={{ background: '#fef2f2', borderBottom: `1px solid #fecaca`, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ShieldAlert size={16} color="#dc2626" />
                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Emergency? For life-threatening situations, call 100 immediately.</span>
                        </div>

                        <div style={{ padding: '28px', paddingBottom: 12 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>What happened?</h2>
                            <p style={{ fontSize: 13, color: TEXT_MID, marginBottom: 0 }}>
                                {eventName ? `Reporting for: ${eventName}` : "Select an event and category below."}
                            </p>
                        </div>

                        <div style={s.inner}>
                            <form onSubmit={handleSubmit}>
                                <label style={s.label}>Select Event</label>
                                <select 
                                    value={targetEventId} 
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        setTargetEventId(selectedId);
                                        const selectedEvent = bookedEvents.find(evt => evt.id.toString() === selectedId);
                                        if (selectedEvent) {
                                            setEventName(selectedEvent.name);
                                        }
                                        setFieldErrors(p => ({ ...p, event: null }));
                                    }}
                                    disabled={isLoadingEvents || bookedEvents.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 8,
                                        border: fieldErrors.event ? '1px solid #ef4444' : `1px solid ${BORDER}`,
                                        fontSize: 13,
                                        color: TEXT_DARK,
                                        background: '#f8fafc',
                                        cursor: bookedEvents.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: bookedEvents.length === 0 ? 0.6 : 1,
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        marginBottom: 16
                                    }}
                                >
                                    <option value="">
                                        {isLoadingEvents ? 'Loading events...' : (bookedEvents.length === 0 ? 'No booked events found' : 'Select an event')}
                                    </option>
                                    {bookedEvents.map(event => (
                                        <option key={event.id} value={event.id.toString()}>
                                            {event.name}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.event && (
                                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: -12, marginBottom: 12 }}>
                                        {fieldErrors.event}
                                    </div>
                                )}

                                <label style={s.label}>Category</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    {categories.map(cat => (
                                        <button key={cat.id} type="button" style={s.catBtn(selectedCategory === cat.id, fieldErrors.category)} 
                                            onClick={() => { setSelectedCategory(cat.id); setFieldErrors(p => ({ ...p, category: null })); }}>
                                            <cat.Icon size={20} color={selectedCategory === cat.id ? ACCENT : TEXT_MID} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: selectedCategory === cat.id ? ACCENT : TEXT_DARK }}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <label style={s.label}>Description</label>
                                <textarea style={s.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the situation briefly…" />

                                {status.message && (
                                    <div style={{ marginTop: 20, padding: '12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', background: status.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${status.type === 'success' ? '#86efac' : '#fecaca'}` }}>
                                        {status.type === 'success' ? <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />}
                                        <span style={{ fontSize: 13, color: status.type === 'success' ? '#16a34a' : '#dc2626', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.message}</span>
                                    </div>
                                )}

                                <button type="submit" disabled={isSubmitting || !location || !selectedCategory}
                                    style={{ ...s.submitBtn, opacity: (isSubmitting || !location || !selectedCategory) ? 0.6 : 1 }}>
                                    {isSubmitting ? <Loader2 size={16} className="spin" /> : <><Send size={15} /> Send Report</>}
                                </button>
                            </form>

                                <div>
                                    <label style={s.label}>Your Location</label>
                                    <div style={s.locCard}>
                                        {location ? (
                                            <>
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <MapPin size={22} color="#fff" />
                                                </div>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', marginBottom: 2 }}>{location.display_name || 'Location captured'}</p>
                                                <p style={{ fontSize: 11, fontFamily: 'monospace', color: TEXT_MID }}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <MapPin size={22} color={TEXT_MID} />
                                                </div>
                                                <p style={{ fontSize: 13, color: TEXT_MID }}>Position unknown</p>
                                            </>
                                        )}
                                    </div>
                                    
                                    <button type="button" style={s.locBtn} onClick={fetchLocation} disabled={isLocating}>
                                        {isLocating ? <Loader2 size={16} className="spin" /> : <><Navigation size={15} /> Update Location</>}
                                    </button>
                                </div>
                        </div>
                    </div>
                </div>
                            <Footer />
            </main>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};



export default ReportIncident;
