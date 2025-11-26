const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
    codigo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: DataTypes.STRING,
    // Adicione outros campos da tabela cliente se precisar (ex: cnpj, endereco)
}, {
    tableName: 'cliente',
    timestamps: false
});

module.exports = Cliente;