# WhatsApp Integration Setup Guide

## Overview
This guide explains how to set up and use WhatsApp integration in your Medicine ERP system.

## Features
- QR code scanning for WhatsApp Web connection
- Automatic invoice sending via WhatsApp when checkout completes
- Connection status monitoring
- Support for Indian phone numbers (automatically adds country code)

## Installation

### Backend Setup
1. Install dependencies:
```bash
cd d:\medicineERP-main\medicineERP-main
npm install
```

### Frontend Setup
1. Install dependencies:
```bash
cd client
npm install
```

## How to Use

### Step 1: Connect WhatsApp
1. On the Dashboard, click the **"📱 Connect WhatsApp"** button
2. A modal will open showing a QR code
3. Open WhatsApp on your phone and go to **Settings → Linked Devices → Link a Device**
4. Scan the displayed QR code with your phone
5. Wait for the connection to establish (the modal will show "✓ WhatsApp Connected!")

### Step 2: Use Billing Counter
1. Fill in the **Customer Name** field
2. Enter the customer's **WhatsApp Number** (10 digits, e.g., 9876543210)
3. Add medicines to cart
4. Click **Checkout**
5. Invoice will be automatically sent to the customer's WhatsApp!

## Troubleshooting

### QR Code Not Appearing
- Click "Refresh QR" button
- Make sure your backend server is running
- Check browser console for errors

### Message Not Sending
- Ensure WhatsApp is connected (green checkmark in modal)
- Verify the phone number format is correct (10 digits for India)
- Check browser console and server logs for errors

### WhatsApp Disconnected
- The connection may drop if:
  - WhatsApp is opened on another device/browser
  - Browser tab is closed/refreshed for long time
  - Network connection is lost
- Reconnect by clicking "Connect WhatsApp" again

## Technical Details

### Backend Services
- **whatsappService.js**: Manages WhatsApp Web JS client, QR code generation, and message sending
- **whatsappController.js**: API endpoints handler
- **whatsappRoutes.js**: Express routes

### Frontend Components
- **WhatsAppModal.jsx**: Modal for QR code display and connection status
- **BillingSection.jsx**: Updated to send messages on checkout

### Env Variables
No special env variables needed for WhatsApp. The system stores WhatsApp session locally.

## Message Format
Invoices are sent in the following format:
```
Medicine Invoice 📋

Thank you [Customer Name]!

Items Ordered:
• Medicine Name x Qty = ₹Amount
• Medicine Name x Qty = ₹Amount

Total Amount: ₹XXXX

Thank you for your purchase! 🙏
```

## Important Notes
⚠️ **WhatsApp Web JS Limitations:**
- WhatsApp must remain open in one browser tab
- Don't open WhatsApp Web in other browsers simultaneously
- Session may disconnect if WhatsApp is opened on phone for too long
- Message sending requires active internet connection

## Error Messages

| Error | Solution |
|-------|----------|
| "WhatsApp is not connected" | Click "Connect WhatsApp" and scan QR code |
| "Message sending failed" | Ensure WhatsApp is still connected and number is valid |
| "Failed to generate QR code" | Restart backend server |

## Restart / Reset

To reset WhatsApp connection:
1. Delete the `.wwebjs_auth` folder from your project root (WhatsApp session data)
2. Restart the server
3. Click "Connect WhatsApp" again and scan new QR code
