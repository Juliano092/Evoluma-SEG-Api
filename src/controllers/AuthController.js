// src/controllers/AuthController.js
const User = require('../models/User');
const Cliente = require('../models/Cliente');
const jwt = require('jsonwebtoken');

/**
 * Gera um token JWT compacto e permanente (sem expiração e com cabeçalho enxuto)
 */
const gerarTokenCompacto = (codCliente) => {
    return jwt.sign(
        { c: codCliente },
        process.env.JWT_SECRET,
        { noTimestamp: true, header: { typ: undefined } }
    );
};

/**
 * Rota POST /api/login
 * Aceita 2 formatos no mesmo endpoint:
 * 1) Login tradicional: { "login": "...", "senha": "..." }
 * 2) Token direto por cliente: { "cod_cliente": 22, "nome": "Racli" }
 */
exports.login = async (req, res) => {
    try {
        const body = req.body || {};
        const codCliente = body.cod_cliente !== undefined ? body.cod_cliente : (body.codigo_cliente || body.id_cliente || body.cliente_id);

        // Se enviou cod_cliente no body do /login, gera o token direto para o cliente!
        if (codCliente !== undefined && codCliente !== null && String(codCliente).trim() !== '') {
            return exports.gerarTokenCliente(req, res);
        }

        const { login, senha } = body;

        if (!login || !senha) {
            return res.status(400).json({ 
                message: 'Informe login e senha, ou envie cod_cliente para gerar o token direto.' 
            });
        }

        const usuario = await User.findOne({ where: { login } });

        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Token permanente e compacto
        const token = gerarTokenCompacto(usuario.cod_cliente);

        res.json({
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
};

/**
 * Geração de Token Direto por Cliente (sem necessidade de usuário e senha)
 * Rota: POST /api/token ou chamada via POST /api/login com cod_cliente
 */
exports.gerarTokenCliente = async (req, res) => {
    try {
        const params = { ...req.query, ...req.body };
        const codCliente = params.cod_cliente !== undefined ? params.cod_cliente : (params.codigo_cliente || params.id_cliente || params.cliente_id);

        if (codCliente === undefined || codCliente === null || String(codCliente).trim() === '') {
            return res.status(400).json({ 
                message: 'Informe o código do cliente (cod_cliente)' 
            });
        }

        const codNum = parseInt(codCliente, 10);
        if (isNaN(codNum)) {
            return res.status(400).json({ message: 'O código do cliente (cod_cliente) deve ser um número.' });
        }

        // Token vitalício e ultra-compacto (reduzido pela metade)
        const token = gerarTokenCompacto(codNum);

        res.json({
            token
        });

    } catch (error) {
        console.error('Erro ao gerar token para cliente:', error);
        res.status(500).json({ message: 'Erro ao gerar token para o cliente informado' });
    }
};
