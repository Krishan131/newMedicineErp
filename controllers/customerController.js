const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Sales = require('../models/Sales');
const Medicine = require('../models/Medicine');
const CustomerReminder = require('../models/CustomerReminder');

const EXPIRING_SOON_DAYS = 15;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SEARCH_RADIUS_KM = 5;

const normalizePhone = (value = '') => value.toString().replace(/\D/g, '');
const parseCoordinateNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const hasCoordinates = (location) => (
    !!location &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    Number.isFinite(location.coordinates[0]) &&
    Number.isFinite(location.coordinates[1])
);
const toLocationPayload = (location) => {
    if (!hasCoordinates(location)) return null;

    return {
        latitude: location.coordinates[1],
        longitude: location.coordinates[0]
    };
};
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildPhoneCandidates = (phone) => {
    const normalized = normalizePhone(phone);
    const candidates = new Set([normalized]);

    if (normalized.length === 10) {
        candidates.add(`91${normalized}`);
    }

    if (normalized.length > 10 && normalized.startsWith('91')) {
        candidates.add(normalized.slice(-10));
    }

    return Array.from(candidates);
};
const buildItemKey = (saleId, itemIndex) => `${saleId}:${itemIndex}`;

const signCustomerToken = (customer) => new Promise((resolve, reject) => {
    const payload = {
        customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone
        }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(token);
    });
});

const toCustomerPayload = (customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    isLocationEnabled: !!customer.isLocationEnabled,
    location: toLocationPayload(customer.location),
    locationUpdatedAt: customer.locationUpdatedAt || null
});

