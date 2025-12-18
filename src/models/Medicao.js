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
    
    status_motor: {
        type: DataTypes.STRING,
        get() {
            const raw = this.getDataValue('status_motor');
            if (raw === null || raw === undefined) return raw;
            const s = String(raw);
            if (s === '1') return 'Ligado';
            if (s === '0') return 'Desligado';
            return raw;
        }
    },

    status_cacamba: {
        type: DataTypes.STRING,
        // Getter para transformar valores em texto legível na resposta da API
        // Agora trata '1' => 'Ligado' e '0' => 'Desligado'.
        get() {
            const raw = this.getDataValue('status_cacamba');
            if (raw === null || raw === undefined) return raw;
            const s = String(raw);
            // Mapear '1' => 'Ligado' e '0' => 'Desligado'
            if (s === '1') return 'Ligado';
            if (s === '0') return 'Desligado';
            return raw; // retorna o valor cru caso seja outro
        }
    },

    cod_veiculo: { type: DataTypes.INTEGER }
}, { tableName: 'medicao', timestamps: false });

module.exports = Medicao;