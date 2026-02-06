import { useState, useEffect } from "react";
import { Bell, ShieldAlert, X, AlertTriangle, Info, CheckCircle } from "lucide-react";

const SafetyAlertListener = ({ eventId }) => {
    const [alerts, setAlerts] = useState([]);
    const [activeAlert, setActiveAlert] = useState(null);

    useEffect(() => {
        if (!eventId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host.replace('5173', '8000')}/ws/broadcast/${eventId}/`;
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'safety_alert') {
                const newAlert = data.alert;
                setAlerts(prev => [newAlert, ...prev]);
                setActiveAlert(newAlert);

                // Audio Cue (Optional)
                if (newAlert.severity === 'EMERGENCY' || newAlert.severity === 'DANGER') {
                    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                    audio.play().catch(e => console.log("Audio play failed", e));
                }
            }
        };

        return () => {
            socket.close();
        };
    }, [eventId]);

    if (!activeAlert) return null;

    const getSeverityStyles = (sev) => {
        switch (sev) {
            case 'EMERGENCY': return "bg-red-600 border-red-400 text-white animate-bounce-short";
            case 'DANGER': return "bg-orange-600 border-orange-400 text-white";
            case 'WARNING': return "bg-yellow-500 border-yellow-300 text-black";
            default: return "bg-blue-600 border-blue-400 text-white";
        }
    };

    const getIcon = (sev) => {
        switch (sev) {
            case 'EMERGENCY': return <ShieldAlert size={28} />;
            case 'DANGER': return <AlertTriangle size={28} />;
            case 'WARNING': return <AlertTriangle size={28} />;
            default: return <Info size={28} />;
        }
    };

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] w-full max-w-lg p-4 animate-in slide-in-from-top-4 duration-500">
            <div className={`relative rounded-3xl p-6 shadow-2xl border-2 flex gap-4 items-start ${getSeverityStyles(activeAlert.severity)}`}>
                <div className="mt-1">
                    {getIcon(activeAlert.severity)}
                </div>

                <div className="flex-grow">
                    <h3 className="font-black text-xl mb-1 flex items-center gap-2">
                        {activeAlert.title}
                        <span className="text-[10px] uppercase bg-black/20 px-1.5 py-0.5 rounded ml-auto">Live Alert</span>
                    </h3>
                    <p className="text-sm font-medium opacity-90 leading-relaxed">
                        {activeAlert.message}
                    </p>

                    <button
                        onClick={() => setActiveAlert(null)}
                        className="mt-4 w-full py-2 bg-black/20 hover:bg-black/30 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={16} />
                        I understand
                    </button>
                </div>

                <button
                    onClick={() => setActiveAlert(null)}
                    className="absolute top-4 right-4 p-1 hover:bg-black/10 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default SafetyAlertListener;
