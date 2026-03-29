import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/api';
import { Link } from 'react-router-dom';

const SalesHistory = () => {
    const [sales, setSales] = useState([]);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const res = await api.get('/sales');
                setSales(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchSales();
    }, []);

    return (
        <>
            <Navbar />
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Sales History</h2>
                    <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
                </div>

                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead style={{ background: 'var(--card-bg)' }}>
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice ID</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => (
                                    <tr key={sale._id}>
                                        <td style={{ color: 'var(--text-color)', opacity: 0.8 }}>
                                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{sale._id.substring(0, 8).toUpperCase()}</td>
                                        <td style={{ fontWeight: '500' }}>{sale.customerName}</td>
                                        <td>
                                            {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>₹{sale.totalAmount}</td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color)', opacity: 0.6 }}>
                                            No sales records found.
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

export default SalesHistory;
