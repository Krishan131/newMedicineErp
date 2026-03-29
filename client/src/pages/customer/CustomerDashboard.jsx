import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const CustomerDashboard = () => {
    const { customer, customerLoading, customerLogout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [activeTab, setActiveTab] = useState('history');
    const [history, setHistory] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [thresholdDays, setThresholdDays] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchRadiusKm, setSearchRadiusKm] = useState(5);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [locationState, setLocationState] = useState({
        isLocationEnabled: false,
        location: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [consumingKey, setConsumingKey] = useState('');
    const navigate = useNavigate();

    const fetchHistory = async () => {
        const res = await api.get('/customer/history');
        setHistory(res.data);
    };

    const fetchReminders = async () => {
        const res = await api.get('/customer/reminders');
        setThresholdDays(res.data.thresholdDays || 15);
        setReminders(res.data.reminders || []);
    };

    const fetchCustomerLocationState = async () => {
        const res = await api.get('/customer/me');
        setLocationState({
            isLocationEnabled: !!res.data.customer?.isLocationEnabled,
            location: res.data.customer?.location || null
        });
    };

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    useEffect(() => {
        if (!customer) return;

        const loadData = async () => {
            setLoading(true);
            setError('');
            try {
                await Promise.all([fetchHistory(), fetchReminders(), fetchCustomerLocationState()]);
            } catch (err) {
                console.error('Failed to fetch customer data', err);
                setError('Failed to load customer dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [customer]);

    const handleLogout = () => {
        customerLogout();
        navigate('/login');
    };

    const handleMarkConsumed = async (saleId, itemIndex, itemKey) => {
        try {
            setConsumingKey(itemKey);
            await api.patch('/customer/reminders/consume', { saleId, itemIndex });
            setReminders((prev) => prev.filter((item) => item.itemKey !== itemKey));
        } catch (err) {
            console.error('Failed to mark reminder as consumed', err);
            alert(err.response?.data?.msg || 'Failed to mark reminder as consumed');
        } finally {
            setConsumingKey('');
        }
    };

    const handleSearchMedicines = async (e) => {
        e.preventDefault();
        setSearchError('');

        if (!searchTerm.trim()) {
            setSearchError('Please enter a medicine name to search');
            return;
        }

        if (!locationState.isLocationEnabled || !locationState.location) {
            setSearchError('Enable and detect your location in customer profile before searching nearby shops');
            return;
        }

        if (!Number.isFinite(Number(searchRadiusKm)) || Number(searchRadiusKm) <= 0) {
            setSearchError('Please enter a valid radius in km');
            return;
        }

        setSearchLoading(true);
        try {
            const res = await api.get('/customer/search-medicines', {
                params: {
                    q: searchTerm.trim(),
                    radiusKm: Number(searchRadiusKm)
                }
            });

            setSearchResults(res.data.results || []);
            setActiveTab('search');
        } catch (err) {
            console.error('Medicine search failed', err);
            setSearchResults([]);
            setSearchError(err.response?.data?.msg || 'Failed to search medicines');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleBuyOption = (result) => {
        const shopAddress = result.shopAddress || 'Address not provided';
        alert(`Buy option from ${result.shopName}\nDistance: ${result.distanceKm} km\nAddress: ${shopAddress}\nPhone: ${result.shopPhone || 'Not available'}`);
    };

    const getStatusStyle = (status) => {
        if (status === 'expired') {
            return { color: 'var(--danger-color)', fontWeight: 'bold' };
        }

        if (status === 'expiring-soon') {
            return { color: '#f39c12', fontWeight: 'bold' };
        }

        return { color: 'var(--success-color)', fontWeight: 'bold' };
    };

    if (customerLoading || loading) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading dashboard...</div>;
    }

    return (
        <div>
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
                    Customer Dashboard
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '999px',
                            padding: '5px 10px'
                        }}
                    >
                        <div
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: '0.78rem'
                            }}
                        >
                            {getInitials(customer?.name || '')}
                        </div>
                        <div style={{ lineHeight: 1.15 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>{customer?.name || 'Customer'}</div>
                            <div style={{ fontSize: '0.74rem', opacity: 0.7 }}>{customer?.phone || ''}</div>
                        </div>
                    </div>
                    <button
                        className="btn"
                        onClick={toggleTheme}
                        style={{
                            padding: '5px 10px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="Toggle light/dark mode"
                    >
                        <span>{isDarkMode ? '🌞' : '🌙'}</span>
                        <span>{isDarkMode ? 'Light' : 'Dark'}</span>
                    </button>
                    <button
                        className="btn"
                        onClick={() => navigate('/customer/profile')}
                        style={{ padding: '5px 10px', fontSize: '0.9rem' }}
                    >
                        Profile
                    </button>
                    <button onClick={handleLogout} className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="container" style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Search Medicines from Live Shops</h4>
                    <form onSubmit={handleSearchMedicines} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '2fr 1fr auto', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Medicine Name</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for a medicine"
                                style={{ marginBottom: 0 }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Radius (km)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={searchRadiusKm}
                                onChange={(e) => setSearchRadiusKm(e.target.value)}
                                style={{ marginBottom: 0 }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                            {searchLoading ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    {!locationState.isLocationEnabled && (
                        <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--danger-color)' }}>
                            Location is required for nearby shop search. Set it in your profile first.
                        </small>
                    )}

                    {searchError && (
                        <div style={{ marginTop: '0.75rem', color: 'var(--danger-color)' }}>{searchError}</div>
                    )}
                </div>

                <div className="grid-responsive" style={{ marginBottom: '1.5rem' }}>
                    <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Total Purchases</h4>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{history.length}</div>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #f39c12' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Active Reminders</h4>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{reminders.length}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('history')}
                        style={{
                            background: activeTab === 'history' ? 'var(--primary-color)' : 'var(--card-bg)',
                            color: activeTab === 'history' ? '#fff' : 'var(--text-color)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        Purchase History
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('reminders')}
                        style={{
                            background: activeTab === 'reminders' ? 'var(--primary-color)' : 'var(--card-bg)',
                            color: activeTab === 'reminders' ? '#fff' : 'var(--text-color)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        Reminders (Expiring in {thresholdDays} days)
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('search')}
                        style={{
                            background: activeTab === 'search' ? 'var(--primary-color)' : 'var(--card-bg)',
                            color: activeTab === 'search' ? '#fff' : 'var(--text-color)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        Search Results ({searchResults.length})
                    </button>
                </div>

                {activeTab === 'history' && (
                    history.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.6 }}>
                            <h3>No purchases found.</h3>
                            <p>Make your first purchase to see history here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {history.map((invoice) => (
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
                    )
                )}

                {activeTab === 'reminders' && (
                    reminders.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.6 }}>
                            <h3>No active reminders.</h3>
                            <p>You're all set for now.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {reminders.map((reminder) => (
                                <div key={reminder.itemKey} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                        <h4 style={{ margin: 0 }}>{reminder.medicineName}</h4>
                                        <span style={getStatusStyle(reminder.status)}>
                                            {reminder.status === 'expiring-soon' && `Expiring Soon (${reminder.daysLeft} days left)`}
                                            {reminder.status === 'expired' && `Expired (${Math.abs(reminder.daysLeft)} days ago)`}
                                            {reminder.status === 'safe' && `Safe (${reminder.daysLeft} days left)`}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '1rem', fontSize: '0.92rem' }}>
                                        <div><strong>Quantity:</strong> {reminder.quantity}</div>
                                        <div><strong>Purchased:</strong> {new Date(reminder.purchaseDate).toLocaleDateString()}</div>
                                        <div><strong>Expiry:</strong> {new Date(reminder.expiryDate).toLocaleDateString()}</div>
                                        <div><strong>Shop:</strong> {reminder.shopName}</div>
                                    </div>

                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleMarkConsumed(reminder.saleId, reminder.itemIndex, reminder.itemKey)}
                                        disabled={consumingKey === reminder.itemKey}
                                    >
                                        {consumingKey === reminder.itemKey ? 'Saving...' : 'Mark as consumed'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {activeTab === 'search' && (
                    searchResults.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '35px', opacity: 0.65 }}>
                            <h3>No matching medicines found in live nearby shops.</h3>
                            <p>Try changing medicine name or increasing radius.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {searchResults.map((result) => (
                                <div key={`${result.shopId}-${result.medicineId}`} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <h4 style={{ marginBottom: '0.35rem' }}>{result.medicineName}</h4>
                                            <div style={{ opacity: 0.85, marginBottom: '0.35rem' }}>
                                                Available at <strong>{result.shopName}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                                                {result.shopAddress || 'Address not available'}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                                                Distance: <strong>{result.distanceKm} km</strong>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                                                Stock: {result.quantity} | Expiry: {result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '0.65rem' }}>
                                                ₹{result.price}
                                            </div>
                                            <button className="btn btn-primary" onClick={() => handleBuyOption(result)}>
                                                Buy from this store
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;
