const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medicao = sequelize.define('Medicao', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Mapeamento da data (igual fizemos antes)
    data_hora: { type: DataTypes.DATE, field: 'data' }, 
    
    // Novos campos vistos no PHP
    latitude: { type: DataTypes.DECIMAL(10, 8) },
    longitude: { type: DataTypes.DECIMAL(11, 8) },
    velocidade: { type: DataTypes.INTEGER },
    status_motor: { type: DataTypes.BOOLEAN }, // ou INTEGER
    
    cod_veiculo: { type: DataTypes.INTEGER }
}, { tableName: 'medicao', timestamps: false });

module.exports = Medicao;