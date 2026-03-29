const express = require('express');
const router = express.Router();
const { loginCustomer, getCustomerHistory } = require('../controllers/customerController');

router.post('/login', loginCustomer);
router.get('/history/:mobile', getCustomerHistory);

module.exports = router;
