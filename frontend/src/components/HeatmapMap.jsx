import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

// Internal component to handle heatmap layer logic
const HeatLayer = ({ points }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        // Create or update heat layer
        if (heatLayerRef.current) {
            heatLayerRef.current.setLatLngs(points);
        } else {
            heatLayerRef.current = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                max: 1.0,
                gradient: {
                    0.2: 'blue',
                    0.4: 'cyan',
                    0.6: 'lime',
                    0.8: 'yellow',
                    1.0: 'red'
                }
            }).addTo(map);
        }

        return () => {
            if (heatLayerRef.current && map) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        };
    }, [map, points]);

    return null;
};

const HeatmapMap = ({ event, livePoints }) => {
    const defaultCenter = [event.location_lat, event.location_lng];

    // Combine event base point + any live points received via WebSocket
    const allPoints = [
        [event.location_lat, event.location_lng, 0.5], // Base event point
        ...livePoints
    ];

    return (
        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <MapContainer
                center={defaultCenter}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <HeatLayer points={allPoints} />
            </MapContainer>
        </div>
    );
};

export default HeatmapMap;
