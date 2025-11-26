// gerarToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega seu segredo do .env

// Configuração do "Super Usuário"
const payload = {
    id: 1,                // O ID Mágico que libera tudo no seu Controller
    nome: "Admin Mestre", // Nome fictício
    cod_cliente: 0        // Admin não precisa de cliente específico
};

// Gera o token (Válido por 10 anos para você não se preocupar)
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3650d' });

console.log("\n=== SEU TOKEN MESTRE (CUIDADO COM ELE) ===");
console.log(token);
console.log("==========================================\n");