import { useEffect, useState } from "react";
import api from "../api";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

const EventCard = ({ event }) => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-colors shadow-lg">
        <div className="h-32 bg-gradient-to-r from-blue-900 to-purple-900 relative">
            <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-bold rounded ${event.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                    'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                }`}>
                {event.status}
            </span>
        </div>
        <div className="p-5">
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
                    <span>Capacity: {event.capacity}</span>
                </div>
            </div>
            <p className="mt-4 text-gray-500 text-sm line-clamp-2">{event.description}</p>
        </div>
    </div>
);

const EventList = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchEvents();
    }, []);

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
                <EventCard key={event.id} event={event} />
            ))}
        </div>
    );
};

export default EventList;
