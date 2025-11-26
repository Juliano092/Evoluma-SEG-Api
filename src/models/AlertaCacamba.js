const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlertaCacamba = sequelize.define('AlertaCacamba', {
    // AQUI ESTAVA O ERRO: Definimos explicitamente que a PK é 'codigo'
    codigo: { 
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
    // Nomes confirmados pelo espião
    data_hora_disparo: { 
        type: DataTypes.DATE 
    },
    latitude: { 
        type: DataTypes.DECIMAL(10, 8) 
    },
    longitude: { 
        type: DataTypes.DECIMAL(11, 8) 
    },
    
    cod_veiculo: { 
        type: DataTypes.INTEGER 
    }
}, {
    tableName: 'alerta_cacamba_disparado',
    timestamps: false
});

module.exports = AlertaCacamba;