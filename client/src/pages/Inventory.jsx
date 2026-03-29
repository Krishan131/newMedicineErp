import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/api';

const Inventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState(null);
    const [file, setFile] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        price: '',
        minimalLevel: '',
        expiryDate: '',
        batchNumber: '',
        manufacturer: ''
    });

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await api.get('/medicines');
            setMedicines(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Derived state for search
    const filteredMedicines = medicines.filter(med =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/medicines/${editId}`, formData);
            } else {
                await api.post('/medicines', formData);
            }
            resetForm();
            fetchMedicines();
        } catch (err) {
            console.error(err);
            alert('Error saving medicine');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await api.delete(`/medicines/${id}`);
                fetchMedicines();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleEdit = (med) => {
        setEditId(med._id);
        setFormData({
            name: med.name,
            quantity: med.quantity,
            price: med.price,
            minimalLevel: med.minimalLevel,
            expiryDate: med.expiryDate.split('T')[0], // Format for date input
            batchNumber: med.batchNumber || '',
            manufacturer: med.manufacturer || ''
        });
    };

    const resetForm = () => {
        setEditId(null);
        setFormData({
            name: '',
            quantity: '',
            price: '',
            minimalLevel: '',
            expiryDate: '',
            batchNumber: '',
            manufacturer: ''
        });
    };

    const handleFileUpload = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const uploadData = new FormData();
        uploadData.append('file', selectedFile);

        try {
            await api.post('/medicines/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Bulk upload successful!');
            fetchMedicines();
        } catch (err) {
            console.error(err);
            alert('Error uploading CSV');
        }
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>Inventory Management</h1>

                    {/* CSV Upload Section */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            id="csvUpload"
                        />
                        <label htmlFor="csvUpload" className="btn btn-primary" style={{ margin: 0 }}>
                            📂 Import CSV
                        </label>
                    </div>
                </div>

                {/* Main Grid: Add Form (Left) vs Stats/Help (Right) */}
                <div className="inventory-container" style={{ marginBottom: '2rem', height: 'auto', overflow: 'visible' }}>
                    {/* Left: Add Medicine Form */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            {editId ? 'Edit Medicine' : 'Add New Medicine'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Medicine Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Paracetamol"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Price (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Min Level</label>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.minimalLevel}
                                        onChange={(e) => setFormData({ ...formData, minimalLevel: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                                {editId ? 'Update Medicine' : 'Add Medicine'}
                            </button>
                            {editId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="btn btn-danger"
                                    style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', color: 'var(--text-color)', border: '1px solid var(--danger-color)' }}
                                >
                                    Cancel
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Right: Quick Stats or Search */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Search Inventory</h3>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ marginBottom: '0' }}
                        />
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Quick Stats</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{medicines.length}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Total Items</div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{medicines.filter(m => m.quantity < m.minimalLevel).length}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Low Stock</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory List Table */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Current Stock</h3>
                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Name</th>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Quantity</th>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Price</th>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Status</th>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Expiry</th>
                                    <th style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border-color)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMedicines.map(med => (
                                    <tr key={med._id}>
                                        <td style={{ fontWeight: '500' }}>{med.name}</td>
                                        <td>{med.quantity}</td>
                                        <td>₹{med.price}</td>
                                        <td>
                                            {med.quantity < med.minimalLevel ? (
                                                <span className="badge badge-danger">Low Stock</span>
                                            ) : (
                                                <span className="badge badge-success">In Stock</span>
                                            )}
                                        </td>
                                        <td>{new Date(med.expiryDate).toLocaleDateString()}</td>
                                        <td style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(med)} className="btn" style={{ padding: '6px 12px', background: 'var(--primary-color)', color: '#fff', fontSize: '0.8rem' }}>Edit</button>
                                            <button onClick={() => handleDelete(med._id)} className="btn" style={{ padding: '6px 12px', background: 'var(--danger-color)', color: '#fff', fontSize: '0.8rem' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMedicines.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No medicines found</td>
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

export default Inventory;
