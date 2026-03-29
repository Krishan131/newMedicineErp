import React, { useState, useEffect } from 'react';
import api from '../api/api';
import './WhatsAppModal.css';

const WhatsAppModal = ({ isOpen, onClose }) => {
    const [qrCode, setQrCode] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchQRCode();
            const interval = setInterval(() => {
                checkStatus();
            }, 3000); // Check status every 3 seconds
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const fetchQRCode = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get('/whatsapp/qr');
            setQrCode(res.data.qr);
            setIsConnected(res.data.isConnected);
        } catch (err) {
            setError('Failed to generate QR code. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setIsConnected(res.data.connected);
        } catch (err) {
            console.error('Error checking status:', err);
        }
    };

    const handleRefresh = () => {
        setRefreshCount(refreshCount + 1);
        fetchQRCode();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content whatsapp-modal">
                <div className="modal-header">
                    <h2>Connect WhatsApp</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}

                    {isConnected ? (
                        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#e6f7e6', borderRadius: '8px' }}>
                            <h3 style={{ color: 'green', marginBottom: '1rem' }}>✓ WhatsApp Connected!</h3>
                            <p>Your WhatsApp is now connected. Messages will be sent to customers automatically when you checkout.</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '14px' }}>
                                📱 Scan this QR code with your phone to connect WhatsApp
                            </p>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p>Loading QR code...</p>
                                </div>
                            ) : qrCode ? (
                                <div style={{ textAlign: 'center' }}>
                                    <img 
                                        src={qrCode} 
                                        alt="WhatsApp QR Code" 
                                        style={{
                                            width: '300px',
                                            height: '300px',
                                            border: '2px solid #ddd',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '1rem' }}>
                                        If QR code doesn't appear, click Refresh
                                    </p>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                    <p>No QR code available. Click Refresh to try again.</p>
                                </div>
                            )}

                            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                                <p>⏳ Waiting for scan...</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button 
                        onClick={handleRefresh} 
                        className="btn btn-secondary"
                        disabled={loading || isConnected}
                    >
                        Refresh QR
                    </button>
                    <button 
                        onClick={onClose} 
                        className="btn btn-primary"
                    >
                        {isConnected ? 'Done' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppModal;
