// gerarToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const args = process.argv.slice(2);
const codClienteArg = args[0];
const nomeClienteArg = args[1] || 'Cliente Integracao';

let codNum = 0;
let tipoToken = 'ADMIN MESTRE (Acesso Total)';

if (codClienteArg) {
    codNum = parseInt(codClienteArg, 10);
    if (isNaN(codNum)) {
        console.error('ERRO: O código do cliente deve ser um número.');
        console.error('Uso: node gerarToken.js <cod_cliente> [nome_cliente]');
        process.exit(1);
    }
    tipoToken = `CLIENTE (cod_cliente: ${codNum} - "${nomeClienteArg}")`;
}

// Token ultra-compacto e permanente (sem expiração)
const token = jwt.sign(
    { c: codNum },
    process.env.JWT_SECRET,
    { noTimestamp: true, header: { typ: undefined } }
);

console.log('\n=============================================================');
console.log(` TOKEN GERADO: ${tipoToken}`);
console.log('=============================================================');
console.log(token);
console.log('=============================================================');
console.log('Como o cliente pode usar no cabeçalho das requisições:');
console.log(`Authorization: Bearer ${token}`);
console.log('ou');
console.log(`X-API-Key: ${token}`);
console.log('-------------------------------------------------------------');
console.log('Dica: Para gerar para um cliente específico:');
console.log('  node gerarToken.js <cod_cliente>');
console.log('Exemplo:');
console.log('  node gerarToken.js 22\n');