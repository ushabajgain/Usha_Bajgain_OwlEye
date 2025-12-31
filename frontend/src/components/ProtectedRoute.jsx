import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role = localStorage.getItem('role') || sessionStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'admin') return children;

    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === 'organizer') return <Navigate to="/events" replace />;
        return <Navigate to="/events" replace />;
    }

    return children;
};

export default ProtectedRoute;