// @route   POST api/customer/register
// @desc    Register customer account
// @access  Public
exports.registerCustomer = async (req, res) => {
    const { name, phone, password, email } = req.body;

    try {
        if (!name || !phone || !password) {
            return res.status(400).json({ msg: 'Name, phone and password are required' });
        }

        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 10) {
            return res.status(400).json({ msg: 'Please provide a valid phone number' });
        }

        const existingByPhone = await Customer.findOne({ phone: normalizedPhone });
        if (existingByPhone) {
            return res.status(400).json({ msg: 'An account already exists with this phone number' });
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
        if (normalizedEmail) {
            const existingByEmail = await Customer.findOne({ email: normalizedEmail });
            if (existingByEmail) {
                return res.status(400).json({ msg: 'An account already exists with this email' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const customer = await Customer.create({
            name: name.trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            password: hashedPassword
        });

        const token = await signCustomerToken(customer);

        return res.status(201).json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   POST api/customer/login
// @desc    Login customer with name + phone + password
// @access  Public
exports.loginCustomer = async (req, res) => {
    const { name, phone, password } = req.body;

    try {
        if (!name || !phone || !password) {
            return res.status(400).json({ msg: 'Name, phone and password are required' });
        }

        const normalizedPhone = normalizePhone(phone);
        const customer = await Customer.findOne({ phone: normalizedPhone });

        if (!customer) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (customer.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const token = await signCustomerToken(customer);

        return res.json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/me
// @desc    Get customer profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.customer.id);

        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        return res.json({ customer: toCustomerPayload(customer) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PUT api/customer/me
// @desc    Update customer profile
// @access  Private (Customer)
exports.updateCustomerProfile = async (req, res) => {
    const { name, email } = req.body;

    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ msg: 'Name is required' });
        }

        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        if (normalizedEmail) {
            const existingCustomer = await Customer.findOne({
                email: normalizedEmail,
                _id: { $ne: customer._id }
            });

            if (existingCustomer) {
                return res.status(400).json({ msg: 'Email is already used by another account' });
            }

            customer.email = normalizedEmail;
        } else {
            customer.email = undefined;
        }

        customer.name = name.trim();
        await customer.save();

        const token = await signCustomerToken(customer);

        return res.json({
            token,
            customer: toCustomerPayload(customer)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/password
// @desc    Change customer password
// @access  Private (Customer)
exports.changeCustomerPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ msg: 'New password must be at least 6 characters long' });
        }

        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, customer.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(newPassword, salt);
        await customer.save();

        return res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/location
// @desc    Save customer location and enable/disable location service
// @access  Private (Customer)
exports.updateCustomerLocation = async (req, res) => {
    const { latitude, longitude, isLocationEnabled } = req.body;

    try {
        const customer = await Customer.findById(req.customer.id);
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        const hasLocationPayload = latitude !== undefined || longitude !== undefined;

        if (hasLocationPayload) {
            if (latitude === undefined || longitude === undefined) {
                return res.status(400).json({ msg: 'Both latitude and longitude are required' });
            }

            const parsedLatitude = parseCoordinateNumber(latitude);
            const parsedLongitude = parseCoordinateNumber(longitude);

            if (parsedLatitude === null || parsedLongitude === null) {
                return res.status(400).json({ msg: 'Latitude and longitude must be valid numbers' });
            }

            if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
                return res.status(400).json({ msg: 'Location coordinates are out of range' });
            }

            customer.location = {
                type: 'Point',
                coordinates: [parsedLongitude, parsedLatitude]
            };
            customer.locationUpdatedAt = new Date();
        }

        if (typeof isLocationEnabled === 'boolean') {
            if (isLocationEnabled && !hasCoordinates(customer.location)) {
                return res.status(400).json({ msg: 'Detect location first before enabling location service' });
            }

            customer.isLocationEnabled = isLocationEnabled;
        }

        if (!hasLocationPayload && typeof isLocationEnabled !== 'boolean') {
            return res.status(400).json({ msg: 'No location changes provided' });
        }

        await customer.save();

        return res.json({ customer: toCustomerPayload(customer) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/search-medicines
// @desc    Search medicines from nearby live shops
// @access  Private (Customer)
exports.searchMedicinesFromLiveShops = async (req, res) => {
    const queryText = (req.query.q || '').toString().trim();
    const radiusKmRaw = req.query.radiusKm;

    try {
        if (!queryText) {
            return res.status(400).json({ msg: 'Search query is required' });
        }

        const radiusKm = radiusKmRaw !== undefined ? Number(radiusKmRaw) : DEFAULT_SEARCH_RADIUS_KM;
        if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
            return res.status(400).json({ msg: 'radiusKm must be a number between 0 and 100' });
        }

        const customer = await Customer.findById(req.customer.id).select('location isLocationEnabled');
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        if (!customer.isLocationEnabled || !hasCoordinates(customer.location)) {
            return res.status(400).json({ msg: 'Enable and detect your location before searching nearby shops' });
        }

        const radiusMeters = radiusKm * 1000;

        const nearbyShops = await User.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: customer.location.coordinates
                    },
                    distanceField: 'distanceMeters',
                    maxDistance: radiusMeters,
                    spherical: true,
                    query: {
                        isLive: true,
                        isLocationEnabled: true,
                        'shopLocation.coordinates.1': { $exists: true }
                    }
                }
            },
            {
                $project: {
                    shopName: 1,
                    shopAddress: 1,
                    shopPhone: 1,
                    shopDescription: 1,
                    shopLocation: 1,
                    distanceMeters: 1
                }
            }
        ]);

        if (!nearbyShops.length) {
            return res.json({ query: queryText, radiusKm, results: [] });
        }

        const shopMap = new Map();
        const shopIds = [];
        nearbyShops.forEach((shop) => {
            shopMap.set(shop._id.toString(), shop);
            shopIds.push(shop._id);
        });

        const medicines = await Medicine.find({
            user: { $in: shopIds },
            quantity: { $gt: 0 },
            name: { $regex: escapeRegex(queryText), $options: 'i' }
        })
            .select('name price quantity expiryDate manufacturer user')
            .lean();

        const results = medicines
            .map((medicine) => {
                const shop = shopMap.get(medicine.user.toString());
                if (!shop) return null;

                const shopLocationPayload = toLocationPayload(shop.shopLocation);

                return {
                    medicineId: medicine._id,
                    medicineName: medicine.name,
                    manufacturer: medicine.manufacturer,
                    price: medicine.price,
                    quantity: medicine.quantity,
                    expiryDate: medicine.expiryDate,
                    shopId: shop._id,
                    shopName: shop.shopName,
                    shopAddress: shop.shopAddress || '',
                    shopPhone: shop.shopPhone || '',
                    shopDescription: shop.shopDescription || '',
                    shopLocation: shopLocationPayload,
                    distanceMeters: Math.round(shop.distanceMeters),
                    distanceKm: Number((shop.distanceMeters / 1000).toFixed(2))
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a.distanceMeters !== b.distanceMeters) {
                    return a.distanceMeters - b.distanceMeters;
                }
                return a.price - b.price;
            });

        return res.json({ query: queryText, radiusKm, results });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/history
// @desc    Get purchase history for logged in customer
// @access  Private (Customer)
exports.getCustomerHistory = async (req, res) => {
    try {
        const phoneCandidates = buildPhoneCandidates(req.customer.phone);

        const history = await Sales.find({ customerContact: { $in: phoneCandidates } })
            .sort({ createdAt: -1 })
            .populate('soldBy', 'username shopName');

        return res.json(history);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   GET api/customer/reminders
// @desc    Get active reminders for logged in customer
// @access  Private (Customer)
exports.getCustomerReminders = async (req, res) => {
    try {
        const phoneCandidates = buildPhoneCandidates(req.customer.phone);

        const sales = await Sales.find({ customerContact: { $in: phoneCandidates } })
            .sort({ createdAt: -1 })
            .populate('soldBy', 'username shopName')
            .lean();

        if (!sales.length) {
            return res.json({ thresholdDays: EXPIRING_SOON_DAYS, reminders: [] });
        }

        const saleIds = sales.map((sale) => sale._id);

        const consumedRows = await CustomerReminder.find({
            customer: req.customer.id,
            sale: { $in: saleIds }
        })
            .select('itemKey')
            .lean();

        const consumedKeys = new Set(consumedRows.map((row) => row.itemKey));

        const missingExpiryMedicineIds = new Set();
        sales.forEach((sale) => {
            sale.items.forEach((item) => {
                if (!item.expiryDate && item.medicine) {
                    missingExpiryMedicineIds.add(item.medicine.toString());
                }
            });
        });

        const fallbackExpiryMap = new Map();
        if (missingExpiryMedicineIds.size > 0) {
            const medicines = await Medicine.find({
                _id: { $in: Array.from(missingExpiryMedicineIds) }
            })
                .select('_id expiryDate')
                .lean();

            medicines.forEach((medicine) => {
                fallbackExpiryMap.set(medicine._id.toString(), medicine.expiryDate);
            });
        }

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const reminders = [];

        sales.forEach((sale) => {
            sale.items.forEach((item, itemIndex) => {
                const itemKey = buildItemKey(sale._id, itemIndex);
                if (consumedKeys.has(itemKey)) {
                    return;
                }

                let expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
                if (!expiryDate && item.medicine) {
                    const fallback = fallbackExpiryMap.get(item.medicine.toString());
                    if (fallback) {
                        expiryDate = new Date(fallback);
                    }
                }

                if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
                    return;
                }

                const startOfExpiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
                const daysLeft = Math.floor((startOfExpiry - startOfToday) / MS_IN_DAY);

                let status = 'safe';
                if (daysLeft < 0) {
                    status = 'expired';
                } else if (daysLeft <= EXPIRING_SOON_DAYS) {
                    status = 'expiring-soon';
                }

                reminders.push({
                    itemKey,
                    saleId: sale._id,
                    itemIndex,
                    medicineName: item.name,
                    quantity: item.quantity,
                    purchaseDate: item.purchaseDate || sale.createdAt,
                    expiryDate,
                    daysLeft,
                    status,
                    shopName: sale.soldBy?.shopName || sale.soldBy?.username || 'Medicine Shop'
                });
            });
        });

        reminders.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        return res.json({ thresholdDays: EXPIRING_SOON_DAYS, reminders });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};

// @route   PATCH api/customer/reminders/consume
// @desc    Mark a reminder as consumed for logged in customer
// @access  Private (Customer)
exports.markReminderConsumed = async (req, res) => {
    const { saleId, itemIndex } = req.body;

    try {
        if (!saleId || itemIndex === undefined) {
            return res.status(400).json({ msg: 'saleId and itemIndex are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(saleId)) {
            return res.status(400).json({ msg: 'Invalid saleId' });
        }

        const parsedItemIndex = Number.parseInt(itemIndex, 10);
        if (Number.isNaN(parsedItemIndex) || parsedItemIndex < 0) {
            return res.status(400).json({ msg: 'Invalid itemIndex' });
        }

        const sale = await Sales.findOne({
            _id: saleId,
            customerContact: { $in: buildPhoneCandidates(req.customer.phone) }
        }).select('_id items');

        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found for this customer' });
        }

        if (parsedItemIndex >= sale.items.length) {
            return res.status(404).json({ msg: 'Reminder item not found' });
        }

        const itemKey = buildItemKey(sale._id, parsedItemIndex);

        await CustomerReminder.findOneAndUpdate(
            { customer: req.customer.id, itemKey },
            {
                customer: req.customer.id,
                sale: sale._id,
                itemIndex: parsedItemIndex,
                itemKey,
                consumedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ msg: 'Reminder marked as consumed', itemKey });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
};
