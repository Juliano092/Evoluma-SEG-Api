const { Sequelize } = require('sequelize');
const path = require('path');

// Garante que o arquivo .env seja lido da raiz
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// --- DEBUG ---
console.log('--- Tentando Conectar ao Banco ---');
console.log('HOST:', process.env.DB_HOST);
// Mostra qual variável de usuário ele achou
console.log('USER:', process.env.DB_USER || process.env.DB_USERNAME); 
// Mostra qual variável de banco ele achou
console.log('DATABASE:', process.env.DB_NAME || process.env.DB_DATABASE);
console.log('----------------------------------');

const sequelize = new Sequelize(
    // AQUI ESTAVA O ERRO: Agora ele tenta DB_NAME ou DB_DATABASE
    process.env.DB_NAME || process.env.DB_DATABASE, 
    
    process.env.DB_USER || process.env.DB_USERNAME, 
    process.env.DB_PASS || process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        timezone: '-03:00',
        dialectOptions: {
            dateStrings: true, // Importante para datas funcionarem igual PHP
            typeCast: true
        }
    }
);

module.exports = sequelize;