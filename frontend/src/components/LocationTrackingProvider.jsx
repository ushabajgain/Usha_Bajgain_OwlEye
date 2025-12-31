import React from 'react';
import { useLocationTracking } from '../hooks/useLocationTracking';

/**
 * LocationTrackingProvider Component
 * 
 * Wraps location tracking functionality and can be added to the app layout.
 * Automatically starts tracking when user is authenticated and WebSocket is connected.
 * 
 * Usage:
 * Add to your main app layout (e.g., inside SafetySocketProvider):
 * 
 * <SafetySocketProvider>
 *   <LocationTrackingProvider />
 *   {/* Rest of app */}
 * </SafetySocketProvider>
 */
export const LocationTrackingProvider = ({ children = null }) => {
    // Start location tracking automatically
    // Pass enabled=true to continuously track
    const { isTracking, lastLocation } = useLocationTracking(true);

    // This component can optionally render children or just provide tracking
    if (children) {
        return <>{children}</>;
    }

    return null; // No UI output, just provides tracking in background
};

/**
 * LocationTrackingStatus Component
 * 
 * Optional UI component to display tracking status for debugging/user feedback.
 * 
 * Usage:
 * <LocationTrackingStatus />
 */
export const LocationTrackingStatus = () => {
    const { isTracking, lastLocation } = useLocationTracking(true);

    return (
        <div style={{
            padding: '8px 12px',
            backgroundColor: isTracking ? '#d4edda' : '#f8d7da',
            border: `1px solid ${isTracking ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            fontSize: '12px',
            color: isTracking ? '#155724' : '#721c24',
        }}>
            {isTracking ? '📍 Location tracking active' : '❌ Location tracking inactive'}
            {lastLocation && (
                <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.8 }}>
                    Last: {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
                </div>
            )}
        </div>
    );
};
