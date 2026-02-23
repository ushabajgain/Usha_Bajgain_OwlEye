import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { AlertTriangle, LifeBuoy, Shield, Crosshair, MapPin } from 'lucide-react';
import api from '../utils/api';

const createTacticalIcon = (color, isSOS = false) => {
    try {
        return L.divIcon({
            html: `
                <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-950 border-2 border-${color}-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all">
                    <div class="w-2 h-2 rounded-full bg-${color}-500 ${isSOS ? 'animate-ping' : ''}"></div>
                    ${isSOS ? `<div class="absolute inset-0 rounded-2xl bg-red-500/10 animate-pulse ring-4 ring-red-500/5"></div>` : ''}
                </div>
            `,
            className: 'tactical-div-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });
    } catch (e) {
        console.warn("Icon failure, using fallback", e);
        return null;
    }
};

import 'leaflet.heat';

const TacticalHeatOverlay = ({ intensity, points }) => {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        if (!map || !points.length) return;
        if (layerRef.current) map.removeLayer(layerRef.current);

        const heatData = points.map(p => [p.lat, p.lng, 0.4 * intensity]);
        layerRef.current = L.heatLayer(heatData, {
            radius: 35, blur: 25, maxZoom: 17,
            gradient: { 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);

        return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
    }, [map, points, intensity]);

    return null;
};

const TacticalMapLayer = ({ eventId }) => {
    const [entities, setEntities] = useState({ incidents: [], sosAlerts: [], responders: {}, crowd: [] });
    const [showHeat, setShowHeat] = useState(true);
    const [isSignalLinked, setIsSignalLinked] = useState(false);
    const ws = useRef(null);
    const [mapError, setMapError] = useState(null);

    useEffect(() => {
        try {
            if (L.Icon.Default && L.Icon.Default.prototype) {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                });
            }
        } catch (e) {
            console.error("Leaflet bootstrap failed", e);
        }
    }, []);

    useEffect(() => {
        const fetchEntities = async () => {
            try {
                const [incRes, sosRes, respRes] = await Promise.all([
                    api.get(`/monitoring/incidents/?event=${eventId}`),
                    api.get(`/monitoring/sos/?event=${eventId}`),
                    api.get(`/monitoring/responders/?event=${eventId}`)
                ]);

                const respondersMap = {};
                respRes.data.forEach(r => { if (r.is_active) respondersMap[r.user] = r; });

                setEntities({
                    incidents: incRes.data.filter(i => i.status !== 'resolved'),
                    sosAlerts: sosRes.data.filter(s => s.status !== 'resolved'),
                    responders: respondersMap
                });
            } catch (err) {
                console.error("Entity Sync Failed", err);
            }
        };
        fetchEntities();
    }, [eventId]);

    // WebSocket Link
    useEffect(() => {
        const socket = new WebSocket(`ws://127.0.0.1:8000/ws/heatmap/${eventId}/`);
        ws.current = socket;

        socket.onopen = () => setIsSignalLinked(true);
        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.entity_type === 'incident') {
                    setEntities(prev => {
                        const filtered = prev.incidents.filter(i => i.id !== data.id);
                        if (data.status === 'resolved' || data.status === 'false_alarm') return { ...prev, incidents: filtered };
                        return { ...prev, incidents: [data, ...filtered] };
                    });
                } else if (data.entity_type === 'sos') {
                    setEntities(prev => {
                        const filtered = prev.sosAlerts.filter(s => s.id !== data.id);
                        if (data.status === 'resolved') return { ...prev, sosAlerts: filtered };
                        return { ...prev, sosAlerts: [data, ...filtered] };
                    });
                } else if (data.entity_type === 'responder') {
                    setEntities(prev => ({ ...prev, responders: { ...prev.responders, [data.id || data.user]: data } }));
                } else if (data.entity_type === 'user') {
                    setEntities(prev => ({
                        ...prev,
                        crowd: [...prev.crowd.slice(-500), { lat: data.lat, lng: data.lng, role: data.role }]
                    }));
                }
            } catch (err) { console.error("Signal Corruption", err); }
        };
        socket.onclose = () => setIsSignalLinked(false);
        return () => socket.close();
    }, [eventId]);

    if (mapError) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-700 uppercase font-black tracking-widest p-10 text-center">
                Optical Sensors Maligned. Manual Calibration Required.<br />{mapError}
            </div>
        );
    }

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={[27.7172, 85.3240]}
                zoom={15}
                className="w-full h-full"
                zoomControl={false}
                scrollWheelZoom={false}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                {/* Tactical Heat Overlay */}
                {showHeat && <TacticalHeatOverlay intensity={1.5} points={entities.crowd} />}

                {/* Incidents Layer */}
                {entities.incidents.map((inc, i) => (
                    <Marker
                        key={`inc-${inc.id}-${i}`}
                        position={[parseFloat(inc.latitude), parseFloat(inc.longitude)]}
                        icon={createTacticalIcon('orange')}
                    >
                        <Popup className="tactical-popup">
                            <div className="p-4 bg-[#020617] text-white rounded-2xl border border-orange-500/40 min-w-55">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 uppercase">{inc.priority} Threat</span>
                                    <AlertTriangle size={14} className="text-orange-500" />
                                </div>
                                <h4 className="text-xs font-black uppercase italic italic-none mb-2 tracking-tight">{inc.category_display || inc.title}</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed mb-6 italic italic-none">{inc.description}</p>
                                <Link to={`/organizer/incident/${inc.id}`} className="block w-full py-3 bg-slate-950 text-[9px] font-black text-center uppercase tracking-[0.2em] border border-slate-800 rounded-xl hover:border-indigo-500 transition-all">Inspect Node</Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* SOS Layer */}
                {entities.sosAlerts.map((sos, i) => (
                    <Marker
                        key={`sos-${sos.id}-${i}`}
                        position={[parseFloat(sos.latitude), parseFloat(sos.longitude)]}
                        icon={createTacticalIcon('red', true)}
                    >
                        <Popup className="tactical-popup">
                            <div className="p-6 text-center bg-[#020617] text-white rounded-4xl border border-red-500/50 min-w-60 shadow-3xl">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4 animate-pulse">
                                    <LifeBuoy size={28} />
                                </div>
                                <h4 className="text-lg font-black text-red-500 uppercase tracking-tighter mb-2 italic italic-none">Priority SOS</h4>
                                <p className="text-[10px] font-bold text-slate-500 mb-8 uppercase tracking-widest">Protocol: {sos.sos_type_display || 'EMERGENCY'}</p>
                                <button className="w-full py-4 bg-indigo-600 text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Deploy Units</button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Responder Layer */}
                {Object.values(entities.responders).map((resp, i) => (
                    <Marker
                        key={`resp-${resp.id || i}`}
                        position={[parseFloat(resp.latitude), parseFloat(resp.longitude)]}
                        icon={createTacticalIcon(resp.status === 'available' ? 'emerald' : 'indigo')}
                    >
                        <Popup className="tactical-popup">
                            <div className="p-4 bg-[#020617] text-white rounded-2xl border border-indigo-500/30">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{resp.role}</p>
                                    <Shield size={12} className="text-indigo-400" />
                                </div>
                                <h4 className="text-[11px] font-black uppercase mb-4 text-white italic italic-none">{resp.user_name}</h4>
                                <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-900">
                                    <div className={`w-2 h-2 rounded-full ${resp.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vector: {resp.status_display}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* In-Map Tactical Overlays */}
            <div className="absolute top-8 right-8 flex flex-col gap-3 z-1000">
                <button className="w-14 h-14 bg-slate-900/80 backdrop-blur-xl text-slate-400 hover:text-white rounded-2xl border border-slate-800 flex items-center justify-center transition-all shadow-3xl">
                    <Crosshair size={20} />
                </button>
                <button className="w-14 h-14 bg-slate-900/80 backdrop-blur-xl text-slate-400 hover:text-white rounded-2xl border border-slate-800 flex items-center justify-center transition-all shadow-3xl">
                    <MapPin size={20} />
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .tactical-popup .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                }
                .tactical-popup .leaflet-popup-tip {
                    background: #020617 !important;
                    border: 1px solid rgba(71, 85, 105, 0.4);
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    width: auto !important;
                }
            `}} />
        </div>
    );
};

export default TacticalMapLayer;
