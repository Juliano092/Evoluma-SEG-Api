const express = require('express');
const router = express.Router();

// --- CORREÇÃO AQUI: Adicionei o 's' em controllers ---
const AuthController = require('./controllers/AuthController');
const ProjetoController = require('./controllers/ProjetoController');
const RecursoController = require('./controllers/RecursoController');
// -----------------------------------------------------

const moverToken = require('./middleware/moverToken');
const auth = require('./middleware/authMiddleware');

router.post('/login', AuthController.login);

router.use(moverToken);
router.use(auth);

router.post('/medicoes', ProjetoController.medicoes);
router.post('/alertas', ProjetoController.alertas);
router.post('/abastecimentos', ProjetoController.abastecimentos);
router.post('/veiculos/resumo', ProjetoController.resumoVeiculos);

// Rota REST elegante: Nome do recurso/tabela direto na URL (ex: /recurso/alertas_disparados)
router.post('/recurso/:recurso', RecursoController.consultarPorUrl);

module.exports = router;