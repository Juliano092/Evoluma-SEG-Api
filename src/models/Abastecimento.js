const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Abastecimento = sequelize.define('Abastecimento', {
    codigo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
    // --- NOMES CORRETOS (Vistos no PHP) ---
    horario_inicial: { type: DataTypes.DATE }, // Era 'data' antes, ajustado para o real
    litros: { type: DataTypes.DECIMAL(10, 2) },
    valor_total: { type: DataTypes.DECIMAL(10, 2) },
    odometro: { type: DataTypes.INTEGER },
    // --------------------------------------

    cod_veiculo: DataTypes.INTEGER,
    cod_posto: DataTypes.INTEGER
}, {
    tableName: 'abastecimentos',
    timestamps: false
});

module.exports = Abastecimento;