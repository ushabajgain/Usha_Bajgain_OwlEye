import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const MockPage = ({ title }) => <div>{title}</div>;

describe('ProtectedRoute Tests (TC_AUTH_25 - TC_AUTH_29)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('TC_AUTH_25: Access protected page with valid token', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'attendee');

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/protected" element={
                        <ProtectedRoute>
                            <MockPage title="Protected Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
    });

    it('TC_AUTH_26: Access protected page without token', () => {
        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/login" element={<MockPage title="Login Page" />} />
                    <Route path="/protected" element={
                        <ProtectedRoute>
                            <MockPage title="Protected Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
        expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
    });

    it('TC_AUTH_27: Access organizer page as attendee', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'attendee');

        render(
            <MemoryRouter initialEntries={['/organizer']}>
                <Routes>
                    <Route path="/events" element={<MockPage title="Events Feed" />} />
                    <Route path="/organizer" element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                            <MockPage title="Organizer Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Events Feed/i)).toBeInTheDocument();
        expect(screen.queryByText(/Organizer Content/i)).not.toBeInTheDocument();
    });

    it('TC_AUTH_28: Access admin page as organizer', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'organizer');

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route path="/organizer/dashboard" element={<MockPage title="Organizer Dashboard" />} />
                    <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <MockPage title="Admin Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Organizer Dashboard/i)).toBeInTheDocument();
        expect(screen.queryByText(/Admin Content/i)).not.toBeInTheDocument();
    });

    it('TC_AUTH_29: Access event dashboard as organizer', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'organizer');

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                            <MockPage title="Dashboard Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Dashboard Content/i)).toBeInTheDocument();
    });

    it('TC_AUTH_30: Organizer accesses create event page (Allowed)', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'organizer');

        render(
            <MemoryRouter initialEntries={['/create-event']}>
                <Routes>
                    <Route path="/create-event" element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                            <MockPage title="Create Event Page" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Create Event Page/i)).toBeInTheDocument();
    });

    it('TC_AUTH_31: Attendee attempts event creation (Denied)', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'attendee');

        render(
            <MemoryRouter initialEntries={['/create-event']}>
                <Routes>
                    <Route path="/events" element={<MockPage title="Events Feed" />} />
                    <Route path="/create-event" element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                            <MockPage title="Create Event Page" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Events Feed/i)).toBeInTheDocument();
        expect(screen.queryByText(/Create Event Page/i)).not.toBeInTheDocument();
    });

    it('TC_AUTH_32: Volunteer attempts admin page (Denied)', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'volunteer');

        render(
            <MemoryRouter initialEntries={['/admin-panel']}>
                <Routes>
                    <Route path="/events" element={<MockPage title="Events Feed" />} />
                    <Route path="/admin-panel" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <MockPage title="Admin Panel" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Events Feed/i)).toBeInTheDocument();
        expect(screen.queryByText(/Admin Panel/i)).not.toBeInTheDocument();
    });

    it('TC_AUTH_33: Admin accesses all pages (Allowed)', () => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('role', 'admin');

        render(
            <MemoryRouter initialEntries={['/restricted-page']}>
                <Routes>
                    <Route path="/restricted-page" element={
                        <ProtectedRoute allowedRoles={['volunteer']}>
                            <MockPage title="Restricted Content" />
                        </ProtectedRoute>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Restricted Content/i)).toBeInTheDocument();
    });
});
