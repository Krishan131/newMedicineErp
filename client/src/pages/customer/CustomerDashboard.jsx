import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

const CustomerDashboard = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const mobile = localStorage.getItem('customerMobile');
    const navigate = useNavigate();

    useEffect(() => {
        if (!mobile) {
            navigate('/login');
            return;
        }

        const fetchHistory = async () => {
            try {
                const res = await api.get(`/customer/history/${mobile}`);
                setHistory(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch history", err);
                setError('Failed to load purchase history.');
                setLoading(false);
            }
        };

        fetchHistory();
    }, [mobile, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('customerMobile');
        navigate('/login');
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading history...</div>;

    return (
        <div>
            {/* Simple Navbar for Customer */}
            <nav style={{
                background: 'var(--card-bg)',
                padding: '1rem 2rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    My Purchase History
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{mobile}</span>
                    <button onClick={handleLogout} className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="container" style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.6 }}>
                        <h3>No purchases found.</h3>
                        <p>Visit our partner stores to make your first purchase!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {history.map(invoice => (
                            <div key={invoice._id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            {invoice.soldBy?.shopName || 'Medicine Shop'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                            {new Date(invoice.createdAt).toLocaleDateString()} at {new Date(invoice.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                                            ₹{invoice.totalAmount}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                            {invoice.items.length} Items
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {invoice.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                                            <span>{item.quantity} x {item.name}</span>
                                            <span style={{ opacity: 0.8 }}>₹{item.total}</span>
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

export default CustomerDashboard;
