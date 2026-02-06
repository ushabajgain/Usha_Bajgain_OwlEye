import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import LiveClusteredMap from "../components/LiveClusteredMap";
import {
    ArrowLeft,
    Users,
    Navigation,
    Loader2,
    Maximize2,
    Filter,
    ShieldAlert
} from "lucide-react";

const LiveEventMap = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [entities, setEntities] = useState({});
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${id}/`);
                setEvent(res.data);
            } catch (err) {
                console.error("Failed to fetch event", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();

        // Connect to Live Map WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host.replace('5173', '8000')}/ws/live-map/${id}/`;
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            // data format: { id, type, lat, lng, label, timestamp, ... }
            if (data.id) {
                setEntities(prev => ({
                    ...prev,
                    [data.id]: data
                }));
            }
        };

        return () => {
            socket.close();
        };
    }, [id]);

    const filteredEntities = filter === 'all'
        ? entities
        : Object.fromEntries(Object.entries(entities).filter(([_, e]) => e.type === filter));

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    if (!event) return <div className="text-white p-20 text-center">Event not found.</div>;

    const entityCounts = Object.values(entities).reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Control Bar */}
            <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <ArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Navigation className="text-blue-500" size={20} />
                                Live Situational Map
                            </h1>
                            <p className="text-xs text-gray-400 capitalize">{event.title} • Live Monitoring</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filter Select */}
                        <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 gap-2">
                            <Filter size={14} className="text-gray-500" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-300"
                            >
                                <option value="all">All Entities</option>
                                <option value="attendee">Attendees</option>
                                <option value="volunteer">Volunteers</option>
                                <option value="organizer">Staff</option>
                                <option value="incident">Incidents</option>
                            </select>
                        </div>

                        <div className="h-8 w-px bg-gray-700 mx-2" />

                        <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="flex flex-col items-center">
                                <span className="text-blue-400">{entityCounts.attendee || 0}</span>
                                <span className="text-[10px] text-gray-500 uppercase">Users</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-amber-400">{entityCounts.volunteer || 0}</span>
                                <span className="text-[10px] text-gray-500 uppercase">Staff</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-red-500">{entityCounts.incident || 0}</span>
                                <span className="text-[10px] text-gray-500 uppercase">Alerts</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow relative">
                <LiveClusteredMap event={event} entities={filteredEntities} />

                {/* Floating Notification */}
                {entityCounts.sos > 0 && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-sm">
                        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl animate-bounce flex items-center gap-4">
                            <ShieldAlert size={32} />
                            <div>
                                <h4 className="font-bold">Active SOS Alerts!</h4>
                                <p className="text-sm opacity-90">{entityCounts.sos} emergency signals detected.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveEventMap;
