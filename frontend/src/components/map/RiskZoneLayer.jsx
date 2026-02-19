import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Fetches and renders risk zone circles from the heatmap API.
 * Polls every 15 seconds for updated risk data.
 * Uses imperative Leaflet via useMap() for circle overlays.
 */
const RiskZoneLayer = ({ eventId, visible = true, api }) => {
    const map = useMap();
    const layerGroupRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!map || !eventId || !api) return;

        if (!layerGroupRef.current) {
            layerGroupRef.current = L.layerGroup();
        }

        if (visible) {
            layerGroupRef.current.addTo(map);
        } else {
            map.removeLayer(layerGroupRef.current);
            return;
        }

        const fetchRiskZones = async () => {
            try {
                const res = await api.get(`/monitoring/heatmap/${eventId}/`);
                if (!layerGroupRef.current) return;

                layerGroupRef.current.clearLayers();

                (res.data || []).forEach(zone => {
                    if (!zone.latitude || !zone.longitude) return;

                    const circle = L.circle([zone.latitude, zone.longitude], {
                        color: zone.color || 'green',
                        fillColor: zone.color || 'green',
                        fillOpacity: 0.25,
                        radius: 100 + (zone.incident_count * 20),
                        weight: 2
                    }).addTo(layerGroupRef.current);

                    circle.bindPopup(`
                        <div style="text-align:center;font-family:'Inter',sans-serif;">
                            <b style="color:${zone.color};font-size:13px;">${(zone.risk_level || 'LOW').toUpperCase()} RISK</b><br/>
                            <strong style="font-size:12px;">${zone.location_name || 'Zone'}</strong><br/>
                            <span style="font-size:11px;color:#64748b;">Incidents: ${zone.incident_count}</span>
                        </div>
                    `);

                    // Clean, centered permanent tooltip instead of a clunky overlapping div marker
                    circle.bindTooltip(
                        `${(zone.location_name || '').split(',')[0]} (${zone.risk_level})`,
                        {
                            permanent: true,
                            direction: 'center',
                            className: 'risk-zone-tooltip'
                        }
                    );
                });
            } catch (err) {
                // Silently handle — risk zones are non-critical
            }
        };

        fetchRiskZones();
        intervalRef.current = setInterval(fetchRiskZones, 15000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [map, eventId, visible, api]);

    // Final cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (layerGroupRef.current && map) {
                try { map.removeLayer(layerGroupRef.current); } catch (e) {}
                layerGroupRef.current = null;
            }
        };
    }, [map]);

    return null;
};

export default RiskZoneLayer;
