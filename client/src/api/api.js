import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to add token
api.interceptors.request.use(
    (config) => {
        config.headers = config.headers || {};
        delete config.headers['x-auth-token'];
        delete config.headers['x-customer-token'];

        const requestUrl = config.url || '';
        const isCustomerApi = requestUrl.startsWith('/customer');

        if (isCustomerApi) {
            const customerToken = localStorage.getItem('customerToken');
            if (customerToken) {
                config.headers['x-customer-token'] = customerToken;
            }
        } else {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers['x-auth-token'] = token;
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
