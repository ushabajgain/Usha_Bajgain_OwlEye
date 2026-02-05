import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../api";
import { Camera, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QRScanner = () => {
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", {
            qrbox: { width: 250, height: 250 },
            fps: 5,
        });

        scanner.render(onScanSuccess, onScanError);

        function onScanSuccess(result) {
            scanner.clear();
            setIsScanning(false);
            handleValidateTicket(result);
        }

        function onScanError(err) {
            // Silence errors as they happen constantly during scanning
        }

        return () => {
            scanner.clear().catch(e => console.error(e));
        };
    }, []);

    const handleValidateTicket = async (token) => {
        setLoading(true);
        try {
            const res = await api.post("/tickets/scan/", { qr_token: token });
            setScanResult({
                success: true,
                message: res.data.message,
                ticket: res.data.ticket
            });
        } catch (err) {
            setScanResult({
                success: false,
                message: err.response?.data?.detail || "Validation failed"
            });
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setIsScanning(true);
        window.location.reload(); // Simplest way to restart html5-qrcode instance
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">
            <div className="flex items-center justify-between mb-8 max-w-lg mx-auto w-full">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold">Entry Scanner</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center max-w-lg mx-auto w-full">
                {isScanning && (
                    <div className="w-full bg-gray-800 rounded-3xl p-6 border border-gray-700 shadow-2xl relative">
                        <div id="reader" className="overflow-hidden rounded-2xl"></div>
                        <div className="mt-8 text-center text-gray-400">
                            <Camera className="mx-auto mb-2 text-blue-500 animate-pulse" />
                            <p>Point camera at attendee's QR code</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center py-20">
                        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                        <p className="text-xl font-medium">Validating Ticket...</p>
                    </div>
                )}

                {scanResult && !loading && (
                    <div className={`w-full p-8 rounded-3xl border text-center shadow-2xl ${scanResult.success
                            ? 'bg-green-900/20 border-green-500/50'
                            : 'bg-red-900/20 border-red-500/50'
                        }`}>
                        {scanResult.success ? (
                            <CheckCircle className="mx-auto text-green-500 mb-6" size={80} />
                        ) : (
                            <XCircle className="mx-auto text-red-500 mb-6" size={80} />
                        )}

                        <h2 className="text-3xl font-bold mb-4">
                            {scanResult.success ? "Access Granted" : "Access Denied"}
                        </h2>

                        <p className="text-lg text-gray-300 mb-8">{scanResult.message}</p>

                        {scanResult.ticket && (
                            <div className="bg-black/20 p-6 rounded-2xl text-left space-y-2 mb-8 border border-white/5">
                                <p className="text-sm text-gray-400 capitalize">Attendee: <span className="text-white font-medium">{scanResult.ticket.user_full_name}</span></p>
                                <p className="text-sm text-gray-400 capitalize">Event: <span className="text-white font-medium">{scanResult.ticket.event_title}</span></p>
                            </div>
                        )}

                        <button
                            onClick={resetScanner}
                            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                        >
                            Scan Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScanner;
