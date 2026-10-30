const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const Veiculo = require('../models/Veiculo');

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
 * Helper para padronizar data e hora recebida nos parâmetros da requisição
 * Aceita:
 * - "2025-08-20" -> "2025-08-20 00:00:00" ou "2025-08-20 23:59:59"
 * - "2025-08-20 14:30" -> "2025-08-20 14:30:00"
 * - "2025-08-20 14:30:00" -> "2025-08-20 14:30:00"
 * - "2025-08-20T14:30:00-03:00" -> "2025-08-20 14:30:00"
 */
const normalizarDataHora = (valor, padraoFim = false) => {
    if (!valor) return null;
    let s = String(valor).trim().replace('T', ' ');
    // Remove fuso horário se vier no formato ISO (ex: -03:00 ou Z)
    s = s.replace(/([+-]\d{2}:\d{2}|Z)$/, '').trim();
    
    // Se veio apenas YYYY-MM-DD (10 caracteres)
    if (s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return padraoFim ? `${s} 23:59:59` : `${s} 00:00:00`;
    }
    // Se veio YYYY-MM-DD HH:mm (16 caracteres)
    if (s.length === 16) {
        return padraoFim ? `${s}:59` : `${s}:00`;
    }
    return s;
};

/**
 * Helper para formatar cada posição EXATAMENTE com os campos solicitados pelo cliente:
 * - id do veículo e placa
 * - latitude e longitude (decimal)
 * - data/hora do GPS, com fuso
 * - data/hora em que o servidor recebeu
 * - velocidade, direção e ignição (ligada/desligada)
 * - odômetro
 */
const formatarPosicao = (item) => {
    const dataGps = formatarDataComFuso(item.data);
    const dataRecebimento = formatarDataComFuso(item.data_transmissao || item.data);
    const ignicaoLigada = item.status_motor === '1' || item.status_motor === 'Ligado';

    const obj = {
        id_veiculo: Number(item.cod_veiculo),
        placa: item.placa || null,
        latitude: item.latitude != null ? parseFloat(item.latitude) : null,
        longitude: item.longitude != null ? parseFloat(item.longitude) : null,
        data_hora_gps: dataGps,
        data_hora_recebimento: dataRecebimento,
        velocidade: item.velocidade != null ? parseInt(item.velocidade, 10) : 0,
        direcao: item.curso != null ? parseFloat(item.curso) : 0,
        ignicao: ignicaoLigada ? 'Ligada' : 'Desligada',
        ignicao_ligada: ignicaoLigada,
        odometro: item.km_odometro != null ? parseFloat(item.km_odometro) : 0,
        horimetro: item.horimetro != null ? parseFloat(item.horimetro) : 0
    };

    if (item.codigo != null) {
        obj.id_posicao = Number(item.codigo);
    }

    return obj;
};

/**
 * Helper para obter os IDs de veículos autorizados para o usuário autenticado
 */
const obterIdsVeiculosAutorizados = async (usuario, placaFiltro = null, idVeiculoFiltro = null) => {
    let whereVeiculo = {};

    // Usuário não-admin só enxerga veículos do seu cliente
    if (usuario.id != 1) {
        if (!usuario.cod_cliente) {
            return { erro: true, status: 403, mensagem: 'Usuário sem cliente vinculado' };
        }
        whereVeiculo.cod_cliente = usuario.cod_cliente;
    }

    if (idVeiculoFiltro) {
        whereVeiculo.codigo = idVeiculoFiltro;
    }

    if (placaFiltro && String(placaFiltro).trim() !== '') {
        whereVeiculo.placa = String(placaFiltro).trim();
    }

    const veiculos = await Veiculo.findAll({
        where: whereVeiculo,
        attributes: ['codigo', 'placa', 'prefixo', 'descricao', 'status']
    });

    if (veiculos.length === 0) {
        return { erro: true, status: 404, mensagem: 'Nenhum veículo encontrado para o cliente informado.' };
    }

    return {
        erro: false,
        veiculos,
        ids: veiculos.map(v => v.codigo)
    };
};

// ================= CONTROLADORES =================

/**
 * 2. Última posição de toda a frota numa única consulta
 * Consulta direta na tabela 'ultima_medicao'
 */
