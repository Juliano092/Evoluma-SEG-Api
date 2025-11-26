const Cliente = require('./Cliente');
const Posto = require('./Posto');
const Veiculo = require('./Veiculo');
const Abastecimento = require('./Abastecimento');
const Medicao = require('./Medicao');
const AlertaCacamba = require('./AlertaCacamba');
const User = require('./User'); // Seu model de usuário criado antes

// Função para iniciar relacionamentos
const definirAssociacoes = () => {

    // --- Veículo e Cliente ---
    // Veículo pertence a Cliente
    Veiculo.belongsTo(Cliente, { foreignKey: 'cod_cliente', targetKey: 'codigo' });
    // Cliente tem muitos Veículos (opcional, mas bom ter)
    Cliente.hasMany(Veiculo, { foreignKey: 'cod_cliente', sourceKey: 'codigo' });

    // --- Abastecimento ---
    // Abastecimento pertence a Veículo
    Abastecimento.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    // Abastecimento pertence a Posto
    Abastecimento.belongsTo(Posto, { foreignKey: 'cod_posto', targetKey: 'codigo' });

    // --- Medição ---
    Medicao.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    Veiculo.hasMany(Medicao, { foreignKey: 'cod_veiculo', sourceKey: 'codigo' });

    // --- Alerta Caçamba ---
    AlertaCacamba.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    Veiculo.hasMany(AlertaCacamba, { foreignKey: 'cod_veiculo', sourceKey: 'codigo' });
    
    // --- Usuário e Cliente ---
    User.belongsTo(Cliente, { foreignKey: 'cod_cliente', targetKey: 'codigo' });

};

module.exports = definirAssociacoes;