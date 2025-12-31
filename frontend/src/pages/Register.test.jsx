import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
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
    };
});

describe('Registration Tests TC_AUTH_01-TC_AUTH_10', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('TC_AUTH_04: Register with invalid email format', async () => {
        render(<BrowserRouter><Register /></BrowserRouter>);

        fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { name: 'full_name', value: 'Test User' } });
        fireEvent.change(screen.getByPlaceholderText(/john@company.com/i), { target: { name: 'email', value: 'invalid-email' } });
        fireEvent.change(screen.getByPlaceholderText(/98XXXXXXX/i), { target: { name: 'phone_number', value: '9841234567' } });

        const passInputs = screen.getAllByPlaceholderText(/••••••••/i);
        fireEvent.change(passInputs[0], { target: { name: 'password', value: 'Password123!' } });
        fireEvent.change(passInputs[1], { target: { name: 'confirmPassword', value: 'Password123!' } });

        fireEvent.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            const error = screen.queryByText(/Invalid email format/i);
            expect(error).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
