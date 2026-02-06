import { useEffect, useState } from "react";
import api from "../api";
import { Calendar, MapPin, Users, Ticket as TicketIcon, Loader2, CheckCircle, Activity, Map as MapIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReportIncidentModal from "./ReportIncidentModal";

const EventCard = ({ event, onJoin }) => {
    const { user } = useAuth();
    const [joining, setJoining] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);

    const handleJoin = async () => {
        setJoining(true);
        await onJoin(event.id);
        setJoining(false);
    };

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-colors shadow-lg flex flex-col h-full">
            <div className="h-32 bg-gradient-to-r from-blue-900 to-purple-900 relative">
                <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-bold rounded ${event.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                    'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    }`}>
                    {event.status}
                </span>
                <div className="absolute top-3 left-3 px-2 py-1 text-xs font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/50">
                    {event.category}
                </div>
            </div>
            <div className="p-5 flex-grow">
                <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-blue-400" />
                        <span>{format(new Date(event.start_date), "MMM d, yyyy • h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-red-400" />
                        <span className="truncate">{event.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-purple-400" />
                        <span>{event.current_attendance} / {event.capacity} registered</span>
                    </div>
                </div>
                <p className="mt-4 text-gray-400 text-sm line-clamp-2">{event.description}</p>
            </div>
            <div className="p-5 pt-0 mt-auto flex flex-col gap-2">
                {user?.role === 'ORGANIZER' && event.organizer === user.id && (
                    <Link
                        to={`/command-center/${event.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-bold shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Activity size={18} />
                        Live Command Center
                    </Link>
                )}

                {event.is_joined ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-2 w-full py-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30 font-medium">
                            <CheckCircle size={18} />
                            Registered
                        </div>
                        <button
                            onClick={() => setReportModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg border border-red-500/30 transition-colors font-medium"
                        >
                            <AlertCircle size={18} />
                            Report Incident
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining || event.status !== 'ACTIVE' || event.current_attendance >= event.capacity}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {joining ? <Loader2 className="animate-spin" size={18} /> : <TicketIcon size={18} />}
                        Join Event
                    </button>
                )}
            </div>

            <ReportIncidentModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                eventId={event.id}
            />
        </div>
    );
};

const EventList = ({ refreshTrigger }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const res = await api.get("/events/");
            setEvents(res.data);
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [refreshTrigger]);

    const handleJoinEvent = async (eventId) => {
        try {
            await api.post("/tickets/join-event/", { event_id: eventId });
            fetchEvents(); // Refresh to show "Registered" status
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to join event");
        }
    };

    if (loading) return <div className="text-center py-8 text-gray-400">Loading events...</div>;

    if (events.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700 border-dashed">
                <p className="text-gray-400">No events found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
                <EventCard key={event.id} event={event} onJoin={handleJoinEvent} />
            ))}
        </div>
    );
};

export default EventList;
