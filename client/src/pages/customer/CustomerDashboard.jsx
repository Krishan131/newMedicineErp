import React, { useState, useEffect, useContext } from 'react';
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

const CustomerDashboard = () => {
    const { customer, customerLoading, customerLogout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchRadiusKm, setSearchRadiusKm] = useState(5);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [locationState, setLocationState] = useState({
        isLocationEnabled: !!customer?.isLocationEnabled,
        location: customer?.location || null
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchCustomerLocationState = async () => {
        const res = await api.get('/customer/me');
        const locationPayload = {
            isLocationEnabled: !!res.data.customer?.isLocationEnabled,
            location: res.data.customer?.location || null
        };

        setLocationState(locationPayload);

        if (customer?.id) {
            writeCustomerCache(
                buildCustomerCacheKey(customer.id, 'locationState'),
                locationPayload
            );
        }
    };

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    useEffect(() => {
        if (!customer) return;

        setLocationState({
            isLocationEnabled: !!customer.isLocationEnabled,
            location: customer.location || null
        });

        const cachedLocation = readCustomerCache(
            buildCustomerCacheKey(customer.id, 'locationState'),
            5 * 60 * 1000
        );

        if (cachedLocation) {
            setLocationState(cachedLocation);
        }

        const cachedSearch = readCustomerCache(
            buildCustomerCacheKey(customer.id, 'searchState'),
            10 * 60 * 1000
        );

        if (cachedSearch) {
            setSearchTerm(cachedSearch.searchTerm || '');
            setSearchRadiusKm(cachedSearch.searchRadiusKm || 5);
            setSearchResults(cachedSearch.searchResults || []);
        }

        const loadData = async () => {
            setLocationLoading(true);
            setError('');
            try {
                await fetchCustomerLocationState();
            } catch (err) {
                console.error('Failed to fetch customer data', err);
                if (!cachedLocation) {
                    setError('Failed to load customer dashboard data.');
                }
            } finally {
                setLocationLoading(false);
            }
        };

        loadData();
    }, [customer]);

    const handleLogout = () => {
        customerLogout();
        navigate('/login');
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

            const nextResults = res.data.results || [];
            setSearchResults(nextResults);

            if (customer?.id) {
                writeCustomerCache(buildCustomerCacheKey(customer.id, 'searchState'), {
                    searchTerm: searchTerm.trim(),
                    searchRadiusKm: Number(searchRadiusKm),
                    searchResults: nextResults
                });
            }
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

    if (customerLoading) {
        return <div className="container customer-dashboard-loading">Loading dashboard...</div>;
    }

    return (
        <div className="customer-dashboard-page">
            <nav className="customer-dashboard-nav">
                <div className="customer-dashboard-brand">
                    <div className="customer-dashboard-brand-title">Customer Dashboard</div>
                    <div className="customer-dashboard-brand-subtitle">Search medicines nearby and view live results</div>
                </div>
                <div className="customer-dashboard-actions">
                    <button
                        type="button"
                        className="customer-dashboard-user-chip customer-dashboard-profile-trigger"
                        onClick={() => navigate('/customer/profile')}
                        title="Open profile"
                    >
                        <div className="customer-dashboard-avatar">
                            {getInitials(customer?.name || '')}
                        </div>
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
                        className="btn customer-dashboard-tab is-active"
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
                        className="btn customer-dashboard-tab"
                        onClick={() => navigate('/customer/chat')}
                    >
                        Medi Chat
                    </button>
                </div>

                <div className="card customer-dashboard-search-panel">
                    <div className="customer-dashboard-panel-head">
                        <h4 className="customer-dashboard-panel-title">Search Medicines from Live Shops</h4>
                        <p className="customer-dashboard-panel-subtitle">Find nearby availability with live stock and distance</p>
                    </div>
                    <form onSubmit={handleSearchMedicines} className="customer-dashboard-search-form">
                        <div className="form-group customer-dashboard-form-group">
                            <label>Medicine Name</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for a medicine"
                            />
                        </div>
                        <div className="form-group customer-dashboard-form-group">
                            <label>Radius (km)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={searchRadiusKm}
                                onChange={(e) => setSearchRadiusKm(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                            {searchLoading ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    {!locationState.isLocationEnabled && (
                        <small className="customer-dashboard-search-note is-error">
                            Location is required for nearby shop search. Set it in your profile first.
                        </small>
                    )}

                    {searchError && (
                        <div className="customer-dashboard-search-note is-error">{searchError}</div>
                    )}

                    {locationLoading && !searchError && (
                        <div className="customer-dashboard-search-note">Refreshing your location settings...</div>
                    )}
                </div>

                {searchResults.length === 0 ? (
                    <div className="customer-dashboard-empty is-compact">
                        <h3>No search results yet.</h3>
                        <p>Search for a medicine to see nearby live shop results.</p>
                    </div>
                ) : (
                    <div className="customer-dashboard-search-list">
                        {searchResults.map((result) => (
                            <div key={`${result.shopId}-${result.medicineId}`} className="card customer-dashboard-result-card">
                                <div className="customer-dashboard-result-content">
                                    <div>
                                        <h4 className="customer-dashboard-result-name">{result.medicineName}</h4>
                                        <div className="customer-dashboard-result-shop">
                                            Available at <strong>{result.shopName}</strong>
                                        </div>
                                        <div className="customer-dashboard-result-meta">
                                            {result.shopAddress || 'Address not available'}
                                        </div>
                                        <div className="customer-dashboard-result-meta">
                                            Distance: <strong>{result.distanceKm} km</strong>
                                        </div>
                                        <div className="customer-dashboard-result-meta">
                                            Stock: {result.quantity} | Expiry: {result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>

                                    <div className="customer-dashboard-result-price-wrap">
                                        <div className="customer-dashboard-result-price">
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
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;
