/**
 * DEPRECATED: Use useLocationTracking instead
 * 
 * This hook has been consolidated into useLocationTracking which provides:
 * - Continuous GPS tracking with watchPosition
 * - Proper throttling and error handling
 * - WebSocket timestamp validation
 * - Battery status reporting
 * 
 * Migration:
 * OLD: const { ws } = useCrowdTracking(eventId);
 * NEW: useLocationTracking(enabled = true); // Sends via existing WebSocket connection
 * 
 * The canonical location flow is now:
 * GPS → useLocationTracking → WebSocket → Backend Consumer → Redis → SOS/Incident
 */

export const useCrowdTracking = (eventId) => {
    console.warn(
        '[useCrowdTracking] DEPRECATED: Use useLocationTracking() instead. ' +
        'See frontend/src/hooks/useCrowdTracking.js for migration guide.'
    );
    
    return {
        deprecated: true,
        message: 'Use useLocationTracking instead',
        ws: { current: null }
    };
};
