import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import api from '../utils/api';

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
        useSearchParams: () => [new URLSearchParams('uid=test-uid&token=test-token')],
    };
});

describe('Remember Me & Forgot Password Tests (TC_AUTH_45 - TC_AUTH_59)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('TC_AUTH_45: Login with Remember Me checked', async () => {
        api.post.mockResolvedValueOnce({ data: { access: 'token', role: 'attendee' } });
        render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByLabelText(/remember me/i));
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBe('token');
            expect(sessionStorage.getItem('token')).toBeNull();
        });
    });

    it('TC_AUTH_46: Login without Remember Me', async () => {
        api.post.mockResolvedValueOnce({ data: { access: 'token', role: 'attendee' } });
        render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
        // leave remember me unchecked
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(sessionStorage.getItem('token')).toBe('token');
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    it('TC_AUTH_51: Request reset with registered email', async () => {
        api.post.mockResolvedValueOnce({ data: { message: 'email sent' } });
        render(<BrowserRouter><ForgotPassword /></BrowserRouter>);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
        });
    });

    it('TC_AUTH_52: Request reset with unregistered email', async () => {
        api.post.mockRejectedValueOnce({
            response: { data: { detail: 'User not found' } }
        });
        render(<BrowserRouter><ForgotPassword /></BrowserRouter>);

        fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'bad@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(screen.getByText(/User not found/i)).toBeInTheDocument();
        });
    });

    it('TC_AUTH_55: Reset password with valid inputs', async () => {
        api.post.mockResolvedValueOnce({ data: { message: 'success' } });
        window.alert = vi.fn();

        render(<BrowserRouter><ResetPassword /></BrowserRouter>);

        const passInputs = screen.getAllByPlaceholderText(/••••••••/i);
        fireEvent.change(passInputs[0], { target: { value: 'NewPassword123!' } });
        fireEvent.change(passInputs[1], { target: { value: 'NewPassword123!' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/accounts/reset-password/', expect.objectContaining({
                password: 'NewPassword123!',
                uid: 'test-uid',
                token: 'test-token'
            }));
            expect(window.alert).toHaveBeenCalledWith('Password has been reset successfully!');
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('TC_AUTH_56: Reset password with mismatched confirmation', async () => {
        render(<BrowserRouter><ResetPassword /></BrowserRouter>);

        const passInputs = screen.getAllByPlaceholderText(/••••••••/i);
        fireEvent.change(passInputs[0], { target: { value: 'NewPassword123!' } });
        fireEvent.change(passInputs[1], { target: { value: 'WrongPassword!' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
        });
    });
});
