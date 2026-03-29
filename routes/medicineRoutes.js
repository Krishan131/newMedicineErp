const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
    getMedicines,
    getMedicineById,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    uploadMedicines
} = require('../controllers/medicineController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temp storage

router.get('/', auth, getMedicines);
router.get('/:id', auth, getMedicineById);
router.post('/', auth, addMedicine);
router.post('/upload', [auth, upload.single('file')], require('../controllers/medicineController').uploadMedicines);
router.put('/:id', auth, updateMedicine);
router.delete('/:id', auth, deleteMedicine);

module.exports = router;
