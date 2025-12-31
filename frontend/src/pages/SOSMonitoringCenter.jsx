import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    Siren, ShieldAlert, MapPin, User, 
    Phone, Radio, AlertTriangle, Loader2,
    CheckCircle, MessageSquare, Maximize2
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = '#ef4444'; 
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

// Custom Flashing Icon
const flashingIcon = L.divIcon({
    className: 'sos-marker-container',
    html: `<div class="sos-marker-inner"></div><div class="sos-marker-pulse"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

import { useSafetySocket } from '../hooks/useSafetySocket';

const SOSMonitoringCenter = () => {
    const [targetEventId, setTargetEventId] = useState('1');
    const { sosAlerts, isConnected, loading: socketLoading } = useSafetySocket(targetEventId);
    
    // Convert map to array for the list
    const alerts = Object.values(sosAlerts).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const [selectedAlert, setSelectedAlert] = useState(null);

    const handleAction = async (id, action) => {
        try {
            if (action === 'resolve') {
                await api.patch(`/monitoring/sos/${id}/`, { status: 'resolved' });
            } else if (action === 'assign') {
                await api.patch(`/monitoring/sos/${id}/`, { status: 'acknowledged' });
                alert("Responder dispatched and SOS acknowledged.");
            }
        } catch (err) {
            console.error("SOS Action failed", err);
        }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: 24, height: 'calc(100vh - 100px)' },
        listContainer: { overflowY: 'auto', paddingRight: 8 },
        alertCard: (active) => ({
            background: CARD_BG, borderRadius: 16, padding: 20, marginBottom: 16,
            border: active ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
            boxShadow: active ? `0 0 15px ${ACCENT}22` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
        }),
        mapContainer: {
            background: '#1e293b', borderRadius: 24, overflow: 'hidden', border: `1px solid ${BORDER}`,
            height: '100%', position: 'relative'
        }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="SOS Monitoring" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    {/* Alert List */}
                    <div style={s.listContainer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: TEXT_DARK }}>Active Alerts ({alerts.length})</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ACCENT, fontWeight: 700 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, animation: 'sos-blink 1s infinite' }} /> ACTIVE FEED
                            </div>
                        </div>

                        {socketLoading && alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={32} className="animate-spin" color={ACCENT} /></div>
                        ) : alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 20, border: `1px dashed ${BORDER}` }}>
                                <ShieldAlert size={48} color={TEXT_MID} style={{ opacity: 0.2, marginBottom: 16 }} />
                                <h3 style={{ color: TEXT_DARK }}>All Systems Clear</h3>
                                <p style={{ color: TEXT_MID }}>No active SOS signals detected platform-wide.</p>
                            </div>
                        ) : (
                            alerts.map(a => (
                                <div key={a.id} onClick={() => setSelectedAlert(a)} style={s.alertCard(selectedAlert?.id === a.id)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: ACCENT + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Siren size={22} color={ACCENT} />
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: TEXT_DARK }}>{a.sos_type_display || 'EMERGENCY'}</h4>
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: TEXT_MID }}>{a.status.toUpperCase()} • {new Date(a.created_at).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: 20, background: a.status === 'active' ? ACCENT : '#f59e0b', color: '#fff', fontSize: 9, fontWeight: 900, display: 'block', marginBottom: 4 }}>{a.status === 'active' ? 'PRIORITY 1' : 'ASSIGNED'}</span>
                                            <span style={{ fontSize: 10, color: TEXT_MID }}>{a.event_name}</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TEXT_DARK, fontWeight: 600 }}>
                                            <User size={14} color={TEXT_MID} /> {a.user_name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TEXT_DARK, fontWeight: 600 }}>
                                            <MapPin size={14} color={TEXT_MID} /> Zone {a.id % 5 + 1}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {a.status === 'active' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'assign'); }}
                                                style={{ flex: 1, padding: '10px', borderRadius: 10, background: ACCENT, color: '#fff', border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <Radio size={14} /> Assign
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'resolve'); }} style={{ flex: a.status === 'active' ? '0 0 40px' : 1, background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <CheckCircle size={18} /> {a.status !== 'active' && <span style={{fontSize: 11, fontWeight: 800}}>Resolve</span>}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Map Section */}
                    <div style={s.mapContainer}>
                        <MapContainer 
                            center={[27.7, 85.3]} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {alerts.map(a => (
                                <Marker 
                                    key={a.id} 
                                    position={[a.latitude || 27.7, a.longitude || 85.3]} 
                                    icon={flashingIcon}
                                >
                                    <Popup>
                                        <div style={{ padding: 4 }}>
                                            <strong style={{ color: ACCENT }}>SOS: {a.user_name}</strong>
                                            <p style={{ margin: '4px 0', fontSize: 12 }}>{a.event_name}</p>
                                            <button onClick={() => handleAction(a.id, 'resolve')} style={{ width: '100%', background: ACCENT, color: '#fff', border: 'none', padding: '6px', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>Resolve</button>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'rgba(15,23,42,0.9)', padding: '12px 16px', borderRadius: 16, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Global Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 20, fontWeight: 900 }}>{alerts.length}</div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>Active Alerts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <style>{`
                .sos-marker-container { position: relative; }
                .sos-marker-inner { width: 14px; height: 14px; background: ${ACCENT}; border: 3px solid #fff; border-radius: 50%; position: absolute; top: 8px; left: 8px; z-index: 2; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                .sos-marker-pulse { width: 30px; height: 30px; background: ${ACCENT}; opacity: 0.6; border-radius: 50%; position: absolute; top: 0; left: 0; animation: sos-pulse 1.5s infinite ease-out; }
                @keyframes sos-pulse { 
                    0% { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes sos-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default SOSMonitoringCenter;
