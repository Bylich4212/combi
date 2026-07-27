const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');

router.get('/rates', apiController.getRates);
router.get('/history', apiController.getHistory);
router.get('/pronostico', apiController.getPronostico);

module.exports = router;
