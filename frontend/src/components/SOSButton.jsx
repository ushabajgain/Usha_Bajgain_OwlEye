import { useState, useRef, useEffect } from "react";
import { Zap, Loader2, ShieldCheck, X, Navigation } from "lucide-react";
import api from "../api";

const SOSButton = ({ eventId }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, success, error
    const [countdown, setCountdown] = useState(3);
    const countdownRef = useRef(null);

    const triggerSOS = async (type = "PANIC") => {
        setLoading(true);
        setStatus("idle");

        // 1. Get Location
        let lat = 0, lng = 0;
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000
                });
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
        } catch (err) {
            console.error("GPS Failed for SOS", err);
        }

        // 2. Send to Backend
        try {
            await api.post("/sos/", {
                event: eventId,
                lat,
                lng,
                sos_type: type
            });
            setStatus("success");
            setTimeout(() => {
                setStatus("idle");
                setIsConfirming(false);
            }, 5000);
        } catch (err) {
            setStatus("error");
            alert("Failed to send SOS. Please call emergency services directly.");
        } finally {
            setLoading(false);
        }
    };

    const startCountdown = () => {
        setIsConfirming(true);
        setCountdown(3);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    triggerSOS();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const cancelSOS = () => {
        clearInterval(countdownRef.current);
        setIsConfirming(false);
        setCountdown(3);
    };

    return (
        <>
            {/* Main Floating SOS Button */}
            {!isConfirming && (
                <button
                    onClick={startCountdown}
                    className="fixed bottom-24 right-6 z-[60] group flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-25 group-hover:opacity-40" />
                    <div className="relative bg-red-600 hover:bg-red-500 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-red-900/40 transition-all active:scale-90 border-4 border-white/20">
                        <Zap className="text-white fill-white" size={32} />
                    </div>
                </button>
            )}

            {/* Confirmation Overlay */}
            {isConfirming && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    {status === "idle" ? (
                        <>
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20" />
                                <div className="w-40 h-40 rounded-full border-8 border-red-600 flex items-center justify-center">
                                    <span className="text-7xl font-black text-white">{countdown}</span>
                                </div>
                            </div>

                            <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">EMERGENCY SOS</h2>
                            <p className="text-red-300 text-lg mb-12 max-w-sm">Sending your live location and identity to event security...</p>

                            <div className="grid grid-cols-1 w-full max-w-xs gap-4">
                                <button
                                    onClick={cancelSOS}
                                    className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-gray-200 transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>

                                <div className="flex gap-2 justify-center mt-4">
                                    <button onClick={() => triggerSOS("MEDICAL")} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Medical</button>
                                    <button onClick={() => triggerSOS("THREAT")} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Security</button>
                                </div>
                            </div>
                        </>
                    ) : status === "success" ? (
                        <div className="animate-in zoom-in duration-500">
                            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/50">
                                <ShieldCheck className="text-white" size={64} />
                            </div>
                            <h2 className="text-4xl font-black text-white mb-2">HELP IS ON THE WAY</h2>
                            <p className="text-green-300 text-lg">Responders have your exact location.</p>
                            <button
                                onClick={() => setIsConfirming(false)}
                                className="mt-12 px-8 py-3 bg-gray-800 rounded-xl text-sm font-bold text-gray-400 border border-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-bold text-red-500">Error Sending SOS</h2>
                            <button onClick={cancelSOS} className="mt-8 px-8 py-3 bg-white text-black rounded-xl font-bold">Try Again</button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default SOSButton;
