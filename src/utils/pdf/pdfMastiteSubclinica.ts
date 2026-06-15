import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

type PropriedadeInfo = {
  nome: string;
  cidade: string;
  estado: string;
  proprietario: string;
};

type Sessao = {
  id: number;
  data_teste: string | null;
  observacoes: string | null;
};

type Animal = {
  id: number;
  nome_vaca: string | null;
  diagnostico: string | null;
  teto_1: string | null;
  teto_2: string | null;
  teto_3: string | null;
  teto_4: string | null;
  observacoes: string | null;
};

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
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
  sessao: Sessao,
  animais: Animal[]
): string {
  const dataTeste = esc(sessao.data_teste);

  let tableBody = '';
  if (animais.length === 0) {
    tableBody = `<tr>
      <td colspan="7" style="text-align:center;color:#999;padding:16px 6px;">
        Nenhum animal registrado nesta sessão
      </td>
    </tr>`;
  } else {
    for (const a of animais) {
      tableBody += `<tr>
        <td class="vaca">${esc(a.nome_vaca)}</td>
        ${diagCell(a.diagnostico)}
        ${tetoCell(a.teto_1)}
        ${tetoCell(a.teto_2)}
        ${tetoCell(a.teto_3)}
        ${tetoCell(a.teto_4)}
        <td class="obs">${esc(a.observacoes)}</td>
      </tr>`;
    }
  }

  const total = animais.length;
  const pos   = animais.filter(a => a.diagnostico === '+').length;
  const neg   = animais.filter(a => a.diagnostico === '-').length;
  const pctPos = total > 0 ? Math.round((pos / total) * 100) : 0;
  const pctNeg = total > 0 ? Math.round((neg / total) * 100) : 0;

  const resumo = `<div class="resumo">
    <p class="resumo-title">Resumo</p>
    <table class="resumo-table">
      <tr>
        <td class="resumo-label">Total de vacas testadas</td>
        <td class="resumo-val">${total}</td>
      </tr>
      <tr>
        <td class="resumo-label">Vacas positivas (+)</td>
        <td class="resumo-val" style="color:#c0392b;font-weight:bold;">${pos} (${pctPos}%)</td>
      </tr>
      <tr>
        <td class="resumo-label">Vacas negativas (−)</td>
        <td class="resumo-val" style="color:#27ae60;font-weight:bold;">${neg} (${pctNeg}%)</td>
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
  h3 { font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 6px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 5px; font-size: 8px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 90px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  th.vaca-th { width: 24%; }
  th.diag-th { width: 14%; }
  th.teto-th { width: 6%; }
  table.main td { border: 1px solid #ccc; padding: 2px 3px; font-size: 7px; vertical-align: top; text-align: center; }
  td.vaca { text-align: left; }
  td.obs  { text-align: left; }
  td.diag { font-weight: bold; }
  td.diag.pos { background: #ffebee; }
  td.diag.neg { background: #e8f5e9; }
  td.teto.pos { background: #ffebee; }
  td.teto.neg { background: #e8f5e9; }
  .resumo { margin-top: 10px; }
  .resumo-title { font-size: 9px; font-weight: bold; margin-bottom: 4px; }
  .resumo-table { border-collapse: collapse; width: 60%; }
  .resumo-table td { padding: 3px 6px; font-size: 8px; border: 1px solid #ddd; }
  .resumo-label { background: #f5f5f5; font-weight: bold; width: 140px; }
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

<h2>PL 02/07 – CONTROLE DE EXAMES DE MASTITE SUBCLÍNICA</h2>

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
    <td class="label">Município/Estado</td>
    <td colspan="3">${esc(info.cidade)} – ${esc(info.estado)}</td>
  </tr>
  <tr>
    <td class="label">Data do Teste</td>
    <td colspan="3">${dataTeste}</td>
  </tr>
</table>

<h3>MASTITE SUBCLÍNICA – CMT (Califórnia Mastit Test)</h3>

<table class="main">
  <thead>
    <tr>
      <th class="vaca-th">Nome da Vaca</th>
      <th class="diag-th">Diagnóstico (-) ou (+)</th>
      <th class="teto-th">Teto 1</th>
      <th class="teto-th">Teto 2</th>
      <th class="teto-th">Teto 3</th>
      <th class="teto-th">Teto 4</th>
      <th>OBSERVAÇÃO</th>
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

export async function gerarPdfMastiteSubclinica(
  sessaoId: number,
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

  let sessao: Sessao = { id: sessaoId, data_teste: null, observacoes: null };
  try {
    const rows = db.getAllSync(
      `SELECT id, data_teste, observacoes
       FROM mastite_subclinica_sessao
       WHERE id = ? AND propriedade_id = ?`,
      [sessaoId, propriedadeId]
    ) as Sessao[];
    if (rows.length > 0) sessao = rows[0];
  } catch {}

  let animais: Animal[] = [];
  try {
    animais = db.getAllSync(
      `SELECT id, nome_vaca, diagnostico,
              teto_1, teto_2, teto_3, teto_4, observacoes
       FROM mastite_subclinica_animal
       WHERE sessao_id = ?
       ORDER BY nome_vaca ASC`,
      [sessaoId]
    ) as Animal[];
  } catch {}

  const html = buildHtml(info, sessao, animais);

  const { uri } = await Print.printToFileAsync({ html });

  const dataPad = sessao.data_teste ?? pad2(new Date().getDate());
  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Mastite Subclínica – ${dataPad}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
