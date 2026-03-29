const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    customerContact: {
        type: String
    },
    items: [
        {
            medicine: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Medicine'
            },
            name: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            total: {
                type: Number,
                required: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi'],
        default: 'cash'
    },
    soldBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Sales', SalesSchema);
