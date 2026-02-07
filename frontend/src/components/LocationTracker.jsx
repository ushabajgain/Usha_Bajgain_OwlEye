import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getToken, getUserId, getFullName, getRole } from '../utils/auth';
import api from '../utils/api';

const LocationTracker = () => {
    const location = useLocation();
    const ws = useRef(null);
    const watchId = useRef(null);

    const pathname = location?.pathname || '';
    const [activeEventId, setActiveEventId] = useState(null);

    useEffect(() => {
        // 1. Try to get ID from URL
        const match = pathname.match(/\/(events|organizer\/heatmap|organizer\/live-map|organizer\/dashboard|report-incident)\/(\d+)/);
        if (match && match[2]) {
            const id = match[2];
            setActiveEventId(id);
            localStorage.setItem('last_active_event_id', id);
            return;
        }

        // 2. Try localStorage
        const stored = localStorage.getItem('last_active_event_id');
        if (stored) {
            setActiveEventId(stored);
            return;
        }

        // 3. Last fallback: Fetch any active event from API
        const token = getToken();
        if (!token) return;
        
        api.get('/events/').then(res => {

            if (res.data.length > 0) {
                const id = res.data[0].id.toString();
                setActiveEventId(id);
                localStorage.setItem('last_active_event_id', id);
            }
        }).catch(() => {});
    }, [pathname]);

    const [trackingEnabled, setTrackingEnabled] = useState(localStorage.getItem('is_tracking_enabled') !== 'false');

    // Live listen for privacy toggle without hard page reload
    useEffect(() => {
        const handlePrefChange = (e) => setTrackingEnabled(e.detail);
        window.addEventListener('tracking_preference_changed', handlePrefChange);
        return () => window.removeEventListener('tracking_preference_changed', handlePrefChange);
    }, []);

    useEffect(() => {
        if (!activeEventId || !trackingEnabled) return;
        const token = getToken();
        if (!token) return;

        let socket;
        
        // Haversine distance calculator for Adaptive Tracking & Anti-Jitter
        const calcDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
            const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        const flushQueue = () => {
            if (!navigator.onLine || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
            const queue = JSON.parse(localStorage.getItem('offline_location_queue') || '[]');
            if (queue.length === 0) return;
            
            // Transmit sequentially natively into Channel layer queue buffer
            queue.forEach(pt => {
                 ws.current.send(JSON.stringify(pt));
            });
            localStorage.removeItem('offline_location_queue'); // Successful flush cleanup
        };

        window.addEventListener('online', flushQueue);

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const host = window.location.host === 'localhost:5173' ? '127.0.0.1:8000' : window.location.host;
            const wsUrl = `${protocol}://${host}/ws/heatmap/${activeEventId}/`;

            socket = new WebSocket(wsUrl);
            ws.current = socket;

            socket.onopen = () => {
                window.dispatchEvent(new CustomEvent('location_tracking_status', { detail: { active: true, eventId: activeEventId } }));
                flushQueue();
            };

            socket.onclose = () => {
                window.dispatchEvent(new CustomEvent('location_tracking_status', { detail: { active: false } }));
            };

            if (navigator.geolocation) {
                let lastUpdate = 0;
                let lastPos = null;
                let lastNetworkSend = 0;
                
                const handlePosition = (position) => {
                    const { latitude, longitude } = position.coords;
                    const now = Date.now();

                    if (lastPos) {
                        const dist = calcDistance(lastPos.lat, lastPos.lng, latitude, longitude);
                        const timeDiffMs = now - lastPos.timestamp; // True time distance
                        
                        // Jitter Filter: Ignore minor GPS drift < 5 meters outdoors/indoors.
                        if (dist < 5 && timeDiffMs < 10000) return;
                        
                        // Adaptive Interval: If stationary (speed < 1m/s), 15s checks. If moving, 2s.
                        const speed = dist / (timeDiffMs / 1000); 
                        const requiredIntervalMs = speed < 1 ? 15000 : 2000;
                        if ((now - lastNetworkSend) < requiredIntervalMs) return; // Retain burst safety throttle
                    }

                    lastPos = { lat: latitude, lng: longitude, timestamp: now };
                    lastNetworkSend = now;

                    const payload = {
                        type: 'location_update',
                        lat: latitude,
                        lng: longitude,
                        timestamp: now / 1000,
                        user_id: getUserId(),
                        full_name: getFullName(),
                        role: getRole(),
                        battery: '100%'
                    };

                    if (navigator.onLine && ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify(payload));
                    } else {
                        const queue = JSON.parse(localStorage.getItem('offline_location_queue') || '[]');
                        queue.push(payload);
                        localStorage.setItem('offline_location_queue', JSON.stringify(queue.slice(-200))); // Persist last 200 points
                    }

                    if (now - lastUpdate > 60000 && navigator.onLine) {
                        localStorage.setItem('last_user_lat', latitude.toString());
                        localStorage.setItem('last_user_lng', longitude.toString());

                        api.post('/accounts/user/location/', {
                            latitude: latitude,
                            longitude: longitude
                        }).then(res => {
                            if (res.data.location_name) {
                                localStorage.setItem('user_location_name', res.data.location_name);
                                window.dispatchEvent(new CustomEvent('user_location_updated', { 
                                    detail: { name: res.data.location_name, lat: latitude, lng: longitude } 
                                 }));
                            }
                        }).catch(() => {});
                        lastUpdate = now;
                    }
                };

                const handleError = (err) => {
                    let msg = "Unknown location error";
                    switch (err.code) {
                        case 1: msg = "Location permission denied"; break;
                        case 2: msg = "Location unavailable. Check GPS."; break;
                        case 3: msg = "GPS timeout. Move to an open area and try again."; break;
                        default: msg = "Unknown location error"; break;
                    }
                    console.error("GPS Error:", err.code, msg);
                    window.dispatchEvent(new CustomEvent('location_tracking_status', { detail: { active: false, error: msg } }));
                };

                const geoOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 };

                navigator.geolocation.getCurrentPosition(
                    (p) => {
                        handlePosition(p);
                        watchId.current = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
                    },
                    (err) => {
                        handleError(err);
                        watchId.current = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
                    },
                    geoOptions
                );
            }
        } catch (e) {
            console.error("Tracking setup failed", e);
        }

        return () => {
             window.removeEventListener('online', flushQueue);
             if (socket) socket.close();
             if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
             window.dispatchEvent(new CustomEvent('location_tracking_status', { detail: { active: false } }));
        };
    }, [activeEventId, trackingEnabled]);

    return null;
};

export default LocationTracker;
