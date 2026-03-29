import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import AuthContext from '../context/AuthContext';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'RT';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const RetailerProfile = () => {
    const { user, loading, setUserProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const retailerId = user?.id;

    const [profileForm, setProfileForm] = useState({
        username: '',
        email: '',
        shopName: '',
        shopPhone: '',
        shopAddress: '',
        shopDescription: ''
    });
    const [shopMeta, setShopMeta] = useState({
        isLocationEnabled: false,
        isLive: false,
        shopLocation: null,
        locationUpdatedAt: null
    });
    const [pageLoading, setPageLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);
    const [savingLive, setSavingLive] = useState(false);
    const [error, setError] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [locationWarning, setLocationWarning] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [loading, user, navigate]);

    const applyProfileToState = (profile) => {
        setProfileForm({
            username: profile.username || '',
            email: profile.email || '',
            shopName: profile.shopName || '',
            shopPhone: profile.shopPhone || '',
            shopAddress: profile.shopAddress || '',
            shopDescription: profile.shopDescription || ''
        });

        setShopMeta({
            isLocationEnabled: !!profile.isLocationEnabled,
            isLive: !!profile.isLive,
            shopLocation: profile.shopLocation || null,
            locationUpdatedAt: profile.locationUpdatedAt || null
        });

        setUserProfile(profile);
    };

    useEffect(() => {
        if (loading) return;

        if (!retailerId) {
            setPageLoading(false);
            return;
        }

        let isMounted = true;

        const fetchProfile = async () => {
            setPageLoading(true);
            setError('');

            try {
                const res = await api.get('/auth/me');
                if (!isMounted) return;
                applyProfileToState(res.data.user);
            } catch (err) {
                console.error('Failed to fetch retailer profile', err);
                if (!isMounted) return;
                setError(err.response?.data?.msg || 'Failed to load profile');
            } finally {
                if (!isMounted) return;
                setPageLoading(false);
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, [loading, retailerId]);

    const detectBrowserLocation = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (geoError) => {
                reject(new Error(geoError.message || 'Unable to fetch current location'));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });

    const onProfileChange = (e) => {
        setError('');
        setProfileMessage('');
        setLocationWarning('');
        setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
    };

    const onSaveProfile = async (e) => {
        e.preventDefault();
        setError('');
        setProfileMessage('');
        setLocationWarning('');

        if (!profileForm.shopName.trim()) {
            setError('Shop name is required');
            return;
        }

        setSavingProfile(true);
        try {
            const res = await api.put('/auth/me', {
                shopName: profileForm.shopName,
                shopPhone: profileForm.shopPhone,
                shopAddress: profileForm.shopAddress,
                shopDescription: profileForm.shopDescription
            });

            applyProfileToState(res.data.user);
            setProfileMessage('Shop profile updated successfully');
        } catch (err) {
            console.error('Failed to save profile', err);
            setError(err.response?.data?.msg || 'Failed to save profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const onDetectAndSaveLocation = async () => {
        setError('');
        setLocationMessage('');
        setLocationWarning('');
        setSavingLocation(true);

        try {
            const coords = await detectBrowserLocation();
            const res = await api.patch('/auth/location', {
                latitude: coords.latitude,
                longitude: coords.longitude,
                isLocationEnabled: true
            });

            applyProfileToState(res.data.user);
            setLocationMessage(res.data.message || 'Shop location detected and location service enabled');

            if (res.data.warning) {
                setLocationWarning(res.data.warning);
            }
        } catch (err) {
            console.error('Failed to detect/save location', err);
            setError(err.response?.data?.msg || err.message || 'Failed to detect location');
        } finally {
            setSavingLocation(false);
        }
    };

    const onToggleLocationService = async (enabled) => {
        setError('');
        setLocationMessage('');
        setLocationWarning('');

        if (enabled && !shopMeta.shopLocation) {
            setError('Detect your shop location first before enabling location service');
            return;
        }

        setSavingLocation(true);
        try {
            const res = await api.patch('/auth/location', { isLocationEnabled: enabled });
            applyProfileToState(res.data.user);
            setLocationMessage(res.data.message || (enabled ? 'Location service enabled' : 'Location service disabled and shop set offline'));
        } catch (err) {
            console.error('Failed to toggle location service', err);
            setError(err.response?.data?.msg || 'Failed to update location service');
        } finally {
            setSavingLocation(false);
        }
    };

    const onToggleShopLive = async (live) => {
        setError('');
        setLocationMessage('');
        setLocationWarning('');
        setSavingLive(true);

        try {
            const res = await api.patch('/auth/live-status', { isLive: live });
            applyProfileToState(res.data.user);
            setLocationMessage(live ? 'Shop is now live on the app' : 'Shop is now offline');
        } catch (err) {
            console.error('Failed to update live status', err);
            setError(err.response?.data?.msg || 'Failed to update live status');
        } finally {
            setSavingLive(false);
        }
    };

    if (loading || pageLoading) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading retailer profile...</div>;
    }

    return (
        <div className="container" style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Retailer Profile</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>
                    Back to Dashboard
                </button>
            </div>

            <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                            color: '#fff',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                        }}
                    >
                        {getInitials(profileForm.shopName || profileForm.username)}
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{profileForm.shopName || 'My Medicine Shop'}</div>
                        <div style={{ opacity: 0.78, fontSize: '0.88rem' }}>{profileForm.email}</div>
                        <div style={{ opacity: 0.65, fontSize: '0.82rem' }}>User: {profileForm.username}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{
                        padding: '0.32rem 0.58rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: shopMeta.isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: shopMeta.isLive ? 'var(--success-color)' : 'var(--danger-color)'
                    }}>
                        {shopMeta.isLive ? 'Live' : 'Offline'}
                    </span>
                    <span style={{
                        padding: '0.32rem 0.58rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: shopMeta.isLocationEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.2)',
                        color: shopMeta.isLocationEnabled ? 'var(--primary-color)' : 'var(--text-secondary)'
                    }}>
                        {shopMeta.isLocationEnabled ? 'Location Enabled' : 'Location Disabled'}
                    </span>
                </div>
            </div>

            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}
            {profileMessage && <div style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>{profileMessage}</div>}
            {locationMessage && <div style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>{locationMessage}</div>}
            {locationWarning && <div style={{ color: '#b45309', marginBottom: '1rem' }}>{locationWarning}</div>}

            <div className="grid-responsive">
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Shop Details</h3>
                    <form onSubmit={onSaveProfile}>
                        <div className="form-group">
                            <label>Shop Name</label>
                            <input
                                type="text"
                                name="shopName"
                                value={profileForm.shopName}
                                onChange={onProfileChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Shop Phone</label>
                            <input
                                type="text"
                                name="shopPhone"
                                value={profileForm.shopPhone}
                                onChange={onProfileChange}
                                placeholder="Enter shop contact number"
                            />
                        </div>

                        <div className="form-group">
                            <label>Shop Address</label>
                            <input
                                type="text"
                                name="shopAddress"
                                value={profileForm.shopAddress}
                                onChange={onProfileChange}
                                placeholder="Will auto-fill when location is detected"
                            />
                            <small style={{ opacity: 0.75 }}>Auto-updated from detected location. You can edit it manually if needed.</small>
                        </div>

                        <div className="form-group">
                            <label>Shop Description</label>
                            <textarea
                                name="shopDescription"
                                value={profileForm.shopDescription}
                                onChange={onProfileChange}
                                placeholder="Describe your store, timings or specialties"
                                rows="4"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--secondary-color)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-body)',
                                    marginBottom: '15px'
                                }}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                            {savingProfile ? 'Saving...' : 'Save Shop Details'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Location and Live Status</h3>

                    <button className="btn btn-primary" onClick={onDetectAndSaveLocation} disabled={savingLocation}>
                        {savingLocation ? 'Detecting...' : 'Detect Shop Location'}
                    </button>

                    <div style={{ marginTop: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {shopMeta.shopLocation ? (
                            <>
                                <div><strong>Detected Address:</strong> {profileForm.shopAddress || 'Address lookup pending. Enter manually if needed.'}</div>
                                {shopMeta.locationUpdatedAt && (
                                    <div style={{ opacity: 0.7, marginTop: '4px' }}>
                                        Updated: {new Date(shopMeta.locationUpdatedAt).toLocaleString()}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ opacity: 0.75 }}>No location detected yet.</div>
                        )}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={shopMeta.isLocationEnabled}
                            onChange={(e) => onToggleLocationService(e.target.checked)}
                            disabled={savingLocation}
                            style={{ width: '18px', height: '18px', marginBottom: 0 }}
                        />
                        Enable location service
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={shopMeta.isLive}
                            onChange={(e) => onToggleShopLive(e.target.checked)}
                            disabled={savingLive || !shopMeta.isLocationEnabled}
                            style={{ width: '18px', height: '18px', marginBottom: 0 }}
                        />
                        Set shop live on app
                    </label>

                    {!shopMeta.isLocationEnabled && (
                        <small style={{ display: 'block', marginTop: '8px', opacity: 0.75 }}>
                            Shop can go live only when location service is enabled.
                        </small>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RetailerProfile;
