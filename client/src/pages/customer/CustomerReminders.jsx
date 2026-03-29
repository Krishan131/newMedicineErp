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

const getStatusClass = (status) => {
    if (status === 'expired') return 'is-expired';
    if (status === 'expiring-soon') return 'is-expiring';
    return 'is-safe';
};

const getStatusLabel = (reminder) => {
    if (reminder.status === 'expiring-soon') {
        return `Expiring Soon (${reminder.daysLeft} days left)`;
    }

    if (reminder.status === 'expired') {
        return `Expired (${Math.abs(reminder.daysLeft)} days ago)`;
    }

    return `Safe (${reminder.daysLeft} days left)`;
};

const CustomerReminders = () => {
    const { customer, customerLoading, customerLogout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [reminders, setReminders] = useState([]);
    const [thresholdDays, setThresholdDays] = useState(15);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [consumingKey, setConsumingKey] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    useEffect(() => {
        if (!customer) return;

        const cacheKey = buildCustomerCacheKey(customer.id, 'reminders');
        const cachedReminderPayload = readCustomerCache(cacheKey, 5 * 60 * 1000);

        if (cachedReminderPayload) {
            setReminders(cachedReminderPayload.reminders || []);
            setThresholdDays(cachedReminderPayload.thresholdDays || 15);
        }

        const fetchReminders = async () => {
            setLoading(!cachedReminderPayload || !(cachedReminderPayload.reminders || []).length);
            setError('');
            try {
                const res = await api.get('/customer/reminders');
                const payload = {
                    thresholdDays: res.data.thresholdDays || 15,
                    reminders: res.data.reminders || []
                };

                setThresholdDays(payload.thresholdDays);
                setReminders(payload.reminders);
                writeCustomerCache(cacheKey, payload);
            } catch (err) {
                console.error('Failed to fetch reminders', err);
                if (!cachedReminderPayload) {
                    setError('Failed to load reminders.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchReminders();
    }, [customer]);

    const handleLogout = () => {
        customerLogout();
        navigate('/login');
    };

    const handleMarkConsumed = async (saleId, itemIndex, itemKey) => {
        try {
            setConsumingKey(itemKey);
            await api.patch('/customer/reminders/consume', { saleId, itemIndex });
            setReminders((prev) => {
                const next = prev.filter((item) => item.itemKey !== itemKey);

                if (customer?.id) {
                    writeCustomerCache(buildCustomerCacheKey(customer.id, 'reminders'), {
                        thresholdDays,
                        reminders: next
                    });
                }

                return next;
            });
        } catch (err) {
            console.error('Failed to mark reminder as consumed', err);
            alert(err.response?.data?.msg || 'Failed to mark reminder as consumed');
        } finally {
            setConsumingKey('');
        }
    };

    if (customerLoading) {
        return <div className="container customer-dashboard-loading">Loading reminders...</div>;
    }

    return (
        <div className="customer-dashboard-page">
            <nav className="customer-dashboard-nav">
                <div className="customer-dashboard-brand">
                    <div className="customer-dashboard-brand-title">Medicine Reminders</div>
                    <div className="customer-dashboard-brand-subtitle">Track active reminders and mark consumed items</div>
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
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/history')}
                    >
                        Purchase History
                    </button>
                    <button
                        className="btn customer-dashboard-tab is-active"
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

                {loading && reminders.length === 0 ? (
                    <div className="customer-dashboard-empty">
                        <h3>Loading reminders...</h3>
                        <p>Please wait a moment.</p>
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="customer-dashboard-empty">
                        <h3>No active reminders.</h3>
                        <p>You are all set for now.</p>
                    </div>
                ) : (
                    <div className="customer-dashboard-reminder-list">
                        <div className="customer-dashboard-panel-subtitle">Expiring soon threshold: {thresholdDays} days</div>
                        {reminders.map((reminder) => (
                            <div key={reminder.itemKey} className="card customer-dashboard-reminder-card">
                                <div className="customer-dashboard-reminder-head">
                                    <h4>{reminder.medicineName}</h4>
                                    <span className={`customer-dashboard-status ${getStatusClass(reminder.status)}`}>
                                        {getStatusLabel(reminder)}
                                    </span>
                                </div>

                                <div className="customer-dashboard-reminder-grid">
                                    <div><strong>Quantity:</strong> {reminder.quantity}</div>
                                    <div><strong>Purchased:</strong> {new Date(reminder.purchaseDate).toLocaleDateString()}</div>
                                    <div><strong>Expiry:</strong> {new Date(reminder.expiryDate).toLocaleDateString()}</div>
                                    <div><strong>Shop:</strong> {reminder.shopName}</div>
                                </div>

                                <button
                                    className="btn btn-success customer-dashboard-reminder-action"
                                    onClick={() => handleMarkConsumed(reminder.saleId, reminder.itemIndex, reminder.itemKey)}
                                    disabled={consumingKey === reminder.itemKey}
                                >
                                    {consumingKey === reminder.itemKey ? 'Saving...' : 'Mark as consumed'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerReminders;
