import { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Power, Activity, Loader2, CheckCircle2 } from "lucide-react";
import api from "../api";

const ResponderTracker = ({ eventId }) => {
    const [isTracking, setIsTracking] = useState(false);
    const [status, setStatus] = useState("AVAILABLE");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(false);

    const trackingInterval = useRef(null);

    const statuses = [
        { value: "AVAILABLE", label: "Available", color: "bg-green-500" },
        { value: "BUSY", label: "Busy", color: "bg-red-500" },
        { value: "RESPONDING", label: "Responding", color: "bg-yellow-500" },
        { value: "OFFLINE", label: "Offline", color: "bg-gray-500" },
    ];

    const updateLocation = async () => {
        if (!("geolocation" in navigator)) return;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    await api.post("/responders/update/", {
                        event_id: eventId,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        status: status
                    });
                    setLastUpdated(new Date());
                } catch (err) {
                    console.error("Failed to update responder location", err);
                }
            },
            (err) => console.error("GPS Error", err),
            { enableHighAccuracy: true }
        );
    };

    const toggleTracking = () => {
        if (isTracking) {
            clearInterval(trackingInterval.current);
            setIsTracking(false);
            // Optionally notify backend user is offline
        } else {
            setIsTracking(true);
            updateLocation();
            trackingInterval.current = setInterval(updateLocation, 10000); // Update every 10s
        }
    };

    useEffect(() => {
        return () => {
            if (trackingInterval.current) clearInterval(trackingInterval.current);
        };
    }, []);

    // Also update if status changes while tracking
    useEffect(() => {
        if (isTracking) updateLocation();
    }, [status]);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isTracking ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                        <Navigation size={20} className={isTracking ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <h3 className="font-bold">Responder Tracking</h3>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">
                            {isTracking ? "Live Location Active" : "Tracking Paused"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleTracking}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isTracking ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTracking ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {isTracking && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">My Current Status</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statuses.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => setStatus(s.value)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${status === s.value
                                            ? 'bg-gray-700 border-white text-white'
                                            : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900 p-3 rounded-xl border border-gray-700/50 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Activity size={14} className="text-blue-500" />
                            <span>Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Pending..."}</span>
                        </div>
                        {lastUpdated && <CheckCircle2 size={12} className="text-green-500" />}
                    </div>

                    <p className="text-[10px] text-gray-500 italic">
                        Your location is only visible to event organizers and emergency dispatchers while active.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ResponderTracker;
