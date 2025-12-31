import { renderHook, waitFor } from '@testing-library/react';
import { useLocationTracking } from './useLocationTracking';
import { SafetySocketProvider } from '../context/SafetySocketContext';
import * as authUtils from '../utils/auth';

// Mock navigator.geolocation
const mockGeolocation = {
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
});

// Mock auth utilities
jest.mock('../utils/auth', () => ({
    getUserId: jest.fn(() => '12345'),
    getToken: jest.fn(() => 'mock-token'),
}));

describe('useLocationTracking', () => {
    let mockWebSocket;
    let watchPositionCallback;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup WebSocket mock
        mockWebSocket = {
            send: jest.fn(),
            close: jest.fn(),
            readyState: WebSocket.OPEN,
        };

        global.WebSocket = jest.fn(() => mockWebSocket);

        // Setup geolocation mock
        mockGeolocation.watchPosition.mockImplementation((successCallback) => {
            watchPositionCallback = successCallback;
            return 12345; // watchId
        });

        // Mock Date.now()
        jest.spyOn(Date, 'now').mockReturnValue(1707465600000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should initialize and call watchPosition when enabled', () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('should not call watchPosition when disabled', () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(false), { wrapper });

        expect(mockGeolocation.watchPosition).not.toHaveBeenCalled();
    });

    it('should send location with correct payload format', async () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        const { result } = renderHook(() => useLocationTracking(true), { wrapper });

        // Simulate position update
        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
                accuracy: 10,
            },
            timestamp: 1707465600000,
        });

        await waitFor(() => {
            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        const sentPayload = JSON.parse(mockWebSocket.send.mock.calls[0][0]);

        expect(sentPayload).toEqual({
            type: 'location_update',
            user_id: 12345,
            lat: 40.712776,
            lng: -74.005974,
            timestamp: 1707465600,
        });
    });

    it('should throttle updates to 5 second minimum', async () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        // First update
        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
            },
            timestamp: 1707465600000,
        });

        await waitFor(() => expect(mockWebSocket.send).toHaveBeenCalledTimes(1));

        // Second update immediately after (should be throttled)
        jest.spyOn(Date, 'now').mockReturnValue(1707465602000); // 2 seconds later
        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
            },
            timestamp: 1707465602000,
        });

        // Should still be 1 call (throttled)
        expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });

    it('should send after throttle window expires', async () => {
        jest.useFakeTimers();

        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        // First update
        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
            },
            timestamp: 1707465600000,
        });

        expect(mockWebSocket.send).toHaveBeenCalledTimes(1);

        // Second update immediately (throttled)
        watchPositionCallback({
            coords: {
                latitude: 40.712777,
                longitude: -74.005975,
            },
            timestamp: 1707465602000,
        });

        expect(mockWebSocket.send).toHaveBeenCalledTimes(1);

        // Fast forward 5+ seconds
        jest.advanceTimersByTime(5100);

        // Pending location should be sent
        expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

        jest.useRealTimers();
    });

    it('should handle geolocation errors gracefully', async () => {
        const mockCallback = jest.fn();
        mockGeolocation.watchPosition.mockImplementation((success, error) => {
            // Call error callback
            error({
                code: 1, // PERMISSION_DENIED
                message: 'User denied geolocation',
            });
            return 12345;
        });

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        await waitFor(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[LocationTracking] Geolocation error'),
                expect.anything(),
                expect.anything()
            );
        });

        consoleWarnSpy.mockRestore();
    });

    it('should cleanup on unmount', () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        const { unmount } = renderHook(() => useLocationTracking(true), { wrapper });

        unmount();

        expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(12345);
    });

    it('should return tracking state', () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        const { result } = renderHook(() => useLocationTracking(true), { wrapper });

        expect(result.current).toHaveProperty('isTracking');
        expect(result.current).toHaveProperty('lastLocation');
        expect(typeof result.current.isTracking).toBe('boolean');
    });

    it('should queue location when WebSocket is not ready', async () => {
        mockWebSocket.readyState = WebSocket.CONNECTING;

        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

        renderHook(() => useLocationTracking(true), { wrapper });

        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
            },
            timestamp: 1707465600000,
        });

        expect(consoleDebugSpy).toHaveBeenCalledWith(
            expect.stringContaining('WebSocket not ready')
        );
        expect(mockWebSocket.send).not.toHaveBeenCalled();

        consoleDebugSpy.mockRestore();
    });

    it('should skip tracking if user not authenticated', () => {
        authUtils.getUserId.mockReturnValue(null);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('User ID not available')
        );

        consoleWarnSpy.mockRestore();
    });

    it('should round latitude and longitude to 6 decimals', async () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        renderHook(() => useLocationTracking(true), { wrapper });

        watchPositionCallback({
            coords: {
                latitude: 40.7127762123456,
                longitude: -74.0059741234567,
            },
            timestamp: 1707465600000,
        });

        await waitFor(() => {
            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        const sentPayload = JSON.parse(mockWebSocket.send.mock.calls[0][0]);

        expect(sentPayload.lat).toEqual(40.712776);
        expect(sentPayload.lng).toEqual(-74.005974);
    });

    it('should update lastLocation when successfully sent', async () => {
        const wrapper = ({ children }) => (
            <SafetySocketProvider>{children}</SafetySocketProvider>
        );

        const { result } = renderHook(() => useLocationTracking(true), { wrapper });

        watchPositionCallback({
            coords: {
                latitude: 40.712776,
                longitude: -74.005974,
            },
            timestamp: 1707465600000,
        });

        await waitFor(() => {
            expect(result.current.lastLocation).not.toBeNull();
        });

        expect(result.current.lastLocation).toEqual({
            latitude: 40.712776,
            longitude: -74.005974,
            timestamp: 1707465600,
        });
    });
});
