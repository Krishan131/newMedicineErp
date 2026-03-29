import React, { createContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Ideally create a route to get user data from token or just decode if client-side enough
                    // For now, we will rely on successful calls or assume valid if token exists 
                    // But strictly we should hit an endpoint like /auth/user.
                    // Since we didn't build /auth/user, we'll store user info on login in localstorage too or just decode.
                    // Let's just store simple user object for now from login.
                    const storedUser = JSON.parse(localStorage.getItem('user'));
                    if (storedUser) setUser(storedUser);
                } catch (error) {
                    console.error("Auth Error", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        loadUser();
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

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
