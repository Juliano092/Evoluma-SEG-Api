const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');
const routes = require('./routes');
const definirAssociacoes = require('./models/associacoes');

// Carrega o .env
require('dotenv').config();

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json()); // Permite ler JSON do body

// Ativa os relacionamentos (FKs) entre as tabelas
definirAssociacoes();

// Documentação Swagger interativa (Pública)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));

// Registra as rotas da API
app.use('/api', routes);

// Define a porta e inicia o servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Documentação Swagger disponível em: http://localhost:${PORT}/api/docs`);
});