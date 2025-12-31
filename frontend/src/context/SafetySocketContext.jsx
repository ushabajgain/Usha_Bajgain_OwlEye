import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/api';
import { getToken } from '../utils/auth';

const SafetySocketContext = createContext(null);

export const SafetySocketProvider = ({ children, eventId: initialEventId = '1' }) => {
    const [eventId, setEventId] = useState(initialEventId);
    const [incidents, setIncidents] = useState({});
    const [sosAlerts, setSosAlerts] = useState({});
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
                    (locRes.value.data || []).forEach(l => locationMap[l.user_id || l.id] = l);
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
            if (ws.current) ws.current.close();
            const socket = new WebSocket(currentWsUrl);
            ws.current = socket;

            socket.onopen = () => setIsConnected(true);
            socket.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    
                    if (data.entity_type === 'incident') {
                        if (data.status === 'resolved' || data.status === 'false') {
                            setIncidents(prev => { const n = { ...prev }; delete n[data.id]; return n; });
                        } else {
                            setIncidents(prev => ({ ...prev, [data.id]: data }));
                        }
                    } 
                    else if (data.entity_type === 'sos') {
                        if (data.status === 'resolved') {
                            setSosAlerts(prev => { const n = { ...prev }; delete n[data.id]; return n; });
                        } else {
                            setSosAlerts(prev => ({ ...prev, [data.id]: data }));
                        }
                    } 
                    else if (data.entity_type === 'user' || data.entity_type === 'responder') {
                        const uid = data.user_id || data.id;
                        setLocations(prev => ({ ...prev, [uid]: { ...data, user_id: uid } }));
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
        locations, setLocations,
        safetyAlerts,
        notifications, unreadCount, markAsRead, loadMoreNotifications, hasMoreNotifs,
        tickets, setTickets,
        events, setEvents,
        isConnected,
        loading,
        ws  // Expose WebSocket ref for direct access in location tracking and other features
    }), [
        eventId, incidents, sosAlerts, locations, safetyAlerts, 
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
