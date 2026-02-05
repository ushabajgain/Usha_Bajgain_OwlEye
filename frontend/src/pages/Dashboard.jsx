import { useAuth } from "../context/AuthContext";
import { LogOut, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import EventList from "../components/EventList";

const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <nav className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">OwlEye Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-300 hidden md:inline">Welcome, {user?.full_name || user?.email}</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50">
                            {user?.role}
                        </span>
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header Actions */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Events</h2>
                        <p className="text-gray-400">Manage and monitor all active events.</p>
                    </div>
                    {user?.role === 'ORGANIZER' && (
                        <Link
                            to="/create-event"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={20} />
                            Create Event
                        </Link>
                    )}
                </div>

                {/* Event List */}
                <EventList />
            </main>
        </div>
    );
};

export default Dashboard;
