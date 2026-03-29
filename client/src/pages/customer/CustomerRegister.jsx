import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="card" style={{ width: '420px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Customer Account</h2>
                <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>Create your profile</h4>

                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={onSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
                        <input type="text" name="name" value={name} onChange={onChange} required placeholder="Enter your name" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                        <input type="text" name="phone" value={phone} onChange={onChange} required placeholder="Enter your phone number" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email (optional)</label>
                        <input type="email" name="email" value={email} onChange={onChange} placeholder="Enter your email" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                        <input type="password" name="password" value={password} onChange={onChange} required placeholder="Create a password" />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password</label>
                        <input type="password" name="confirmPassword" value={confirmPassword} onChange={onChange} required placeholder="Re-enter your password" />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
                </form>

                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)' }}>Login</Link>
                </p>
            </div>
        </div>
    );
};

export default CustomerRegister;
