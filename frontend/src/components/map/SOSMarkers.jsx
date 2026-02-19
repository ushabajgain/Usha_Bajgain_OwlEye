import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createSOSIcon = () => L.divIcon({
    html: `<div class="sos-marker-wrap">
        <div class="sos-pulse-ring"></div>
        <div class="sos-pulse-ring-delayed"></div>
        <div class="sos-core-dot"></div>
    </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
});

/**
 * Renders SOS markers for a specific event.
 * Uses pulsing red animation for high visibility.
 * Automatically reflects status changes from WebSocket updates.
 */
const SOSMarkers = ({ sosAlerts, eventId }) => {
    const filtered = useMemo(() => {
        if (!sosAlerts) return [];
        return Object.values(sosAlerts).filter(s => {
            const lat = parseFloat(s.latitude || s.lat);
            const lng = parseFloat(s.longitude || s.lng);
            if (isNaN(lat) || isNaN(lng)) return false;
            if (s.status === 'resolved' || s.status === 'cancelled' || s.status === 'completed') return false;
            // If eventId is provided, filter by it; otherwise show all
            if (eventId) {
                const sosEvent = String(s.event_id || s.event || '');
                return sosEvent === String(eventId);
            }
            return true;
        });
    }, [sosAlerts, eventId]);

    const icon = useMemo(() => createSOSIcon(), []);

    return (
        <>
            {filtered.map(s => {
                const lat = parseFloat(s.latitude || s.lat);
                const lng = parseFloat(s.longitude || s.lng);

                return (
                    <Marker key={`sos-${s.id}`} position={[lat, lng]} icon={icon} zIndexOffset={1000}>
                        <Popup>
                            <div style={{ minWidth: 210, fontFamily: "'Inter',sans-serif" }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #fee2e2' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'sos-blink 0.8s infinite alternate' }} />
                                    <strong style={{ color: '#ef4444', fontSize: 14, letterSpacing: 0.5 }}>EMERGENCY SOS</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                                    <p style={{ margin: '3px 0' }}><strong>Sender:</strong> {s.user_name || 'Unknown'}</p>
                                    <p style={{ margin: '3px 0' }}><strong>Type:</strong> {s.sos_type_display || s.sos_type || 'Emergency'}</p>
                                    <p style={{ margin: '3px 0' }}><strong>Status:</strong> <span style={{ color: '#ef4444', fontWeight: 700 }}>{(s.status || 'reported').toUpperCase()}</span></p>
                                    <p style={{ margin: '3px 0' }}><strong>Time:</strong> {s.created_at ? new Date(s.created_at).toLocaleTimeString() : 'Just now'}</p>
                                    {s.location_name && (
                                        <p style={{ margin: '3px 0' }}><strong>Location:</strong> {s.location_name}</p>
                                    )}
                                    {s.assigned_volunteer_name && (
                                        <p style={{ margin: '6px 0 0', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '4px 8px', borderRadius: 4 }}>
                                            Responder: {s.assigned_volunteer_name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
};

export default React.memo(SOSMarkers);
