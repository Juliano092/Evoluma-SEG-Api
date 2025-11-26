const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    codigo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    login: {
        type: DataTypes.STRING,
        allowNull: false
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nome: DataTypes.STRING,
    email: DataTypes.STRING,
    cod_cliente: DataTypes.INTEGER
}, {
    tableName: 'usuario', // Nome da tabela antiga
    timestamps: false     // Desativa created_at/updated_at
});

module.exports = User;