import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

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
        <div className="portal-login-page">
            <div className="card portal-login-card">
                <div className="portal-login-tabs">
                    <div
                        onClick={() => setLoginType('retailer')}
                        className={`portal-login-tab ${loginType === 'retailer' ? 'is-active' : ''}`}
                    >
                        Retailer
                    </div>
                    <div
                        onClick={() => setLoginType('customer')}
                        className={`portal-login-tab ${loginType === 'customer' ? 'is-active' : ''}`}
                    >
                        Customer
                    </div>
                </div>

                <div className="portal-login-body">
                    <h2>Medicine ERP</h2>
                    <h4>
                        {loginType === 'retailer' ? 'Shop Owner Login' : 'Customer Portal'}
                    </h4>

                    {error && <div className="portal-login-error">{error}</div>}

                    <form onSubmit={onSubmit}>
                        {loginType === 'retailer' ? (
                            <>
                                <div className="portal-login-field">
                                    <label>Email</label>
                                    <input type="email" name="email" value={email} onChange={onChange} required />
                                </div>
                                <div className="portal-login-field is-last">
                                    <label>Password</label>
                                    <input type="password" name="password" value={password} onChange={onChange} required />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="portal-login-field">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={customerName}
                                        onChange={onChange}
                                        required
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="portal-login-field">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        name="customerPhone"
                                        value={customerPhone}
                                        onChange={onChange}
                                        required
                                        placeholder="Enter your phone number"
                                    />
                                </div>
                                <div className="portal-login-field is-last">
                                    <label>Password</label>
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

                        <button type="submit" className="btn btn-primary portal-login-submit">
                            {loginType === 'retailer' ? 'Login' : 'Customer Login'}
                        </button>
                    </form>

                    {loginType === 'retailer' && (
                        <p className="portal-login-footer">
                            Don't have an account? <Link to="/register">Register</Link>
                        </p>
                    )}

                    {loginType === 'customer' && (
                        <p className="portal-login-footer">
                            New customer? <Link to="/customer/register">Create account</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
