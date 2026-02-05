import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <nav className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">OwlEye Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-300">Welcome, {user?.full_name || user?.email}</span>
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

            <main className="max-w-7xl mx-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Widget 1 */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Live Status</h3>
                        <div className="h-32 bg-gray-700/50 rounded flex items-center justify-center text-gray-500">
                            Map Widget Placeholder
                        </div>
                    </div>

                    {/* Role Specific Content */}
                    {user?.role === 'ORGANIZER' && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h3 className="text-lg font-semibold text-purple-400 mb-4">Event Management</h3>
                            <p className="text-gray-400">Create and manage your events here.</p>
                            <button className="mt-4 px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 text-sm">Create Event</button>
                        </div>
                    )}

                    {user?.role === 'ATTENDEE' && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h3 className="text-lg font-semibold text-green-400 mb-4">My Tickets</h3>
                            <p className="text-gray-400">View your upcoming events and tickets.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
