import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

type PropriedadeInfo = {
  nome: string;
  cidade: string;
  estado: string;
  proprietario: string;
};

type RegistroVenda = {
  id: number;
  data_venda: string | null;
  cliente: string | null;
  tipo_queijo: string | null;
  quantidade_unid: number | null;
  peso_total_kg: number | null;
  peso_por_queijo_kg: number | null;
  preco_unit_kg: number | null;
  total_rs: number | null;
};

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtBRL(v: number): string {
  return v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroVenda[]
): string {
  const mesLabel = `${MESES_FULL[mes - 1]}/${ano}`;

  const totalQty  = registros.reduce((s, r) => s + (r.quantidade_unid ?? 0), 0);
  const totalKg   = registros.reduce((s, r) => s + (r.peso_total_kg ?? 0), 0);
  const totalRs   = registros.reduce((s, r) => s + (r.total_rs ?? 0), 0);
  const precoMedio = totalKg > 0 ? totalRs / totalKg : 0;
  const clientesUnicos = new Set(
    registros.map(r => r.cliente ?? '').filter(c => c !== '')
  ).size;

  let tableBody = '';
  if (registros.length === 0) {
    tableBody = `<tr>
      <td colspan="8" style="text-align:center;color:#999;padding:16px 6px;">
        Nenhuma venda registrada neste período
      </td>
    </tr>`;
  } else {
    for (const r of registros) {
      tableBody += `<tr>
        <td>${esc(r.data_venda)}</td>
        <td>${esc(r.cliente)}</td>
        <td>${esc(r.tipo_queijo)}</td>
        <td class="num">${r.quantidade_unid ?? ''}</td>
        <td class="num">${r.peso_total_kg != null ? r.peso_total_kg.toFixed(2) : ''}</td>
        <td class="num">${r.peso_por_queijo_kg != null ? r.peso_por_queijo_kg.toFixed(3) : ''}</td>
        <td class="num">${r.preco_unit_kg != null ? r.preco_unit_kg.toFixed(2) : ''}</td>
        <td class="num total-cell">${r.total_rs != null ? fmtBRL(r.total_rs) : ''}</td>
      </tr>`;
    }
    tableBody += `<tr style="background:#d0d0d0;font-weight:bold;">
      <td colspan="3" style="text-align:right;padding-right:6px;">TOTAL</td>
      <td class="num">${Math.round(totalQty)}</td>
      <td class="num">${totalKg.toFixed(2)}</td>
      <td class="num">—</td>
      <td class="num">${precoMedio.toFixed(2)}</td>
      <td class="num total-cell">R$ ${fmtBRL(totalRs)}</td>
    </tr>`;
  }

  const resumo = `<div class="resumo">
    <p class="resumo-title">Resumo do período</p>
    <table class="resumo-table">
      <tr>
        <td class="resumo-label">Total de vendas</td>
        <td class="resumo-val">${registros.length}</td>
        <td class="resumo-label">Clientes únicos</td>
        <td class="resumo-val">${clientesUnicos}</td>
      </tr>
      <tr>
        <td class="resumo-label">Total kg vendido</td>
        <td class="resumo-val">${totalKg.toFixed(2)} kg</td>
        <td class="resumo-label">Preço médio</td>
        <td class="resumo-val">R$ ${precoMedio.toFixed(2)}/kg</td>
      </tr>
      <tr>
        <td class="resumo-label">Receita total</td>
        <td class="resumo-val" style="color:#1a5c24;font-weight:bold;">R$ ${fmtBRL(totalRs)}</td>
        <td></td><td></td>
      </tr>
    </table>
  </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #000; }
  h2 { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 5px; font-size: 8px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 90px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  th.date-th { width: 13%; }
  th.cliente-th { width: 20%; }
  th.tipo-th { width: 13%; }
  th.qty-th { width: 8%; }
  table.main td { border: 1px solid #ccc; padding: 2px 3px; font-size: 7px; vertical-align: top; }
  td.num { text-align: right; padding-right: 4px; }
  td.total-cell { font-weight: bold; }
  .resumo { margin-top: 8px; }
  .resumo-title { font-size: 9px; font-weight: bold; margin-bottom: 4px; }
  .resumo-table { border-collapse: collapse; width: 70%; }
  .resumo-table td { padding: 3px 6px; font-size: 8px; border: 1px solid #ddd; }
  .resumo-label { background: #f5f5f5; font-weight: bold; width: 110px; }
  .assinatura { margin-top: 14px; font-size: 8px; display: table; width: 100%; }
  .assinatura-esq { display: table-cell; width: 45%; }
  .assinatura-mid { display: table-cell; width: 10%; }
  .assinatura-dir {
    display: table-cell; width: 45%; border-top: 1px solid #000;
    text-align: center; padding-top: 3px; vertical-align: bottom;
  }
  .rodape { margin-top: 8px; font-size: 7px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>CONTROLE DE VENDAS DE QUEIJO</h2>

<table class="info-table">
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Mês/Ano</td>
    <td>${mesLabel}</td>
  </tr>
  <tr>
    <td class="label">Produtor</td>
    <td colspan="3">${esc(info.proprietario)}</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th class="date-th">Data de Venda</th>
      <th class="cliente-th">Cliente</th>
      <th class="tipo-th">Tipo de Queijo</th>
      <th class="qty-th">Qtd. (Unid.)</th>
      <th>Peso Total (kg)</th>
      <th>Peso/Queijo (kg/un)</th>
      <th>Preço Unit. (R$/kg)</th>
      <th>Total (R$)</th>
    </tr>
  </thead>
  <tbody>
    ${tableBody}
  </tbody>
</table>

${resumo}

<div class="assinatura">
  <div class="assinatura-esq">Data: ___/___/______</div>
  <div class="assinatura-mid"></div>
  <div class="assinatura-dir">Responsável: _________________</div>
</div>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;
}

export async function gerarPdfVendaQueijo(
  mes: number,
  ano: number,
  propriedadeId: number
): Promise<void> {
  if (!db) return;

  let info: PropriedadeInfo = { nome: '', cidade: '', estado: '', proprietario: '' };
  try {
    const rows = db.getAllSync(
      `SELECT p.nome, p.cidade, p.estado, u.nome as proprietario
       FROM PROPRIEDADE p
       JOIN USUARIO u ON u.propriedade_id = p.id
       WHERE p.id = ?
       LIMIT 1`,
      [propriedadeId]
    ) as PropriedadeInfo[];
    if (rows.length > 0) info = rows[0];
  } catch {}

  let registros: RegistroVenda[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, data_venda, cliente, tipo_queijo,
              quantidade_unid, peso_total_kg, peso_por_queijo_kg,
              preco_unit_kg, total_rs
       FROM venda_queijo
       WHERE propriedade_id = ? AND data_venda LIKE ?
       ORDER BY data_venda ASC`,
      [propriedadeId, `${ano}-${pad2(mes)}-%`]
    ) as RegistroVenda[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  try {
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Vendas de Queijo ${pad2(mes)}/${ano}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
