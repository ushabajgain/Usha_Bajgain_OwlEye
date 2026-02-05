import { useEffect, useState } from "react";
import api from "../api";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket as TicketIcon, Loader2, Search } from "lucide-react";

const TicketCard = ({ ticket }) => (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col md:flex-row max-w-3xl mx-auto mb-8">
        {/* QR Section */}
        <div className="bg-white p-8 flex items-center justify-center">
            <QRCode
                value={ticket.qr_token}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
            />
        </div>

        {/* Details Section */}
        <div className="p-8 flex-grow flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">{ticket.event_title}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${ticket.status === 'SCANNED' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                            'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        }`}>
                        {ticket.status}
                    </span>
                </div>

                <div className="space-y-3 text-gray-300 mb-6">
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-blue-400" />
                        <span>{format(new Date(ticket.event_start_date), "EEEE, MMMM do, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-[18px]" /> {/* Spacer for icon alignment */}
                        <span className="text-gray-400">{format(new Date(ticket.event_start_date), "h:mm a (UTC)")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-red-400" />
                        <span>{ticket.event_address}</span>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Pass Holder</p>
                <p className="text-white font-medium">{ticket.user_full_name}</p>
                <p className="text-[10px] text-gray-600 font-mono mt-4">ID: {ticket.id}</p>
            </div>
        </div>
    </div>
);

const MyTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await api.get("/tickets/my-tickets/");
                setTickets(res.data);
            } catch (err) {
                console.error("Failed to fetch tickets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <p className="text-gray-400">Loading your passes...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto mb-10 text-center">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                    My Event Passes
                </h1>
                <p className="text-gray-400">Scan these QR codes at the event entry points.</p>
            </div>

            {tickets.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-16 px-6 bg-gray-800 rounded-3xl border border-gray-700 border-dashed">
                    <TicketIcon className="mx-auto text-gray-600 mb-6" size={60} />
                    <h3 className="text-xl font-bold mb-2">No tickets yet</h3>
                    <p className="text-gray-400 mb-8">You haven't registered for any events. Browse upcoming events on the dashboard.</p>
                    <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                        Browse Events
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {tickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTickets;
