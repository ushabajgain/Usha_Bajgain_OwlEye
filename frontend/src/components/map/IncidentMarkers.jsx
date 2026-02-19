import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const PRIORITY_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6'
};

const createIcon = (priority) => {
    const color = PRIORITY_COLORS[priority] || '#f97316';
    return L.divIcon({
        html: `<div style="
            width:26px;height:26px;border-radius:50%;
            background:${color};border:3px solid #fff;
            box-shadow:0 2px 8px ${color}88;
            display:flex;align-items:center;justify-content:center;
        "><div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div></div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -16]
    });
};

/**
 * Renders incident markers for a specific event.
 * Only shows active incidents (pending, verified, responding).
 * Automatically updates when incident data changes via WebSocket or re-fetch.
 */
const IncidentMarkers = ({ incidents, eventId }) => {
    const filtered = useMemo(() => {
        if (!incidents) return [];
        return Object.values(incidents).filter(inc => {
            const lat = parseFloat(inc.latitude || inc.lat);
            const lng = parseFloat(inc.longitude || inc.lng);
            if (isNaN(lat) || isNaN(lng)) return false;
            if (!['pending', 'verified', 'responding'].includes(inc.status)) return false;
            // If eventId is provided, filter by it; otherwise show all
            if (eventId) {
                const incEvent = String(inc.event_id || inc.event || '');
                return incEvent === String(eventId);
            }
            return true;
        });
    }, [incidents, eventId]);


    return (
        <>
            {filtered.map(inc => {
                const lat = parseFloat(inc.latitude || inc.lat);
                const lng = parseFloat(inc.longitude || inc.lng);
                const color = PRIORITY_COLORS[inc.priority] || '#f97316';

                return (
                    <Marker
                        key={`incident-${inc.id}`}
                        position={[lat, lng]}
                        icon={createIcon(inc.priority)}
                    >
                        <Popup>
                            <div style={{ minWidth: 200, fontFamily: "'Inter',sans-serif" }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                    <strong style={{ fontSize: 14, color: '#1e293b' }}>
                                        {inc.title || inc.category_display || 'Incident'}
                                    </strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                                    <p style={{ margin: '3px 0' }}>
                                        Status: <strong>{(inc.status_display || inc.status || '').toUpperCase()}</strong>
                                    </p>
                                    <p style={{ margin: '3px 0' }}>
                                        Priority: <strong style={{ color }}>{(inc.priority || 'medium').toUpperCase()}</strong>
                                    </p>
                                    {inc.reporter_name && (
                                        <p style={{ margin: '3px 0' }}>Reported by: {inc.reporter_name}</p>
                                    )}
                                    {inc.location_name && (
                                        <p style={{ margin: '3px 0' }}>Location: {inc.location_name}</p>
                                    )}
                                </div>
                                {inc.description && (
                                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 6, lineHeight: 1.5 }}>
                                        {inc.description}
                                    </div>
                                )}
                                {inc.volunteer_name && (
                                    <div style={{ fontSize: 11, marginTop: 6, color: '#16a34a', fontWeight: 600 }}>
                                        Assigned: {inc.volunteer_name}
                                    </div>
                                )}
                                {inc.is_flagged_reporter && (
                                    <div style={{ marginTop: 6, color: '#991b1b', background: '#fef2f2', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid #fee2e2' }}>
                                        ⚠ SUSPICIOUS REPORTER — VERIFY CAREFULLY
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
};

export default React.memo(IncidentMarkers);
