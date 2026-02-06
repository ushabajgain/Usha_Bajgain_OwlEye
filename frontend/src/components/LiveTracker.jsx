import { useEffect, useRef } from "react";

const LiveTracker = ({ eventId, isActive }) => {
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!isActive || !eventId) return;

        // 1. Establish WebSocket Connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host.replace('5173', '8000')}/ws/track/${eventId}/`;
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            console.log("Location tracking connected");

            // 2. Start Geolocation Watch
            if ("geolocation" in navigator) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        if (socketRef.current.readyState === WebSocket.OPEN) {
                            socketRef.current.send(JSON.stringify({
                                lat: latitude,
                                lng: longitude
                            }));
                        }
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 5000,
                        timeout: 10000
                    }
                );
            }
        };

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (socketRef.current) socketRef.current.close();
        };
    }, [eventId, isActive]);

    return null; // Invisible component
};

export default LiveTracker;
