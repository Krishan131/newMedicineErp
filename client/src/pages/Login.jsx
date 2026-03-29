import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    // Tab State: 'retailer' or 'customer'
    const [loginType, setLoginType] = useState('retailer');

    // Auth State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        customerName: '',
        customerPhone: '',
        customerPassword: ''
    });
    const [error, setError] = useState('');
    const { login, customerLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const { email, password, customerName, customerPhone, customerPassword } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        if (loginType === 'retailer') {
            const res = await login(email, password);
            if (res.success) {
                navigate('/');
            } else {
                setError(res.msg);
            }
        } else {
            if (customerPhone.replace(/\D/g, '').length < 10) {
                setError('Please enter a valid phone number');
                return;
            }

            const res = await customerLogin(customerName, customerPhone, customerPassword);
            if (res.success) {
                navigate('/customer/dashboard');
            } else {
                setError(res.msg);
            }
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <div className="card" style={{ width: '380px', padding: '0' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                    <div
                        onClick={() => setLoginType('retailer')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: loginType === 'retailer' ? 'var(--card-bg)' : 'rgba(0,0,0,0.05)',
                            color: loginType === 'retailer' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: loginType === 'retailer' ? 'bold' : 'normal',
                            borderTopLeftRadius: '15px'
                        }}
                    >
                        Retailer
                    </div>
                    <div
                        onClick={() => setLoginType('customer')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: loginType === 'customer' ? 'var(--card-bg)' : 'rgba(0,0,0,0.05)',
                            color: loginType === 'customer' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: loginType === 'customer' ? 'bold' : 'normal',
                            borderTopRightRadius: '15px'
                        }}
                    >
                        Customer
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Medicine ERP</h2>
                    <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>
                        {loginType === 'retailer' ? 'Shop Owner Login' : 'Customer Portal'}
                    </h4>

                    {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                    <form onSubmit={onSubmit}>
                        {loginType === 'retailer' ? (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                                    <input type="email" name="email" value={email} onChange={onChange} required />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                                    <input type="password" name="password" value={password} onChange={onChange} required />
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={customerName}
                                        onChange={onChange}
                                        required
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                                    <input
                                        type="text"
                                        name="customerPhone"
                                        value={customerPhone}
                                        onChange={onChange}
                                        required
                                        placeholder="Enter your phone number"
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                                    <input
                                        type="password"
                                        name="customerPassword"
                                        value={customerPassword}
                                        onChange={onChange}
                                        required
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </>
                        )}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            {loginType === 'retailer' ? 'Login' : 'Customer Login'}
                        </button>
                    </form>

                    {loginType === 'retailer' && (
                        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                            Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)' }}>Register</Link>
                        </p>
                    )}

                    {loginType === 'customer' && (
                        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                            New customer? <Link to="/customer/register" style={{ color: 'var(--primary-color)' }}>Create account</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
