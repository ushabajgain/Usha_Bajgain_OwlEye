import { useEffect, useRef } from 'react';
import { useSafety } from '../context/SafetySocketContext';
import { getUserId } from '../utils/auth';

/**
 * Real-time location tracking hook for OwlEye.
 * 
 * Continuously tracks user GPS position using navigator.geolocation.watchPosition
 * and sends raw location updates via WebSocket every 5-15 seconds.
 * 
 * WebSocket payload format:
 * {
 *   "type": "location_update",
 *   "user_id": <user_id>,
 *   "lat": <latitude>,
 *   "lng": <longitude>,
 *   "timestamp": <unix_timestamp_ms>
 * }
 * 
 * Features:
 * - Continuous GPS monitoring (not one-time fetch)
 * - Throttled updates (5-15 second intervals)
 * - Error handling for permission denial, timeout, etc.
 * - Lightweight payload with raw GPS data only
 * - Automatically reconnects if WebSocket disconnects
 */
export const useLocationTracking = (enabled = true) => {
    const safety = useSafety();
    const watchIdRef = useRef(null);
    const lastSentTimeRef = useRef(0);
    const lastLocationRef = useRef(null);
    const sendTimeoutRef = useRef(null);
    const pendingLocationRef = useRef(null);

    useEffect(() => {
        if (!enabled || !navigator.geolocation) {
            return;
        }

        const userId = getUserId();
        if (!userId) {
            console.warn('[LocationTracking] User ID not available. Skipping location tracking.');
            return;
        }

        const sendLocationUpdate = (latitude, longitude) => {
            // Safety check: WebSocket must be connected
            if (!safety.ws?.current || safety.ws.current.readyState !== WebSocket.OPEN) {
                console.debug('[LocationTracking] WebSocket not ready. Queuing location update.');
                pendingLocationRef.current = { latitude, longitude };
                return;
            }

            const now = Date.now();
            const timestamp = Math.floor(now / 1000); // Unix timestamp in seconds

            // Throttle: Only send if 5+ seconds have passed since last send
            if (now - lastSentTimeRef.current < 5000) {
                console.debug('[LocationTracking] Throttled. Queuing location update.');
                pendingLocationRef.current = { latitude, longitude };

                // Set timeout to send the pending update after throttle window
                if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
                sendTimeoutRef.current = setTimeout(() => {
                    if (pendingLocationRef.current) {
                        sendLocationUpdate(
                            pendingLocationRef.current.latitude,
                            pendingLocationRef.current.longitude
                        );
                    }
                }, 5000);

                return;
            }

            // Prepare raw GPS payload
            const payload = {
                type: 'location_update',
                user_id: parseInt(userId, 10),
                lat: Number(latitude.toFixed(6)),
                lng: Number(longitude.toFixed(6)),
                timestamp: timestamp,
            };

            try {
                safety.ws.current.send(JSON.stringify(payload));
                lastSentTimeRef.current = now;
                lastLocationRef.current = { latitude, longitude, timestamp };
                pendingLocationRef.current = null;

                console.debug('[LocationTracking] Location sent:', {
                    lat: payload.lat,
                    lng: payload.lng,
                    timestamp: payload.timestamp,
                });
            } catch (err) {
                console.error('[LocationTracking] Failed to send location:', err);
                pendingLocationRef.current = { latitude, longitude };
            }
        };

        // Watch position continuously
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendLocationUpdate(latitude, longitude);
            },
            (error) => {
                // Handle geolocation errors gracefully
                let errorMsg = 'Unknown geolocation error';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg =
                            'Location permission denied. Enable GPS in browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'GPS position unavailable. Check GPS hardware.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out. Retrying...';
                        break;
                    default:
                        errorMsg = `Geolocation error: ${error.message}`;
                }

                console.warn('[LocationTracking] Geolocation error:', errorMsg, error);
            },
            {
                enableHighAccuracy: true, // Use GPS instead of IP-based location
                timeout: 15000, // 15 second timeout per request
                maximumAge: 10000, // Use cached position up to 10 seconds old
            }
        );

        watchIdRef.current = watchId;

        // Cleanup: Stop watching position and clear timeouts
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (sendTimeoutRef.current) {
                clearTimeout(sendTimeoutRef.current);
                sendTimeoutRef.current = null;
            }
        };
    }, [enabled, safety]);

    // Return tracking state for UI feedback
    return {
        isTracking: enabled && !!watchIdRef.current,
        lastLocation: lastLocationRef.current,
    };
};
