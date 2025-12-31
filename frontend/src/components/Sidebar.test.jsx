import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('Sidebar Logout Tests (TC_AUTH_23)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('TC_AUTH_23: Token removed on logout', async () => {
        localStorage.setItem('token', 'active-token');
        localStorage.setItem('role', 'attendee');

        render(<BrowserRouter><Sidebar /></BrowserRouter>);

        const logoutBtn = screen.getByText(/Log Out/i);
        fireEvent.click(logoutBtn);

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('role')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});
