// src/middleware/moverToken.js
const moverTokenParaHeader = (req, res, next) => {
    // Verifica se o usuário enviou o 'token' dentro do corpo JSON
    if (req.body && req.body.token) {
        const token = req.body.token;

        // Injeta no cabeçalho Authorization
        // O Express trata headers como case-insensitive, mas o padrão é authorization
        req.headers['authorization'] = `Bearer ${token}`;
    }

    next();
};

module.exports = moverTokenParaHeader;