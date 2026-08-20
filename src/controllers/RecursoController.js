const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

exports.consultarPorUrl = async (req, res) => {
    try {
        const usuario = req.user;
        // Pega o nome do recurso/tabela direto da URL (:recurso) ou do body
        const nomeRecurso = req.params.recurso || req.body.recurso || req.body.tabela;
        const { limite = 100, pagina = 1, data_inicial, data_final } = req.body;

        if (!nomeRecurso) {
            return res.status(400).json({ error: 'Informe o recurso desejado na URL' });
        }

        // Sanitiza o nome do recurso (aceita apenas letras, números e underline)
        const tabelaLimpa = nomeRecurso.replace(/[^a-zA-Z0-9_]/g, '');

        // 1. Verifica se a tabela existe no banco de dados
        const [tabelasExistentes] = await sequelize.query(
            `SHOW TABLES LIKE :tabela`,
            { replacements: { tabela: tabelaLimpa }, type: QueryTypes.SELECT }
        );

        if (!tabelasExistentes || Object.keys(tabelasExistentes).length === 0) {
            return res.status(404).json({ error: `Recurso '${tabelaLimpa}' não encontrado.` });
        }

        // 2. Descobre as colunas da tabela para aplicar os filtros de segurança
        const colunasInfo = await sequelize.query(
            `DESCRIBE \`${tabelaLimpa}\``,
            { type: QueryTypes.SELECT }
        );

        const colunas = colunasInfo.map(c => c.Field);

        // Identifica colunas chaves
        const colCliente = colunas.find(c => ['cod_cliente', 'cliente_id', 'id_cliente'].includes(c.toLowerCase()));
        const colVeiculo = colunas.find(c => ['cod_veiculo', 'veiculo_id', 'id_veiculo'].includes(c.toLowerCase()));
        const colData = colunas.find(c => [
            'data_hora', 'data', 'created_at', 'data_hora_disparo', 
            'horario_inicial', 'data_criacao', 'data_disparo', 
            'datahora', 'dt_criacao', 'timestamp'
        ].includes(c.toLowerCase()) || c.toLowerCase().includes('data') || c.toLowerCase().includes('horario'));

        let whereClauses = [];
        let replacements = {};

        // 3. Aplica filtro de segurança de cliente (se não for admin ID 1)
        if (usuario.id != 1) {
            if (!usuario.cod_cliente) {
                return res.status(403).json({ error: 'Usuário sem cliente vinculado' });
            }

            if (colCliente) {
                whereClauses.push(`\`${colCliente}\` = :cod_cliente`);
                replacements.cod_cliente = usuario.cod_cliente;
            } else if (colVeiculo) {
                // Se a tabela tem veículo mas não tem cod_cliente, busca veículos do cliente
                const veiculos = await sequelize.query(
                    `SELECT codigo FROM veiculo WHERE cod_cliente = :cod_cliente`,
                    { replacements: { cod_cliente: usuario.cod_cliente }, type: QueryTypes.SELECT }
                );
                const idsVeiculos = veiculos.map(v => v.codigo);
                if (idsVeiculos.length === 0) {
                    return res.json({ recurso: tabelaLimpa, qtd: 0, pagina: Number(pagina), dados: [] });
                }
                whereClauses.push(`\`${colVeiculo}\` IN (:idsVeiculos)`);
                replacements.idsVeiculos = idsVeiculos;
            }
        }

        // 4. Filtro por Data (se fornecido no body e a tabela tiver coluna de data)
        if (data_inicial && data_final && colData) {
            const dtIni = data_inicial.length === 10 ? `${data_inicial} 00:00:00` : data_inicial;
            const dtFim = data_final.length === 10 ? `${data_final} 23:59:59` : data_final;
            
            whereClauses.push(`\`${colData}\` >= :dtIni AND \`${colData}\` <= :dtFim`);
            replacements.dtIni = dtIni;
            replacements.dtFim = dtFim;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        
        // Paginação
        const qtdLimite = Math.min(Math.max(parseInt(limite) || 100, 1), 1000);
        const offset = (Math.max(parseInt(pagina) || 1, 1) - 1) * qtdLimite;
        replacements.limite = qtdLimite;
        replacements.offset = offset;

        // Ordenação por data ou primeira coluna
        const orderSql = colData ? `ORDER BY \`${colData}\` DESC` : `ORDER BY \`${colunas[0]}\` DESC`;

        const querySql = `SELECT * FROM \`${tabelaLimpa}\` ${whereSql} ${orderSql} LIMIT :limite OFFSET :offset`;

        const dados = await sequelize.query(querySql, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            recurso: tabelaLimpa,
            qtd: dados.length,
            pagina: Number(pagina),
            limite: qtdLimite,
            dados
        });

    } catch (error) {
        console.error('Erro na consulta por recurso:', error);
        res.status(500).json({ error: 'Erro ao consultar o recurso informado' });
    }
};
