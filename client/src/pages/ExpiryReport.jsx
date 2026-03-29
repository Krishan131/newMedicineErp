import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/api';
import { Link } from 'react-router-dom';

const ExpiryReport = () => {
    const [expiringMedicines, setExpiringMedicines] = useState([]);

    useEffect(() => {
        const fetchExpiring = async () => {
            try {
                const res = await api.get('/medicines');
                const today = new Date();
                const thresholdDate = new Date();
                thresholdDate.setDate(today.getDate() + 45); // 1.5 months approx 45 days

                const filtered = res.data.filter(med => {
                    const expiryDate = new Date(med.expiryDate);
                    return expiryDate >= today && expiryDate <= thresholdDate;
                });

                // Sort by nearest expiry first
                filtered.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

                setExpiringMedicines(filtered);
            } catch (err) {
                console.error(err);
            }
        };
        fetchExpiring();
    }, []);

    return (
        <>
            <Navbar />
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Expiry Alert (Next 45 Days)</h2>
                    <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
                </div>

                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead style={{ background: 'var(--card-bg)' }}>
                                <tr>
                                    <th>Name</th>
                                    <th>Batch</th>
                                    <th>Expiry Date</th>
                                    <th>Days Left</th>
                                    <th>Price</th>
                                    <th>Current Qty</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expiringMedicines.map(med => {
                                    const daysLeft = Math.ceil((new Date(med.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <tr key={med._id}>
                                            <td style={{ fontWeight: '500' }}>{med.name}</td>
                                            <td>{med.batchNumber}</td>
                                            <td>{new Date(med.expiryDate).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 'bold', color: daysLeft < 30 ? 'var(--danger-color)' : 'var(--secondary-color)' }}>
                                                {daysLeft} days
                                            </td>
                                            <td>₹{med.price}</td>
                                            <td>{med.quantity}</td>
                                            <td>
                                                <span className="badge badge-danger">Expiring Soon</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {expiringMedicines.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color)', opacity: 0.6 }}>
                                            No items expiring within the next 1.5 months.
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

export default ExpiryReport;
