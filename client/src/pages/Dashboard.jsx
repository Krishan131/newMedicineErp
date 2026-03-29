import React, { useEffect, useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import BillingSection from '../components/BillingSection';
import WhatsAppModal from '../components/WhatsAppModal';
import api from '../api/api';
import AuthContext from '../context/AuthContext'; // Import AuthContext (Default Export)
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useContext(AuthContext); // Get user from context
    const [medicines, setMedicines] = useState([]);
    const [stats, setStats] = useState({
        totalMedicines: 0,
        lowStock: 0,
        totalSales: 0,
        expiringSoon: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch medicines
            const medRes = await api.get('/medicines');
            const meds = medRes.data;
            setMedicines(meds);
            const lowStockCount = meds.filter(m => m.quantity < m.minimalLevel).length;

            // Calculate expiring soon (next 45 days)
            const today = new Date();
            const thresholdDate = new Date();
            thresholdDate.setDate(today.getDate() + 45);
            const expiringSoonCount = meds.filter(m => {
                const expiryDate = new Date(m.expiryDate);
                return expiryDate >= today && expiryDate <= thresholdDate;
            }).length;

            // Fetch sales
            const salesRes = await api.get('/sales');
            const sales = salesRes.data;
            const totalSalesAmount = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

            setStats({
                totalMedicines: meds.length,
                lowStock: lowStockCount,
                totalSales: totalSalesAmount,
                expiringSoon: expiringSoonCount
            });

            setRecentSales(sales.slice(0, 5)); // Get last 5
        } catch (err) {
            console.error("Error fetching dashboard data", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <>
            <Navbar />
            <div className="container">
                {/* Stylish Welcome Message */}
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            marginBottom: '0.5rem',
                            color: 'var(--text-color)',
                            display: 'inline-block'
                        }}>
                            Welcome back, <span style={{ color: 'var(--primary-color)' }}>{user ? user.username : 'User'}</span> 👋
                        </h1>
                        <p style={{ color: 'var(--secondary-color)', fontSize: '1.1rem', opacity: 0.8 }}>
                            Here's what's happening with your store today.
                        </p>
                    </div>
                    <button 
                        onClick={() => setWhatsappModalOpen(true)}
                        style={{
                            padding: '0.8rem 1.5rem',
                            backgroundColor: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginTop: '1rem'
                        }}
                    >
                        📱 Connect WhatsApp
                    </button>
                </div>

                <WhatsAppModal 
                    isOpen={whatsappModalOpen} 
                    onClose={() => setWhatsappModalOpen(false)}
                />

                {/* Stats Cards */}
                <div className="grid-responsive" style={{ marginBottom: '3rem' }}>

                    <Link to="/inventory" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-color)', opacity: 0.8, marginBottom: '0.5rem' }}>Total Items</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{stats.totalMedicines}</p>
                            </div>
                            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>💊</div>
                        </div>
                    </Link>

                    <Link to="/low-stock" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--danger-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-color)', opacity: 0.8, marginBottom: '0.5rem' }}>Low Stock</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{stats.lowStock}</p>
                            </div>
                            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>⚠️</div>
                        </div>
                    </Link>

                    <Link to="/expiry-report" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ borderLeft: '4px solid #f39c12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-color)', opacity: 0.8, marginBottom: '0.5rem' }}>Expiring Soon</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.expiringSoon}</p>
                            </div>
                            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>⏳</div>
                        </div>
                    </Link>

                    <Link to="/sales-history" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--success-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-color)', opacity: 0.8, marginBottom: '0.5rem' }}>Total Sales</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>₹{stats.totalSales.toFixed(0)}</p>
                            </div>
                            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>💰</div>
                        </div>
                    </Link>
                </div>

                {/* Billing Section */}
                <BillingSection
                    medicines={medicines}
                    onCheckoutSuccess={fetchData}
                />      {/* Recent Sales Table */}
                <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Recent History</h3>
                    <div className="card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '15px' }}>Date</th>
                                    <th style={{ padding: '15px' }}>Customer</th>
                                    <th style={{ padding: '15px' }}>Items</th>
                                    <th style={{ padding: '15px' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map(sale => (
                                    <tr key={sale._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '15px', color: 'var(--text-color)', opacity: 0.8 }}>{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}</td>
                                        <td style={{ padding: '15px', fontWeight: '500' }}>{sale.customerName}</td>
                                        <td style={{ padding: '15px' }}>{sale.items.length}</td>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>₹{sale.totalAmount}</td>
                                    </tr>
                                ))}
                                {recentSales.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6 }}>No sales yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
