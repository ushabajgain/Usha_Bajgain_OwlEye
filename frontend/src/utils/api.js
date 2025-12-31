import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
});

// Interceptor to add token to headers
api.interceptors.request.use((config) => {
    const noAuthEndpoints = [
        '/accounts/login/',
        '/accounts/register/',
        '/accounts/forgot-password/',
        '/accounts/reset-password/'
    ];

    const needsAuth = !noAuthEndpoints.some(endpoint => config.url && config.url.includes(endpoint));

    if (needsAuth) {
        // Prefer sessionStorage (active session) over localStorage (persistent data)
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (err) => {
    return Promise.reject(err);
});

// Interceptor to handle global 401 Unauthorized responses
api.interceptors.response.use((response) => {
    return response;
}, (err) => {
    if (err.response && err.response.status === 401) {
        localStorage.clear();
        sessionStorage.clear();
        // Avoid redirect loop if we are already on the login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
        }
    }
    return Promise.reject(err);
});


export default api;
