import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import './CustomerRegister.css';

const CustomerRegister = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const { customerRegister } = useContext(AuthContext);
    const navigate = useNavigate();

    const { name, phone, email, password, confirmPassword } = formData;

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        if (password.length < 6) {
            setError('Password should be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Password and confirm password do not match');
            return;
        }

        const res = await customerRegister(name, phone, password, email);
        if (res.success) {
            navigate('/customer/dashboard');
        } else {
            setError(res.msg);
        }
    };

    return (
        <div className="customer-register-page">
            <div className="customer-register-shell">
                <div className="card customer-register-card">
                    <div className="customer-register-header">
                        <h2>Customer Account</h2>
                        <p>Create your profile</p>
                    </div>

                    {error && <div className="customer-register-error">{error}</div>}

                    <form onSubmit={onSubmit}>
                        <div className="customer-register-field">
                            <label>Name</label>
                            <input type="text" name="name" value={name} onChange={onChange} required placeholder="Enter your name" />
                        </div>

                        <div className="customer-register-field">
                            <label>Phone Number</label>
                            <input type="text" name="phone" value={phone} onChange={onChange} required placeholder="Enter your phone number" />
                        </div>

                        <div className="customer-register-field">
                            <label>Email (optional)</label>
                            <input type="email" name="email" value={email} onChange={onChange} placeholder="Enter your email" />
                        </div>

                        <div className="customer-register-field">
                            <label>Password</label>
                            <input type="password" name="password" value={password} onChange={onChange} required placeholder="Create a password" />
                        </div>

                        <div className="customer-register-field is-last">
                            <label>Confirm Password</label>
                            <input type="password" name="confirmPassword" value={confirmPassword} onChange={onChange} required placeholder="Re-enter your password" />
                        </div>

                        <button type="submit" className="btn btn-primary customer-register-submit">Create Account</button>
                    </form>

                    <p className="customer-register-footer">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CustomerRegister;