exports.ultimas = async (req, res) => {
    try {
        const usuario = req.user;
        const params = { ...req.query, ...req.body };
        const { placa, id_veiculo, ativo } = params;

        let whereClauses = [];
        let replacements = {};

        // Regra de segurança: Usuário não-admin só enxerga veículos do seu cliente
        if (usuario.id != 1) {
            if (!usuario.cod_cliente) {
                return res.status(403).json({ error: 'Usuário sem cliente vinculado' });
            }
            whereClauses.push('v.cod_cliente = :codCliente');
            replacements.codCliente = usuario.cod_cliente;
        } else if (params.cod_cliente) {
            whereClauses.push('v.cod_cliente = :codCliente');
            replacements.codCliente = params.cod_cliente;
        }

        if (placa && String(placa).trim() !== '') {
            whereClauses.push('v.placa = :placa');
            replacements.placa = String(placa).trim();
        }

        if (id_veiculo) {
            whereClauses.push('v.codigo = :idVeiculo');
            replacements.idVeiculo = id_veiculo;
        }

        // Filtro por status ativo ('1') por padrão
        if (ativo !== undefined && ativo !== null && ativo !== '') {
            const filtrarAtivo = String(ativo).toLowerCase() === 'true' || String(ativo) === '1';
            if (filtrarAtivo) {
                whereClauses.push("v.status = '1'");
            }
        } else {
            whereClauses.push("v.status = '1'");
        }

        // Ignora id='999999' (TAGs de aferição / sem rastreador)
        whereClauses.push("v.id != '999999'");

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const querySql = `
            SELECT m.codigo, m.cod_veiculo, v.placa,
                   m.latitude, m.longitude, m.data, m.data_transmissao, m.velocidade, m.status_motor, m.curso, m.km_odometro, m.horimetro
            FROM veiculo v
            JOIN ultima_medicao m ON m.cod_veiculo = v.codigo
            ${whereSql}
            ORDER BY v.placa ASC
        `;

        const dados = await sequelize.query(querySql, {
            replacements,
            type: QueryTypes.SELECT
        });

        const posicoesFormatadas = dados.map(formatarPosicao);

        res.json({
            qtd: posicoesFormatadas.length,
            posicoes: posicoesFormatadas
        });

    } catch (error) {
        console.error('Erro ao consultar últimas posições da frota:', error);
        res.status(500).json({ erro: true, mensagem: 'Erro ao buscar últimas posições da frota' });
    }
};

/**
 * 3. Histórico por período: todas as posições de um veículo entre duas datas/horas em ordem cronológica
 * Busca direta na tabela 'medicao_aux' (índice idx_rota otimizado em cod_veiculo + data)
 * Sem limite e sem paginação por padrão: traz todos os registros consultados no período.
 */
exports.historico = async (req, res) => {
    try {
        const usuario = req.user;
        const params = { ...req.query, ...req.body };
        
        const placa = params.placa;
        const id_veiculo = params.id_veiculo || params.id || params.cod_veiculo;
        const rawDataIni = params.data_inicial || params.data_inicio || params.inicio || params.dtIni || params.dt_inicial;
        const rawDataFim = params.data_final || params.data_fim || params.fim || params.dtFim || params.dt_final;
        const ordem = params.ordem || 'ASC';

        if (!placa && !id_veiculo) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Informe a placa ou id_veiculo para consultar o histórico.'
            });
        }

        if (!rawDataIni || !rawDataFim) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Informe data_inicial e data_final (ou data_inicio e data_fim) com data e hora. Exemplo: 2025-08-23 08:00:00'
            });
        }

        // Valida se o veículo pertence ao cliente autenticado
        const autorizacao = await obterIdsVeiculosAutorizados(usuario, placa, id_veiculo);
        if (autorizacao.erro) {
            return res.status(autorizacao.status).json({ erro: true, mensagem: autorizacao.mensagem });
        }

        const veiculo = autorizacao.veiculos[0];
        const codVeiculo = veiculo.codigo;

        const dtIni = normalizarDataHora(rawDataIni, false);
        const dtFim = normalizarDataHora(rawDataFim, true);
        const direcaoOrdem = String(ordem).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        let limitSql = '';
        let replacements = {
            codVeiculo,
            placa: veiculo.placa,
            dtIni,
            dtFim
        };

        const temLimite = params.limite !== undefined && params.limite !== null && parseInt(params.limite, 10) > 0;
        let paginacaoInfo = null;

        if (temLimite) {
            const qtdLimite = parseInt(params.limite, 10);
            const numPagina = Math.max(parseInt(params.pagina, 10) || 1, 1);
            const offset = (numPagina - 1) * qtdLimite;
            limitSql = 'LIMIT :qtdLimite OFFSET :offset';
            replacements.qtdLimite = qtdLimite;
            replacements.offset = offset;

            const [totalRes] = await sequelize.query(`
                SELECT COUNT(*) AS total
                FROM medicao_aux
                WHERE cod_veiculo = :codVeiculo AND data >= :dtIni AND data <= :dtFim
            `, {
                replacements: { codVeiculo, dtIni, dtFim },
                type: QueryTypes.SELECT
            });

            const totalRegistros = totalRes ? Number(totalRes.total) : 0;
            paginacaoInfo = {
                pagina_atual: numPagina,
                total_paginas: Math.ceil(totalRegistros / qtdLimite) || 1,
                limite_por_pagina: qtdLimite,
                total_registros: totalRegistros
            };
        }

        // Busca registros ordenados por data e codigo na tabela medicao_aux
        const querySql = `
            SELECT m.codigo, m.cod_veiculo, :placa AS placa,
                   m.latitude, m.longitude, m.data, m.velocidade, m.status_motor, m.curso, m.km_odometro, m.horimetro
            FROM medicao_aux m
            WHERE m.cod_veiculo = :codVeiculo AND m.data >= :dtIni AND m.data <= :dtFim
            ORDER BY m.data ${direcaoOrdem}, m.codigo ${direcaoOrdem}
            ${limitSql}
        `;

        const dados = await sequelize.query(querySql, {
            replacements,
            type: QueryTypes.SELECT
        });

        const posicoesFormatadas = dados.map(formatarPosicao);

        res.json({
            qtd: posicoesFormatadas.length,
            posicoes: posicoesFormatadas
        });

    } catch (error) {
        console.error('Erro ao consultar histórico de posições:', error);
        res.status(500).json({ erro: true, mensagem: 'Erro ao consultar histórico de posições' });
    }
};

