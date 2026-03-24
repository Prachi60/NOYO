import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
    (config) => {
        let token = null;
        const url = config.url;
        const pagePath = window.location.pathname;

        // 1. Module-specific pages (Path-based detection)
        if (pagePath.startsWith('/seller')) {
            token = localStorage.getItem('auth_seller');
        } else if (pagePath.startsWith('/admin')) {
            token = localStorage.getItem('auth_admin');
        } else if (pagePath.startsWith('/delivery')) {
            token = localStorage.getItem('auth_delivery');
        } else if (pagePath.startsWith('/customer')) {
            token = localStorage.getItem('auth_customer');
        }

        // 2. URL-based detection (fallback or override for shared APIs)
        if (!token) {
            if (url.includes('/admin')) token = localStorage.getItem('auth_admin');
            else if (url.includes('/seller')) token = localStorage.getItem('auth_seller');
            else if (url.includes('/delivery')) token = localStorage.getItem('auth_delivery');
            else if (url.includes('/customer') || url.includes('/cart') || url.includes('/wishlist') || url.includes('/categories') || url.includes('/products')) {
                token = localStorage.getItem('auth_customer');
            }
        }

        // 3. Last fallback: Check common 'token' key or customer token
        if (!token) {
            token = localStorage.getItem('auth_customer') || localStorage.getItem('token');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Only reload when we had a token that's now invalid (expired/logged out elsewhere).
            // If no token exists, skip reload to avoid infinite loop on public pages.
            const hasToken = ['auth_seller', 'auth_admin', 'auth_delivery', 'auth_customer', 'token'].some(
                (key) => localStorage.getItem(key)
            );
            if (!hasToken) {
                return Promise.reject(error);
            }

            // Clear all possible auth tokens from localStorage
            const storageKeys = ['auth_seller', 'auth_admin', 'auth_delivery', 'auth_customer', 'token'];
            storageKeys.forEach(key => localStorage.removeItem(key));

            // Reload will trigger ProtectedRoute to redirect to proper login page
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
