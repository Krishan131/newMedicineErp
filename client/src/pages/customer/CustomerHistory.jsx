import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';
import { buildCustomerCacheKey, readCustomerCache, writeCustomerCache } from '../../utils/customerCache';
import './CustomerDashboard.css';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const CustomerHistory = () => {
    const { customer, customerLoading, customerLogout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    useEffect(() => {
        if (!customer) return;

        const cacheKey = buildCustomerCacheKey(customer.id, 'history');
        const cachedHistory = readCustomerCache(cacheKey, 5 * 60 * 1000);

        if (cachedHistory && Array.isArray(cachedHistory)) {
            setHistory(cachedHistory);
        }

        const fetchHistory = async () => {
            setLoading(!cachedHistory || !cachedHistory.length);
            setError('');
            try {
                const res = await api.get('/customer/history');
                const nextHistory = res.data || [];
                setHistory(nextHistory);
                writeCustomerCache(cacheKey, nextHistory);
            } catch (err) {
                console.error('Failed to fetch purchase history', err);
                if (!cachedHistory) {
                    setError('Failed to load purchase history.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [customer]);

    const handleLogout = () => {
        customerLogout();
        navigate('/login');
    };

    if (customerLoading) {
        return <div className="container customer-dashboard-loading">Loading history...</div>;
    }

    return (
        <div className="customer-dashboard-page">
            <nav className="customer-dashboard-nav">
                <div className="customer-dashboard-brand">
                    <div className="customer-dashboard-brand-title">Purchase History</div>
                    <div className="customer-dashboard-brand-subtitle">All your previous medicine purchases in one place</div>
                </div>
                <div className="customer-dashboard-actions">
                    <button
                        type="button"
                        className="customer-dashboard-user-chip customer-dashboard-profile-trigger"
                        onClick={() => navigate('/customer/profile')}
                        title="Open profile"
                    >
                        <div className="customer-dashboard-avatar">{getInitials(customer?.name || '')}</div>
                        <div className="customer-dashboard-user-meta">
                            <div className="customer-dashboard-user-label">Profile</div>
                            <div className="customer-dashboard-user-name">{customer?.name || 'Customer'}</div>
                        </div>
                    </button>
                    <button
                        className="btn customer-dashboard-toolbar-btn customer-dashboard-theme-btn"
                        onClick={toggleTheme}
                        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        title="Toggle light/dark mode"
                    >
                        {isDarkMode ? '🌞' : '🌙'}
                    </button>
                    <button onClick={handleLogout} className="btn-danger customer-dashboard-logout-btn">
                        Logout
                    </button>
                </div>
            </nav>

            <div className="container customer-dashboard-container">
                {error && <div className="customer-dashboard-alert is-error">{error}</div>}

                <div className="customer-dashboard-tabs" role="tablist" aria-label="Customer portal pages">
                    <button
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/dashboard')}
                    >
                        Search & Results
                    </button>
                    <button
                        className="btn customer-dashboard-tab is-active"
                        onClick={() => navigate('/customer/history')}
                    >
                        Purchase History
                    </button>
                    <button
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/reminders')}
                    >
                        Reminders
                    </button>
                    <button
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/chat')}
                    >
                        Medi Chat
                    </button>
                </div>

                {loading && history.length === 0 ? (
                    <div className="customer-dashboard-empty">
                        <h3>Loading purchase history...</h3>
                        <p>Please wait a moment.</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="customer-dashboard-empty">
                        <h3>No purchases found.</h3>
                        <p>Make your first purchase to see history here.</p>
                    </div>
                ) : (
                    <div className="customer-dashboard-history-list">
                        {history.map((invoice) => (
                            <div key={invoice._id} className="card customer-dashboard-history-card">
                                <div className="customer-dashboard-history-head">
                                    <div>
                                        <div className="customer-dashboard-shop-name">
                                            {invoice.soldBy?.shopName || 'Medicine Shop'}
                                        </div>
                                        <div className="customer-dashboard-shop-meta">
                                            {new Date(invoice.createdAt).toLocaleDateString()} at {new Date(invoice.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div className="customer-dashboard-amount-wrap">
                                        <div className="customer-dashboard-amount">₹{invoice.totalAmount}</div>
                                        <div className="customer-dashboard-items-count">{invoice.items.length} Items</div>
                                    </div>
                                </div>

                                <div>
                                    {invoice.items.map((item, idx) => (
                                        <div key={idx} className="customer-dashboard-item-row">
                                            <span>{item.quantity} x {item.name}</span>
                                            <span className="customer-dashboard-item-price">₹{item.total}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerHistory;
