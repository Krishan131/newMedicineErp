import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/api';
import { Link } from 'react-router-dom';

const LowStock = () => {
    const [lowStockMedicines, setLowStockMedicines] = useState([]);

    useEffect(() => {
        const fetchLowStock = async () => {
            try {
                const res = await api.get('/medicines');
                const filtered = res.data.filter(med => med.quantity < med.minimalLevel);
                setLowStockMedicines(filtered);
            } catch (err) {
                console.error(err);
            }
        };
        fetchLowStock();
    }, []);

    return (
        <>
            <Navbar />
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Low Stock Report</h2>
                    <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
                </div>

                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead style={{ background: 'var(--card-bg)' }}>
                                <tr>
                                    <th>Name</th>
                                    <th>Batch</th>
                                    <th>Expiry</th>
                                    <th>Price</th>
                                    <th>Current Qty</th>
                                    <th>Alert Level</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockMedicines.map(med => (
                                    <tr key={med._id}>
                                        <td style={{ fontWeight: '500' }}>{med.name}</td>
                                        <td>{med.batchNumber}</td>
                                        <td>{new Date(med.expiryDate).toLocaleDateString()}</td>
                                        <td>₹{med.price}</td>
                                        <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{med.quantity}</td>
                                        <td>{med.minimalLevel}</td>
                                        <td>
                                            <span className="badge badge-danger">Low Stock</span>
                                        </td>
                                    </tr>
                                ))}
                                {lowStockMedicines.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color)', opacity: 0.6 }}>
                                            No low stock items found. Everything looks good!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LowStock;
