const express = require('express');
const router = express.Router();
const { getQRCode, getStatus, sendWhatsAppMessage } = require('../controllers/whatsappController');
const auth = require('../middleware/authMiddleware');

// Get QR Code
router.get('/qr', auth, getQRCode);

// Get WhatsApp connection status
router.get('/status', auth, getStatus);

// Send WhatsApp message
router.post('/send', auth, sendWhatsAppMessage);

module.exports = router;
