import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import HeatmapMap from "../components/HeatmapMap";
import IncidentManagement from "../components/IncidentManagement";
import { ArrowLeft, Users, Zap, ShieldAlert, Loader2, MessageSquareWarning } from "lucide-react";

const EventHeatmap = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [livePoints, setLivePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ attendance: 0, density: "Low" });

    useEffect(() => {
        // 1. Fetch event details
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${id}/`);
                setEvent(res.data);
                setStats(prev => ({ ...prev, attendance: res.data.current_attendance }));
            } catch (err) {
                console.error("Failed to fetch event", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();

        // 2. Connect to Heatmap WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host.replace('5173', '8000')}/ws/heatmap/${id}/`;
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'heatmap_data') {
                // For raw points coming from tracker, we append to livePoints
                setLivePoints(prev => [...prev, ...data.points].slice(-500)); // Keep last 500 points for performance
            }
            // Check if it's a individual point update from the tracker broadcasther
            if (data.lat && data.lng) {
                setLivePoints(prev => [...prev, [data.lat, data.lng, 0.8]].slice(-500));
            }
        };

        return () => {
            socket.close();
        };
    }, [id]);

    // Handle density logic
    useEffect(() => {
        if (!event) return;
        const ratio = stats.attendance / event.capacity;
        let density = "Low";
        if (ratio > 0.8) density = "High / Risk";
        else if (ratio > 0.5) density = "Moderate";
        setStats(prev => ({ ...prev, density }));
    }, [stats.attendance, event]);

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    if (!event) return <div className="text-white">Event not found.</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{event.title} - Live Heatmap</h1>
                        <p className="text-gray-400 text-sm">Real-time crowd monitoring and density analysis</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl flex items-center gap-3">
                        <Users className="text-blue-400" size={20} />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Live Count</p>
                            <p className="font-bold">{stats.attendance / 1} / {event.capacity}</p>
                        </div>
                    </div>
                    <div className={`bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl flex items-center gap-3 ${stats.density === 'High / Risk' ? 'border-red-500' : ''}`}>
                        <Zap className={stats.density === 'High / Risk' ? 'text-red-500' : 'text-yellow-400'} size={20} />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Density</p>
                            <p className={`font-bold ${stats.density === 'High / Risk' ? 'text-red-500' : ''}`}>{stats.density}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Map */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <HeatmapMap event={event} livePoints={livePoints} />
                </div>

                {/* Sidebar controls/alerts */}
                <div className="space-y-6">
                    <IncidentManagement eventId={id} />

                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-blue-400">
                            <ShieldAlert size={20} />
                            Safety Insights
                        </h3>
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-xs leading-relaxed text-gray-300">
                                <strong>Tip:</strong> Warm areas indicate higher crowd concentration. Monitor the main gates for buildup.
                            </div>
                            {stats.density === "High / Risk" && (
                                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-xs leading-relaxed text-red-200 animate-pulse">
                                    <strong>ALERT:</strong> Overcrowding detected! Consider opening secondary exits.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                        <h3 className="font-bold text-sm mb-4">Map Controls</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between text-sm text-gray-400">
                                Heat Intensity
                                <input type="range" className="w-24 accent-blue-500" />
                            </label>
                            <label className="flex items-center justify-between text-sm text-gray-400">
                                Show Markers
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                            </label>
                            <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors mt-4">
                                Export Density Log
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventHeatmap;
