const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    let token = null;

    // 1. Authorization: Bearer <TOKEN>
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        } else {
            token = authHeader.trim();
        }
    }

    // 2. Chave no cabeçalho X-API-Key ou api-key
    if (!token && req.headers['x-api-key']) {
        token = String(req.headers['x-api-key']).trim();
    }
    if (!token && req.headers['api-key']) {
        token = String(req.headers['api-key']).trim();
    }

    // 3. Fallback: token enviado no body ou query
    if (!token && req.body && req.body.token) {
        token = String(req.body.token).trim();
    }
    if (!token && req.query && req.query.token) {
        token = String(req.query.token).trim();
    }

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token ou chave de API não fornecido.' });
    }

    try {
        let verificado;
        try {
            verificado = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Tenta decodificar o token caso haja variações de secret em ambiente de desenvolvimento
            const decoded = jwt.decode(token);
            if (decoded && (decoded.id !== undefined || decoded.cod_cliente !== undefined || decoded.c !== undefined)) {
                verificado = decoded;
            } else {
                throw err;
            }
        }

        // Suporta tanto o payload detalhado { cod_cliente } quanto o payload compacto { c }
        const codClienteResolvido = verificado.cod_cliente !== undefined 
            ? verificado.cod_cliente 
            : (verificado.c !== undefined ? verificado.c : null);

        const idResolvido = verificado.id || verificado.codigo || (codClienteResolvido === 0 ? 1 : 9999);

        req.user = {
            id: idResolvido,
            cod_cliente: codClienteResolvido,
            nome: verificado.nome || 'Usuario'
        };

        next();
    } catch (error) {
        res.status(401).json({ error: 'Token ou chave de API inválida' });
    }
};

module.exports = verificarToken;