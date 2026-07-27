const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta de prueba protegida
router.get('/me', verifyToken, (req, res) => {
  res.json({ message: 'Ruta protegida, acceso concedido', user: req.user });
});

module.exports = router;
