const Medicine = require('../models/Medicine');
const fs = require('fs');
const csv = require('csv-parser');

const normalizeCsvHeader = (header = '') => header
    .toString()
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

const FIELD_ALIASES = {
    name: ['name', 'medicinename', 'medicine'],
    batchNumber: ['batchnumber', 'batchno', 'batch'],
    manufacturer: ['manufacturer', 'company', 'maker', 'brand'],
    expiryDate: ['expirydate', 'expiry', 'expdate', 'expirydt'],
    price: ['price', 'mrp', 'rate', 'unitprice'],
    quantity: ['quantity', 'qty', 'stock'],
    minimalLevel: ['minimallevel', 'minlevel', 'minstocklevel', 'minimumlevel']
};

const REQUIRED_FIELDS = ['name', 'batchNumber', 'manufacturer', 'expiryDate', 'price', 'quantity'];

const getValueFromAliases = (row, aliases = []) => {
    for (const alias of aliases) {
        const value = row[alias];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }

    return '';
};

const getMissingFields = (rawRow) => REQUIRED_FIELDS.filter((field) => {
    const value = getValueFromAliases(rawRow, FIELD_ALIASES[field]);
    return !value;
});

const parseNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

// @route   GET api/medicines
// @desc    Get all medicines
// @access  Private
exports.getMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find({ user: req.user.id }).sort({ createdAt: -1 });
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
    let uploadPath = '';

    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        uploadPath = req.file.path;

        const medicines = [];
        const rowErrors = [];
        let rowIndex = 1;

        await new Promise((resolve, reject) => {
            fs.createReadStream(uploadPath)
                .pipe(csv({
                    mapHeaders: ({ header }) => normalizeCsvHeader(header)
                }))
                .on('data', (rawRow) => {
                    const currentRow = rowIndex;
                    rowIndex += 1;

                    const missingFields = getMissingFields(rawRow);
                    if (missingFields.length > 0) {
                        rowErrors.push(`Row ${currentRow}: Missing required fields -> ${missingFields.join(', ')}`);
                        return;
                    }

                    const name = getValueFromAliases(rawRow, FIELD_ALIASES.name);
                    const batchNumber = getValueFromAliases(rawRow, FIELD_ALIASES.batchNumber);
                    const manufacturer = getValueFromAliases(rawRow, FIELD_ALIASES.manufacturer);
                    const expiryDateRaw = getValueFromAliases(rawRow, FIELD_ALIASES.expiryDate);
                    const priceRaw = getValueFromAliases(rawRow, FIELD_ALIASES.price);
                    const quantityRaw = getValueFromAliases(rawRow, FIELD_ALIASES.quantity);
                    const minimalLevelRaw = getValueFromAliases(rawRow, FIELD_ALIASES.minimalLevel);

                    const expiryDate = new Date(expiryDateRaw);
                    if (Number.isNaN(expiryDate.getTime())) {
                        rowErrors.push(`Row ${currentRow}: Invalid expiryDate '${expiryDateRaw}'. Use YYYY-MM-DD format.`);
                        return;
                    }

                    const price = parseNumber(priceRaw);
                    if (price === null || price < 0) {
                        rowErrors.push(`Row ${currentRow}: Invalid price '${priceRaw}'.`);
                        return;
                    }

                    const quantity = parseInteger(quantityRaw);
                    if (quantity === null || quantity < 0) {
                        rowErrors.push(`Row ${currentRow}: Invalid quantity '${quantityRaw}'.`);
                        return;
                    }

                    let minimalLevel = 10;
                    if (minimalLevelRaw) {
                        const parsedMinimalLevel = parseInteger(minimalLevelRaw);
                        if (parsedMinimalLevel === null || parsedMinimalLevel < 0) {
                            rowErrors.push(`Row ${currentRow}: Invalid minimalLevel '${minimalLevelRaw}'.`);
                            return;
                        }

                        minimalLevel = parsedMinimalLevel;
                    }

                    medicines.push({
                        user: req.user.id,
                        name,
                        batchNumber,
                        manufacturer,
                        expiryDate,
                        price,
                        quantity,
                        minimalLevel
                    });
                })
                .on('error', (err) => {
                    reject(new Error(`Invalid CSV format: ${err.message}`));
                })
                .on('end', resolve);
        });

        if (rowErrors.length > 0) {
            return res.status(400).json({
                msg: rowErrors[0],
                errors: rowErrors.slice(0, 10),
                expectedColumns: [
                    'name',
                    'batchNumber',
                    'manufacturer',
                    'expiryDate',
                    'price',
                    'quantity',
                    'minimalLevel(optional)'
                ]
            });
        }

        if (medicines.length === 0) {
            return res.status(400).json({ msg: 'CSV is empty or has no valid medicine rows' });
        }

        await Medicine.insertMany(medicines);

        return res.json({ msg: `${medicines.length} medicines uploaded successfully` });

    } catch (err) {
        console.error(err.message);
        const lowerMessage = (err.message || '').toLowerCase();
        const isCsvParsingError = lowerMessage.includes('invalid csv format');

        if (isCsvParsingError) {
            return res.status(400).json({ msg: err.message });
        }

        return res.status(500).json({ msg: `Error saving data to DB: ${err.message}` });
    } finally {
        if (uploadPath && fs.existsSync(uploadPath)) {
            fs.unlinkSync(uploadPath);
        }
    }
};
