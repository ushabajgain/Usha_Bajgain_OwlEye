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

import SOSMarkers from '../components/map/SOSMarkers';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = '#ef4444'; 
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;



import { useSafetySocket } from '../hooks/useSafetySocket';

import { useFeedback } from '../context/FeedbackContext';
import Footer from '../components/Footer';

const SOSMonitoringCenter = () => {
    const { showToast } = useFeedback();
    const [targetEventId, setTargetEventId] = useState('1');
    const { sosAlerts, isConnected, loading: socketLoading } = useSafetySocket(targetEventId);
    
    // Convert map to array for the list
    const alerts = Object.values(sosAlerts).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const [selectedAlert, setSelectedAlert] = useState(null);

    const handleAction = async (id, action) => {
        try {
            if (action === 'resolve') {
                await api.patch(`/monitoring/sos/${id}/`, { status: 'resolved' });
                showToast("SOS alert marked as resolved.");
            } else if (action === 'assign') {
                const res = await api.post(`/monitoring/sos/${id}/dispatch_assistance/`);
                if (res.data.success) {
                    showToast(res.data.message);
                } else {
                    showToast("Could not find a nearby volunteer.", "error");
                }
            }
        } catch (err) {
            console.error("SOS Action failed", err);
            const msg = err.response?.data?.message || err.response?.data?.error || "Failed to process SOS action.";
            showToast(msg, 'error');
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
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 80, background: CARD_BG, borderRadius: 20, border: `1px dashed ${BORDER}` }}>
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
                                            <span style={{ padding: '4px 10px', borderRadius: 20, background: a.status === 'reported' ? ACCENT : '#f59e0b', color: '#fff', fontSize: 9, fontWeight: 900, display: 'block', marginBottom: 4 }}>{a.status === 'reported' ? 'PRIORITY 1' : 'ASSIGNED'}</span>
                                            <span style={{ fontSize: 10, color: TEXT_MID }}>{a.event_name}</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 12px', marginBottom: 16, display: 'grid', gridTemplateColumns: '35% 1fr', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: TEXT_DARK, fontWeight: 600, overflow: 'hidden' }}>
                                            <User size={14} color={TEXT_MID} style={{ flexShrink: 0 }} /> 
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.user_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: TEXT_DARK, fontWeight: 600, overflow: 'hidden' }}>
                                            <MapPin size={14} color={TEXT_MID} style={{ flexShrink: 0 }} /> 
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.location_name || 'Locating...'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {a.status === 'reported' && (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'assign'); }}
                                                    style={{ flex: 1, padding: '14px', borderRadius: 10, background: ACCENT, color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                    <Radio size={16} /> Assign
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'resolve'); }} style={{ flex: '0 0 50px', padding: '14px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                    <CheckCircle size={20} />
                                                </button>
                                            </>
                                        )}
                                        {a.status !== 'reported' && (
                                            <div style={{ flex: 1, padding: '14px', background: '#f8fafc', color: TEXT_MID, border: `1px solid ${BORDER}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}>
                                                <Loader2 size={16} className="animate-spin" /> Awaiting Volunteer Resolution
                                            </div>
                                        )}
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
                            <SOSMarkers sosAlerts={alerts} />
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
                            <Footer />
            </main>
            <style>{`
                /* SOS Marker Animations */
                .sos-marker-wrap {
                    position: relative;
                    width: 44px;
                    height: 44px;
                }
                .sos-pulse-ring {
                    position: absolute;
                    top: 0; left: 0;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.4);
                    animation: sos-pulse-kf 1.5s ease-out infinite;
                }
                .sos-pulse-ring-delayed {
                    position: absolute;
                    top: 0; left: 0;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.25);
                    animation: sos-pulse-kf 1.5s ease-out infinite 0.4s;
                }
                .sos-core-dot {
                    position: absolute;
                    top: 12px; left: 12px;
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    background: #ef4444;
                    border: 3px solid #fff;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.6);
                    z-index: 2;
                }
                @keyframes sos-pulse-kf {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes sos-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                /* Leaflet popup overrides */
                .leaflet-popup-content-wrapper {
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
                }
                .leaflet-popup-content {
                    margin: 12px 14px !important;
                    font-family: 'Inter','Segoe UI',sans-serif !important;
                }
            `}</style>
        </div>
    );
};

export default SOSMonitoringCenter;
