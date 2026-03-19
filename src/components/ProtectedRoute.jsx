// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from './ErrorBoundary';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();

    return (
        isAuthenticated ? children : (
            <Navigate to="/login" />
        )
    );
};

export default ProtectedRoute;
