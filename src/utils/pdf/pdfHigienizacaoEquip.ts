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

type RegistroHigienizacao = {
  id: number;
  data: string;
  tambores_leite: string | null;
  bancas_bancadas: string | null;
  pias: string | null;
  armarios: string | null;
  pas_liras: string | null;
  formas_plastico: string | null;
  funil_coador: string | null;
  tecidos: string | null;
  baldes_plastico: string | null;
  tanque_soro: string | null;
  prateleiras_madeira: string | null;
  ralos: string | null;
  observacoes: string | null;
};

const EQUIPAMENTOS = [
  { key: 'tambores_leite',      label: 'Tambores de Leite' },
  { key: 'bancas_bancadas',     label: 'Bancas e Bancadas' },
  { key: 'pias',                label: 'Pias' },
  { key: 'armarios',            label: 'Armários' },
  { key: 'pas_liras',           label: 'Pás ou Liras' },
  { key: 'formas_plastico',     label: 'Formas de Plástico' },
  { key: 'funil_coador',        label: 'Funil com Coador' },
  { key: 'tecidos',             label: 'Tecidos' },
  { key: 'baldes_plastico',     label: 'Baldes de Plástico' },
  { key: 'tanque_soro',         label: 'Tanque/Saída do Soro' },
  { key: 'prateleiras_madeira', label: 'Prateleiras de Madeira' },
  { key: 'ralos',               label: 'Ralos' },
];

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

function cnCell(val: string | null | undefined, isValidDay: boolean): string {
  if (!isValidDay) return `<td class="no-day"></td>`;
  if (!val) return `<td class="empty"></td>`;
  if (val === 'C') return `<td class="conforme">C</td>`;
  if (val === 'NC') return `<td class="nc">NC</td>`;
  return `<td>${esc(val)}</td>`;
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroHigienizacao[]
): string {
  const totalDays = daysInMonth(mes, ano);
  const mesLabel = MESES_FULL[mes - 1];

  const porDia: Record<number, RegistroHigienizacao> = {};
  for (const r of registros) {
    const day = parseInt(r.data.split('-')[2], 10);
    if (!isNaN(day)) porDia[day] = r;
  }

  const thDays = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const cls = day > totalDays ? 'no-day' : '';
    return `<th class="${cls}">${day}</th>`;
  }).join('');

  const equipRows = EQUIPAMENTOS.map(eq => {
    const cells = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const r = porDia[day];
      const val = r ? (r as any)[eq.key] : null;
      return cnCell(val, day <= totalDays);
    }).join('');
    return `<tr><td class="eq-label">${esc(eq.label)}</td>${cells}</tr>`;
  }).join('');

  const obsRows = registros
    .filter(r => r.observacoes && r.observacoes.trim() !== '')
    .map(r => {
      const day = r.data.split('-')[2] ?? '';
      return `<tr>
        <td class="obs-date">${day}/${pad2(mes)}/${ano}</td>
        <td class="obs-text">${esc(r.observacoes)}</td>
      </tr>`;
    })
    .join('');

  const obsSection = obsRows
    ? `<div class="obs-section">
        <p class="obs-title">Observações e Ações Corretivas:</p>
        <table class="obs-table">${obsRows}</table>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 7px; color: #000; }
  h2 { font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 4px; font-size: 7px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 105px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 2px 1px; font-size: 6px; text-align: center;
  }
  table.main th.eq-th { text-align: left; width: 112px; font-size: 7px; padding-left: 4px; }
  table.main th.no-day { background: #e0e0e0; color: #aaa; }
  table.main td { border: 1px solid #ccc; padding: 2px 1px; font-size: 6px; text-align: center; }
  td.eq-label { font-size: 7px; text-align: left; padding: 2px 4px; }
  td.conforme { background: #e8f5e9; color: #1a5c24; font-weight: bold; }
  td.nc { background: #ffebee; color: #c0392b; font-weight: bold; }
  td.empty { background: #f9f9f9; }
  td.no-day { background: #e0e0e0; }
  .obs-section { margin-top: 8px; }
  .obs-title { font-size: 8px; font-weight: bold; margin-bottom: 4px; }
  table.obs-table { border-collapse: collapse; width: 100%; }
  table.obs-table td { border: 1px solid #ccc; padding: 3px 5px; font-size: 7px; vertical-align: top; }
  td.obs-date { width: 80px; font-weight: bold; white-space: nowrap; }
  .legenda { margin-top: 6px; font-size: 7px; color: #555; }
  .assinatura { margin-top: 12px; font-size: 8px; display: table; width: 100%; }
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

<h2>PL 01/05 – AVALIAÇÃO DA EFICIÊNCIA DA HIGIENIZAÇÃO E MANUTENÇÃO DE EQUIPAMENTOS</h2>

<table class="info-table">
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Produtor</td>
    <td>${esc(info.proprietario)}</td>
    <td class="label">Frequência</td>
    <td>DIÁRIA</td>
  </tr>
  <tr>
    <td class="label">Meses / dias do mês</td>
    <td>${mesLabel}</td>
    <td class="label">ANO</td>
    <td>${ano}</td>
    <td class="label">Município</td>
    <td>${esc(info.cidade)}${info.estado ? ' – ' + esc(info.estado) : ''}</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th class="eq-th">EQUIPAMENTOS</th>
      ${thDays}
    </tr>
  </thead>
  <tbody>
    ${equipRows}
  </tbody>
</table>

${obsSection}

<p class="legenda">
  <span style="color:#1a5c24;font-weight:bold">C</span> = Conforme &nbsp;&nbsp;
  <span style="color:#c0392b;font-weight:bold">NC</span> = Não Conforme &nbsp;&nbsp;
  <span style="background:#f9f9f9;padding:1px 3px;border:1px solid #ccc">vazio</span> = sem registro &nbsp;&nbsp;
  <span style="background:#e0e0e0;padding:1px 3px;border:1px solid #ccc">cinza</span> = dia inexistente
</p>

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

export async function gerarPdfHigienizacaoEquip(
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

  let registros: RegistroHigienizacao[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, data,
              tambores_leite, bancas_bancadas, pias, armarios,
              pas_liras, formas_plastico, funil_coador, tecidos,
              baldes_plastico, tanque_soro, prateleiras_madeira, ralos,
              observacoes
       FROM pl_higienizacao_equip
       WHERE propriedade_id = ? AND data LIKE ?
       ORDER BY data ASC`,
      [propriedadeId, `${ano}-${pad2(mes)}-%`]
    ) as RegistroHigienizacao[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `PL 01/05 – Higienização ${pad2(mes)}/${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
