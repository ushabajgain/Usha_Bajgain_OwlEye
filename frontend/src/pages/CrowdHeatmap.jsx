import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import { Activity, Info, Loader2 } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole } from '../utils/auth';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const CrowdHeatmap = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [targetEventId, setTargetEventId] = useState(eventId || '');

    useEffect(() => {
        if (!eventId) {
            api.get('/events/').then(res => {
                if (res.data.length > 0) setTargetEventId(res.data[0].id.toString());
            }).catch(e => console.error("Heatmap: Fallback event failed", e));
        }
    }, [eventId]);

    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [intensity, setIntensity] = useState(2.0);
    const [pointsCount, setPointsCount] = useState(0);

    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const heatLayer = useRef(null);
    const pointsRef = useRef([]);
    const ws = useRef(null);

    useEffect(() => {
        const role = getRole();
        if (role !== 'organizer' && role !== 'admin') { navigate('/events'); return; }
        setLoading(false);
    }, [navigate]);

    useEffect(() => {
        if (loading || !mapRef.current || mapInstance.current) return;
        try {
            const map = L.map(mapRef.current, { center: [27.7172, 85.3240], zoom: 15, zoomControl: true, attributionControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapInstance.current = map;
            heatLayer.current = L.heatLayer([], { 
                radius: 35, 
                blur: 20, 
                maxZoom: 17, 
                gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' } 
            }).addTo(map);
        } catch (err) { console.error('Map init error', err); }
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    }, [loading]);

    useEffect(() => {
        if (heatLayer.current) heatLayer.current.setOptions({ radius: 20 * intensity, blur: 15 * intensity });
    }, [intensity]);

    const [viewMode, setViewMode] = useState('both'); // 'live', 'history', 'both'

    useEffect(() => {
        if (loading || !mapInstance.current || !targetEventId) return;

        const fetchPatterns = async () => {
             try {
                 const res = await api.get(`/monitoring/movement-patterns/${targetEventId}/`);
                 const pts = res.data.map(loc => [loc.lat, loc.lng, 0.6]); // Lower intensity for history
                 pointsRef.current = pts;
                 heatLayer.current?.setLatLngs(pts);
                 setPointsCount(pts.length);
             } catch (err) { console.error("Initial load failed", err); }
        };
        fetchPatterns();

        const socket = new WebSocket(`ws://127.0.0.1:8000/ws/heatmap/${targetEventId}/`);
        ws.current = socket;
        socket.onopen = () => setIsConnected(true);
        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.entity_type === 'user') {
                    const lat = parseFloat(data.lat), lng = parseFloat(data.lng);
                    const pInt = data.intensity || (data.role === 'attendee' ? 1 : 0.5);
                    if (lat && lng) {
                        pointsRef.current.push([lat, lng, pInt]);
                        if (pointsRef.current.length > 5000) pointsRef.current.shift();
                        heatLayer.current?.setLatLngs(pointsRef.current);
                        setPointsCount(pointsRef.current.length);
                    }
                }
            } catch { }
        };
        socket.onclose = () => setIsConnected(false);
        return () => socket.close();
    }, [targetEventId, loading]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG, fontFamily: "'Inter',sans-serif" }}>
            <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                <PageHeader title="Crowd Heatmap" breadcrumb="Dashboard" />

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Controls panel */}
                    <div style={{ width: 280, background: CARD_BG, borderRight: `1px solid ${BORDER}`, padding: '24px 20px', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: isConnected ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `1px solid ${isConnected ? '#bbf7d0' : '#fecaca'}` }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? C.success : C.danger, flexShrink: 0, boxShadow: `0 0 8px ${isConnected ? C.success : C.danger}` }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: isConnected ? '#166534' : '#991b1b' }}>
                                {isConnected ? 'System online' : 'Offline'}
                            </span>
                        </div>

                        {/* Stats */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Live Stats</p>
                                <button
                                    onClick={() => { pointsRef.current = []; heatLayer.current?.setLatLngs([]); setPointsCount(0); }}
                                    style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: '#f8fafc', color: TEXT_DARK, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    Clear Map
                                </button>
                            </div>
                            <div style={{ background: CONTENT_BG, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, textAlign: 'center', marginBottom: 10 }}>
                                <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK }}>{pointsCount}</p>
                                <p style={{ fontSize: 12, color: TEXT_MID }}>Active crowd points</p>
                            </div>
                            <div style={{ background: CONTENT_BG, borderRadius: 10, padding: '12px 16px', border: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: 11, color: TEXT_MID, marginBottom: 2 }}>Crowd density</p>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: pointsCount > 1000 ? '#d97706' : '#16a34a' }}>
                                        {pointsCount > 1000 ? 'Crowded' : 'Normal'}
                                    </p>
                                </div>
                                <Activity size={20} color={pointsCount > 1000 ? '#d97706' : '#16a34a'} />
                            </div>
                        </div>

                        {/* Intensity */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Heat Intensity</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: TEXT_MID }}>Strength</span>
                                <span style={{ fontWeight: 700, color: ACCENT }}>{intensity.toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.5" max="5" step="0.1" value={intensity}
                                onChange={e => setIntensity(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: ACCENT }} />
                            <button style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Export Report
                            </button>
                        </div>

                        {/* Legend */}
                        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px', border: '1px solid #bfdbfe' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Info size={13} /> How to read this map</p>
                            <p style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.6 }}>
                                This map shows where people are gathering based on their live location. Hotter colours (red/orange) = more people.
                            </p>
                            <div style={{ marginTop: 10 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MID, marginBottom: 6 }}>Density scale</p>
                                <div style={{ height: 8, borderRadius: 4, background: 'linear-gradient(to right, cyan, lime, yellow, orange, red)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TEXT_MID, marginTop: 4 }}>
                                    <span>Low</span><span>High</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div style={{ flex: 1, position: 'relative', background: '#e8eaed' }}>
                        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    </div>
                </div>
            </main>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
    );
};

export default CrowdHeatmap;
