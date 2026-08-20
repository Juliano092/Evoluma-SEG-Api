const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
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
            include: [{ model: Veiculo, attributes: ['placa', 'cacamba_com_status_motor'] }],
            limit: 100,
            order: [['data_hora', 'DESC']]
        });

        // Formata o JSON de resposta
        const dadosFormatados = dados.map(item => {
            const veiculo = item.Veiculo;
            // Verifica se o veículo tem a flag 'S' para exibir caçamba
            const exibirCacamba = veiculo && veiculo.cacamba_com_status_motor === 'S';

            const obj = {
                placa: veiculo ? veiculo.placa : 'N/A',
                latitude: item.latitude,
                longitude: item.longitude,
                velocidade: item.velocidade,
                status_motor: item.status_motor,
                data: item.data_hora
            };

            // Só adiciona o campo se a flag for 'S'
            if (exibirCacamba) {
                obj.status_cacamba = item.status_cacamba;
            }

            return obj;
        });

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

// Auxiliar para cálculo de tempo parado formatado
const calcularTempoExtenso = (inicio, fim) => {
    if (!inicio) return 'N/A';
    const dIni = new Date(inicio);
    const dFim = fim ? new Date(fim) : new Date();
    const diffMs = dFim - dIni;

    if (isNaN(diffMs) || diffMs <= 0) return '0 min';

    const totalMinutos = Math.floor(diffMs / 60000);
    const dias = Math.floor(totalMinutos / (24 * 60));
    const horas = Math.floor((totalMinutos % (24 * 60)) / 60);
    const minutos = totalMinutos % 60;

    let partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0 || partes.length === 0) partes.push(`${minutos}m`);

    return partes.join(' ');
};

exports.resumoVeiculos = async (req, res) => {
    try {
        const usuario = req.user;
        const { data_inicial, data_final, placa } = req.body || {};

        let whereVeiculo = {};
        if (usuario.id != 1) {
            if (!usuario.cod_cliente) return res.status(403).json({ erro: true, mensagem: 'Usuario sem cliente vinculado' });
            whereVeiculo.cod_cliente = usuario.cod_cliente;
        }

        if (placa && placa !== "") {
            whereVeiculo.placa = placa;
        }

        const veiculos = await Veiculo.findAll({
            where: whereVeiculo,
            attributes: ['codigo', 'placa', 'prefixo', 'modelo']
        });

        if (veiculos.length === 0) {
            return res.json({ qtd: 0, dados: [] });
        }

        const ids_veiculos = veiculos.map(v => v.codigo);
        const mapVeiculos = new Map();
        veiculos.forEach(v => mapVeiculos.set(v.codigo, v));

        // Tenta buscar alertas de parada da tabela 'alerta_parada_disparado'
        let dadosFormatados = [];
        const [tabelaParada] = await sequelize.query(
            `SHOW TABLES LIKE 'alerta_parada_disparado'`,
            { type: QueryTypes.SELECT }
        );

        if (tabelaParada) {
            let whereClause = `WHERE cod_veiculo IN (:ids_veiculos)`;
            let replacements = { ids_veiculos };

            if (data_inicial && data_final) {
                const dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
                const dtFim = data_final.length === 10 ? `${data_final} 23:59:59` : data_final;
                whereClause += ` AND data_hora_disparo >= :dtIni AND data_hora_disparo <= :dtFim`;
                replacements.dtIni = dtIni;
                replacements.dtFim = dtFim;
            }

            const queryParadas = `SELECT * FROM alerta_parada_disparado ${whereClause} ORDER BY data_hora_disparo DESC LIMIT 500`;
            const paradas = await sequelize.query(queryParadas, { replacements, type: QueryTypes.SELECT });

            if (paradas && paradas.length > 0) {
                dadosFormatados = paradas.map(p => {
                    const veic = mapVeiculos.get(p.cod_veiculo) || {};
                    const inicio = p.inicio_parada || p.inicio || p.data_hora_inicio || null;
                    const fim = p.data_hora_disparo || p.fim_parada || p.data_hora || null;
                    const tempoParado = calcularTempoExtenso(inicio, fim);

                    return {
                        placa: veic.placa || 'Desconhecido',
                        prefixo: veic.prefixo || null,
                        inicio_parada: inicio,
                        fim_parada: fim,
                        tempo_parado: tempoParado,
                        proximidade: p.proximidades || p.proximidade || p.endereco || null,
                        latitude: p.latitude || null,
                        longitude: p.longitude || null
                    };
                });
            }
        }

        // Fallback: Se não houver alertas na tabela específica, busca nas medições
        if (dadosFormatados.length === 0) {
            let whereMedicao = { cod_veiculo: { [Op.in]: ids_veiculos } };

            if (data_inicial && data_final) {
                const dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
                const dtFim = data_final.length === 10 ? `${data_final} 23:59:59` : data_final;
                whereMedicao.data_hora = { [Op.between]: [dtIni, dtFim] };
            }

            const medicoes = await Medicao.findAll({
                where: whereMedicao,
                include: [{ model: Veiculo, attributes: ['placa', 'prefixo'] }],
                limit: 500,
                order: [['data_hora', 'DESC']]
            });

            dadosFormatados = medicoes.map(item => {
                const veiculo = item.Veiculo || {};
                const ehDesligado = item.status_motor === 'Desligado' || item.velocidade === 0;

                return {
                    placa: veiculo.placa || 'Desconhecido',
                    prefixo: veiculo.prefixo || null,
                    inicio_parada: item.data_hora,
                    fim_parada: null,
                    tempo_parado: ehDesligado ? 'Parado' : 'Em Movimento',
                    proximidade: null,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    velocidade: item.velocidade,
                    status_motor: item.status_motor,
                    data_hora: item.data_hora
                };
            });
        }

        res.json({
            qtd: dadosFormatados.length,
            dados: dadosFormatados
        });

    } catch (error) {
        console.error('Erro ao buscar resumo de veículos:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo de veículos' });
    }
};