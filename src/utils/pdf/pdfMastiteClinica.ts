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

type RegistroMastite = {
  id: number;
  nome_vaca: string | null;
  data_exame: string | null;
  diagnostico: string | null;
  teto_1: string | null;
  teto_2: string | null;
  teto_3: string | null;
  teto_4: string | null;
  observacoes: string | null;
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

function diagCell(val: string | null): string {
  if (val === '+') return `<td class="diag pos">${esc(val)}</td>`;
  if (val === '-') return `<td class="diag neg">${esc(val)}</td>`;
  return `<td class="diag">${esc(val) || '—'}</td>`;
}

function tetoCell(val: string | null): string {
  if (val === '+') return `<td class="teto pos">${esc(val)}</td>`;
  if (val === '-') return `<td class="teto neg">${esc(val)}</td>`;
  return `<td class="teto">—</td>`;
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroMastite[]
): string {
  const mesLabel = `${MESES_FULL[mes - 1]}/${ano}`;

  let tableBody = '';
  if (registros.length === 0) {
    tableBody = `<tr>
      <td colspan="8" style="text-align:center;color:#999;padding:16px 6px;">
        Nenhum registro neste período
      </td>
    </tr>`;
  } else {
    for (const r of registros) {
      tableBody += `<tr>
        <td class="vaca">${esc(r.nome_vaca)}</td>
        ${diagCell(r.diagnostico)}
        ${tetoCell(r.teto_1)}
        ${tetoCell(r.teto_2)}
        ${tetoCell(r.teto_3)}
        ${tetoCell(r.teto_4)}
        <td class="data">${esc(r.data_exame)}</td>
        <td class="obs">${esc(r.observacoes)}</td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #000; }
  h2 { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
  h3 { font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 6px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 5px; font-size: 8px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 90px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  th.vaca-th  { width: 22%; }
  th.diag-th  { width: 14%; }
  th.teto-th  { width: 6%; }
  th.data-th  { width: 12%; }
  table.main td { border: 1px solid #ccc; padding: 2px 3px; font-size: 7px; vertical-align: top; text-align: center; }
  td.vaca { text-align: left; }
  td.obs  { text-align: left; }
  td.data { }
  td.diag { font-weight: bold; }
  td.diag.pos { background: #ffebee; }
  td.diag.neg { background: #e8f5e9; }
  td.teto.pos { background: #ffebee; }
  td.teto.neg { background: #e8f5e9; }
  .nivel { margin-top: 8px; font-size: 8px; font-weight: bold; text-align: center; }
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

<h2>PL 01/07 – CONTROLE DE EXAMES DE MASTITE CLÍNICA</h2>

<table class="info-table">
  <tr>
    <td class="label">Produtor</td>
    <td colspan="3">${esc(info.proprietario)}</td>
  </tr>
  <tr>
    <td class="label">Propriedade</td>
    <td colspan="3">${esc(info.nome)}</td>
  </tr>
  <tr>
    <td class="label">Município</td>
    <td>${esc(info.cidade)}</td>
    <td class="label">Estado</td>
    <td>${esc(info.estado)}</td>
  </tr>
</table>

<h3>MASTITE CLÍNICA – Caneca de Fundo Escuro — ${mesLabel}</h3>

<table class="main">
  <thead>
    <tr>
      <th class="vaca-th">Nome da Vaca</th>
      <th class="diag-th">Diagnóstico (-) ou (+)</th>
      <th class="teto-th">Teto 1</th>
      <th class="teto-th">Teto 2</th>
      <th class="teto-th">Teto 3</th>
      <th class="teto-th">Teto 4</th>
      <th class="data-th">DATA</th>
      <th>OBSERVAÇÃO</th>
    </tr>
  </thead>
  <tbody>
    ${tableBody}
  </tbody>
</table>

<p class="nivel">Níveis Aceitáveis: Vacas com Mastite Clínica – até 1% ao mês</p>

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

export async function gerarPdfMastiteClinica(
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

  let registros: RegistroMastite[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, nome_vaca, data_exame, diagnostico,
              teto_1, teto_2, teto_3, teto_4, observacoes
       FROM mastite_clinica
       WHERE propriedade_id = ? AND data_exame LIKE ?
       ORDER BY data_exame ASC`,
      [propriedadeId, `${ano}-${pad2(mes)}-%`]
    ) as RegistroMastite[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  try {
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Mastite Clínica ${pad2(mes)}/${ano}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
