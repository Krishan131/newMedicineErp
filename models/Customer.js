const mongoose = require('mongoose');

const GeoPointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: function (coords) {
                if (!Array.isArray(coords) || coords.length !== 2) return false;
                const [longitude, latitude] = coords;
                return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
            },
            message: 'Customer location coordinates must be [longitude, latitude]'
        }
    }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    location: {
        type: GeoPointSchema,
        default: null
    },
    isLocationEnabled: {
        type: Boolean,
        default: false
    },
    locationUpdatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

CustomerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Customer', CustomerSchema);
