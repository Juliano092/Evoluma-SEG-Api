const Cliente = require('./Cliente');
const Posto = require('./Posto');
const Veiculo = require('./Veiculo');
const Abastecimento = require('./Abastecimento');
const Medicao = require('./Medicao');
const AlertaCacamba = require('./AlertaCacamba');
const User = require('./User');

const definirAssociacoes = () => {
    // Veículo pertence a Cliente
    Veiculo.belongsTo(Cliente, { foreignKey: 'cod_cliente', targetKey: 'codigo' });
    
    // Abastecimento liga com Veículo e Posto
    Abastecimento.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    Abastecimento.belongsTo(Posto, { foreignKey: 'cod_posto', targetKey: 'codigo' });

    // Medição pertence a Veículo
    Medicao.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    
    // Alerta pertence a Veículo
    AlertaCacamba.belongsTo(Veiculo, { foreignKey: 'cod_veiculo', targetKey: 'codigo' });
    
    // Usuário pertence a Cliente (se for usuário comum)
    User.belongsTo(Cliente, { foreignKey: 'cod_cliente', targetKey: 'codigo' });
};

module.exports = definirAssociacoes;