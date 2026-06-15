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

type RegistroVestiario = {
  id: number;
  mes: number;
  ano: number;
  semana: number;
  data_avaliacao: string | null;
  item_1: string | null;
  item_2: string | null;
  item_3: string | null;
  item_4: string | null;
  item_5: string | null;
  item_6: string | null;
  item_7: string | null;
  item_8: string | null;
  item_9: string | null;
  item_10: string | null;
  observacoes: string | null;
  acoes_corretivas: string | null;
  responsavel: string | null;
};

const ITENS = [
  'Ambiente do vestiário está limpo e organizado?',
  'Há presença de lixeira com acionamento por pedal?',
  'Há saco plástico na lixeira?',
  'O lixo é recolhido semanalmente?',
  'Há presença de saboneteiras com sabonete líquido bactericida?',
  'Há presença de suporte de papel toalha?',
  'Há papel toalha para secar as mãos?',
  'Pias e ralos estão em bom estado de conservação e funcionando adequadamente?',
  'Lava-botas está em bom estado de conservação e funcionando adequadamente?',
  'Todos os manipuladores passam pelo vestiário antes de adentrar o ambiente de fabricação?',
];

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const SEMANA_LABELS = ['1ª Semana', '2ª Semana', '3ª Semana', '4ª Semana'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getItem(r: RegistroVestiario | undefined, n: number): string | null {
  if (!r) return null;
  return (r as any)[`item_${n}`] as string | null;
}

function snCells(val: string | null, data: string | null): string {
  const dataCell = `<td class="data-cell">${esc(data)}</td>`;
  if (val === 'S') return dataCell + `<td class="sim">X</td><td class="empty"></td>`;
  if (val === 'N') return dataCell + `<td class="empty"></td><td class="nao">X</td>`;
  return dataCell + `<td class="empty"></td><td class="empty"></td>`;
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroVestiario[]
): string {
  const mesLabel = MESES_FULL[mes - 1];

  const porSemana: Record<number, RegistroVestiario> = {};
  for (const r of registros) porSemana[r.semana] = r;

  const semanaHeaders = SEMANA_LABELS
    .map(l => `<th colspan="3">${l}</th>`)
    .join('');

  const subHeaders = Array.from({ length: 4 }, () =>
    `<th class="data-th">DATA</th><th class="sn-th">SIM</th><th class="sn-th">NÃO</th>`
  ).join('');

  const itemRows = ITENS.map((texto, idx) => {
    const n = idx + 1;
    const semCells = [1,2,3,4].map(s => {
      const r = porSemana[s];
      return snCells(getItem(r, n), r?.data_avaliacao ?? null);
    }).join('');
    return `<tr>
      <td class="item-cell">${n}. ${esc(texto)}</td>
      ${semCells}
    </tr>`;
  }).join('');

  const obsRow = `<tr>
    <td class="row-label">Observações</td>
    ${[1,2,3,4].map(s =>
      `<td colspan="3" class="bottom-cell">${esc(porSemana[s]?.observacoes)}</td>`
    ).join('')}
  </tr>`;

  const acsRow = `<tr>
    <td class="row-label">Ações Corretivas</td>
    ${[1,2,3,4].map(s =>
      `<td colspan="3" class="bottom-cell">${esc(porSemana[s]?.acoes_corretivas)}</td>`
    ).join('')}
  </tr>`;

  const respRow = `<tr>
    <td class="row-label">Responsável</td>
    ${[1,2,3,4].map(s =>
      `<td colspan="3" class="bottom-cell">${esc(porSemana[s]?.responsavel)}</td>`
    ).join('')}
  </tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #000; }
  h2 { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 4px; font-size: 8px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 110px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  th.item-th { text-align: left; width: 28%; padding-left: 4px; }
  th.data-th { width: 8%; font-size: 6px; }
  th.sn-th { width: 4%; font-size: 6px; }
  table.main td { border: 1px solid #bbb; padding: 3px 2px; font-size: 7px; vertical-align: top; }
  td.item-cell { font-size: 7px; text-align: left; padding: 3px 4px; line-height: 1.3; }
  td.data-cell { font-size: 6px; text-align: center; color: #555; }
  td.sim { background: #e8f5e9; color: #1a5c24; font-weight: bold; text-align: center; }
  td.nao { background: #ffebee; color: #c0392b; font-weight: bold; text-align: center; }
  td.empty { background: #f9f9f9; }
  td.row-label { font-weight: bold; font-size: 7px; padding: 5px 4px; background: #f5f5f5; }
  td.bottom-cell { font-size: 7px; padding: 5px 4px; vertical-align: top; }
  .rodape { margin-top: 10px; font-size: 7px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>PL 02/05 – AVALIAÇÃO DAS CONDIÇÕES DO VESTIÁRIO</h2>

<table class="info-table">
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Produtor</td>
    <td>${esc(info.proprietario)}</td>
  </tr>
  <tr>
    <td class="label">Meses / semanas do mês</td>
    <td>${mesLabel}</td>
    <td class="label">ANO</td>
    <td>${ano}</td>
  </tr>
  <tr>
    <td class="label">Frequência</td>
    <td>SEMANAL</td>
    <td class="label">Município</td>
    <td>${esc(info.cidade)}${info.estado ? ' – ' + esc(info.estado) : ''}</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th rowspan="2" class="item-th">ÍTENS</th>
      ${semanaHeaders}
    </tr>
    <tr>
      ${subHeaders}
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    ${obsRow}
    ${acsRow}
    ${respRow}
  </tbody>
</table>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;
}

export async function gerarPdfVestiario(
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

  let registros: RegistroVestiario[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, mes, ano, semana, data_avaliacao,
              item_1, item_2, item_3, item_4, item_5,
              item_6, item_7, item_8, item_9, item_10,
              observacoes, acoes_corretivas, responsavel
       FROM pl_vestiario
       WHERE propriedade_id = ? AND mes = ? AND ano = ?
       ORDER BY semana ASC`,
      [propriedadeId, mes, ano]
    ) as RegistroVestiario[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `PL 02/05 – Vestiário ${pad2(mes)}/${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
