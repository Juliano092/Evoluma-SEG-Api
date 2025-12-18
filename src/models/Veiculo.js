const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Veiculo = sequelize.define('Veiculo', {
    codigo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    placa: DataTypes.STRING,
    modelo: DataTypes.STRING,
    cacamba_com_status_motor: DataTypes.STRING, // Novo campo para controle de exibição
    cod_cliente: DataTypes.INTEGER // Chave estrangeira (FK)
}, {
    tableName: 'veiculo',
    timestamps: false
});

module.exports = Veiculo;