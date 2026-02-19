import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const STATUS_COLORS = {
    available: '#10b981',
    responding: '#f59e0b',
    busy: '#ef4444',
    patrolling: '#3b82f6',
    offline: '#94a3b8'
};

const createVolunteerIcon = (name, pic, status) => {
    const color = STATUS_COLORS[status] || '#10b981';
    const safePic = pic && pic !== 'null'
        ? pic
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'V')}&background=3b82f6&color=fff`;

    return L.divIcon({
        html: `<div style="position:relative;width:40px;height:48px;">
            <div style="position:absolute;top:0;right:0;width:12px;height:12px;
                border-radius:50%;background:${color};border:2px solid white;z-index:5;
                box-shadow:0 0 6px ${color}aa;"></div>
            <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;
                border-top:14px solid #3b82f6;"></div>
            <img src="${safePic}" style="width:40px;height:40px;border-radius:50%;
                border:3px solid #3b82f6;object-fit:cover;background:white;position:relative;z-index:2;"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'V')}&background=3b82f6&color=fff'" />
        </div>`,
        className: '',
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48]
    });
};

/**
 * Renders volunteer markers with status-colored dots.
 * Green = available, Yellow = responding, Red = busy.
 * Shows name, status, phone in popup.
 */
const VolunteerMarkers = ({ locations }) => {
    const volunteers = useMemo(() => {
        if (!locations) return [];
        return Object.values(locations).filter(u => {
            return u.role === 'volunteer' &&
                u.name &&
                !isNaN(parseFloat(u.lat || u.latitude)) &&
                !isNaN(parseFloat(u.lng || u.longitude));
        });
    }, [locations]);

    return (
        <>
            {volunteers.map(v => {
                const lat = parseFloat(v.lat || v.latitude);
                const lng = parseFloat(v.lng || v.longitude);
                const icon = createVolunteerIcon(v.name, v.pic, v.status);
                const statusColor = STATUS_COLORS[v.status] || '#10b981';

                return (
                    <Marker
                        key={`vol-${v.user_id}`}
                        position={[lat, lng]}
                        icon={icon}
                        zIndexOffset={500}
                    >
                        <Popup>
                            <div style={{ minWidth: 190, fontFamily: "'Inter',sans-serif" }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                                    <img
                                        src={v.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}`}
                                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
                                        onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}`}
                                        alt={v.name}
                                    />
                                    <div>
                                        <strong style={{ fontSize: 14, color: '#1e293b' }}>{v.name}</strong>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>Volunteer</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                                    <p style={{ margin: '3px 0' }}>
                                        Status: <span style={{ color: statusColor, fontWeight: 700 }}>
                                            {(v.status || 'available').toUpperCase()}
                                        </span>
                                    </p>
                                    {v.phone && v.phone !== 'N/A' && (
                                        <p style={{ margin: '3px 0' }}>Phone: {v.phone}</p>
                                    )}
                                    {v.last_seen && <p style={{ margin: '3px 0' }}>Last seen: {v.last_seen}</p>}
                                    {v.active_time && <p style={{ margin: '3px 0' }}>Active: {v.active_time}</p>}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
};

export default React.memo(VolunteerMarkers);
