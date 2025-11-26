const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Projeto = sequelize.define('Projeto', {
    id_projeto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: DataTypes.STRING
}, {
    tableName: 'nome_da_tabela_projeto', // Ajuste para o nome real
    timestamps: false
});

module.exports = Projeto;