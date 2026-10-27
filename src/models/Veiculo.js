const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Veiculo = sequelize.define('Veiculo', {
    codigo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id: DataTypes.STRING, // ID do equipamento/rastreador (ex: 999999 para sem rastreador)
    placa: DataTypes.STRING,
    prefixo: DataTypes.STRING,
    modelo: DataTypes.STRING,
    descricao: DataTypes.STRING,
    status: DataTypes.STRING,
    cacamba_com_status_motor: DataTypes.STRING, // Novo campo para controle de exibição
    cod_cliente: DataTypes.INTEGER // Chave estrangeira (FK)
}, {
    tableName: 'veiculo',
    timestamps: false
});

module.exports = Veiculo;