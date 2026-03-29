const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
	registerUser,
	loginUser,
	getMyProfile,
	updateMyProfile,
	updateShopLocation,
	updateShopLiveStatus
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateMyProfile);
router.patch('/location', auth, updateShopLocation);
router.patch('/live-status', auth, updateShopLiveStatus);

module.exports = router;
