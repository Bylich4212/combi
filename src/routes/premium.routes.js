const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premium.controller');
const upload = require('../middlewares/upload');

router.post('/', upload.single('comprobante'), premiumController.submitPremium);
router.get('/status', premiumController.getPremiumStatus);

module.exports = router;
