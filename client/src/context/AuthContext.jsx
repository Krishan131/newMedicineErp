import React, { createContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext();

const safeParse = (value) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customerLoading, setCustomerLoading] = useState(true);

    useEffect(() => {
        const loadAuthState = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const storedUser = safeParse(localStorage.getItem('user'));
                    if (storedUser) setUser(storedUser);
                } catch (error) {
                    console.error("Auth Error", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }

            setLoading(false);

            const customerToken = localStorage.getItem('customerToken');
            if (customerToken) {
                try {
                    const storedCustomer = safeParse(localStorage.getItem('customer'));
                    if (storedCustomer) setCustomer(storedCustomer);
                } catch (error) {
                    console.error('Customer Auth Error', error);
                    localStorage.removeItem('customerToken');
                    localStorage.removeItem('customer');
                }
            }

            setCustomerLoading(false);
        };

        loadAuthState();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                msg: error.response?.data?.msg || 'Login failed'
            };
        }
    };

    const register = async (username, email, password, shopName) => {
        try {
            const res = await api.post('/auth/register', { username, email, password, shopName });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                msg: error.response?.data?.msg || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const setUserProfile = (profile, token) => {
        if (token) {
            localStorage.setItem('token', token);
        }

        localStorage.setItem('user', JSON.stringify(profile));
        setUser(profile);
    };

    const customerLogin = async (name, phone, password) => {
        try {
            const res = await api.post('/customer/login', { name, phone, password });
            localStorage.setItem('customerToken', res.data.token);
            localStorage.setItem('customer', JSON.stringify(res.data.customer));
            setCustomer(res.data.customer);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                msg: error.response?.data?.msg || 'Customer login failed'
            };
        }
    };

    const customerRegister = async (name, phone, password, email) => {
        try {
            const payload = { name, phone, password };
            if (email) {
                payload.email = email;
            }

            const res = await api.post('/customer/register', payload);
            localStorage.setItem('customerToken', res.data.token);
            localStorage.setItem('customer', JSON.stringify(res.data.customer));
            setCustomer(res.data.customer);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                msg: error.response?.data?.msg || 'Customer registration failed'
            };
        }
    };

    const customerLogout = () => {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        setCustomer(null);
    };

    const setCustomerProfile = (profile, token) => {
        if (token) {
            localStorage.setItem('customerToken', token);
        }

        localStorage.setItem('customer', JSON.stringify(profile));
        setCustomer(profile);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                register,
                logout,
                setUserProfile,
                loading,
                customer,
                customerLoading,
                customerLogin,
                customerRegister,
                customerLogout,
                setCustomerProfile
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
