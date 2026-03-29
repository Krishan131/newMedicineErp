import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', shopName: '' });
    const [error, setError] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const { username, email, password, shopName } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        const res = await register(username, email, password, shopName); // Updated to pass shopName
        if (res.success) {
            navigate('/');
        } else {
            setError(res.msg);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <div className="card" style={{ width: '350px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--primary-color)' }}>Medicine ERP</h2>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Retailer Register</h3>
                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                <form onSubmit={onSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Shop Name</label>
                        <input type="text" name="shopName" value={shopName} onChange={onChange} required placeholder="e.g. City Medicals" />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
                        <input type="text" name="username" value={username} onChange={onChange} required />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input type="email" name="email" value={email} onChange={onChange} required />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                        <input type="password" name="password" value={password} onChange={onChange} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register</button>
                </form>
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)' }}>Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
