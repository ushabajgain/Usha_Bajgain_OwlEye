import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/api';
import { getToken } from '../utils/auth';

const SafetySocketContext = createContext(null);

export const SafetySocketProvider = ({ children, eventId: initialEventId = '1' }) => {
    const [eventId, setEventId] = useState(initialEventId);
    const [incidents, setIncidents] = useState({});
    const [sosAlerts, setSosAlerts] = useState({});
    const [nearbySosAlerts, setNearbySosAlerts] = useState({}); // ✅ STEP 5.3.4: Targeted nearby SOS alerts
    const [locations, setLocations] = useState({});
    const [safetyAlerts, setSafetyAlerts] = useState([]);
    const [tickets, setTickets] = useState({});
    const [events, setEvents] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const ws = useRef(null);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationPage, setNotificationPage] = useState(1);
    const [hasMoreNotifs, setHasMoreNotifs] = useState(false);
    const wsDisabledRef = useRef(false); // Track if WebSocket is disabled due to backend not supporting it

    useEffect(() => {
        if (!eventId) {
            setLoading(false);
            return;
        }
        const currentWsUrl = import.meta.env.MODE === 'production' 
            ? `wss://${window.location.host}/ws/heatmap/${eventId}/`
            : `ws://127.0.0.1:8000/ws/heatmap/${eventId}/`;

        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchInitial = async () => {
            setLoading(true);
            try {
                const results = await Promise.allSettled([
                    api.get('/monitoring/incidents/'),
                    api.get('/monitoring/sos/'),
                    api.get(`/monitoring/locations/${eventId}/`),
                    api.get('/monitoring/alerts/'),
                    api.get('/tickets/my-tickets/'),
                    api.get('/events/'),
                    api.get('/monitoring/notifications/')
                ]);

                const [incRes, sosRes, locRes, alertRes, tkRes, evRes, notifyRes] = results;

                const incidentMap = {};
                if (incRes.status === 'fulfilled') {
                    (incRes.value.data || []).forEach(i => {
                        if (i.status !== 'resolved' && i.status !== 'false') incidentMap[i.id] = i;
                    });
                }
                setIncidents(incidentMap);

                const sosMap = {};
                if (sosRes.status === 'fulfilled') {
                    (sosRes.value.data || []).forEach(s => {
                        if (s.status !== 'resolved') sosMap[s.id] = s;
                    });
                }
                setSosAlerts(sosMap);

                const locationMap = {};
                if (locRes.status === 'fulfilled') {
                    const apiLocations = locRes.value.data || [];
                    console.log(`[LOCATION_SOURCE] API returned ${apiLocations.length} locations for event ${eventId}`);
                    
                    apiLocations.forEach(l => {
                        // Validate each location has required fields (user_id, name, coordinates)
                        if (l && l.user_id && l.name && (l.lat || l.latitude) && (l.lng || l.longitude)) {
                            locationMap[l.user_id || l.id] = l;
                            console.log(`[LOCATION_SOURCE] ✓ Added: ${l.name} (ID: ${l.user_id})`);
                        } else {
                            // Log invalid entries that are filtered out
                            if (l) {
                                console.warn(`[LOCATION_FILTER] Filtered out invalid entry:`, {
                                    user_id: l.user_id,
                                    name: l.name,
                                    hasCoords: !!(l.lat || l.latitude)
                                });
                            }
                        }
                    });
                    
                    // CRITICAL FIX: If API returns empty, clear any cached locations
                    if (apiLocations.length === 0) {
                        console.log(`[LOCATION_FIX] API returned EMPTY - clearing any stale cached locations`);
                    }
                } else if (locRes.status === 'rejected') {
                    console.error(`[LOCATION_SOURCE] API call failed:`, locRes.reason);
                }
                setLocations(locationMap);

                const ticketMap = {};
                if (tkRes.status === 'fulfilled' && Array.isArray(tkRes.value.data)) {
                    tkRes.value.data.forEach(t => ticketMap[t.id] = t);
                }
                setTickets(ticketMap);

                const eventMap = {};
                if (evRes.status === 'fulfilled' && Array.isArray(evRes.value.data)) {
                    evRes.value.data.forEach(e => eventMap[e.id] = e);
                }
                setEvents(eventMap);

                if (alertRes.status === 'fulfilled') setSafetyAlerts(alertRes.value.data || []);
                
                if (notifyRes.status === 'fulfilled') {
                    const nData = notifyRes.value.data.results ? notifyRes.value.data.results : (notifyRes.value.data || []);
                    setNotifications(nData);
                    setHasMoreNotifs(!!notifyRes.value.data.next);
                    setUnreadCount(nData.filter(n => !n.is_read).length);
                }

            } catch (err) {
                console.error("Initial safety fetch overall failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();

        const connect = () => {
            // Skip WebSocket if backend doesn't support it (Daphne not running)
            // Check both the ref and sessionStorage (in case other components already detected it)
            if (wsDisabledRef.current || sessionStorage.getItem('wsDisabled') === 'true') {
                wsDisabledRef.current = true;
                return;
            }

            if (ws.current) ws.current.close();
            
            try {
                const socket = new WebSocket(currentWsUrl);
                ws.current = socket;

                socket.onopen = () => setIsConnected(true);

                socket.onerror = (err) => {
                    // Mark WebSocket as disabled for this session
                    wsDisabledRef.current = true;
                    sessionStorage.setItem('wsDisabled', 'true');
                    setIsConnected(false);
                    // Silent fail - don't log, just disable WebSocket for this session
                };

                socket.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        
                        // ✅ STEP 5.3.4: Handle targeted SOS_NEARBY messages
                        if (data.type === 'SOS_NEARBY') {
                            setNearbySosAlerts(prev => ({
                                ...prev,
                                [data.sos_id]: {
                                    id: data.sos_id,
                                    event_id: data.event_id,
                                    latitude: data.latitude,
                                    longitude: data.longitude,
                                    distance: data.distance,
                                    distance_text: data.distance_text,
                                    sos_type: data.sos_type,
                                    sos_type_display: data.sos_type_display,
                                    priority: data.priority,
                                    user_name: data.user_name,
                                    user_phone: data.user_phone,
                                    location_name: data.location_name,
                                    status: data.status,
                                    message: data.message,
                                    created_at: new Date().toISOString()
                                }
                            }));
                            console.log(`[SOS_NEARBY] ✓ New nearby SOS: ${data.sos_id} (${data.distance_text})`);
                            return;
                        }
                        
                        if (data.entity_type === 'incident') {
                            if (data.status === 'resolved' || data.status === 'false') {
                                setIncidents(prev => { const n = { ...prev }; delete n[data.id]; return n; });
                            } else {
                                setIncidents(prev => ({ ...prev, [data.id]: data }));
                            }
                        } 
                        else if (data.entity_type === 'sos') {
                            // ✅ STEP 5.3.5: Still handle for organizers/admins
                            // Volunteers only see SOS via SOS_NEARBY (targeted) not this global broadcast
                            if (data.status === 'resolved') {
                                setSosAlerts(prev => { const n = { ...prev }; delete n[data.id]; return n; });
                            } else {
                                setSosAlerts(prev => ({ ...prev, [data.id]: data }));
                            }
                        } 
                        else if (data.entity_type === 'user' || data.entity_type === 'responder') {
                            // CRITICAL FIX: Validate user has required fields before adding
                            const uid = data.user_id || data.id;
                            const hasName = data.name && data.name.trim().length > 0;
                            const hasCoords = (data.lat !== undefined || data.latitude !== undefined) && 
                                             (data.lng !== undefined || data.longitude !== undefined);
                            
                            if (uid && hasName && hasCoords) {
                                setLocations(prev => {
                                    const updated = { ...prev, [uid]: { ...data, user_id: uid } };
                                    console.log(`[LOCATION_WS] ✓ Updated location: ${data.name} (ID: ${uid})`);
                                    return updated;
                                });
                            } else {
                                // Invalid user data - REJECT and log
                                console.error('[LOCATION_VALIDATION] REJECTED invalid WebSocket user data:', {
                                    user_id: uid,
                                    name: data.name,
                                    hasCoords: hasCoords,
                                    received: data
                                });
                            }
                        }
                        else if (data.entity_type === 'safety_alert') {
                            setSafetyAlerts(prev => [data, ...prev].slice(0, 10));
                        }
                        else if (data.entity_type === 'notification') {
                            setNotifications(prev => [data, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        }
                        else if (data.entity_type === 'notification_read') {
                            setNotifications(prev => prev.map(n => n.id === data.id ? { ...n, is_read: true } : n));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                        else if (data.entity_type === 'notification_read_all') {
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            setUnreadCount(0);
                        }
                        else if (data.entity_type === 'ticket') {
                            setTickets(prev => ({ ...prev, [data.id]: data }));
                        }
                        else if (data.entity_type === 'event') {
                            if (data.action === 'deleted' || data.status === 'cancelled') {
                                setEvents(prev => { const n = { ...prev }; delete n[data.id]; return n; });
                            } else {
                                setEvents(prev => ({ ...prev, [data.id]: { ...prev[data.id], ...data } }));
                            }
                        }
                    } catch (err) {
                        console.error("Socket message error", err);
                    }
                };

            socket.onclose = () => {
                setIsConnected(false);
                // Only reconnect if the socket is still the current one
                if (ws.current === socket) {
                    setTimeout(connect, 5000);
                }
            };
            } catch (err) {
                console.error('[SafetySocketContext] WebSocket initialization error:', err);
                wsDisabledRef.current = true;
                sessionStorage.setItem('wsDisabled', 'true');
            }
        };

        connect();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [eventId]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/monitoring/notifications/${id}/`, { is_read: true });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error("Mark read failed", err); }
    };

    const loadMoreNotifications = async () => {
        if (!hasMoreNotifs || loading) return;
        try {
            const nextP = notificationPage + 1;
            const res = await api.get(`/monitoring/notifications/?page=${nextP}&limit=20`);
            setNotifications(prev => [...prev, ...res.data.results]);
            setHasMoreNotifs(!!res.data.next);
            setNotificationPage(nextP);
        } catch (e) { console.error("Load more failed", e); }
    };

    const value = useMemo(() => ({
        eventId, updateEventId: setEventId,
        incidents, setIncidents,
        sosAlerts, setSosAlerts,
        nearbySosAlerts, setNearbySosAlerts,  // ✅ STEP 5.3.4: Expose nearby SOS alerts
        locations, setLocations,
        safetyAlerts,
        notifications, unreadCount, markAsRead, loadMoreNotifications, hasMoreNotifs,
        tickets, setTickets,
        events, setEvents,
        isConnected,
        loading,
        ws  // Expose WebSocket ref for direct access in location tracking and other features
    }), [
        eventId, incidents, sosAlerts, nearbySosAlerts, locations, safetyAlerts, 
        notifications, unreadCount, hasMoreNotifs, tickets, 
        events, isConnected, loading
    ]);

    return (
        <SafetySocketContext.Provider value={value}>
            {children}
        </SafetySocketContext.Provider>
    );
};

export const useSafety = () => {
    const context = useContext(SafetySocketContext);
    if (!context) throw new Error('useSafety must be used within SafetySocketProvider');
    return context;
};
