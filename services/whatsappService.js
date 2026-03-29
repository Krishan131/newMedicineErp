const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

let whatsappClient = null;
let qrCodeData = null;
let isConnected = false;
let connectionAttempt = false;

const initializeWhatsApp = async () => {
    if (connectionAttempt) {
        return; // Prevent multiple simultaneous initialization attempts
    }

    connectionAttempt = true;

    try {
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                clientId: 'medicine-erp'
            }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        whatsappClient.on('qr', async (qr) => {
            console.log('QR Code received');
            qrCodeData = qr;
            // You can emit this to connected clients via Socket.io if needed
        });

        whatsappClient.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            isConnected = true;
            qrCodeData = null;
        });

        whatsappClient.on('auth_failure', (msg) => {
            console.error('Authentication failed:', msg);
            isConnected = false;
            connectionAttempt = false;
        });

        whatsappClient.on('disconnected', (reason) => {
            console.log('WhatsApp Client disconnected:', reason);
            isConnected = false;
            connectionAttempt = false;
            whatsappClient = null;
        });

        await whatsappClient.initialize();
    } catch (err) {
        console.error('Error initializing WhatsApp:', err.message);
        connectionAttempt = false;
    }
};

const getQRCode = async () => {
    if (!whatsappClient) {
        await initializeWhatsApp();
    }

    if (qrCodeData) {
        try {
            const qrDataUrl = await QRCode.toDataURL(qrCodeData);
            return { qr: qrDataUrl, isConnected: false };
        } catch (err) {
            console.error('Error generating QR Code:', err);
            return null;
        }
    }

    return { qr: null, isConnected };
};

const isWhatsAppConnected = () => {
    return isConnected;
};

const sendMessage = async (phoneNumber, message) => {
    if (!whatsappClient || !isConnected) {
        throw new Error('WhatsApp is not connected. Please scan QR code first.');
    }

    try {
        // Format phone number for WhatsApp (add country code if not present)
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (!formattedNumber.startsWith('91')) {
            formattedNumber = '91' + formattedNumber;
        }

        const chatId = formattedNumber + '@c.us';
        await whatsappClient.sendMessage(chatId, message);
        return { success: true, message: 'Message sent successfully' };
    } catch (err) {
        console.error('Error sending message:', err);
        throw new Error('Failed to send message: ' + err.message);
    }
};

const disconnectWhatsApp = async () => {
    if (whatsappClient) {
        await whatsappClient.destroy();
        whatsappClient = null;
        isConnected = false;
        qrCodeData = null;
        connectionAttempt = false;
    }
};

module.exports = {
    initializeWhatsApp,
    getQRCode,
    isWhatsAppConnected,
    sendMessage,
    disconnectWhatsApp
};
