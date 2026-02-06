import { useAuth } from "../context/AuthContext";
import { LogOut, Plus, ScanLine, Ticket as TicketIcon, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import EventList from "../components/EventList";
import SOSButton from "../components/SOSButton";
import { useState } from "react";

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <nav className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">OwlEye</Link>
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Role Tag */}
                        <span className="hidden sm:inline px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {user?.role}
                        </span>

                        {/* Nav Links */}
                        <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block" />

                        <Link to="/my-tickets" className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white" title="My Passes">
                            <TicketIcon size={20} />
                        </Link>

                        {user?.role === 'ORGANIZER' && (
                            <Link to="/scan" className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white" title="Entry Scanner">
                                <ScanLine size={24} />
                            </Link>
                        )}

                        <div className="h-6 w-px bg-gray-700 mx-2" />

                        <button
                            onClick={logout}
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors text-red-400 hover:text-red-300"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Upcoming Events</h1>
                        <p className="text-gray-400">Discover and join events in your area.</p>
                    </div>
                    {user?.role === 'ORGANIZER' && (
                        <Link
                            to="/create-event"
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus size={20} />
                            Create Event
                        </Link>
                    )}
                </div>

                {/* Event List */}
                <EventList refreshTrigger={refreshTrigger} />

                {/* SOS Button */}
                <SOSButton />
            </main>
        </div>
    );
};

export default Dashboard;
