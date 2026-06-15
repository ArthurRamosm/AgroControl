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

type RegistroLeiteiro = {
  id: number;
  data: string;
  kg_dia: number | null;
  litros_dia: number | null;
  vp_preco: number | null;
  vs: number | null;
  leite_familiar: number | null;
  leite_bezerro: number | null;
  leite_descarte: number | null;
  queijos_produzidos: number | null;
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

function daysInMonth(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate();
}

function fmt1(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return v.toFixed(1);
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return v.toFixed(2);
}

function fmtInt(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return String(Math.round(v));
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroLeiteiro[]
): string {
  const totalDays = daysInMonth(mes, ano);
  const mesLabel = `${MESES_FULL[mes - 1]}/${ano}`;

  const porDia: Record<number, RegistroLeiteiro> = {};
  for (const r of registros) {
    const day = parseInt(r.data.split('-')[2], 10);
    if (!isNaN(day)) porDia[day] = r;
  }

  let rows = '';
  for (let day = 1; day <= 31; day++) {
    if (day > totalDays) {
      rows += `<tr style="background:#f0f0f0;">
        <td class="day-cell">${day}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`;
    } else {
      const r = porDia[day];
      if (r) {
        rows += `<tr>
          <td class="day-cell">${day}</td>
          <td class="num">${fmt1(r.kg_dia)}</td>
          <td class="num">${fmt1(r.litros_dia)}</td>
          <td class="num">${fmtMoney(r.vp_preco)}</td>
          <td class="num">${fmt1(r.vs)}</td>
          <td class="num">${fmt1(r.leite_familiar)}</td>
          <td class="num">${fmt1(r.leite_bezerro)}</td>
          <td class="num">${fmt1(r.leite_descarte)}</td>
          <td class="num">${fmtInt(r.queijos_produzidos)}</td>
        </tr>`;
      } else {
        rows += `<tr>
          <td class="day-cell">${day}</td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>`;
      }
    }
  }

  const count = registros.length;
  const sumKg    = registros.reduce((s, r) => s + (r.kg_dia ?? 0), 0);
  const sumLit   = registros.reduce((s, r) => s + (r.litros_dia ?? 0), 0);
  const sumVp    = registros.reduce((s, r) => s + (r.vp_preco ?? 0), 0);
  const sumVs    = registros.reduce((s, r) => s + (r.vs ?? 0), 0);
  const sumFam   = registros.reduce((s, r) => s + (r.leite_familiar ?? 0), 0);
  const sumBez   = registros.reduce((s, r) => s + (r.leite_bezerro ?? 0), 0);
  const sumDesc  = registros.reduce((s, r) => s + (r.leite_descarte ?? 0), 0);
  const sumQueij = registros.reduce((s, r) => s + (r.queijos_produzidos ?? 0), 0);

  const totalRow = `<tr style="background:#d0d0d0;font-weight:bold;">
    <td class="day-cell">TOTAL</td>
    <td class="num">${sumKg.toFixed(1)}</td>
    <td class="num">${sumLit.toFixed(1)}</td>
    <td class="num">${sumVp.toFixed(2)}</td>
    <td class="num">${sumVs.toFixed(1)}</td>
    <td class="num">${sumFam.toFixed(1)}</td>
    <td class="num">${sumBez.toFixed(1)}</td>
    <td class="num">${sumDesc.toFixed(1)}</td>
    <td class="num">${Math.round(sumQueij)}</td>
  </tr>`;

  const mediaRow = count > 0
    ? `<tr style="background:#e8e8e8;font-weight:bold;">
        <td class="day-cell">MÉDIA</td>
        <td class="num">${(sumKg / count).toFixed(1)}</td>
        <td class="num">${(sumLit / count).toFixed(1)}</td>
        <td class="num">${(sumVp / count).toFixed(2)}</td>
        <td class="num">${(sumVs / count).toFixed(1)}</td>
        <td class="num">${(sumFam / count).toFixed(1)}</td>
        <td class="num">${(sumBez / count).toFixed(1)}</td>
        <td class="num">${(sumDesc / count).toFixed(1)}</td>
        <td class="num">${(sumQueij / count).toFixed(1)}</td>
      </tr>`
    : '';

  const obsEntries = registros
    .filter(r => r.observacoes && r.observacoes.trim() !== '')
    .map(r => {
      const day = r.data.split('-')[2] ?? '';
      return `<p style="margin-bottom:3px;"><strong>${day}/${pad2(mes)}/${ano}:</strong> ${esc(r.observacoes)}</p>`;
    })
    .join('');

  const obsSection = obsEntries
    ? `<div style="margin-top:10px;">
        <p style="font-weight:bold;font-size:8px;margin-bottom:4px;">Observações do mês:</p>
        <div style="font-size:7px;color:#333;">${obsEntries}</div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 8mm; }
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
  th.day-th { width: 6%; }
  table.main td { border: 1px solid #ccc; padding: 2px 3px; font-size: 7px; }
  td.day-cell { text-align: center; font-weight: bold; background: #f5f5f5; }
  td.num { text-align: right; padding-right: 4px; }
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

<h2>PLANILHA PARA CONTROLE LEITEIRO MENSAL</h2>

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
      <th class="day-th">Dia</th>
      <th>Kg/dia</th>
      <th>Litros/dia</th>
      <th>VP (R$/L)</th>
      <th>VS (L)</th>
      <th>Leite Fam.</th>
      <th>Leite Bez.</th>
      <th>Leite Desc.</th>
      <th>Queijos</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${totalRow}
    ${mediaRow}
  </tbody>
</table>

${obsSection}

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

export async function gerarPdfControleLeiteiro(
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

  let registros: RegistroLeiteiro[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, data, kg_dia, litros_dia, vp_preco, vs,
              leite_familiar, leite_bezerro, leite_descarte,
              queijos_produzidos, observacoes
       FROM controle_leiteiro
       WHERE propriedade_id = ? AND data LIKE ?
       ORDER BY data ASC`,
      [propriedadeId, `${ano}-${pad2(mes)}-%`]
    ) as RegistroLeiteiro[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Controle Leiteiro ${pad2(mes)}/${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
