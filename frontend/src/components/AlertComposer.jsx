import { useState } from "react";
import { Send, AlertOctagon, Info, Bell, ShieldAlert, Loader2, X } from "lucide-react";
import api from "../api";

const AlertComposer = ({ eventId, onAlertSent }) => {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        severity: "INFO",
        audience_type: "ALL"
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message) return;

        setLoading(true);
        try {
            await api.post("/alerts/", {
                ...formData,
                event: eventId
            });
            setFormData({ title: "", message: "", severity: "INFO", audience_type: "ALL" });
            setIsOpen(false);
            if (onAlertSent) onAlertSent();
            alert("Safety alert broadcasted successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to broadcast alert.");
        } finally {
            setLoading(false);
        }
    };

    const severities = [
        { value: "INFO", label: "Information", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
        { value: "WARNING", label: "Warning", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
        { value: "DANGER", label: "Danger", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
        { value: "EMERGENCY", label: "Emergency", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
    ];

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Bell className="text-purple-400" size={20} />
                    <span className="font-bold">Broadcast Safety Alert</span>
                </div>
                {isOpen ? <X size={18} /> : <div className="bg-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">COMPOSE</div>}
            </button>

            {isOpen && (
                <form onSubmit={handleSubmit} className="p-6 border-t border-gray-700 space-y-5 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Severity Level</label>
                        <div className="grid grid-cols-2 gap-2">
                            {severities.map(sev => (
                                <button
                                    key={sev.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, severity: sev.value })}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${formData.severity === sev.value
                                            ? `${sev.bg} ${sev.border} ${sev.color} ring-1 ring-offset-1 ring-offset-gray-800 ring-current`
                                            : 'bg-gray-900 border-gray-700 text-gray-500'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    {sev.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                        <input
                            type="text"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="e.g. Evacuation Order, Route Change"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Message</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                            placeholder="Provide clear instructions for attendees..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                        <Info size={14} />
                        <span>This alert will be broadcasted to ALL connected attendees instantly via WebSockets.</span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        Broadcast Now
                    </button>
                </form>
            )}
        </div>
    );
};

export default AlertComposer;
