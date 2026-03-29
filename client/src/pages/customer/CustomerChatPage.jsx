import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';
import CustomerChatbot from '../../components/CustomerChatbot';
import './CustomerDashboard.css';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const CustomerChatPage = () => {
    const { customer, customerLoading, customerLogout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    const handleLogout = () => {
        customerLogout();
        navigate('/login');
    };

    if (customerLoading) {
        return <div className="container customer-dashboard-loading">Loading chat...</div>;
    }

    return (
        <div className="customer-dashboard-page">
            <nav className="customer-dashboard-nav">
                <div className="customer-dashboard-brand">
                    <div className="customer-dashboard-brand-title">Medi Chat</div>
                    <div className="customer-dashboard-brand-subtitle">Ask health, wellness, and medicine-related questions</div>
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
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/reminders')}
                    >
                        Reminders
                    </button>
                    <button
                        className="btn customer-dashboard-tab is-active"
                        onClick={() => navigate('/customer/chat')}
                    >
                        Medi Chat
                    </button>
                </div>

                <CustomerChatbot customerName={customer?.name || ''} />
            </div>
        </div>
    );
};

export default CustomerChatPage;
