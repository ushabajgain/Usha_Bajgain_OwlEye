import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { getIcon } from "../utils/mapIcons";
import { format } from "date-fns";

const LiveClusteredMap = ({ event, entities }) => {
    const defaultCenter = [event.location_lat, event.location_lng];

    return (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-gray-700 shadow-2xl relative">
            <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    showCoverageOnHover={false}
                >
                    {Object.values(entities).map((entity) => (
                        <Marker
                            key={`${entity.type}-${entity.id}`}
                            position={[entity.lat, entity.lng]}
                            icon={getIcon(entity.type, entity.severity)}
                        >
                            <Popup className="custom-popup">
                                <div className="text-gray-900 p-2 min-w-[150px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm capitalize">{entity.type}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {format(new Date(entity.timestamp), "h:mm:ss a")}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-base mb-1">{entity.label || "Anonymous"}</h4>
                                    {entity.status && (
                                        <p className="text-xs text-gray-600">Status: {entity.status}</p>
                                    )}
                                    {entity.severity && (
                                        <p className="text-xs font-bold text-red-600">Severity: {entity.severity}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-xl space-y-2 pointer-events-none sm:pointer-events-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Legend</h4>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-400" /> <span>Attendees</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-400" /> <span>Volunteers</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-purple-500" /> <span>Organizers</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-orange-500" /> <span>Incidents</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-red-500" /> <span>SOS Alerts</span>
                </div>
            </div>
        </div>
    );
};

export default LiveClusteredMap;
