import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

/**
 * Imperative Leaflet layer for heatmap and/or attendee marker clusters.
 * Uses useMap() to access the Leaflet instance directly, since these plugins
 * don't have React Leaflet wrappers.
 *
 * - showHeatmap: renders a canvas-based heatmap from attendee positions
 * - showMarkers: renders clustered dot markers for individual attendees
 */
const AttendeeLayer = ({ locations, showHeatmap = true, showMarkers = false }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);
    const clusterRef = useRef(null);
    const debounceRef = useRef(null);

    const attendees = useMemo(() => {
        if (!locations) return [];
        return Object.values(locations).filter(u => {
            return u.role === 'attendee' &&
                !isNaN(parseFloat(u.lat || u.latitude)) &&
                !isNaN(parseFloat(u.lng || u.longitude));
        });
    }, [locations]);

    // Heatmap layer management
    useEffect(() => {
        if (!map) return;

        if (showHeatmap) {
            if (!heatLayerRef.current) {
                heatLayerRef.current = L.heatLayer([], {
                    radius: 35,
                    blur: 25,
                    maxZoom: 18,
                    gradient: {
                        0.2: '#3b82f6',
                        0.4: '#06b6d4',
                        0.6: '#10b981',
                        0.8: '#eab308',
                        1.0: '#ef4444'
                    }
                }).addTo(map);
            }

            // Debounce heatmap updates to avoid excessive canvas redraws
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                if (!heatLayerRef.current) return;
                const points = attendees.map(u => [
                    parseFloat(u.lat || u.latitude),
                    parseFloat(u.lng || u.longitude),
                    u.intensity || 1.0
                ]);
                heatLayerRef.current.setLatLngs(points);
            }, 1500);
        } else {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [map, attendees, showHeatmap]);

    // Cleanup heatmap on unmount
    useEffect(() => {
        return () => {
            if (heatLayerRef.current && map) {
                try { map.removeLayer(heatLayerRef.current); } catch (e) {}
                heatLayerRef.current = null;
            }
        };
    }, [map]);

    // Marker cluster layer management
    useEffect(() => {
        if (!map) return;

        if (showMarkers) {
            if (!clusterRef.current) {
                clusterRef.current = L.markerClusterGroup({
                    chunkedLoading: true,
                    maxClusterRadius: 60,
                    disableClusteringAtZoom: 18,
                    showCoverageOnHover: false,
                    spiderfyOnMaxZoom: false
                }).addTo(map);
            }

            clusterRef.current.clearLayers();

            attendees.forEach(u => {
                const lat = parseFloat(u.lat || u.latitude);
                const lng = parseFloat(u.lng || u.longitude);
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: `<div style="width:12px;height:12px;border-radius:50%;background:#f43f5e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
                        className: '',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                });
                marker.bindPopup(`
                    <div style="font-family:'Inter',sans-serif;">
                        <strong>${u.name || 'Attendee'}</strong><br>
                        <small style="color:#64748b;">Last seen: ${u.last_seen || 'Now'}</small>
                    </div>
                `);
                clusterRef.current.addLayer(marker);
            });
        } else {
            if (clusterRef.current) {
                map.removeLayer(clusterRef.current);
                clusterRef.current = null;
            }
        }

        return () => {
            // Don't cleanup on every re-render; only on actual toggle off or unmount
        };
    }, [map, attendees, showMarkers]);

    // Cleanup clusters on unmount
    useEffect(() => {
        return () => {
            if (clusterRef.current && map) {
                try { map.removeLayer(clusterRef.current); } catch (e) {}
                clusterRef.current = null;
            }
        };
    }, [map]);

    return null; // This component renders imperatively, not via JSX
};

export default AttendeeLayer;
