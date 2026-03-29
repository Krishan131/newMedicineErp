import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import AuthContext from '../../context/AuthContext';

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const CustomerProfile = () => {
    const { customer, customerLoading, setCustomerProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const customerId = customer?.id;

    const [profileForm, setProfileForm] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [locationSaving, setLocationSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [error, setError] = useState('');
    const [locationData, setLocationData] = useState({
        isLocationEnabled: false,
        location: null,
        locationUpdatedAt: null
    });

    const applyCustomerProfile = (profile, syncContext = false) => {
        setProfileForm({
            name: profile.name || '',
            phone: profile.phone || '',
            email: profile.email || ''
        });

        setLocationData({
            isLocationEnabled: !!profile.isLocationEnabled,
            location: profile.location || null,
            locationUpdatedAt: profile.locationUpdatedAt || null
        });

        if (syncContext) {
            setCustomerProfile(profile);
        }
    };

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
                reject(new Error(geoError.message || 'Unable to fetch location'));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });

    useEffect(() => {
        if (!customerLoading && !customer) {
            navigate('/login');
        }
    }, [customer, customerLoading, navigate]);

    useEffect(() => {
        if (customerLoading) return;

        if (!customerId) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const loadProfile = async () => {
            setLoading(true);
            setError('');

            try {
                const res = await api.get('/customer/me');
                const profile = res.data.customer;
                if (!isMounted) return;
                applyCustomerProfile(profile, true);
            } catch (err) {
                console.error('Failed to load customer profile', err);
                if (!isMounted) return;
                setError(err.response?.data?.msg || 'Failed to load profile');
            } finally {
                if (!isMounted) return;
                setLoading(false);
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, [customerLoading, customerId]);

    const onProfileChange = (e) => {
        setProfileMessage('');
        setLocationMessage('');
        setError('');
        setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
    };

    const onPasswordChange = (e) => {
        setPasswordMessage('');
        setLocationMessage('');
        setError('');
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    };

    const onProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage('');
        setLocationMessage('');
        setError('');

        if (!profileForm.name.trim()) {
            setError('Name is required');
            return;
        }

        setProfileSaving(true);

        try {
            const res = await api.put('/customer/me', {
                name: profileForm.name,
                email: profileForm.email
            });

            applyCustomerProfile(res.data.customer, true);
            setProfileMessage('Profile updated successfully');
        } catch (err) {
            console.error('Failed to update profile', err);
            setError(err.response?.data?.msg || 'Failed to update profile');
        } finally {
            setProfileSaving(false);
        }
    };

    const onPasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage('');
        setLocationMessage('');
        setError('');

        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            setError('Current and new password are required');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('New password and confirm password do not match');
            return;
        }

        setPasswordSaving(true);

        try {
            const res = await api.patch('/customer/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            setPasswordMessage(res.data.msg || 'Password updated successfully');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            console.error('Failed to update password', err);
            setError(err.response?.data?.msg || 'Failed to update password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const onDetectAndSaveLocation = async () => {
        setError('');
        setLocationMessage('');
        setLocationSaving(true);

        try {
            const coords = await detectBrowserLocation();
            const res = await api.patch('/customer/location', {
                latitude: coords.latitude,
                longitude: coords.longitude,
                isLocationEnabled: true
            });

            applyCustomerProfile(res.data.customer, true);
            setLocationMessage('Location detected and saved successfully');
        } catch (err) {
            console.error('Failed to save location', err);
            setError(err.response?.data?.msg || err.message || 'Failed to detect location');
        } finally {
            setLocationSaving(false);
        }
    };

    const onToggleLocationService = async (enabled) => {
        setError('');
        setLocationMessage('');

        if (enabled && !locationData.location) {
            setError('Detect your location first before enabling location service');
            return;
        }

        setLocationSaving(true);

        try {
            const res = await api.patch('/customer/location', { isLocationEnabled: enabled });
            applyCustomerProfile(res.data.customer, true);
            setLocationMessage(enabled ? 'Location service enabled' : 'Location service disabled');
        } catch (err) {
            console.error('Failed to toggle location service', err);
            setError(err.response?.data?.msg || 'Failed to update location settings');
        } finally {
            setLocationSaving(false);
        }
    };

    if (customerLoading || loading) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;
    }

    return (
        <div className="container" style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Customer Profile</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/customer/dashboard')}>
                    Back to Dashboard
                </button>
            </div>

            <div
                className="card"
                style={{
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem 1.25rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
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
                            fontWeight: '700',
                            fontSize: '1rem',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {getInitials(profileForm.name || customer?.name)}
                    </div>

                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem', lineHeight: 1.2 }}>
                            {profileForm.name || customer?.name || 'Customer'}
                        </div>
                        <div style={{ opacity: 0.75, fontSize: '0.9rem', marginTop: '2px' }}>
                            {profileForm.phone || customer?.phone || 'No phone'}
                        </div>
                        <div style={{ opacity: 0.65, fontSize: '0.85rem', marginTop: '2px' }}>
                            {profileForm.email || 'No email added'}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        padding: '0.35rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: 'rgba(34, 197, 94, 0.14)',
                        color: '#15803d',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Active Account
                </div>
            </div>

            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}
            {profileMessage && <div style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>{profileMessage}</div>}
            {passwordMessage && <div style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>{passwordMessage}</div>}
            {locationMessage && <div style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>{locationMessage}</div>}

            <div className="grid-responsive">
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Account Details</h3>
                    <form onSubmit={onProfileSubmit}>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                name="name"
                                value={profileForm.name}
                                onChange={onProfileChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                value={profileForm.phone}
                                disabled
                            />
                            <small style={{ opacity: 0.75 }}>Phone number is used for login and purchase linking.</small>
                        </div>

                        <div className="form-group">
                            <label>Email (optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={profileForm.email}
                                onChange={onProfileChange}
                                placeholder="Enter email"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                            {profileSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
                    <form onSubmit={onPasswordSubmit}>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={onPasswordChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={onPasswordChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={onPasswordChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                            {passwordSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Location Service</h3>

                    <button type="button" className="btn btn-primary" onClick={onDetectAndSaveLocation} disabled={locationSaving}>
                        {locationSaving ? 'Detecting...' : 'Detect My Location'}
                    </button>

                    <div style={{ marginTop: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {locationData.location ? (
                            <>
                                <div><strong>Latitude:</strong> {locationData.location.latitude.toFixed(6)}</div>
                                <div><strong>Longitude:</strong> {locationData.location.longitude.toFixed(6)}</div>
                                {locationData.locationUpdatedAt && (
                                    <div style={{ opacity: 0.7, marginTop: '4px' }}>
                                        Updated: {new Date(locationData.locationUpdatedAt).toLocaleString()}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ opacity: 0.75 }}>Location not detected yet.</div>
                        )}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={locationData.isLocationEnabled}
                            onChange={(e) => onToggleLocationService(e.target.checked)}
                            disabled={locationSaving}
                            style={{ width: '18px', height: '18px', marginBottom: 0 }}
                        />
                        Enable location service for nearby medicine search
                    </label>

                    {!locationData.isLocationEnabled && (
                        <small style={{ display: 'block', marginTop: '8px', opacity: 0.75 }}>
                            Location service must be enabled to search medicines from nearby live shops.
                        </small>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerProfile;
