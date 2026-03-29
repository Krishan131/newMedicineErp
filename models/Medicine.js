const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    minimalLevel: {
        type: Number,
        default: 10
    }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', MedicineSchema);
