import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import ThemeContext from '../context/ThemeContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <nav className="navbar">
            <div className="container">
                <div className="navbar-header" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link to="/" style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <span style={{ color: 'var(--primary-color)' }}>Medicine</span>ERP
                    </Link>

                    {/* Hamburger Icon */}
                    <button className="hamburger" onClick={toggleMenu} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                </div>

                <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/">Dashboard</Link>
                    <Link to="/inventory">Inventory</Link>
                    <Link to="/low-stock">Low Stock</Link>
                    <button onClick={toggleTheme} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#fff' }} title="Toggle Dark Mode">
                        {isDarkMode ? '🌞' : '🌙'}
                    </button>
                    <button onClick={logout} className="btn btn-danger" style={{ marginLeft: '1rem', padding: '8px 15px' }}>Logout</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
