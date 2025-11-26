const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verificado; // Salva o usuário na requisição (igual $request->user())
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido' });
    }
};

module.exports = verificarToken;