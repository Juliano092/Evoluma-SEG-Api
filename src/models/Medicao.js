const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medicao = sequelize.define('Medicao', {
    codigo: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id: { type: DataTypes.DECIMAL(10, 0) },
    // Mapeamento da data (igual fizemos antes)
    data_hora: { type: DataTypes.DATE, field: 'data' }, 
    
    // Novos campos vistos no PHP
    latitude: { type: DataTypes.DECIMAL(17, 15) },
    longitude: { type: DataTypes.DECIMAL(17, 15) },
    velocidade: { type: DataTypes.INTEGER },
    curso: { type: DataTypes.DECIMAL(5, 2) },
    km_odometro: { type: DataTypes.DECIMAL(10, 3) },
    
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