import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/api';

const Sales = () => {
    const [medicines, setMedicines] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [qty, setQty] = useState(1);
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const res = await api.get('/medicines');
                setMedicines(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchMedicines();
    }, []);

    const addToCart = () => {
        if (!selectedMedicine) return;
        const med = medicines.find(m => m._id === selectedMedicine);

        if (med.quantity < qty) {
            alert('Insufficient stock!');
            return;
        }

        const item = {
            medicine: med._id,
            name: med.name,
            price: med.price,
            quantity: parseInt(qty),
            total: med.price * parseInt(qty)
        };

        setCart([...cart, item]);
        setSelectedMedicine('');
        setQty(1);
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + item.total, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || !customerName) {
            alert('Cart is empty or Customer Name is missing!');
            return;
        }

        try {
            await api.post('/sales', {
                customerName,
                items: cart,
                paymentMethod: 'cash'
            });
            alert('Invoice Created Successfully!');
            setCart([]);
            setCustomerName('');
            // Refresh medicines to update stock
            const res = await api.get('/medicines');
            setMedicines(res.data);
        } catch (err) {
            console.error(err);
            alert('Checkout Failed');
        }
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h2>Billing Counter</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>

                    {/* Selection Area */}
                    <div className="card">
                        <h3>Add Item</h3>
                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Customer Name</label>
                            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter Customer Name" />

                            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>Select Medicine</label>
                            <select
                                value={selectedMedicine}
                                onChange={(e) => setSelectedMedicine(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="">-- Select Medicine --</option>
                                {medicines.map(med => (
                                    <option key={med._id} value={med._id} disabled={med.quantity === 0}>
                                        {med.name} (Stock: {med.quantity}) - ₹{med.price}
                                    </option>
                                ))}
                            </select>

                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Quantity</label>
                            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />

                            <button onClick={addToCart} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Add to Cart</button>
                        </div>
                    </div>

                    {/* Cart/Invoice Preview */}
                    <div className="card">
                        <h3>Invoice Preview</h3>
                        <div style={{ marginTop: '1rem', minHeight: '200px' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px' }}>{item.name}</td>
                                            <td style={{ padding: '8px' }}>{item.quantity}</td>
                                            <td style={{ padding: '8px' }}>{item.price}</td>
                                            <td style={{ padding: '8px' }}>{item.total}</td>
                                            <td style={{ padding: '8px' }}>
                                                <button onClick={() => removeFromCart(index)} style={{ color: 'red', background: 'none' }}>x</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #ddd', textAlign: 'right' }}>
                            <h3>Total: ₹{calculateTotal()}</h3>
                            <button onClick={handleCheckout} className="btn btn-success" style={{ marginTop: '1rem', width: '100%' }}>Generate Invoice</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sales;
