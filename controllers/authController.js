const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { reverseGeocode } = require('../services/geocodingService');

const normalizePhone = (value = '') => value.toString().replace(/\D/g, '');

const hasCoordinates = (location) => (
    !!location &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    Number.isFinite(location.coordinates[0]) &&
    Number.isFinite(location.coordinates[1])
);

const parseCoordinateNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toLocationPayload = (location) => {
    if (!hasCoordinates(location)) return null;

    return {
        latitude: location.coordinates[1],
        longitude: location.coordinates[0]
    };
};

const toUserPayload = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    shopName: user.shopName || 'My Medicine Shop',
    shopPhone: user.shopPhone || '',
    shopAddress: user.shopAddress || '',
    shopDescription: user.shopDescription || '',
    isLocationEnabled: !!user.isLocationEnabled,
    isLive: !!user.isLive,
    shopLocation: toLocationPayload(user.shopLocation),
    locationUpdatedAt: user.locationUpdatedAt || null
});

const signUserToken = (user) => new Promise((resolve, reject) => {
    const payload = {
        user: {
            id: user.id,
            role: user.role
        }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(token);
    });
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
exports.registerUser = async (req, res) => {
    const {
        username,
        email,
        password,
        role,
        shopName,
        shopPhone,
        shopAddress,
        shopDescription
    } = req.body;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({ msg: 'Username, email and password are required' });
        }

        const normalizedShopPhone = shopPhone ? normalizePhone(shopPhone) : '';
        if (shopPhone && normalizedShopPhone.length < 10) {
            return res.status(400).json({ msg: 'Please provide a valid shop phone number' });
        }

        // Check if user exists by Email OR Username
        let user = await User.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (user) {
            return res.status(400).json({ msg: 'User already exists (Email or Username taken)' });
        }

        user = new User({
            username,
            email,
            password,
            role,
            shopName: shopName || 'My Medicine Shop',
            shopPhone: normalizedShopPhone,
            shopAddress: shopAddress ? shopAddress.trim() : '',
            shopDescription: shopDescription ? shopDescription.trim() : ''
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const token = await signUserToken(user);

        return res.json({ token, user: toUserPayload(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
};

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ msg: 'Email and password are required' });
        }

        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const token = await signUserToken(user);
        return res.json({ token, user: toUserPayload(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
};

// @route   GET api/auth/me
// @desc    Get retailer profile
// @access  Private
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        return res.json({ user: toUserPayload(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// @route   PUT api/auth/me
// @desc    Update retailer profile details
// @access  Private
exports.updateMyProfile = async (req, res) => {
    const { shopName, shopPhone, shopAddress, shopDescription } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (shopName !== undefined) {
            if (!shopName || !shopName.trim()) {
                return res.status(400).json({ msg: 'Shop name is required' });
            }
            user.shopName = shopName.trim();
        }

        if (shopPhone !== undefined) {
            const normalizedShopPhone = shopPhone ? normalizePhone(shopPhone) : '';
            if (shopPhone && normalizedShopPhone.length < 10) {
                return res.status(400).json({ msg: 'Please provide a valid shop phone number' });
            }
            user.shopPhone = normalizedShopPhone;
        }

        if (shopAddress !== undefined) {
            user.shopAddress = shopAddress ? shopAddress.trim() : '';
        }

        if (shopDescription !== undefined) {
            user.shopDescription = shopDescription ? shopDescription.trim() : '';
        }

        await user.save();

        return res.json({ user: toUserPayload(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// @route   PATCH api/auth/location
// @desc    Update retailer shop location and location service status
// @access  Private
exports.updateShopLocation = async (req, res) => {
    const { latitude, longitude, isLocationEnabled } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const hasLocationPayload = latitude !== undefined || longitude !== undefined;
        let locationMessage = '';
        let locationWarning = '';

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

            user.shopLocation = {
                type: 'Point',
                coordinates: [parsedLongitude, parsedLatitude]
            };
            user.locationUpdatedAt = new Date();

            const detectedAddress = await reverseGeocode(parsedLatitude, parsedLongitude);

            if (detectedAddress) {
                user.shopAddress = detectedAddress;
                locationMessage = 'Shop location detected and address updated automatically';
            } else {
                locationMessage = 'Shop location detected';

                if (user.shopAddress) {
                    locationWarning = 'Location saved, but address lookup failed. Existing shop address was kept.';
                } else {
                    locationWarning = 'Location saved, but address lookup failed. Please enter shop address manually.';
                }
            }
        }

        if (typeof isLocationEnabled === 'boolean') {
            if (isLocationEnabled && !hasCoordinates(user.shopLocation)) {
                return res.status(400).json({ msg: 'Detect shop location before enabling location service' });
            }

            user.isLocationEnabled = isLocationEnabled;

            if (!isLocationEnabled) {
                user.isLive = false;
            }

            if (!hasLocationPayload) {
                locationMessage = isLocationEnabled ? 'Location service enabled' : 'Location service disabled and shop set offline';
            }
        }

        if (!hasLocationPayload && typeof isLocationEnabled !== 'boolean') {
            return res.status(400).json({ msg: 'No location changes provided' });
        }

        await user.save();

        return res.json({
            user: toUserPayload(user),
            message: locationMessage || 'Location settings updated',
            warning: locationWarning || null
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// @route   PATCH api/auth/live-status
// @desc    Toggle retailer live status
// @access  Private
exports.updateShopLiveStatus = async (req, res) => {
    const { isLive } = req.body;

    try {
        if (typeof isLive !== 'boolean') {
            return res.status(400).json({ msg: 'isLive must be a boolean' });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (isLive && (!user.isLocationEnabled || !hasCoordinates(user.shopLocation))) {
            return res.status(400).json({ msg: 'Enable location service with valid location before going live' });
        }

        user.isLive = isLive;
        await user.save();

        return res.json({ user: toUserPayload(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};
