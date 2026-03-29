import React, { useState } from 'react';
import api from '../api/api';

const BillingSection = ({ medicines, onCheckoutSuccess }) => {
    const [cart, setCart] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [qty, setQty] = useState(1);
    const [customerName, setCustomerName] = useState('');
    const [customerContact, setCustomerContact] = useState('');

    const addToCart = () => {
        if (!selectedMedicine) return;
        const med = medicines.find(m => m._id === selectedMedicine);

        if (!med) return;

        if (med.quantity < qty) {
            alert(`Insufficient stock! Only ${med.quantity} available.`);
            return;
        }

        // Check if item already in cart and sum quantities
        const existingItemIndex = cart.findIndex(item => item.medicine === med._id);
        if (existingItemIndex > -1) {
            const newCart = [...cart];
            const newQty = newCart[existingItemIndex].quantity + parseInt(qty);
            if (med.quantity < newQty) {
                alert(`Cannot add more. Total in cart would exceed stock (${med.quantity}).`);
                return;
            }
            newCart[existingItemIndex].quantity = newQty;
            newCart[existingItemIndex].total = med.price * newQty;
            setCart(newCart);
        } else {
            const item = {
                medicine: med._id,
                name: med.name,
                price: med.price,
                quantity: parseInt(qty),
                total: med.price * parseInt(qty)
            };
            setCart([...cart, item]);
        }

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
            const response = await api.post('/sales', {
                customerName,
                customerContact,
                items: cart,
                paymentMethod: 'cash'
            });

            // Generate invoice message for WhatsApp
            let invoiceMessage = `*Medicine Invoice* 📋\n\n`;
            invoiceMessage += `Thank you *${customerName}*!\n\n`;
            invoiceMessage += `*Items Ordered:*\n`;
            cart.forEach(item => {
                invoiceMessage += `• ${item.name} x${item.quantity} = ₹${item.total}\n`;
            });
            invoiceMessage += `\n*Total Amount:* ₹${calculateTotal().toFixed(2)}\n`;
            invoiceMessage += `\nThank you for your purchase! 🙏`;

            // Send WhatsApp message if phone number is provided
            if (customerContact) {
                try {
                    await api.post('/whatsapp/send', {
                        phoneNumber: customerContact,
                        message: invoiceMessage
                    });
                } catch (whatsappErr) {
                    console.error('WhatsApp message failed:', whatsappErr);
                    // Don't fail the checkout if WhatsApp fails
                    alert('Invoice Created! WhatsApp message could not be sent (Client may not be connected).');
                }
            }

            alert('Invoice Created Successfully!');
            setCart([]);
            setCustomerName('');
            setCustomerContact('');
            if (onCheckoutSuccess) onCheckoutSuccess();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.msg || err.message || 'Checkout Failed';
            alert(`Checkout Failed: ${errorMsg}`);
        }
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--primary-color)', display: 'inline-block', paddingBottom: '5px' }}>
                Billing Counter
            </h3>
            <div className="billing-container">

                {/* Left: Add to Cart Form */}
                <div className="card">
                    <h4 style={{ marginBottom: '1rem', color: 'var(--secondary-color)' }}>New Order</h4>
                    <div>
                        <div className="form-group">
                            <label>Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Enter Customer Name"
                            />
                        </div>

                        <div className="form-group">
                            <label>WhatsApp Number</label>
                            <input
                                type="text"
                                value={customerContact}
                                onChange={(e) => setCustomerContact(e.target.value)}
                                placeholder="Enter Mobile (e.g. 9876543210)"
                            />
                        </div>

                        <div className="form-group">
                            <label>Select Medicine</label>
                            <select
                                value={selectedMedicine}
                                onChange={(e) => setSelectedMedicine(e.target.value)}
                            >
                                <option value="">-- Select Medicine --</option>
                                {medicines.map(med => (
                                    <option key={med._id} value={med._id} disabled={med.quantity === 0}>
                                        {med.name} (Qty: {med.quantity}) - ₹{med.price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                                placeholder="Qty"
                            />
                        </div>

                        <button onClick={addToCart} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            Add to Cart
                        </button>
                    </div>
                </div>

                {/* Right: Cart & Actions */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>Current Invoice</h4>
                        <span className="badge badge-success">{cart.length} Items</span>
                    </div>

                    <div className="table-container" style={{ flex: 1, minHeight: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: '500' }}>{item.name}</td>
                                        <td>₹{item.price}</td>
                                        <td>{item.quantity}</td>
                                        <td>₹{item.total}</td>
                                        <td>
                                            <button onClick={() => removeFromCart(index)} style={{ color: 'var(--danger-color)', background: 'none', fontSize: '1.2rem' }}>
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color)', opacity: 0.6 }}>
                                            Cart is empty
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-color)', opacity: 0.8 }}>Grand Total:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', marginLeft: '10px', color: 'var(--secondary-color)' }}>
                                ₹{calculateTotal().toFixed(2)}
                            </span>
                        </div>
                        <button onClick={handleCheckout} className="btn btn-success" disabled={cart.length === 0} style={{ padding: '12px 30px', opacity: cart.length === 0 ? 0.6 : 1 }}>
                            Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingSection;
