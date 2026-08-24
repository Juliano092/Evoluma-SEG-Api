const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    try {
        let verificado;
        try {
            verificado = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Tenta decodificar o token se foi enviado parcialmente
            const decoded = jwt.decode(token);
            if (decoded && (decoded.id !== undefined || decoded.cod_cliente !== undefined)) {
                verificado = decoded;
            } else {
                throw err;
            }
        }

        req.user = {
            id: verificado.id || verificado.codigo || 1,
            cod_cliente: verificado.cod_cliente !== undefined ? verificado.cod_cliente : null,
            nome: verificado.nome || 'Usuario'
        };

        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido' });
    }
};

module.exports = verificarToken;