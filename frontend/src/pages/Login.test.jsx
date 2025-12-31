import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import api from '../utils/api';

// Mock the API and Router
vi.mock('../utils/api', () => ({
    default: {
        post: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Login Tests (TC_AUTH_11 - TC_AUTH_17)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('TC_AUTH_11: Login with correct credentials', async () => {
        const mockData = {
            access: 'mock-access-token',
            refresh: 'mock-refresh-token',
            role: 'attendee',
            id: '123',
            full_name: 'John Doe'
        };
        api.post.mockResolvedValueOnce({ data: mockData });

        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/accounts/login/', {
                email: 'test@example.com',
                password: 'password123'
            });
            expect(localStorage.getItem('token')).toBe('mock-access-token');
            expect(localStorage.getItem('role')).toBe('attendee');
            expect(mockNavigate).toHaveBeenCalledWith('/events');
        });
    });

    it('TC_AUTH_12: Login with incorrect password', async () => {
        api.post.mockRejectedValueOnce({
            response: { data: { detail: 'No active account found with the given credentials' } }
        });

        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrongpassword' } });

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/No active account found with the given credentials/i)).toBeInTheDocument();
    });

    it('TC_AUTH_13: Login with unregistered email', async () => {
        api.post.mockRejectedValueOnce({
            response: { data: { detail: 'User not found' } }
        });

        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'nonexistent@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'anypassword' } });

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/User not found/i)).toBeInTheDocument();
    });

    it('TC_AUTH_14: Login with empty email', async () => {
        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'anypassword' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    });

    it('TC_AUTH_15: Login with empty password', async () => {
        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
    });

    it('TC_AUTH_16: Login with invalid email format', async () => {
        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'invalid-email' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/Invalid email format/i)).toBeInTheDocument();
    });

    it('TC_AUTH_17: Login API failure', async () => {
        api.post.mockRejectedValueOnce(new Error('Network Error'));

        renderWithRouter(<Login />);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
    });
});
