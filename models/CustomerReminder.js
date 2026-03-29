const mongoose = require('mongoose');

const CustomerReminderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sales',
        required: true
    },
    itemIndex: {
        type: Number,
        required: true,
        min: 0
    },
    itemKey: {
        type: String,
        required: true
    },
    consumedAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

CustomerReminderSchema.index({ customer: 1, itemKey: 1 }, { unique: true });

module.exports = mongoose.model('CustomerReminder', CustomerReminderSchema);
