const express = require('express');
const router = express.Router();

const AuthController = require('./controller/AuthController');
const ProjetoController = require('./controller/ProjetoController');

const moverTokenMiddleware = require('./middleware/moverToken');
const authMiddleware = require('./middleware/authMiddleware');

// Rota de Login (Pública)
router.post('/login', AuthController.login);

// Grupo de rotas protegidas
// 1. Aplica o MoverToken
// 2. Aplica o AuthMiddleware (checa se o token é valido)
router.use(moverTokenMiddleware);
router.use(authMiddleware);

// Rotas protegidas
router.post('/medicoes', ProjetoController.medicoes);
router.post('/alertas', ProjetoController.alertas);
router.post('/abastecimentos', ProjetoController.abastecimentos);

router.get('/user', (req, res) => {
    res.json(req.user);
});

module.exports = router;