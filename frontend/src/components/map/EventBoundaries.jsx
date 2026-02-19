import React, { useMemo } from 'react';
import { Polygon, Popup, Tooltip } from 'react-leaflet';

/**
 * Generates a rectangular boundary polygon around a center point.
 * Uses an offset to create a visible perimeter around the event venue.
 */
const generateBoundary = (lat, lng, sizeMeters = 300) => {
    // Approximate offset in degrees (1 degree ≈ 111km at equator)
    const latOffset = sizeMeters / 111000;
    const lngOffset = sizeMeters / (111000 * Math.cos(lat * Math.PI / 180));

    return [
        [lat - latOffset, lng - lngOffset],
        [lat - latOffset, lng + lngOffset],
        [lat + latOffset, lng + lngOffset],
        [lat + latOffset, lng - lngOffset]
    ];
};

/**
 * Renders event boundary polygons and name labels on the map.
 * Each event gets a blue dashed rectangle around its venue coordinates.
 * Clicking an event boundary shows event details in a popup.
 */
const EventBoundaries = ({ events }) => {
    const eventList = useMemo(() => {
        if (!events) return [];
        const list = Array.isArray(events) ? events : Object.values(events);
        return list.filter(e => {
            const lat = parseFloat(e.latitude);
            const lng = parseFloat(e.longitude);
            return !isNaN(lat) && !isNaN(lng) && e.name;
        });
    }, [events]);

    return (
        <>
            {eventList.map(event => {
                const lat = parseFloat(event.latitude);
                const lng = parseFloat(event.longitude);
                const boundary = generateBoundary(lat, lng, 350);
                const isActive = event.end_datetime ? new Date(event.end_datetime) >= new Date() : true;

                return (
                    <React.Fragment key={`boundary-${event.id}`}>
                        {/* Boundary polygon */}
                        <Polygon
                            positions={boundary}
                            pathOptions={{
                                color: '#4F46E5',
                                weight: 2.5,
                                dashArray: '8, 6',
                                fillColor: '#4F46E5',
                                fillOpacity: 0.06,
                                opacity: 0.7
                            }}
                        >
                            <Tooltip permanent direction="top" className="event-boundary-tooltip">
                                {event.name}
                            </Tooltip>
                            
                            <Popup>
                                <div style={{ minWidth: 220, fontFamily: "'Inter',sans-serif" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: isActive ? '#16a34a' : '#94a3b8'
                                        }} />
                                        <span style={{
                                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                            color: isActive ? '#16a34a' : '#94a3b8',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {isActive ? 'Active Event' : 'Past Event'}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                                        {event.name}
                                    </h3>
                                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                                        {event.venue_address || 'Venue'}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Capacity</div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{event.capacity || 0}</div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Attendees</div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>{event.attendee_count || 0}</div>
                                        </div>
                                    </div>
                                    {event.start_datetime && (
                                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                                            {new Date(event.start_datetime).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                            {' — '}
                                            {new Date(event.start_datetime).toLocaleTimeString('en-US', {
                                                hour: 'numeric', minute: '2-digit'
                                            })}
                                        </p>
                                    )}
                                </div>
                            </Popup>
                        </Polygon>
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default React.memo(EventBoundaries);
