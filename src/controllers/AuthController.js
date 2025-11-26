// src/controllers/AuthController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { login, senha } = req.body;

        if (!login || !senha) {
            return res.status(400).json({ message: 'Login e senha são obrigatórios' });
        }

        const usuario = await User.findOne({ where: { login } });

        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // --- AQUI ESTAVA FALTANDO O COD_CLIENTE ---
        const token = jwt.sign(
            { 
                id: usuario.codigo, 
                nome: usuario.nome,
                cod_cliente: usuario.cod_cliente // <--- ADICIONEI ESTA LINHA
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '1y' }
        );
        // ------------------------------------------

        res.json({ 
            token, 
            user: {
                codigo: usuario.codigo,
                nome: usuario.nome,
                email: usuario.email,
                cod_cliente: usuario.cod_cliente
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
};