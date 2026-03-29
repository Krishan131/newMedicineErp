const express = require('express');
const router = express.Router();
const customerAuth = require('../middleware/customerAuthMiddleware');
const {
	registerCustomer,
	loginCustomer,
	getCustomerProfile,
	updateCustomerProfile,
	changeCustomerPassword,
	updateCustomerLocation,
	searchMedicinesFromLiveShops,
	getCustomerHistory,
	getCustomerReminders,
	customerChat,
	markReminderConsumed
} = require('../controllers/customerController');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/me', customerAuth, getCustomerProfile);
router.put('/me', customerAuth, updateCustomerProfile);
router.patch('/password', customerAuth, changeCustomerPassword);
router.patch('/location', customerAuth, updateCustomerLocation);
router.get('/search-medicines', customerAuth, searchMedicinesFromLiveShops);
router.get('/history', customerAuth, getCustomerHistory);
router.get('/reminders', customerAuth, getCustomerReminders);
router.post('/chat', customerAuth, customerChat);
router.patch('/reminders/consume', customerAuth, markReminderConsumed);

module.exports = router;
