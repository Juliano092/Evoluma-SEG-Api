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

// Auxiliar para formatar minutos em texto extenso (ex: "1d 2h 15m" ou "45m")
const formatarMinutosExtenso = (totalMinutos) => {
    if (isNaN(totalMinutos) || totalMinutos <= 0) return '0m';

    const minInt = Math.floor(totalMinutos);
    const dias = Math.floor(minInt / (24 * 60));
    const horas = Math.floor((minInt % (24 * 60)) / 60);
    const minutos = minInt % 60;

    let partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0 || partes.length === 0) partes.push(`${minutos}m`);

    return partes.join(' ');
};

// Auxiliar para cálculo de tempo parado formatado entre duas datas
const calcularTempoExtenso = (inicio, fim) => {
    if (!inicio) return 'N/A';
    const dIni = new Date(inicio);
    const dFim = fim ? new Date(fim) : new Date();
    const diffMs = dFim - dIni;

    if (isNaN(diffMs) || diffMs <= 0) return '0m';

    const totalMinutos = Math.floor(diffMs / 60000);
    return formatarMinutosExtenso(totalMinutos);
};

// Auxiliar para montar endereço/proximidade a partir dos campos da medição
const montarProximidade = (endereco, bairro, cidade) => {
    const limpar = (val) => {
        if (!val) return '';
        const s = String(val).trim();
        if (s === '' || s === '-' || s.toUpperCase() === 'CNX' || s === ', ,') return '';
        return s;
    };

    const endLimpo = limpar(endereco);
    const bairroLimpo = limpar(bairro);
    const cidLimpa = limpar(cidade);

    const partes = [];
    if (endLimpo) partes.push(endLimpo);
    if (bairroLimpo && !partes.includes(bairroLimpo)) partes.push(bairroLimpo);
    if (cidLimpa) partes.push(cidLimpa);
    return partes.length > 0 ? partes.join(' - ') : null;
};

