const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const definirAssociacoes = require('./models/associacoes');
const path = require('path');

// Carrega o .env
require('dotenv').config();

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json()); // Permite ler JSON do body

// Ativa os relacionamentos (FKs) entre as tabelas
definirAssociacoes();

// Registra as rotas
app.use('/api', routes);

// Define a porta e inicia o servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});