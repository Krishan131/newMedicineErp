const Sales = require('../models/Sales');
const Medicine = require('../models/Medicine');

const normalizePhone = (value = '') => value.toString().replace(/\D/g, '');

// @route   POST api/sales
// @desc    Create new invoice and update inventory
// @access  Private (Staff/Admin)
exports.createInvoice = async (req, res) => {
    const { customerName, customerContact, items, paymentMethod } = req.body;

    try {
        if (!customerName || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ msg: 'Customer name and at least one item are required' });
        }

        const normalizedCustomerContact = customerContact ? normalizePhone(customerContact) : '';
        if (customerContact && normalizedCustomerContact.length < 10) {
            return res.status(400).json({ msg: 'Please provide a valid customer contact number' });
        }

        let totalAmount = 0;
        const processedItems = [];

        // Check stock and calculate total
        for (const item of items) {
            if (!item.medicine || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ msg: 'Each item must have medicine and quantity > 0' });
            }

            const medicine = await Medicine.findById(item.medicine);

            if (!medicine) {
                return res.status(404).json({ msg: `Medicine not found for ID: ${item.medicine}` });
            }

            // Verify medicine belongs to user
            if (medicine.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: `Unauthorized access to medicine: ${medicine.name}` });
            }

            if (medicine.quantity < item.quantity) {
                return res.status(400).json({ msg: `Insufficient stock for ${medicine.name}` });
            }

            // Deduct stock
            medicine.quantity -= item.quantity;
            await medicine.save();

            processedItems.push({
                medicine: medicine._id,
                name: medicine.name,
                batchNumber: medicine.batchNumber,
                expiryDate: medicine.expiryDate,
                purchaseDate: new Date(),
                quantity: item.quantity,
                price: medicine.price,
                total: medicine.price * item.quantity
            });

            totalAmount += medicine.price * item.quantity;
        }

        const newSales = new Sales({
            customerName,
            customerContact: normalizedCustomerContact,
            items: processedItems,
            totalAmount,
            paymentMethod,
            soldBy: req.user.id
        });

        const invoice = await newSales.save();

        // Send response IMMEDIATELY so frontend doesn't timeout
        res.json(invoice);

        // Perform PDF Generation in the BACKGROUND (for storage/future use)
        (async () => {
            try {
                const { generateInvoicePDF } = require('../services/pdfService');
                const path = require('path');
                const fs = require('fs');

                // Create invoices directory if not exists
                const invoiceDir = path.join(__dirname, '..', 'invoices');
                if (!fs.existsSync(invoiceDir)) {
                    fs.mkdirSync(invoiceDir);
                }

                const invoicePath = path.join(invoiceDir, `invoice_${invoice._id}.pdf`);
                await generateInvoicePDF(invoice, invoicePath);

                console.log(`Invoice PDF generated: ${invoicePath}`);

            } catch (pdfErr) {
                console.error('Error in Background PDF generation:', pdfErr);
            }
        })();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/sales
// @desc    Get all invoices for current user
// @access  Private
exports.getInvoices = async (req, res) => {
    try {
        // Filter by soldBy (current user)
        const invoices = await Sales.find({ soldBy: req.user.id }).sort({ date: -1 }).populate('soldBy', 'username');
        res.json(invoices);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/sales/:id
// @desc    Get invoice by ID
// @access  Private
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Sales.findById(req.params.id).populate('soldBy', 'username').populate('items.medicine');
        if (!invoice) return res.status(404).json({ msg: 'Invoice not found' });

        // Ensure invoice belongs to user
        if (invoice.soldBy._id.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        res.json(invoice);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
