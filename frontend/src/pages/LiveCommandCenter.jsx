import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import LiveClusteredMap from "../components/LiveClusteredMap";
import IncidentManagement from "../components/IncidentManagement";
import AlertComposer from "../components/AlertComposer";
import ResponderTracker from "../components/ResponderTracker";
import SafetyAlertListener from "../components/SafetyAlertListener";
import {
    Users,
    ShieldAlert,
    Activity,
    Wifi,
    ArrowLeft,
    Settings,
    Maximize2,
    Clock,
    Zap,
    AlertTriangle,
    Navigation,
    Loader2
} from "lucide-react";
import { format } from "date-fns";

const LiveCommandCenter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchDashboardData = async () => {
        try {
            const [eventRes, statsRes] = await Promise.all([
                api.get(`/events/${id}/`),
                api.get(`/events/${id}/stats/`)
            ]);
            setEvent(eventRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Dashboard Fetch Error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const statsInterval = setInterval(fetchDashboardData, 10000); // Pulse stats every 10s
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(statsInterval);
            clearInterval(timeInterval);
        };
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <p className="font-mono tracking-widest animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden max-h-screen">
            {/* Command Bar */}
            <header className="h-16 bg-gray-900/50 border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-xl z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
                            <Activity className="text-blue-500" size={18} />
                            LIVE COMMAND CENTER
                        </h1>
                        <p className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            SECURE FEED: {event?.title}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right tabular-nums hidden sm:block">
                        <p className="text-sm font-bold">{format(currentTime, "HH:mm:ss")}</p>
                        <p className="text-[10px] text-gray-500">{format(currentTime, "MMMM do, yyyy")}</p>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-800 p-2 rounded-lg cursor-not-allowed opacity-50"><Settings size={18} /></div>
                        <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg font-bold text-xs flex items-center gap-1 border border-blue-500/30">
                            <Wifi size={14} />
                            ACTIVE
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col p-4 gap-4 overflow-hidden">
                {/* Telemetry Cards */}
                <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Users size={12} /> Attendees
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black">{stats?.total_attendees}</span>
                            <span className="text-[10px] text-blue-500 font-mono">FLOWING</span>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Activity size={12} /> Capacity
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black">{stats?.capacity_percentage}%</span>
                            <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${stats?.capacity_percentage}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${stats?.active_incidents > 0 ? 'bg-orange-950/20 border-orange-500/50' : 'bg-gray-900/50 border-white/5'}`}>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle size={12} /> Incidents
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className={`text-2xl font-black ${stats?.active_incidents > 0 ? 'text-orange-500' : ''}`}>{stats?.active_incidents}</span>
                            <span className="text-[10px] font-mono text-gray-500">ACTIVE</span>
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${stats?.active_sos > 0 ? 'bg-red-950/20 border-red-500 animate-pulse' : 'bg-gray-900/50 border-white/5'}`}>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Zap size={12} /> Emergency SOS
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className={`text-2xl font-black ${stats?.active_sos > 0 ? 'text-red-500' : ''}`}>{stats?.active_sos}</span>
                            <span className="text-[10px] font-mono text-gray-500">DISTRESS</span>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1" title="Online Responders">
                            <Navigation size={12} /> Staff Live
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black">{stats?.online_staff}</span>
                            <span className="text-[10px] font-mono text-gray-500">ON FIELD</span>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Settings size={12} /> Net Health
                        </span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black text-green-500">9MS</span>
                            <span className="text-[10px] font-mono text-gray-500">STABLE</span>
                        </div>
                    </div>
                </section>

                <div className="flex-grow flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
                    {/* Primary Visualization Hub */}
                    <div className="flex-grow bg-black rounded-2xl border border-white/10 overflow-hidden relative shadow-inner">
                        <div className="absolute top-4 left-4 z-40 bg-gray-900/80 backdrop-blur-md p-2 rounded-lg border border-white/10 flex gap-2">
                            <div className="px-3 py-1 bg-blue-600 text-[10px] font-bold rounded shadow-lg flex items-center gap-1">
                                <Activity size={12} /> SITUATIONAL MAP
                            </div>
                            <div className="px-3 py-1 bg-gray-800 text-[10px] font-bold rounded flex items-center gap-1 text-gray-400">
                                <Zap size={10} /> HEATMAP OVERLAY
                            </div>
                        </div>

                        <LiveClusteredMap eventId={id} />
                    </div>

                    {/* Operational Sidebar */}
                    <aside className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        <ResponderTracker eventId={id} />
                        <AlertComposer eventId={id} />
                        <IncidentManagement eventId={id} />

                        <div className="bg-gray-900/50 border border-white/5 p-6 rounded-2xl">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Event Metadata</h4>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Venue</span>
                                    <span className="text-white font-medium">{event?.address}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Issued</span>
                                    <span className="text-white font-medium">{stats?.total_tickets_issued} Tickets</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Closing Time</span>
                                    <span className="text-white font-medium">{format(new Date(event?.end_date || Date.now()), "h:mm a")}</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* In-App Alerts Listener */}
            <SafetyAlertListener eventId={id} />

            <style sx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .animate-bounce-short {
                    animation: bounce 1s infinite;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
};

export default LiveCommandCenter;
