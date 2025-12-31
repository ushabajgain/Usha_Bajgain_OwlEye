import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ReportIncident from './ReportIncident';
import SOSEmergency from './SOSEmergency';
import api from '../utils/api';

// Mock API
vi.mock('../utils/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock Geolocation
const mockGeolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
};
global.navigator.geolocation = mockGeolocation;

describe('Location & Emergency Services Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for events
        api.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Event' }] });
    });

    it('TC_LOC_01: Fetch current location in Report Incident', async () => {
        const mockPos = {
            coords: {
                latitude: 27.7172,
                longitude: 85.3240,
            },
        };
        mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => success(mockPos));

        render(<BrowserRouter><ReportIncident /></BrowserRouter>);

        const locateBtn = screen.getByText(/Share My Location/i);
        fireEvent.click(locateBtn);

        await waitFor(() => {
            expect(screen.getByText(/Location verified/i)).toBeInTheDocument();
            expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
        });
    });

    it('TC_LOC_02: Submit Incident Report with Location', async () => {
        const mockPos = {
            coords: {
                latitude: 27.7172,
                longitude: 85.3240,
            },
        };
        mockGeolocation.getCurrentPosition.mockImplementation((success) => success(mockPos));
        api.post.mockResolvedValueOnce({ data: { id: 101, status: 'pending' } });

        render(<BrowserRouter><ReportIncident /></BrowserRouter>);

        // Get location first
        fireEvent.click(screen.getByText(/Share My Location/i));
        
        // Fill form
        fireEvent.change(screen.getByPlaceholderText(/Provide more details about the situation/i), { 
            target: { value: 'Someone collapsed near the stage' } 
        });
        
        // Select category (it's "Medical Emergency")
        fireEvent.click(screen.getByText(/Medical Emergency/i));

        const submitBtn = screen.getByRole('button', { name: /Send Report/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/monitoring/incidents/', expect.objectContaining({
                latitude: 27.7172,
                longitude: 85.3240,
                category: 'medical'
            }));
            expect(screen.getByText(/Your report was sent/i)).toBeInTheDocument();
        });
    });

    it('TC_LOC_03: Trigger SOS with Location Services', async () => {
        const mockPos = {
            coords: {
                latitude: 27.7172,
                longitude: 85.3240,
            },
        };
        mockGeolocation.getCurrentPosition.mockImplementation((success) => success(mockPos));
        api.post.mockResolvedValueOnce({ data: { status: 'sent' } });

        render(<BrowserRouter><SOSEmergency /></BrowserRouter>);

        const sosBtn = screen.getByTestId('sos-panic-button');
        fireEvent.click(sosBtn);

        await waitFor(() => {
            expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
            expect(api.post).toHaveBeenCalledWith('/monitoring/sos/', expect.objectContaining({
                latitude: 27.7172,
                longitude: 85.3240,
                sos_type: 'panic'
            }));
            expect(screen.getByText(/Help is on the way/i)).toBeInTheDocument();
        });
    });

    it('TC_LOC_04: Handle Geolocation Timeout/Error', async () => {
        const mockError = { code: 3, message: 'Timeout' };
        // Fail both times (initial and fallback)
        mockGeolocation.getCurrentPosition.mockImplementation((success, error) => error(mockError));

        render(<BrowserRouter><SOSEmergency /></BrowserRouter>);

        const sosBtn = screen.getByTestId('sos-panic-button');
        fireEvent.click(sosBtn);

        await waitFor(() => {
            // Should show error message after fallback failed
            expect(screen.getByText(/GPS connection too weak/i)).toBeInTheDocument();
        });
    });
});
