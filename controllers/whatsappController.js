const { getQRCode, isWhatsAppConnected, sendMessage } = require('../services/whatsappService');

// @route   GET api/whatsapp/qr
// @desc    Get WhatsApp QR Code
// @access  Private
exports.getQRCode = async (req, res) => {
    try {
        const result = await getQRCode();
        
        if (result) {
            res.json(result);
        } else {
            res.status(500).json({ msg: 'Failed to generate QR code' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error generating QR code' });
    }
};

// @route   GET api/whatsapp/status
// @desc    Check WhatsApp connection status
// @access  Private
exports.getStatus = async (req, res) => {
    try {
        const connected = isWhatsAppConnected();
        res.json({ connected });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error checking status' });
    }
};

// @route   POST api/whatsapp/send
// @desc    Send message via WhatsApp
// @access  Private
exports.sendWhatsAppMessage = async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({ msg: 'Phone number and message are required' });
        }

        const result = await sendMessage(phoneNumber, message);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Error sending message' });
    }
};
