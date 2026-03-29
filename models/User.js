const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    shopName: {
        type: String,
        required: true, // Making it required for all new retailer registrations
        default: 'My Medicine Shop' // Default for existing users to avoid breakage
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
