import { format } from "date-fns";
import { Clock, User, CheckCircle2, AlertCircle, ShieldCheck, UserCheck } from "lucide-react";

const IncidentTimeline = ({ logs }) => {
    if (!logs || logs.length === 0) return <div className="text-gray-500 text-sm italic">No activity logged yet.</div>;

    const getActionIcon = (action) => {
        if (action.includes("REPORTED")) return <AlertCircle size={14} className="text-blue-400" />;
        if (action.includes("INVESTIGATING")) return <Clock size={14} className="text-yellow-500" />;
        if (action.includes("RESOLVED")) return <CheckCircle2 size={14} className="text-green-500" />;
        if (action.includes("FALSE_ALARM")) return <ShieldCheck size={14} className="text-gray-500" />;
        return <UserCheck size={14} className="text-purple-400" />;
    };

    return (
        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-700">
            {logs.map((log, idx) => (
                <div key={log.id || idx} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-gray-900 border-2 border-gray-600 z-10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {getActionIcon(log.action_type)}
                                <span className="text-xs font-black text-white uppercase tracking-tighter">
                                    {log.action_type.replace("STATUS_CHANGE_", "")}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-500 tabular-nums">
                                {format(new Date(log.timestamp), "HH:mm:ss")}
                            </span>
                        </div>

                        <p className="text-[11px] text-gray-400 leading-relaxed mb-2 italic">
                            "{log.notes || "No additional comments"}"
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-gray-500 border-t border-gray-700/50 pt-2 mt-2">
                            <User size={10} />
                            <span>Action by: <span className="text-gray-300 font-bold">{log.performed_by_name}</span></span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default IncidentTimeline;
