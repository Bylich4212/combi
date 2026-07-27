const express = require('express');
const router = express.Router();
const p2pController = require('../controllers/p2p.controller');
const { verifyToken } = require('../middlewares/auth');

// Rutas públicas
router.get('/', p2pController.getAds);

// Rutas protegidas (solo usuarios logueados pueden crear anuncios)
router.post('/', verifyToken, p2pController.createAd);

module.exports = router;
