const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Posto = sequelize.define('Posto', {
    codigo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome_fantasia: { type: DataTypes.STRING } // Importante para o relatório
}, { tableName: 'posto', timestamps: false });

module.exports = Posto;