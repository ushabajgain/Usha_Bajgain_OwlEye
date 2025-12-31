import { useEffect } from 'react';
import { useSafety } from '../context/SafetySocketContext';

/**
 * Accessor for the global SafetySocketContext that syncs the eventId.
 */
export const useSafetySocket = (eventId) => {
    const safety = useSafety();
    
    useEffect(() => {
        if (eventId && safety.updateEventId && safety.eventId !== eventId) {
            safety.updateEventId(eventId);
        }
    }, [eventId, safety.updateEventId, safety.eventId]);

    return safety;
};

