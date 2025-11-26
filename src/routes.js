const express = require('express');
const router = express.Router();

// --- CORREÇÃO AQUI: Adicionei o 's' em controllers ---
const AuthController = require('./controllers/AuthController');
const ProjetoController = require('./controllers/ProjetoController');
// -----------------------------------------------------

const moverToken = require('./middleware/moverToken');
const auth = require('./middleware/authMiddleware');

router.post('/login', AuthController.login);

router.use(moverToken);
router.use(auth);

router.post('/medicoes', ProjetoController.medicoes);
router.post('/alertas', ProjetoController.alertas);
router.post('/abastecimentos', ProjetoController.abastecimentos);

module.exports = router;