import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import { Loader2, LocateFixed, Users, AlertTriangle, Search, Globe } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole, getUserId } from '../utils/auth';
import { useSafetySocket } from '../hooks/useSafetySocket';

const CONTENT_BG = C.background;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const UserMarkerIcon = (pic, bg, status = null) => {
    let statusColor = '#10b981'; // Default available
    if (status === 'responding') statusColor = '#f59e0b';
    if (status === 'busy') statusColor = '#6366f1';
    
    // Fallback safe URL
    const safePic = pic && pic !== 'null' ? pic : 'https://ui-avatars.com/api/?name=User&background=random';
    
    const statusDot = status ? `
        <div style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: ${statusColor}; border: 2px solid white; z-index: 5; box-shadow: 0 0 4px rgba(0,0,0,0.2);"></div>
    ` : '';

    return L.divIcon({
        html: `
        <div style="position: relative; width: 40px; height: 40px;">
            ${statusDot}
            <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 15px solid ${bg || '#ef4444'};"></div>
            <img src="${safePic}" style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${bg || '#ef4444'}; object-fit: cover; background: white; position: relative; z-index: 2;" />
        </div>`,
        className: '',
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48]
    });
};

const SimpleIcon = (color) => L.divIcon({
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
});

const LiveMap = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [targetEventId, setTargetEventId] = useState(eventId || '1');
    const [loading, setLoading] = useState(true);
    const [mapSearch, setMapSearch] = useState('');

    useEffect(() => {
        const init = async () => {
            const role = getRole();
            if (!['organizer', 'admin', 'volunteer'].includes(role)) { navigate('/events'); return; }

            // If no eventId in URL, fetch fallback
            if (!eventId && !targetEventId) {
                try {
                    const res = await api.get('/events/');
                    if (res.data && res.data.length > 0) {
                        setTargetEventId(res.data[0].id.toString());
                    } else {
                        setTargetEventId('1');
                    }
                } catch (err) {
                    console.error("LiveMap: Failed to fetch fallback events", err);
                    setTargetEventId('1');
                }
            }
            setLoading(false);
        };
        init();

        const timer = setTimeout(() => {
            setLoading(false);
        }, 3500);

        return () => clearTimeout(timer);
    }, [eventId, targetEventId, navigate]);
    
    const findNearestVolunteer = (lat, lng) => {
        const volunteers = Object.values(users).filter(u => u.role === 'volunteer');
        if (volunteers.length === 0) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        volunteers.forEach(v => {
            const dist = Math.sqrt(Math.pow(v.lat - lat, 2) + Math.pow(v.lng - lng, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = v;
            }
        });
        return nearest;
    };
    
    const { 
        locations: users, 
        incidents, 
        sosAlerts: sos, 
        isConnected, 
        loading: contextLoading,
        updateEventId 
    } = useSafetySocket(targetEventId);

    // Map State
    const mapRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const markerClusterGroup = useRef(null);
    const heatLayer = useRef(null);
    const incidentMarkers = useRef({});
    const sosMarkers = useRef({});
    const userMarkers = useRef({});

    // 1. Initialize Map
    useEffect(() => {
        if (loading || !mapRef.current || mapInstance) return;

        const startPos = location.state?.lat && location.state?.lng 
            ? [location.state.lat, location.state.lng] 
            : [27.7172, 85.3240];
        const startZoom = location.state?.zoom || 15;

        const map = L.map(mapRef.current, { 
            center: startPos, 
            zoom: startZoom,
            zoomControl: true,
            attributionControl: false 
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        // Cluster Group
        markerClusterGroup.current = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: zoom => zoom < 15 ? 80 : 40,
            disableClusteringAtZoom: 18,
            showCoverageOnHover: false
        }).addTo(map);

        // Heat Layer (Crowd Density)
        heatLayer.current = L.heatLayer([], {
            radius: 35,
            blur: 25,
            maxZoom: 18,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);

        // Risk Zone Layer Group
        window.riskLayerGroup = L.layerGroup().addTo(map);

        setMapInstance(map);

        return () => {
            if (map) {
                map.remove();
            }
        };
    }, [loading]);

    useEffect(() => {
        if (mapInstance && location.state?.lat && location.state?.lng) {
            mapInstance.flyTo([location.state.lat, location.state.lng], location.state.zoom || 18);
        }
    }, [location.state, mapInstance]);

    // 2. Heatmap Risk Data Polling (Still needed as it's not in global context yet)
    useEffect(() => {
        if (loading || !mapInstance || !targetEventId) return;

        window.L = L;

        window.dispatchHelp = (sosId) => {
            api.get(`/monitoring/sos-alerts/`).then(res => {
                const s = res.data.find(x => String(x.id) === String(sosId));
                if (!s) return alert("SOS Alert ended or not found.");
                
                api.get(`/monitoring/locations/${targetEventId}/`).then(locRes => {
                    const currentUsers = {};
                    locRes.data.forEach(u => currentUsers[u.user_id || u.id] = u);
                    
                    const volunteers = Object.values(currentUsers).filter(u => u.role === 'volunteer');
                    if (volunteers.length === 0) return alert("No rescuers found nearby.");
                    
                    let nearest = null;
                    let minDist = Infinity;
                    volunteers.forEach(v => {
                        const dist = Math.sqrt(Math.pow(v.lat - s.lat, 2) + Math.pow(v.lng - s.lng, 2));
                        if (dist < minDist) { minDist = dist; nearest = v; }
                    });
                    
                    if (nearest) alert(`DISPATCHED: ${nearest.name} is responding to ${s.user_name || 'the user'}'s location.`);
                });
            });
        };

        const fetchHeatmap = async () => {
            try {
                const res = await api.get(`/monitoring/heatmap/${targetEventId}/`);
                if (window.riskLayerGroup) {
                    window.riskLayerGroup.clearLayers();
                    res.data.forEach(zone => {
                        if (zone.latitude && zone.longitude) {
                            const circle = L.circle([zone.latitude, zone.longitude], {
                                color: zone.color || 'green',
                                fillColor: zone.color || 'green',
                                fillOpacity: 0.3,
                                radius: 100 + (zone.incident_count * 20),
                                weight: 2
                            }).addTo(window.riskLayerGroup);
                            
                            circle.bindPopup(`
                                <div style="text-align:center;">
                                    <b style="color:${zone.color}">${zone.risk_level.toUpperCase()} RISK AREA</b><br/>
                                    <strong>${zone.location_name}</strong><br/>
                                    Incidents: ${zone.incident_count}
                                </div>
                            `);

                            const label = L.marker([zone.latitude, zone.longitude], {
                                icon: L.divIcon({
                                    className: 'risk-label',
                                    html: `<div style="color:${zone.color}; font-weight:900; background:rgba(255,255,255,0.8); padding:2px 6px; border-radius:4px; border:1.5px solid ${zone.color}; font-size:10px; white-space:nowrap;">${zone.location_name.split(',')[0]} (Risk: ${zone.risk_level})</div>`,
                                    iconSize: [0, 0],
                                    iconAnchor: [-10, 10]
                                })
                            }).addTo(window.riskLayerGroup);
                        }
                    });
                }
            } catch {}
        };

        const heatmapInterval = setInterval(fetchHeatmap, 10000); 
        fetchHeatmap();

        return () => {
            clearInterval(heatmapInterval);
            delete window.dispatchHelp;
        };
    }, [targetEventId, loading, mapInstance]);

    // 3. Update User Markers & Clusters
    useEffect(() => {
        if (!markerClusterGroup.current || !heatLayer.current || !mapInstance) return;

        const query = (mapSearch || "").trim().toLowerCase();
        const activeUsers = Object.values(users);
        const filteredUsers = query 
            ? activeUsers.filter(u => (u.name || "").toLowerCase().includes(query))
            : activeUsers;
            
        const heatPoints = [];

        filteredUsers.forEach(user => {
            const userId = user.user_id;
            const pos = [user.lat, user.lng];
            
            // Marker Update & State Synchronization
            if (userMarkers.current[userId]) {
                const marker = userMarkers.current[userId];
                marker.setLatLng(pos);
                // Dynamically sync status/visual changes consistently 
                const newIcon = UserMarkerIcon(
                    user.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
                    user.role === 'attendee' ? '#f43f5e' : '#3b82f6',
                    user.role === 'volunteer' ? (user.status || 'available') : null
                );
                marker.setIcon(newIcon);
            } else {
                const marker = L.marker(pos, {
                    icon: UserMarkerIcon(
                        user.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
                        user.role === 'attendee' ? '#f43f5e' : '#3b82f6',
                        user.role === 'volunteer' ? (user.status || 'available') : null
                    )
                });

                const popupHtml = `
                    <div style="min-width: 200px; padding: 10px;">
                        <div style="display: flex; gap: 12px; alignItems: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                            <img src="${user.pic || ''}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border: 2px solid ${ACCENT};" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}'"/>
                            <div>
                                <h4 style="margin:0; font-size:16px; font-weight:800; color: ${TEXT_DARK};">${user.name}</h4>
                                <p style="margin:0; font-size:12px; color:#64748b; text-transform:capitalize; font-weight: 600;">${user.role}</p>
                            </div>
                        </div>
                        <div style="font-size: 13px; color: #1e293b; line-height: 1.6;">
                            <p style="margin: 4px 0;"><b>Name:</b> ${user.name}</p>
                            <p style="margin: 4px 0;"><b>Contact Info:</b> ${user.phone || 'N/A'}</p>
                            <p style="margin: 4px 0;"><b>Event Name:</b> ${user.event_name || 'OwlEye Event'}</p>
                            <p style="margin: 4px 0;"><b>Event Venue:</b> ${user.venue_address || 'Main Stadium, KTM'}</p>
                            <p style="margin: 4px 0;"><b>Last Seen:</b> ${user.last_seen}</p>
                            <p style="margin: 4px 0;"><b>Active time:</b> ${user.active_time}</p>
                        </div>
                    </div>
                `;
                marker.bindPopup(popupHtml);
                markerClusterGroup.current.addLayer(marker);
                userMarkers.current[userId] = marker;
            }

            // Heatpoint
            heatPoints.push([user.lat, user.lng, user.intensity || 1.0]);
        });

        // O(1) Heatmap Set Lookup Architecture solving O(N^2) CPU locking
        const activeIds = new Set(filteredUsers.map(u => String(u.user_id)));

        Object.keys(userMarkers.current).forEach(id => {
            if (!activeIds.has(id)) {
                markerClusterGroup.current.removeLayer(userMarkers.current[id]);
                delete userMarkers.current[id];
            }
        });

        // Throttle Canvas Thermal Map to avoid freezing core telemetry render loop
        if (window.heatmapThrottle) clearTimeout(window.heatmapThrottle);
        window.heatmapThrottle = setTimeout(() => {
            if (heatLayer.current) heatLayer.current.setLatLngs(heatPoints);
        }, 2000);

        // Auto-center if only one user matches search and not already zooming
        if (filteredUsers.length === 1 && query.length > 3) {
            const u = filteredUsers[0];
            mapInstance?.setView([u.lat, u.lng], 18);
        }
    }, [users, mapSearch, mapInstance]);

    // 4. Update Incidents & SOS
    useEffect(() => {
        if (!mapInstance) return;

        const newIncMarkers = {};
        const newSosMarkers = {};

        // Add current incidents for this event
        Object.values(incidents).filter(inc => inc.event_id == targetEventId).forEach(inc => {
            if (!incidentMarkers.current[inc.id]) {
                const flaggedBadge = inc.is_flagged_reporter 
                    ? `<div style="margin-top:5px; color:#991b1b; background:#fef2f2; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:700; border:1px solid #fee2e2;">⚠️ SUSPICIOUS REPORTER - VERIFY CAREFULLY</div>` 
                    : '';
                
                const lat = inc.latitude || inc.lat;
                const lng = inc.longitude || inc.lng;
                if (!lat || !lng) return;

                const m = L.marker([lat, lng], { icon: SimpleIcon('#f97316') })
                    .bindPopup(`
                        <div style="min-width: 160px;">
                            <b style="color:#f97316">Incident: ${inc.title}</b><br/>
                            <p style="margin:4px 0; font-size:12px;">${inc.description || 'No description'}</p>
                            ${flaggedBadge}
                        </div>
                    `)
                    .addTo(mapInstance);
                newIncMarkers[inc.id] = m;
            } else {
                newIncMarkers[inc.id] = incidentMarkers.current[inc.id];
            }
        });

        // Cleanup old incidents
        Object.keys(incidentMarkers.current).forEach(id => {
            if (!newIncMarkers[id]) {
                mapInstance.removeLayer(incidentMarkers.current[id]);
            }
        });
        incidentMarkers.current = newIncMarkers;

        // Add SOS
        Object.values(sos).filter(s => s.event_id == targetEventId).forEach(s => {
            if (!sosMarkers.current[s.id]) {
                const nearest = findNearestVolunteer(s.lat || s.latitude, s.lng || s.longitude);
                const nearestHtml = nearest 
                    ? `<div style="margin-top:8px; padding:6px; background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; font-size:11px; color:#92400e;">
                         <strong style="display:block; margin-bottom:2px;">🛡️ NEAREST RESPONDER</strong>
                         ${nearest.name} (${nearest.phone || 'N/A'})
                       </div>`
                    : `<div style="margin-top:8px; padding:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; color:#64748b;">
                         No responders nearby.
                       </div>`;

                const lat = s.lat || s.latitude;
                const lng = s.lng || s.longitude;
                if (!lat || !lng) return;

                const m = L.marker([lat, lng], { 
                    icon: L.divIcon({
                        html: `
                        <div class="sos-marker-container">
                            <div class="sos-pulse-ring"></div>
                            <div class="sos-pulse-ring-inner"></div>
                            <div class="sos-core"></div>
                        </div>`,
                        className: '',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })
                })
                .bindPopup(`
                    <div style="min-width: 190px; padding: 4px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <div style="width:10px; height:10px; border-radius:50%; background:#ef4444; animation: pulse 0.6s infinite alternate;"></div>
                            <b style="color:#ef4444; font-size:14px; letter-spacing:0.5px;">EMERGENCY SOS</b>
                        </div>
                        <div style="font-size:12px; color:#334155; margin-bottom:12px;">
                            <p style="margin:2px 0;"><strong>Sender:</strong> ${s.user_name}</p>
                            <p style="margin:2px 0;"><strong>Type:</strong> ${s.sos_type_display}</p>
                            ${nearestHtml}
                        </div>
                    </div>
                `)
                .addTo(mapInstance);
                newSosMarkers[s.id] = m;
            } else {
                newSosMarkers[s.id] = sosMarkers.current[s.id];
            }
        });

        // Cleanup old SOS
        Object.keys(sosMarkers.current).forEach(id => {
            if (!newSosMarkers[id]) {
                mapInstance.removeLayer(sosMarkers.current[id]);
            }
        });
        sosMarkers.current = newSosMarkers;
    }, [incidents, sos, mapInstance, targetEventId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Loader2 size={40} className="animate-spin" color={ACCENT} style={{ marginBottom: 16 }} />
                        <p style={{ color: TEXT_MID, fontWeight: 600 }}>Loading map data...</p>
                    </div>
                </main>
                <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!targetEventId && !eventId) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', maxWidth: 400, padding: 32, background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}` }}>
                        <Globe size={48} color={TEXT_MID} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, marginBottom: 8 }}>No Active Events</h2>
                        <p style={{ color: TEXT_MID, fontSize: 14, marginBottom: 24 }}>We couldn't find any active events to display on the map. Please create an event first.</p>
                        <button onClick={() => navigate('/events')} style={{ padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                            Go to Events
                        </button>
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif", background: CONTENT_BG }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <PageHeader title="Live Map" breadcrumb="Dashboard" />

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* LEFT PANEL: Users List */}
                    <div style={{ width: 360, background: '#f8fafc', borderRight: `1px solid ${BORDER}`, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Stats Panel */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
                            <div style={{ background: '#fff', padding: '12px', borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Attendees</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: ACCENT }}>{Object.values(users).filter(u => u.role === 'attendee').length}</p>
                            </div>
                            <div style={{ background: '#fff', padding: '12px', borderRadius: 10, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase' }}>Volunteers</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{Object.values(users).filter(u => u.role === 'volunteer').length}</p>
                            </div>
                        </div>

                        
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                            <input 
                                placeholder="Search user..." 
                                value={mapSearch}
                                onChange={e => setMapSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none' }}
                            />
                        </div>

                        {Object.values(users)
                            .filter(u => {
                                const q = (mapSearch || "").trim().toLowerCase();
                                return (u.name || "").toLowerCase().includes(q) || 
                                       (u.role || "").toLowerCase().includes(q);
                            })
                            .sort((a,b) => {
                                const timeA = new Date(a.last_seen).getTime() || 0;
                                const timeB = new Date(b.last_seen).getTime() || 0;
                                return timeB - timeA;
                            }).map(user => (
                            <div key={user.user_id || user.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <img src={user.pic} alt={user.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }} />
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>{user.name}</h4>
                                            <span style={{ fontSize: 12, color: TEXT_MID, textTransform: 'capitalize' }}>{user.role}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID }}>{(user.user_id || user.id || '').toString().substring(0,6)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 12, marginBottom: 12 }}>
                                    <button 
                                        onClick={() => mapInstance?.setView([user.lat, user.lng], 18)}
                                        style={{ background: ACCENT, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                        Locate
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderTop: `1px solid #f1f5f9`, paddingTop: '12px' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 11, color: TEXT_MID, marginBottom: 2 }}>First seen</p>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ACCENT }}>{user.first_seen}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontSize: 11, color: TEXT_MID, marginBottom: 2 }}>Last seen</p>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ACCENT }}>{user.last_seen}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                        <LocateFixed size={14} color={TEXT_MID} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK }}>{user.distance} km</span>
                                    </div>

                                    <button 
                                        onClick={() => { mapInstance?.flyTo([user.lat, user.lng], 18); userMarkers.current[user.user_id]?.openPopup(); }}
                                        style={{ padding: '8px', background: ACCENT, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                        <LocateFixed size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MAIN PANEL: Live Map */}
                    <div style={{ flex: 1, position: 'relative', background: '#e8eaed' }}>
                        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LiveMap;
