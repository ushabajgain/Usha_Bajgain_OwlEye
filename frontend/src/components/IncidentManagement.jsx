import { useEffect, useState } from "react";
import api from "../api";
import { format } from "date-fns";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    User,
    Info,
    ChevronRight,
    Search,
    Filter
} from "lucide-react";

const IncidentManagement = ({ eventId }) => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, critical: 0 });

    const fetchIncidents = async () => {
        try {
            const res = await api.get(`/incidents/?event_id=${eventId}`);
            setIncidents(res.data);

            const pending = res.data.filter(i => i.status === 'REPORTED').length;
            const critical = res.data.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;
            setStats({ pending, critical });
        } catch (err) {
            console.error("Failed to fetch incidents", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();

        // Polling as a fallback for WebSocket (Optional, but good for reliability)
        const interval = setInterval(fetchIncidents, 30000);
        return () => clearInterval(interval);
    }, [eventId]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/incidents/${id}/`, { status: newStatus });
            fetchIncidents();
        } catch (err) {
            alert("Failed to update incident status");
        }
    };

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'CRITICAL': return "bg-red-500/20 text-red-500 border-red-500/50";
            case 'HIGH': return "bg-orange-500/20 text-orange-500 border-orange-500/50";
            case 'MEDIUM': return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
            default: return "bg-blue-500/20 text-blue-500 border-blue-500/50";
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading incoming reports...</div>;

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pending Review</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                </div>
                <div className={`bg-gray-800 border p-4 rounded-2xl ${stats.critical > 0 ? 'border-red-500' : 'border-gray-700'}`}>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Critical Alarms</p>
                    <p className={`text-2xl font-bold ${stats.critical > 0 ? 'text-red-500' : 'text-white'}`}>{stats.critical}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h3 className="font-bold flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={18} />
                        Active Incidents
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchIncidents} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <Clock size={16} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-700">
                    {incidents.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No incidents reported for this event.
                        </div>
                    ) : (
                        incidents.map((incident) => (
                            <div key={incident.id} className={`p-4 hover:bg-white/5 transition-colors ${incident.status === 'REPORTED' ? 'border-l-4 border-blue-500' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getSeverityColor(incident.severity)}`}>
                                            {incident.severity}
                                        </span>
                                        <h4 className="font-bold text-white">{incident.category.replace('_', ' ')}</h4>
                                    </div>
                                    <span className="text-[10px] text-gray-500">
                                        {format(new Date(incident.created_at), "h:mm a")}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-400 mb-4 line-clamp-2 italic">
                                    "{incident.description || 'No additional details provided.'}"
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <User size={14} />
                                        <span>Reported by: {incident.reporter_name}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        {incident.status === 'REPORTED' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(incident.id, 'FALSE_ALARM')}
                                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold rounded-lg transition-colors border border-gray-600"
                                                >
                                                    False Alarm
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(incident.id, 'INVESTIGATING')}
                                                    className="px-3 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 text-xs font-bold rounded-lg transition-colors border border-yellow-500/30"
                                                >
                                                    Investigate
                                                </button>
                                            </>
                                        )}
                                        {incident.status === 'INVESTIGATING' && (
                                            <button
                                                onClick={() => handleUpdateStatus(incident.id, 'RESOLVED')}
                                                className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-500 text-xs font-bold rounded-lg transition-colors border border-green-500/30"
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                        {incident.status === 'RESOLVED' && (
                                            <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                                                <CheckCircle2 size={14} />
                                                Resolved
                                            </div>
                                        )}
                                        {incident.status === 'FALSE_ALARM' && (
                                            <div className="text-gray-500 text-xs font-bold">
                                                Ignored (False)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IncidentManagement;
