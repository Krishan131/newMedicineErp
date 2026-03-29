const Medicine = require('../models/Medicine');
const fs = require('fs');
const csv = require('csv-parser');

// @route   GET api/medicines
// @desc    Get all medicines
// @access  Private
exports.getMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find().sort({ date: -1 });
        res.json(medicines);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/medicines/:id
// @desc    Get medicine by ID
// @access  Private
exports.getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }

        // Make sure user owns the medicine
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @route   POST api/medicines
// @desc    Add new medicine
// @access  Private (Admin/Staff)
exports.addMedicine = async (req, res) => {
    const { name, quantity, price, expiryDate, minStockLevel } = req.body;

    try {
        const newMedicine = new Medicine({
            user: req.user.id, // Assign to current user
            name,
            quantity,
            price,
            expiryDate,
            minStockLevel
        });

        const medicine = await newMedicine.save();
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   PUT api/medicines/:id
// @desc    Update medicine
// @access  Private
exports.updateMedicine = async (req, res) => {
    const { name, quantity, price, expiryDate, minStockLevel } = req.body;

    // Build medicine object
    const medicineFields = {};
    if (name) medicineFields.name = name;
    if (quantity !== undefined) medicineFields.quantity = quantity;
    if (price !== undefined) medicineFields.price = price;
    if (expiryDate) medicineFields.expiryDate = expiryDate;
    if (minStockLevel !== undefined) medicineFields.minStockLevel = minStockLevel;

    try {
        let medicine = await Medicine.findById(req.params.id);

        if (!medicine) return res.status(404).json({ msg: 'Medicine not found' });

        // Make sure user owns the medicine
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { $set: medicineFields },
            { new: true }
        );

        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   DELETE api/medicines/:id
// @desc    Delete medicine
// @access  Private
exports.deleteMedicine = async (req, res) => {
    try {
        let medicine = await Medicine.findById(req.params.id);

        if (!medicine) return res.status(404).json({ msg: 'Medicine not found' });

        // Make sure user owns the medicine
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Medicine.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Medicine removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
// @route   POST api/medicines/upload
// @desc    Upload medicines via CSV
// @access  Private (Admin/Staff)
exports.uploadMedicines = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const results = [];
        let hasError = false;

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                // Validate required fields
                if (!data.name || !data.batchNumber || !data.manufacturer || !data.expiryDate || !data.price || !data.quantity) {
                    console.error('Missing required fields in row:', data);
                    hasError = true;
                    return;
                }
                results.push(data);
            })
            .on('error', (err) => {
                console.error('CSV parsing error:', err);
                hasError = true;
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(400).json({ msg: 'Invalid CSV format: ' + err.message });
            })
            .on('end', async () => {
                if (hasError && res.headersSent === false) {
                    return res.status(400).json({ msg: 'CSV contains invalid data' });
                }

                if (results.length === 0) {
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    return res.status(400).json({ msg: 'CSV is empty' });
                }

                try {
                    // Map results to correct types and fields
                    // Assumes CSV headers: name,batchNumber,manufacturer,expiryDate,price,quantity,minimalLevel
                    const medicines = results.map(row => ({
                        user: req.user.id, // Assign to current user
                        name: row.name.trim(),
                        batchNumber: row.batchNumber.trim(),
                        manufacturer: row.manufacturer.trim(),
                        expiryDate: new Date(row.expiryDate),
                        price: parseFloat(row.price),
                        quantity: parseInt(row.quantity),
                        minimalLevel: parseInt(row.minimalLevel) || 10
                    }));

                    // Validate date format
                    const invalidDates = medicines.filter(m => isNaN(m.expiryDate.getTime()));
                    if (invalidDates.length > 0) {
                        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                        return res.status(400).json({ msg: 'Invalid date format in expiryDate column. Use YYYY-MM-DD format.' });
                    }

                    await Medicine.insertMany(medicines);

                    // Delete file after processing
                    fs.unlinkSync(req.file.path);

                    res.json({ msg: `${medicines.length} medicines uploaded successfully` });
                } catch (err) {
                    console.error('Database error:', err);
                    // Delete file even if error
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    res.status(500).json({ msg: 'Error saving data to DB: ' + err.message });
                }
            });

    } catch (err) {
        console.error(err.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};
