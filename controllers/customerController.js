const Sales = require('../models/Sales');
// Note: Customer auth is lightweight for this MVP (Mobile Number only)
// In production, an OTP system would be required here.

// @route   POST api/customer/login
// @desc    Verify customer exists (checking if they have any past orders)
// @access  Public
exports.loginCustomer = async (req, res) => {
    const { mobile } = req.body;

    try {
        // Check if any sale exists with this contact
        // We use findOne just to verify existence quickly
        const sale = await Sales.findOne({ customerContact: mobile });

        if (!sale) {
            return res.status(404).json({ msg: 'No purchase history found for this number' });
        }

        // Return success (Frontend can then store mobile in localstorage)
        res.json({ success: true, mobile });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/customer/history/:mobile
// @desc    Get purchase history for a mobile number
// @access  Public (Protected by knowledge of mobile number in this MVP)
exports.getCustomerHistory = async (req, res) => {
    try {
        const { mobile } = req.params;

        // Find sales, populate 'soldBy' to get Shop Name (username of retailer)
        // Also populate medicine names if needed, but they are embedded in items array
        const history = await Sales.find({ customerContact: mobile })
            .sort({ createdAt: -1 })
            .populate('soldBy', 'username shopName'); // Fetch shopName too

        res.json(history);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
