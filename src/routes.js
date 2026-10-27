const express = require('express');
const router = express.Router();

const AuthController = require('./controllers/AuthController');
const ProjetoController = require('./controllers/ProjetoController');
const RecursoController = require('./controllers/RecursoController');
const VeiculoController = require('./controllers/VeiculoController');
const PosicaoController = require('./controllers/PosicaoController');

const moverToken = require('./middleware/moverToken');
const auth = require('./middleware/authMiddleware');

// Rotas públicas de autenticação e geração de token
router.post('/login', AuthController.login);
router.post('/token', AuthController.gerarTokenCliente);
router.post('/gerar-token', AuthController.gerarTokenCliente);

// Middlewares de autenticação para todas as rotas protegidas
router.use(moverToken);
router.use(auth);

// =========================================================================
// 🚀 NOVAS ROTAS SOLICITADAS PARA INTEGRAÇÃO DO CLIENTE (GET e POST)
// =========================================================================

// 1. Lista de veículos: id do veículo, placa, descrição e se está ativo
router.get('/veiculos', VeiculoController.listar);
router.post('/veiculos', VeiculoController.listar);

// 2. Última posição de toda a frota numa única consulta (direto da tabela ultima_medicao)
router.get('/posicoes/ultimas', PosicaoController.ultimas);
router.post('/posicoes/ultimas', PosicaoController.ultimas);
router.get('/veiculos/posicoes/ultimas', PosicaoController.ultimas);
router.post('/veiculos/posicoes/ultimas', PosicaoController.ultimas);
router.get('/ultimas-posicoes', PosicaoController.ultimas);
router.post('/ultimas-posicoes', PosicaoController.ultimas);

// 3. Histórico por período: todas as posições de um veículo entre duas datas/horas, em ordem, com paginação
router.get('/posicoes/historico', PosicaoController.historico);
router.post('/posicoes/historico', PosicaoController.historico);
router.get('/historico', PosicaoController.historico);
router.post('/historico', PosicaoController.historico);
router.get('/posicoes/periodo', PosicaoController.historico);
router.post('/posicoes/periodo', PosicaoController.historico);

// 4. (O mais importante) Posições novas da frota inteira via cursor / a cada 1-2 minutos
router.get('/posicoes/novas', PosicaoController.novas);
router.post('/posicoes/novas', PosicaoController.novas);
router.get('/posicoes/sincronizar', PosicaoController.novas);
router.post('/posicoes/sincronizar', PosicaoController.novas);

// =========================================================================
// 📌 ROTAS EXISTENTES MANTIDAS PARA COMPATIBILIDADE
// =========================================================================
router.post('/medicoes', ProjetoController.medicoes);
router.post('/alertas', ProjetoController.alertas);
router.post('/abastecimentos', ProjetoController.abastecimentos);
router.post('/veiculos/resumo', ProjetoController.resumoVeiculos);
router.post('/recurso/:recurso', RecursoController.consultarPorUrl);

module.exports = router;