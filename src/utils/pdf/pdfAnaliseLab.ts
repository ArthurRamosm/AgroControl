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

type RegistroLab = {
  mes: number;
  agua_micro_sim_nao: string | null;
  agua_fisico_sim_nao: string | null;
  agua_lab_credenciado: string | null;
  agua_data_analise: string | null;
  agua_numero_analise: string | null;
  queijo_micro_sim_nao: string | null;
  queijo_fisico_sim_nao: string | null;
  queijo_lab_credenciado: string | null;
  queijo_data_analise: string | null;
  queijo_numero_analise: string | null;
  leite_analise_sim_nao: string | null;
  leite_lab_rbql: string | null;
  leite_data_analise: string | null;
  leite_numero_analise: string | null;
};

const MESES_ABREV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const N_COLS = 13; // 1 item + 12 meses

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function snCell(v: string | null | undefined): string {
  if (!v) return `<td class="empty"></td>`;
  if (v === 'S') return `<td class="sim">S</td>`;
  if (v === 'N') return `<td class="nao">N</td>`;
  return `<td>${esc(v)}</td>`;
}

function txtCell(v: string | null | undefined): string {
  if (!v) return `<td class="empty"></td>`;
  return `<td class="txt">${esc(v)}</td>`;
}

function sectionHeader(label: string): string {
  return `<tr><td colspan="${N_COLS}" class="sec-title">${label}</td></tr>`;
}

function dataRow(
  label: string,
  porMes: Record<number, RegistroLab>,
  getter: (r: RegistroLab) => string | null | undefined,
  isSN: boolean
): string {
  const cells = Array.from({ length: 12 }, (_, i) => {
    const r = porMes[i + 1];
    const val = r ? getter(r) : null;
    return isSN ? snCell(val) : txtCell(val);
  }).join('');
  return `<tr><td class="item">${esc(label)}</td>${cells}</tr>`;
}

function buildHtml(
  info: PropriedadeInfo,
  ano: number,
  registros: RegistroLab[]
): string {
  const porMes: Record<number, RegistroLab> = {};
  for (const r of registros) porMes[r.mes] = r;

  const thMeses = MESES_ABREV.map(m => `<th>${m}</th>`).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #000; }
  h2 { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
  h3 { font-size: 8px; font-weight: normal; text-align: center; margin-bottom: 6px; color: #333; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 4px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 80px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  table.main th.item-th { text-align: left; width: 140px; }
  table.main td { border: 1px solid #bbb; padding: 2px 3px; font-size: 7px; }
  td.item { font-size: 7px; vertical-align: top; line-height: 1.3; }
  td.sim { background: #e8f5e9; color: #1a5c24; font-weight: bold; text-align: center; }
  td.nao { background: #ffebee; color: #c0392b; font-weight: bold; text-align: center; }
  td.empty { background: #f9f9f9; }
  td.txt { text-align: center; font-size: 6px; }
  td.sec-title {
    background: #2c3e50; color: #fff; font-weight: bold;
    font-size: 8px; padding: 4px 6px; text-transform: uppercase;
  }
  .legenda { margin-top: 6px; font-size: 7px; color: #555; }
  .legenda span { margin-right: 12px; }
  .rodape { margin-top: 8px; font-size: 7px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>PL 01/03 – Controle Laboratorial e Análises (Água, Queijo e Leite)</h2>

<table class="info-table">
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Produtor</td>
    <td>${esc(info.proprietario)}</td>
    <td class="label">ANO</td>
    <td>${ano}</td>
    <td class="label">Frequência</td>
    <td>SEMESTRAL E TRIMESTRAL</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th class="item-th">ÍTEM</th>
      ${thMeses}
    </tr>
  </thead>
  <tbody>

    ${sectionHeader('ÁGUA')}
    ${dataRow('1. Possui análise microbiológica da ÁGUA dos últimos seis meses?', porMes, r => r.agua_micro_sim_nao, true)}
    ${dataRow('2. Possui análise físico-química da ÁGUA dos últimos seis meses?', porMes, r => r.agua_fisico_sim_nao, true)}
    ${dataRow('3. A análise da ÁGUA foi feita em laboratório terceirizado/credenciado?', porMes, r => r.agua_lab_credenciado, true)}
    ${dataRow('4. Data da análise', porMes, r => r.agua_data_analise, false)}
    ${dataRow('5. Número da análise', porMes, r => r.agua_numero_analise, false)}

    ${sectionHeader('QUEIJO')}
    ${dataRow('1. Possui análise microbiológica do QUEIJO dos últimos seis meses?', porMes, r => r.queijo_micro_sim_nao, true)}
    ${dataRow('2. Possui análise físico-química do QUEIJO dos últimos seis meses?', porMes, r => r.queijo_fisico_sim_nao, true)}
    ${dataRow('3. A análise do QUEIJO foi feita em laboratório terceirizado/credenciado?', porMes, r => r.queijo_lab_credenciado, true)}
    ${dataRow('4. Data da análise', porMes, r => r.queijo_data_analise, false)}
    ${dataRow('5. Número da análise', porMes, r => r.queijo_numero_analise, false)}

    ${sectionHeader('LEITE')}
    ${dataRow('1. Possui análise de LEITE nos últimos três meses?', porMes, r => r.leite_analise_sim_nao, true)}
    ${dataRow('2. A análise do LEITE foi feita em laboratório da RBQL credenciado pelo Ministério da Agricultura?', porMes, r => r.leite_lab_rbql, true)}
    ${dataRow('4. Data da análise', porMes, r => r.leite_data_analise, false)}
    ${dataRow('5. Número da análise', porMes, r => r.leite_numero_analise, false)}

  </tbody>
</table>

<p class="legenda">
  <span style="color:#1a5c24;font-weight:bold">S</span> = Sim &nbsp;
  <span style="color:#c0392b;font-weight:bold">N</span> = Não &nbsp;
  <span style="background:#f9f9f9;padding:1px 4px">célula cinza</span> = sem registro
</p>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;

  return html;
}

export async function gerarPdfAnaliseLab(
  ano: number,
  propriedadeId: number
): Promise<void> {
  if (!db) return;

  // a) Dados da propriedade e proprietário
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

  // b) Registros do ano
  let registros: RegistroLab[] = [];
  try {
    registros = db.getAllSync(
      `SELECT mes,
              agua_micro_sim_nao, agua_fisico_sim_nao, agua_lab_credenciado,
              agua_data_analise, agua_numero_analise,
              queijo_micro_sim_nao, queijo_fisico_sim_nao, queijo_lab_credenciado,
              queijo_data_analise, queijo_numero_analise,
              leite_analise_sim_nao, leite_lab_rbql,
              leite_data_analise, leite_numero_analise
       FROM pl_analise_lab
       WHERE propriedade_id = ? AND ano = ?
       ORDER BY mes ASC`,
      [propriedadeId, ano]
    ) as RegistroLab[];
  } catch {}

  // c) Gerar e exportar PDF
  const html = buildHtml(info, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `PL 01/03 – Análise Laboratorial ${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
