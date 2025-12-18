const { Op } = require('sequelize');
const Veiculo = require('../models/Veiculo');
const Medicao = require('../models/Medicao');
const Abastecimento = require('../models/Abastecimento');
const AlertaCacamba = require('../models/AlertaCacamba');
const Cliente = require('../models/Cliente');
const Posto = require('../models/Posto');

// --- Função Auxiliar de Validação (A mesma do PHP) ---
const obterVeiculosValidos = async (req) => {
    const usuario = req.user; 
    const { data_inicial, data_final, placa } = req.body;

    if (!data_inicial || !data_final) {
        return { erro: true, mensagem: 'Informe data_inicial e data_final', code: 200 };
    }

    // Ajusta as horas para pegar o dia inteiro (igual ao PHP)
    const dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
    const dtFim = data_final.length === 10 ? `${data_final} 23:59:59` : data_final;

    let ids = [];

    // Se for Admin (ID 1) vê tudo, senão vê só do cliente dele
    if (usuario.id == 1) { 
        if (placa && placa !== "") {
            const veiculo = await Veiculo.findOne({ where: { placa } });
            if (!veiculo) return { erro: true, mensagem: `Veiculo ${placa} nao encontrado`, code: 404 };
            ids = [veiculo.codigo];
        } else {
            const veiculos = await Veiculo.findAll({ limit: 1000, attributes: ['codigo'] });
            ids = veiculos.map(v => v.codigo);
        }
    } else {
        // Validação de Cliente
        if (!usuario.cod_cliente) return { erro: true, mensagem: 'Usuario sem cliente vinculado', code: 403 };

        if (placa && placa !== "") {
            const veiculo = await Veiculo.findOne({ 
                where: { cod_cliente: usuario.cod_cliente, placa } 
            });
            if (!veiculo) return { erro: true, mensagem: 'Acesso negado a este veiculo', code: 404 };
            ids = [veiculo.codigo];
        } else {
            const veiculos = await Veiculo.findAll({ 
                where: { cod_cliente: usuario.cod_cliente },
                attributes: ['codigo']
            });
            ids = veiculos.map(v => v.codigo);
        }
    }

    return { ids_veiculos: ids, data_inicial: dtIni, data_final: dtFim };
};

// ================= ROTAS =================

exports.medicoes = async (req, res) => {
    try {
        const validacao = await obterVeiculosValidos(req);
        if (validacao.erro) return res.status(validacao.code).json(validacao);

        const { ids_veiculos, data_inicial, data_final } = validacao;

        // Busca Medições
        const dados = await Medicao.findAll({
            where: {
                cod_veiculo: { [Op.in]: ids_veiculos },
                data_hora: { [Op.between]: [data_inicial, data_final] } // Usa o field map que criamos no Model
            },
            include: [{ model: Veiculo, attributes: ['placa'] }],
            limit: 100,
            order: [['data_hora', 'DESC']]
        });

        // Formata o JSON de resposta
        const dadosFormatados = dados.map(item => ({
            placa: item.Veiculo ? item.Veiculo.placa : 'N/A',
            latitude: item.latitude,
            longitude: item.longitude,
            velocidade: item.velocidade,
            
            status_motor: item.status_motor,

            status_cacamba: item.status_cacamba,
            
            data: item.data_hora
        }));

        res.json({
            tipo: 'Medicoes',
            qtd: dadosFormatados.length,
            periodo: `${data_inicial} ate ${data_final}`,
            dados: dadosFormatados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar medições' });
    }
};

exports.alertas = async (req, res) => {
    try {
        const validacao = await obterVeiculosValidos(req);
        if (validacao.erro) return res.status(validacao.code).json(validacao);

        const { ids_veiculos, data_inicial, data_final } = validacao;

        // Busca Alertas
        const dados = await AlertaCacamba.findAll({
            where: {
                cod_veiculo: { [Op.in]: ids_veiculos },
                data_hora_disparo: { [Op.between]: [data_inicial, data_final] }
            },
            include: [{ model: Veiculo, attributes: ['placa'] }],
            limit: 100,
            order: [['data_hora_disparo', 'DESC']]
        });

        const dadosFormatados = dados.map(item => ({
            placa: item.Veiculo ? item.Veiculo.placa : 'Desconhecido',
            data_hora_disparo: item.data_hora_disparo,
            latitude: item.latitude,
            longitude: item.longitude
        }));

        res.json({
            tipo: 'Alertas de Cacamba',
            qtd: dadosFormatados.length,
            periodo: `${data_inicial} ate ${data_final}`,
            dados: dadosFormatados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
};

exports.abastecimentos = async (req, res) => {
    try {
        const validacao = await obterVeiculosValidos(req);
        if (validacao.erro) return res.status(validacao.code).json(validacao);

        const { ids_veiculos, data_inicial, data_final } = validacao;

        // Busca Abastecimentos
        const dados = await Abastecimento.findAll({
            where: {
                cod_veiculo: { [Op.in]: ids_veiculos },
                horario_inicial: { [Op.between]: [data_inicial, data_final] }
            },
            include: [
                { model: Veiculo, attributes: ['placa'] },
                { model: Posto, attributes: ['codigo', 'nome_fantasia'] }
            ],
            limit: 100,
            order: [['horario_inicial', 'DESC']]
        });

        const dadosFormatados = dados.map(item => ({
            placa: item.Veiculo ? item.Veiculo.placa : 'Desconhecido',
            posto_codigo: item.Posto ? item.Posto.codigo : null,
            posto_nome: item.Posto ? item.Posto.nome_fantasia : 'Desconhecido',
            data: item.horario_inicial, // Renomeia para 'data' no JSON final
            litros: item.litros,
            valor: item.valor_total,
            km: item.odometro
        }));

        res.json({
            tipo: 'Abastecimentos',
            qtd: dadosFormatados.length,
            periodo: `${data_inicial} ate ${data_final}`,
            dados: dadosFormatados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar abastecimentos' });
    }
};