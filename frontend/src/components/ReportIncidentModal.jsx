import { useState, useEffect } from "react";
import { AlertCircle, X, Navigation, Loader2 } from "lucide-react";
import api from "../api";

const ReportIncidentModal = ({ isOpen, onClose, eventId }) => {
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [locLoading, setLocLoading] = useState(false);

    const [formData, setFormData] = useState({
        category: "OTHER",
        severity: "MEDIUM",
        description: ""
    });

    const categories = [
        { value: "FIRE", label: "🔥 Fire" },
        { value: "MEDICAL", label: "🏥 Medical Emergency" },
        { value: "VIOLENCE", label: "👊 Violence/Conflict" },
        { value: "STAMPEDE", label: "🏃 Stampede Risk" },
        { value: "SUSPICIOUS", label: "🕵️ Suspicious Activity" },
        { value: "LOST_PERSON", label: "👤 Lost Person" },
        { value: "TECH_FAILURE", label: "🏗️ Technical Failure" },
        { value: "OTHER", label: "⚠️ Other" }
    ];

    const severities = [
        { value: "LOW", label: "Low", color: "text-blue-400" },
        { value: "MEDIUM", label: "Medium", color: "text-yellow-400" },
        { value: "HIGH", label: "High", color: "text-orange-500" },
        { value: "CRITICAL", label: "Critical", color: "text-red-500" }
    ];

    useEffect(() => {
        if (isOpen) {
            handleGetLocation();
        }
    }, [isOpen]);

    const handleGetLocation = () => {
        setLocLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocLoading(false);
                },
                (err) => {
                    console.error(err);
                    setLocLoading(false);
                }
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location) {
            alert("Location is required. Please enable GPS.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/incidents/", {
                ...formData,
                event: eventId,
                lat: location.lat,
                lng: location.lng
            });
            onClose();
            alert("Incident reported successfully. Authorities have been notified.");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to report incident");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-red-500/10">
                    <div className="flex items-center gap-3 text-red-500">
                        <AlertCircle size={28} />
                        <h2 className="text-xl font-bold">Report Incident</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Incident Type</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Severity Level</label>
                        <div className="grid grid-cols-2 gap-3">
                            {severities.map(sev => (
                                <button
                                    key={sev.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, severity: sev.value })}
                                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${formData.severity === sev.value
                                            ? 'bg-gray-700 border-white text-white ring-2 ring-red-500'
                                            : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                                        }`}
                                >
                                    <span className={sev.color}>●</span> {sev.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none resize-none h-24"
                            placeholder="Help us understand the situation better..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Navigation size={20} className={location ? "text-green-500" : "text-gray-500"} />
                            <span className="text-xs text-gray-400">
                                {locLoading ? "Detecting location..." :
                                    location ? `Location Captured: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` :
                                        "GPS required for reporting"}
                            </span>
                        </div>
                        {!location && !locLoading && (
                            <button type="button" onClick={handleGetLocation} className="text-xs text-red-400 font-bold hover:underline">
                                Retry
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || locLoading}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Submit Report"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportIncidentModal;
