const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Helper para formatar a data com o fuso horário de Brasília (-03:00)
 */
const formatarDataComFuso = (data) => {
    if (!data) return null;
    const s = String(data).trim().replace(' ', 'T');
    if (!s.includes('-03:00') && !s.includes('+') && !s.includes('Z')) {
        return `${s}-03:00`;
    }
    return s;
};

/**
 * 1. Lista de Veículos com Telemetria Integrada
 * Retorna dados cadastrais do veículo (id, placa, prefixo, descrição, modelo, status)
 * E a última posição GPS em tempo real (latitude, longitude, data_hora com fuso, velocidade, ignição e odômetro).
 */
exports.listar = async (req, res) => {
    try {
        const usuario = req.user;
        const params = { ...req.query, ...req.body };
        const { ativo, placa, cod_cliente, incluir_virtuais } = params;

        let whereClauses = [];
        let replacements = {};

        // Regra de segurança: Usuário não-admin só enxerga veículos do seu cliente
        if (usuario.id != 1) {
            if (!usuario.cod_cliente) {
                return res.status(403).json({ error: 'Usuário sem cliente vinculado' });
            }
            whereClauses.push('v.cod_cliente = :codCliente');
            replacements.codCliente = usuario.cod_cliente;
        } else if (cod_cliente) {
            whereClauses.push('v.cod_cliente = :codCliente');
            replacements.codCliente = cod_cliente;
        }

        // Filtro por placa opcional
        if (placa && String(placa).trim() !== '') {
            whereClauses.push('v.placa LIKE :placa');
            replacements.placa = `%${String(placa).trim()}%`;
        }

        // Filtro por status ativo (status '1' = Ativo)
        if (ativo !== undefined && ativo !== null && ativo !== '') {
            const filtrarAtivo = String(ativo).toLowerCase() === 'true' || String(ativo) === '1';
            if (filtrarAtivo) {
                whereClauses.push("v.status = '1'");
            } else {
                whereClauses.push("v.status != '1'");
            }
        }

        // Ignora id='999999' (TAGs de aferição / sem rastreador), exceto se pedido explicitamente
        const deveIncluirVirtuais = String(incluir_virtuais).toLowerCase() === 'true';
        if (!deveIncluirVirtuais) {
            whereClauses.push("v.id != '999999'");
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Busca os veículos juntamente com a última posição gravada na tabela 'ultima_medicao'
        const querySql = `
            SELECT v.codigo, v.id AS id_equipamento, v.placa, v.prefixo, v.modelo, v.descricao, v.status,
                   m.latitude, m.longitude, m.data, m.velocidade, m.status_motor, m.curso, m.km_odometro, m.horimetro
            FROM veiculo v
            LEFT JOIN ultima_medicao m ON m.cod_veiculo = v.codigo
            ${whereSql}
            ORDER BY v.placa ASC
        `;

        const veiculos = await sequelize.query(querySql, {
            replacements,
            type: QueryTypes.SELECT
        });

        const dadosFormatados = veiculos.map(v => {
            const estaAtivo = v.status === '1';
            const ignicaoLigada = v.status_motor === '1';

            return {
                id: v.codigo,
                id_veiculo: v.codigo,
                placa: v.placa,
                prefixo: v.prefixo || null,
                descricao: v.descricao || null,
                modelo: v.modelo || null,
                ativo: estaAtivo,
                status: estaAtivo ? 'Ativo' : 'Inativo',
                latitude: v.latitude != null ? parseFloat(v.latitude) : null,
                longitude: v.longitude != null ? parseFloat(v.longitude) : null,
                data_hora: formatarDataComFuso(v.data),
                velocidade: v.velocidade != null ? parseInt(v.velocidade, 10) : 0,
                direcao: v.curso != null ? parseFloat(v.curso) : 0,
                ignicao: ignicaoLigada ? 'Ligado' : 'Desligado',
                ignicao_ligada: ignicaoLigada,
                odometro: v.km_odometro != null ? parseFloat(v.km_odometro) : 0,
                horimetro: v.horimetro != null ? parseFloat(v.horimetro) : 0
            };
        });

        res.json({
            qtd: dadosFormatados.length,
            veiculos: dadosFormatados
        });

    } catch (error) {
        console.error('Erro ao listar veículos com telemetria:', error);
        res.status(500).json({ error: 'Erro ao consultar lista de veículos' });
    }
};
