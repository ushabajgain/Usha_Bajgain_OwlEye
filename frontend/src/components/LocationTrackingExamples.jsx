/**
 * Example Usage Patterns for Location Tracking Hook
 * 
 * This file demonstrates various ways to use the useLocationTracking hook
 * in real application components.
 */

import React from 'react';
import { LocationTrackingProvider } from './LocationTrackingProvider';

/**
 * Add to your main app layout - that's it!
 */
export function AppWithAutoTracking() {
    return (
        <div>
            <LocationTrackingProvider />
            {/* App content */}
        </div>
    );
}

import { LocationTrackingStatus } from './LocationTrackingProvider';

export function AppWithTrackingStatus() {
    return (
        <div>
            {/* Floating status indicator */}
            <div style={{
                position: 'fixed',
                top: 10,
                right: 10,
                zIndex: 9999
            }}>
                <LocationTrackingStatus />
            </div>
            
            {/* Auto tracking in background */}
            <LocationTrackingProvider />
            {/* App content */}
        </div>
    );
}

import { useLocationTracking } from '../hooks/useLocationTracking';

export function LocationDisplay() {
    const { isTracking, lastLocation } = useLocationTracking(true);

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc' }}>
            <h3>Location Tracking</h3>
            <p>Status: {isTracking ? 'Active' : 'Inactive'}</p>
            
            {lastLocation && (
                <div>
                    <p>Latitude: {lastLocation.latitude.toFixed(6)}</p>
                    <p>Longitude: {lastLocation.longitude.toFixed(6)}</p>
                    <p>Last Update: {new Date(lastLocation.timestamp * 1000).toLocaleTimeString()}</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// Example 4: Conditional Tracking (Toggle)
// ============================================

export function ToggleableTracking() {
    const [trackingEnabled, setTrackingEnabled] = React.useState(true);
    const { isTracking, lastLocation } = useLocationTracking(trackingEnabled);

    return (
        <div>
            <button 
                onClick={() => setTrackingEnabled(!trackingEnabled)}
                style={{
                    padding: '10px 20px',
                    backgroundColor: trackingEnabled ? '#4CAF50' : '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                {trackingEnabled ? 'Stop' : 'Start'} Tracking
            </button>

            {trackingEnabled && lastLocation && (
                <p>
                    Last location: {lastLocation.latitude}, {lastLocation.longitude}
                </p>
            )}
        </div>
    );
}

// ============================================
// Example 5: With Custom Error Display
// ============================================

export function TrackingWithErrorHandling() {
    const [trackingEnabled, setTrackingEnabled] = React.useState(true);
    const [error, setError] = React.useState(null);
    const { isTracking, lastLocation } = useLocationTracking(trackingEnabled);

    React.useEffect(() => {
        // Listen for geolocation errors (logged to console)
        const handleError = (event) => {
            if (event.detail?.includes('permission denied')) {
                setError('Location permission required');
            } else if (event.detail?.includes('unavailable')) {
                setError('GPS unavailable');
            } else if (event.detail?.includes('timeout')) {
                setError('Location request timed out');
            }
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    return (
        <div>
            {error && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    marginBottom: '10px'
                }}>
                    {error}
                </div>
            )}

            <button onClick={() => setTrackingEnabled(!trackingEnabled)}>
                {trackingEnabled ? 'Pause' : 'Resume'} Tracking
            </button>

            {isTracking && (
                <p>✓ Location tracking active</p>
            )}
        </div>
    );
}

// ============================================
// Example 6: Dashboard Panel
// ============================================

export function LocationTrackingDashboard() {
    const { isTracking, lastLocation } = useLocationTracking(true);

    const getUpdateAge = () => {
        if (!lastLocation) return 'Never';
        const ageSeconds = Math.floor(Date.now() / 1000) - lastLocation.timestamp;
        if (ageSeconds < 60) return `${ageSeconds}s ago`;
        return `${Math.floor(ageSeconds / 60)}m ago`;
    };

    return (
        <div style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '300px'
        }}>
            <h3>Location Tracking</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <strong>Status:</strong>
                <div style={{
                    marginTop: '5px',
                    padding: '5px 10px',
                    backgroundColor: isTracking ? '#c8e6c9' : '#ffcccc',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
                </div>
            </div>

            {lastLocation && (
                <>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Latitude:</strong>
                        <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                            {lastLocation.latitude.toFixed(6)}
                        </p>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <strong>Longitude:</strong>
                        <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                            {lastLocation.longitude.toFixed(6)}
                        </p>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <strong>Last Update:</strong>
                        <p style={{ margin: '5px 0', fontSize: '12px' }}>
                            {getUpdateAge()}
                        </p>
                    </div>

                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        paddingTop: '10px',
                        borderTop: '1px solid #ddd'
                    }}>
                        Updates sent: Every 5-15 seconds
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// Example 7: Attendee Event View
// ============================================

import { useSafety } from '../context/SafetySocketContext';

export function EventAttendeeView() {
    const { isConnected } = useSafety();
    const { isTracking, lastLocation } = useLocationTracking(true);

    return (
        <div>
            <h2>You're Registered for Event</h2>
            
            <div style={{
                padding: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                marginBottom: '20px'
            }}>
                <strong>Live Tracking Status:</strong>
                <ul style={{ margin: '10px 0' }}>
                    <li>
                        WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
                    </li>
                    <li>
                        GPS Tracking: {isTracking ? 'Active' : 'Inactive'}
                    </li>
                    <li>
                        Location Permission: {lastLocation ? '✓ Granted' : '⏳ Pending'}
                    </li>
                </ul>
            </div>

            <p>Your location is being shared with event organizers for safety purposes.</p>
        </div>
    );
}

// ============================================
// Example 8: Volunteer Tracking
// ============================================

export function VolunteerLocationTracking() {
    const [dutyActive, setDutyActive] = React.useState(false);
    const { isTracking, lastLocation } = useLocationTracking(dutyActive);

    return (
        <div style={{
            padding: '20px',
            backgroundColor: dutyActive ? '#fff3cd' : '#f8f9fa',
            borderRadius: '8px'
        }}>
            <h3>🚨 Volunteer Status</h3>

            <button
                onClick={() => setDutyActive(!dutyActive)}
                style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: dutyActive ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '15px'
                }}
            >
                {dutyActive ? 'End Duty' : 'Start Duty'}
            </button>

            {dutyActive && (
                <>
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#d4edda',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}>
                        ✓ Your location is being tracked
                    </div>

                    {lastLocation && (
                        <div style={{ fontSize: '12px', color: '#555' }}>
                            <p>Last location update: {getUpdateAge()}</p>
                            <p>Accuracy: High (GPS)</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============================================
// Example 9: Settings Page Integration
// ============================================

export function LocationTrackingSettings() {
    const [trackingEnabled, setTrackingEnabled] = React.useState(
        localStorage.getItem('location_tracking_enabled') !== 'false'
    );

    const handleChange = (enabled) => {
        setTrackingEnabled(enabled);
        localStorage.setItem('location_tracking_enabled', enabled ? 'true' : 'false');
    };

    const { isTracking } = useLocationTracking(trackingEnabled);

    return (
        <div style={{ maxWidth: '400px' }}>
            <h3>Privacy Settings</h3>

            <div style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '15px'
            }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        checked={trackingEnabled}
                        onChange={(e) => handleChange(e.target.checked)}
                        style={{ marginRight: '10px' }}
                    />
                    <span>Enable location tracking for this event</span>
                </label>
                
                <p style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    Your location will be shared with event organizers for safety purposes.
                </p>
            </div>

            {trackingEnabled && isTracking && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    ✓ Location tracking is active. Your coordinates are updated every 5-15 seconds.
                </div>
            )}
        </div>
    );
}

// ============================================
// Helper function for age calculation
// ============================================

function getUpdateAge(lastLocation) {
    if (!lastLocation) return 'Never';
    const ageSeconds = Math.floor(Date.now() / 1000) - lastLocation.timestamp;
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
    return `${Math.floor(ageSeconds / 3600)}h ago`;
}

export default {
    AppWithAutoTracking,
    AppWithTrackingStatus,
    LocationDisplay,
    ToggleableTracking,
    TrackingWithErrorHandling,
    LocationTrackingDashboard,
    EventAttendeeView,
    VolunteerLocationTracking,
    LocationTrackingSettings
};
