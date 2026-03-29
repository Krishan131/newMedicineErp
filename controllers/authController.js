const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
exports.registerUser = async (req, res) => {
    const { username, email, password, role, shopName } = req.body;

    try {
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
            shopName: shopName || 'My Medicine Shop'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 }, // Long expiry for dev
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, role: user.role, shopName: user.shopName } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, role: user.role, shopName: user.shopName || 'My Medicine Shop' } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