/**
 * 4. Posições novas da frota inteira (por cursor / sincronização contínua a cada 1-2 minutos)
 */
exports.novas = async (req, res) => {
    try {
        const usuario = req.user;
        const params = { ...req.query, ...req.body };
        const cursorRecebido = params.cursor || params.ultimo_id || params.desde_id || null;
        const limiteSolicitado = Math.min(Math.max(parseInt(params.limite, 10) || 1000, 1), 5000);
        const placaFiltro = params.placa || null;
        const idVeiculoFiltro = params.id_veiculo || params.id || params.cod_veiculo || null;

        const autorizacao = await obterIdsVeiculosAutorizados(usuario, placaFiltro, idVeiculoFiltro);
        if (autorizacao.erro) {
            return res.status(autorizacao.status).json({ erro: true, mensagem: autorizacao.mensagem });
        }

        const idsVeiculos = autorizacao.ids;
        let whereSql = 'WHERE m.cod_veiculo IN (:idsVeiculos)';
        let replacements = { idsVeiculos, limite: limiteSolicitado };

        if (cursorRecebido) {
            whereSql += ' AND m.codigo > :cursor';
            replacements.cursor = Number(cursorRecebido);
        } else if (params.data_inicial) {
            const dtIni = params.data_inicial.length === 10 ? `${params.data_inicial} 00:00:00` : params.data_inicial;
            whereSql += ' AND m.data >= :dtIni';
            replacements.dtIni = dtIni;
        } else {
            whereSql += ' AND m.data >= DATE_SUB(NOW(), INTERVAL 2 HOUR)';
        }

        const querySql = `
            SELECT m.codigo, m.cod_veiculo, v.placa,
                   m.latitude, m.longitude, m.data, m.velocidade, m.status_motor, m.curso, m.km_odometro, m.horimetro
            FROM medicao_aux m
            JOIN veiculo v ON v.codigo = m.cod_veiculo
            ${whereSql}
            ORDER BY m.codigo ASC
            LIMIT :limite
        `;

        const dados = await sequelize.query(querySql, {
            replacements,
            type: QueryTypes.SELECT
        });

        const posicoesFormatadas = dados.map(formatarPosicao);

        let proximoCursor = cursorRecebido ? Number(cursorRecebido) : null;
        if (dados.length > 0) {
            proximoCursor = Number(dados[dados.length - 1].codigo);
        }

        const temMaisRegistros = dados.length >= limiteSolicitado;

        res.json({
            qtd: posicoesFormatadas.length,
            cursor_anterior: cursorRecebido ? Number(cursorRecebido) : null,
            proximo_cursor: proximoCursor,
            mais_registros: temMaisRegistros,
            posicoes: posicoesFormatadas
        });

    } catch (error) {
        console.error('Erro ao consultar novas posições:', error);
        res.status(500).json({ erro: true, mensagem: 'Erro ao buscar novas posições' });
    }
};