exports.resumoVeiculos = async (req, res) => {
    try {
        const usuario = req.user;
        const params = { ...req.query, ...req.body };
        const {
            data_inicial,
            data_final,
            placa,
            id_veiculo,
            cod_veiculo,
            tempo_minimo_minutos,
            considerar_ignicao
        } = params;

        // Tempo mínimo em minutos para considerar uma parada válida (padrão: 2 min para ignorar semáforos/manobras rápidas)
        const minParadaMinutos = tempo_minimo_minutos !== undefined && tempo_minimo_minutos !== null
            ? Math.max(parseInt(tempo_minimo_minutos, 10) || 0, 0)
            : 2;

        // Tolerância de micro-movimento/oscilação de GPS (em minutos) para fundir paradas no mesmo local
        const toleranciaOscilacaoMin = 2;

        // Limite máximo de contabilização de parada: 60 dias (86.400 minutos)
        const maxParadaMinutos = 60 * 24 * 60;

        let whereVeiculo = {};
        if (usuario.id != 1) {
            if (!usuario.cod_cliente) {
                return res.status(403).json({ erro: true, mensagem: 'Usuario sem cliente vinculado' });
            }
            whereVeiculo.cod_cliente = usuario.cod_cliente;
        } else if (params.cod_cliente) {
            whereVeiculo.cod_cliente = params.cod_cliente;
        }

        const filtroIdVeiculo = id_veiculo || cod_veiculo;
        if (filtroIdVeiculo) {
            whereVeiculo.codigo = filtroIdVeiculo;
        }

        if (placa && String(placa).trim() !== '') {
            const pLimpa = String(placa).trim();
            const pComEspaco = pLimpa.replace(/-/g, ' ');
            const pComHifen = pLimpa.replace(/\s+/g, '-');
            const variantes = Array.from(new Set([pLimpa, pComEspaco, pComHifen]));

            whereVeiculo[Op.or] = [
                { placa: { [Op.in]: variantes } },
                { prefixo: { [Op.in]: variantes } },
                sequelize.where(sequelize.fn('TRIM', sequelize.col('placa')), { [Op.in]: variantes }),
                sequelize.where(sequelize.fn('TRIM', sequelize.col('prefixo')), { [Op.in]: variantes })
            ];
        } else {
            // Quando busca a frota geral, ignora TAGs virtuais sem rastreador (999999) e inativos
            whereVeiculo.id = { [Op.ne]: '999999' };
            whereVeiculo.status = '1';
        }

        const veiculos = await Veiculo.findAll({
            where: whereVeiculo,
            attributes: ['codigo', 'placa', 'prefixo', 'modelo', 'descricao']
        });

        if (veiculos.length === 0) {
            return res.json({ qtd: 0, dados: [] });
        }

        const ids_veiculos = veiculos.map(v => v.codigo);
        const mapVeiculos = new Map();
        veiculos.forEach(v => mapVeiculos.set(Number(v.codigo), v));

        // Verifica configurações e o inicio_parada real em aberto registrado em veiculo_alerta_parada
        const configParadaPorVeiculo = new Map();
        try {
            const configs = await sequelize.query(`
                SELECT vap.cod_veiculo,
                       MAX(ap.velocidade_max) AS velocidade_max,
                       MIN(vap.inicio_parada) AS inicio_parada_ativo
                FROM veiculo_alerta_parada vap
                LEFT JOIN alerta_parada ap ON ap.codigo = vap.cod_alerta AND ap.ativo = 'S'
                WHERE vap.cod_veiculo IN (:ids_veiculos)
                GROUP BY vap.cod_veiculo
            `, {
                replacements: { ids_veiculos },
                type: QueryTypes.SELECT
            });

            configs.forEach(c => {
                configParadaPorVeiculo.set(Number(c.cod_veiculo), {
                    velocidadeMax: c.velocidade_max != null ? Number(c.velocidade_max) : 1,
                    inicioParadaAtivo: c.inicio_parada_ativo || null
                });
            });
        } catch (_) {
            // Se a tabela não existir em algum ambiente, segue com o padrão (velocidade <= 1)
        }

        // Busca última medição dos veículos (para obter data de referência, status atual e fallback de endereço)
        const ultimasMedicoes = await sequelize.query(`
            SELECT cod_veiculo, data, velocidade, status_motor, endereco, bairro, cidade, latitude, longitude
            FROM ultima_medicao
            WHERE cod_veiculo IN (:ids_veiculos)
        `, {
            replacements: { ids_veiculos },
            type: QueryTypes.SELECT
        });

        const mapUltimaMedicao = new Map();
        const mapProximidadeUltima = new Map();
        let maxDataFrota = null;
        const agoraMais1Dia = new Date(Date.now() + 24 * 60 * 60 * 1000);

        for (const u of ultimasMedicoes) {
            const cod = Number(u.cod_veiculo);
            mapUltimaMedicao.set(cod, u);
            const prox = montarProximidade(u.endereco, u.bairro, u.cidade);
            if (prox) {
                mapProximidadeUltima.set(cod, prox);
            }
            if (u.data) {
                const dt = new Date(u.data);
                // Ignora datas futuras corrompidas de GPS ao definir a referência da frota
                if (!isNaN(dt) && dt <= agoraMais1Dia) {
                    if (!maxDataFrota || dt > maxDataFrota) {
                        maxDataFrota = dt;
                    }
                }
            }
        }

        // Define o intervalo de datas para leitura das medições
        let dtIni = null;
        let dtFim = null;

        if (data_inicial && data_final) {
            dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
            dtFim = data_final.length === 10 ? `${data_final} 23:59:59` : data_final;
        } else if (data_inicial) {
            dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
            dtFim = data_inicial.length === 10 ? `${data_inicial} 23:59:59` : new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else {
            // Sem filtro de data informado: busca as últimas 48h a partir da medição mais recente da frota
            const refFim = maxDataFrota || new Date();
            const refIni = new Date(refFim.getTime() - (48 * 60 * 60 * 1000));

            const pad = (n) => String(n).padStart(2, '0');
            const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

            dtIni = fmt(refIni);
            dtFim = fmt(refFim);
        }

        // Busca endereços já geocodificados em alerta_parada_disparado no período para enriquecer proximidade se medicao_aux estiver sem endereço
        const mapProximidadeAlerta = new Map();
        try {
            const alertasEnd = await sequelize.query(`
                SELECT cod_veiculo, proximidades
                FROM alerta_parada_disparado
                WHERE cod_veiculo IN (:ids_veiculos)
                  AND data_hora_disparo >= :dtIni AND data_hora_disparo <= :dtFim
                  AND proximidades IS NOT NULL AND proximidades != '' AND proximidades != ', , '
                ORDER BY data_hora_disparo DESC
            `, {
                replacements: { ids_veiculos, dtIni, dtFim },
                type: QueryTypes.SELECT
            });
            for (const a of alertasEnd) {
                const cod = Number(a.cod_veiculo);
                if (!mapProximidadeAlerta.has(cod)) {
                    mapProximidadeAlerta.set(cod, String(a.proximidades).trim());
                }
            }
        } catch (_) {}

        // 1. Busca a série histórica de medições em medicao_aux (usa o índice idx_rota: cod_veiculo + data)
        const medicoes = await sequelize.query(`
            SELECT cod_veiculo, data, velocidade, status_motor, latitude, longitude, endereco, cidade, bairro
            FROM medicao_aux
            WHERE cod_veiculo IN (:ids_veiculos)
              AND data >= :dtIni AND data <= :dtFim
            ORDER BY cod_veiculo ASC, data ASC, codigo ASC
        `, {
            replacements: { ids_veiculos, dtIni, dtFim },
            type: QueryTypes.SELECT
        });

        const forcarIgnicao = considerar_ignicao !== undefined && considerar_ignicao !== null
            ? (String(considerar_ignicao).toLowerCase() === 'true' || String(considerar_ignicao) === '1')
            : null;

        const paradasConsolidadas = [];
        const veiculosComParadaAtual = new Set();

        if (medicoes && medicoes.length > 0) {
            // Agrupa medições por veículo
            const medicoesPorVeiculo = new Map();
            for (const m of medicoes) {
                const cod = Number(m.cod_veiculo);
                if (!medicoesPorVeiculo.has(cod)) {
                    medicoesPorVeiculo.set(cod, []);
                }
                medicoesPorVeiculo.get(cod).push(m);
            }

            // Processa a linha do tempo de cada veículo para encontrar início e fim real de cada parada
            for (const [codVeiculo, lista] of medicoesPorVeiculo.entries()) {
                const cfg = configParadaPorVeiculo.get(codVeiculo) || { velocidadeMax: 1, exigeMotorDesligado: false, inicioParadaAtivo: null };
                const velMax = cfg.velocidadeMax;
                // Por padrão avalia pela velocidade (<= velMax) para evitar inconsistências de pós-chave travado em '1'
                // ou viradas rápidas de chave no pátio sem deslocamento
                const avaliarMotor = forcarIgnicao !== null ? forcarIgnicao : false;

                const intervalosBrutos = [];
                let paradaAtual = null;

                for (const m of lista) {
                    const vel = m.velocidade != null ? Number(m.velocidade) : 0;
                    const motorDesligado = String(m.status_motor) === '0' || String(m.status_motor).toLowerCase() === 'desligado';
                    const estaParado = avaliarMotor ? (vel <= velMax && motorDesligado) : (vel <= velMax);

                    if (estaParado) {
                        if (!paradaAtual) {
                            paradaAtual = {
                                cod_veiculo: codVeiculo,
                                inicio_parada: m.data,
                                fim_parada: m.data,
                                latitude: m.latitude != null ? String(m.latitude) : null,
                                longitude: m.longitude != null ? String(m.longitude) : null,
                                proximidade: montarProximidade(m.endereco, m.bairro, m.cidade),
                                em_andamento: false
                            };
                        } else {
                            paradaAtual.fim_parada = m.data;
                            if (!paradaAtual.proximidade) {
                                const prox = montarProximidade(m.endereco, m.bairro, m.cidade);
                                if (prox) paradaAtual.proximidade = prox;
                            }
                            if (paradaAtual.latitude == null && m.latitude != null) {
                                paradaAtual.latitude = String(m.latitude);
                                paradaAtual.longitude = String(m.longitude);
                            }
                        }
                    } else {
                        if (paradaAtual) {
                            // O fim real da parada é o momento em que o veículo voltou a operar/movimentar
                            paradaAtual.fim_parada = m.data;
                            intervalosBrutos.push(paradaAtual);
                            paradaAtual = null;
                        }
                    }
                }

                // Se terminou a lista de medições e o veículo ainda estava parado
                if (paradaAtual) {
                    paradaAtual.em_andamento = true;
                    intervalosBrutos.push(paradaAtual);
                }

                // Funde paradas consecutivas separadas apenas por uma rápida oscilação de GPS (< 2 min)
                // ou quando o veículo não saiu do mesmo local (< 50m de diferença e gap <= 10 min)
                const intervalosFundidos = [];
                for (const interv of intervalosBrutos) {
                    if (intervalosFundidos.length > 0) {
                        const anterior = intervalosFundidos[intervalosFundidos.length - 1];
                        const gapMin = (new Date(interv.inicio_parada) - new Date(anterior.fim_parada)) / 60000;
                        const mesmoLocal = anterior.latitude != null && interv.latitude != null
                            && Math.abs(parseFloat(interv.latitude) - parseFloat(anterior.latitude)) < 0.0005
                            && Math.abs(parseFloat(interv.longitude) - parseFloat(anterior.longitude)) < 0.0005;

                        if (gapMin >= 0 && (gapMin <= toleranciaOscilacaoMin || (mesmoLocal && gapMin <= 10))) {
                            anterior.fim_parada = interv.fim_parada;
                            anterior.em_andamento = interv.em_andamento;
                            if (!anterior.proximidade && interv.proximidade) {
                                anterior.proximidade = interv.proximidade;
                            }
                            continue;
                        }
                    }
                    intervalosFundidos.push(interv);
                }

                // Se a parada começou logo no primeiro pacote da janela consultada, o veículo já estava parado antes de dtIni.
                // Verifica primeiro veiculo_alerta_parada e, se necessário, busca em medicao_aux a última movimentação real antes da janela.
                if (intervalosFundidos.length > 0) {
                    const primeiroInterv = intervalosFundidos[0];
                    const ultimoInterv = intervalosFundidos[intervalosFundidos.length - 1];
                    const primeiraMedicao = lista[0];

                    if (ultimoInterv.em_andamento && cfg.inicioParadaAtivo && new Date(cfg.inicioParadaAtivo) < new Date(ultimoInterv.inicio_parada)) {
                        ultimoInterv.inicio_parada = cfg.inicioParadaAtivo;
                    }

                    if (primeiraMedicao && primeiroInterv.inicio_parada === primeiraMedicao.data) {
                        try {
                            const [ultMov] = await sequelize.query(`
                                SELECT data
                                FROM medicao_aux
                                WHERE cod_veiculo = :codVeiculo
                                  AND data < :iniJanela
                                  AND data >= DATE_SUB(:iniJanela, INTERVAL 60 DAY)
                                  AND velocidade > :velMax
                                ORDER BY data DESC
                                LIMIT 1
                            `, {
                                replacements: { codVeiculo, iniJanela: primeiraMedicao.data, velMax },
                                type: QueryTypes.SELECT
                            });

                            let realIni = null;
                            if (ultMov && ultMov.data) {
                                const [primParada] = await sequelize.query(`
                                    SELECT data
                                    FROM medicao_aux
                                    WHERE cod_veiculo = :codVeiculo
                                      AND data > :dataMov
                                      AND data <= :iniJanela
                                    ORDER BY data ASC
                                    LIMIT 1
                                `, {
                                    replacements: { codVeiculo, dataMov: ultMov.data, iniJanela: primeiraMedicao.data },
                                    type: QueryTypes.SELECT
                                });
                                realIni = primParada ? primParada.data : ultMov.data;
                            } else {
                                const [primAbs] = await sequelize.query(`
                                    SELECT MIN(data) AS min_data
                                    FROM medicao_aux
                                    WHERE cod_veiculo = :codVeiculo
                                      AND data <= :iniJanela
                                      AND data >= DATE_SUB(:iniJanela, INTERVAL 60 DAY)
                                `, {
                                    replacements: { codVeiculo, iniJanela: primeiraMedicao.data },
                                    type: QueryTypes.SELECT
                                });
                                realIni = primAbs ? primAbs.min_data : null;
                            }

                            if (realIni && new Date(realIni) < new Date(primeiroInterv.inicio_parada)) {
                                primeiroInterv.inicio_parada = realIni;
                            }
                        } catch (_) {}
                    }

                    // Se a parada atual continua em andamento (ex: chave geral desligada no pátio), estende até a referência atual
                    if (!data_inicial && ultimoInterv.em_andamento && cfg.inicioParadaAtivo && new Date(dtFim) > new Date(ultimoInterv.fim_parada)) {
                        ultimoInterv.fim_parada = dtFim;
                    }
                }

                // Filtra pelo tempo mínimo de parada (descarta paradas de semáforo/manobra)
                for (const interv of intervalosFundidos) {
                    const diffMs = new Date(interv.fim_parada) - new Date(interv.inicio_parada);
                    const minutos = Math.floor(diffMs / 60000);

                    if (minutos >= minParadaMinutos) {
                        if (interv.em_andamento) {
                            veiculosComParadaAtual.add(codVeiculo);
                        }
                        const veic = mapVeiculos.get(codVeiculo) || {};
                        const proxFinal = interv.proximidade
                            || mapProximidadeAlerta.get(codVeiculo)
                            || mapProximidadeUltima.get(codVeiculo)
                            || null;

                        paradasConsolidadas.push({
                            placa: veic.placa ? String(veic.placa).trim() : 'Desconhecido',
                            prefixo: veic.prefixo ? String(veic.prefixo).trim() : null,
                            descricao: veic.descricao ? String(veic.descricao).trim() : (veic.modelo ? String(veic.modelo).trim() : null),
                            inicio_parada: interv.inicio_parada,
                            fim_parada: interv.fim_parada,
                            tempo_parado: formatarMinutosExtenso(Math.min(minutos, maxParadaMinutos)),
                            proximidade: proxFinal,
                            latitude: interv.latitude,
                            longitude: interv.longitude
                        });
                    }
                }
            }
        }

        // Complementa veículos que estão parados com chave geral desligada (sem pacotes recentes na janela de medicao_aux)
        if (!data_inicial) {
            for (const codVeiculo of ids_veiculos) {
                if (veiculosComParadaAtual.has(codVeiculo)) continue;
                const u = mapUltimaMedicao.get(codVeiculo);
                if (!u) continue;

                const cfg = configParadaPorVeiculo.get(codVeiculo) || { velocidadeMax: 1, inicioParadaAtivo: null };
                const vel = u.velocidade != null ? Number(u.velocidade) : 0;
                if (vel > cfg.velocidadeMax) continue;

                const inicioReal = cfg.inicioParadaAtivo || u.data;
                if (!inicioReal) continue;

                const fimReal = (cfg.inicioParadaAtivo && new Date(dtFim) > new Date(inicioReal))
                    ? dtFim
                    : ((u.data && new Date(u.data) > new Date(inicioReal)) ? u.data : dtFim);
                const diffMs = new Date(fimReal) - new Date(inicioReal);
                const minutos = Math.floor(diffMs / 60000);

                if (minutos >= minParadaMinutos) {
                    const veic = mapVeiculos.get(codVeiculo) || {};
                    const proxFinal = mapProximidadeUltima.get(codVeiculo)
                        || mapProximidadeAlerta.get(codVeiculo)
                        || null;

                    paradasConsolidadas.push({
                        placa: veic.placa ? String(veic.placa).trim() : 'Desconhecido',
                        prefixo: veic.prefixo ? String(veic.prefixo).trim() : null,
                        descricao: veic.descricao ? String(veic.descricao).trim() : (veic.modelo ? String(veic.modelo).trim() : null),
                        inicio_parada: inicioReal,
                        fim_parada: fimReal,
                        tempo_parado: formatarMinutosExtenso(Math.min(minutos, maxParadaMinutos)),
                        proximidade: proxFinal,
                        latitude: u.latitude != null ? String(u.latitude) : null,
                        longitude: u.longitude != null ? String(u.longitude) : null
                    });
                }
            }
        }

        // Fallback para períodos muito antigos que só existam em alerta_parada_disparado (sem duplicar alertas do mesmo início)
        if (paradasConsolidadas.length === 0 && (!medicoes || medicoes.length === 0)) {
            const [tabelaParada] = await sequelize.query(
                `SHOW TABLES LIKE 'alerta_parada_disparado'`,
                { type: QueryTypes.SELECT }
            );

            if (tabelaParada) {
                const paradas = await sequelize.query(`
                    SELECT cod_veiculo,
                           inicio_parada,
                           MAX(data_hora_disparo) AS fim_parada,
                           MAX(proximidades) AS proximidades,
                           MAX(latitude) AS latitude,
                           MAX(longitude) AS longitude
                    FROM alerta_parada_disparado
                    WHERE cod_veiculo IN (:ids_veiculos)
                      AND data_hora_disparo >= :dtIni AND data_hora_disparo <= :dtFim
                    GROUP BY cod_veiculo, inicio_parada
                    ORDER BY fim_parada DESC
                    LIMIT 500
                `, {
                    replacements: { ids_veiculos, dtIni, dtFim },
                    type: QueryTypes.SELECT
                });

                for (const p of paradas) {
                    const veic = mapVeiculos.get(Number(p.cod_veiculo)) || {};
                    const diffMs = new Date(p.fim_parada) - new Date(p.inicio_parada);
                    const minutos = Math.max(Math.floor(diffMs / 60000), 0);

                    paradasConsolidadas.push({
                        placa: veic.placa ? String(veic.placa).trim() : 'Desconhecido',
                        prefixo: veic.prefixo ? String(veic.prefixo).trim() : null,
                        descricao: veic.descricao ? String(veic.descricao).trim() : (veic.modelo ? String(veic.modelo).trim() : null),
                        inicio_parada: p.inicio_parada,
                        fim_parada: p.fim_parada,
                        tempo_parado: formatarMinutosExtenso(Math.min(minutos, maxParadaMinutos)),
                        proximidade: p.proximidades || null,
                        latitude: p.latitude != null ? String(p.latitude) : null,
                        longitude: p.longitude != null ? String(p.longitude) : null
                    });
                }
            }
        }

        // Ordena as paradas da mais recente para a mais antiga
        paradasConsolidadas.sort((a, b) => new Date(b.fim_parada) - new Date(a.fim_parada));

        res.json({
            qtd: paradasConsolidadas.length,
            dados: paradasConsolidadas
        });

    } catch (error) {
        console.error('Erro ao buscar resumo de veículos:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo de veículos' });
    }
};
