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

type RegistroPotabilidade = {
  data: string;
  teor_cloro: number | null;
  ph: number | null;
  acoes_corretivas: string | null;
  responsavel: string | null;
};

const CLORO_MIN = 0.2;
const CLORO_MAX = 2.0;
const PH_MIN = 6.0;
const PH_MAX = 9.5;

const MESES_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function diasNoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate();
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

// [OWASP M4-01] Escapa valores antes de interpolar no HTML do PDF, evitando
// que dados do usuário (nome da propriedade, responsável, ações corretivas,
// etc.) quebrem a estrutura da tabela ou injetem HTML/script no documento gerado.
function esc(v: any): string {
  if (v == null || v === '') return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cloroFora(v: number | null): boolean {
  if (v === null || v === undefined) return false;
  return v < CLORO_MIN || v > CLORO_MAX;
}

function phFora(v: number | null): boolean {
  if (v === null || v === undefined) return false;
  return v < PH_MIN || v > PH_MAX;
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroPotabilidade[]
): string {
  const totalDias = diasNoMes(mes, ano);

  // Index por dia do mês (1..31)
  const porDia: Record<number, RegistroPotabilidade> = {};
  for (const r of registros) {
    const dia = parseInt(r.data.slice(8, 10), 10);
    porDia[dia] = r;
  }

  // Responsável do último registro do mês
  const responsavelFinal = [...registros]
    .reverse()
    .find(r => r.responsavel)?.responsavel ?? '';

  // Ações corretivas concatenadas por data
  const acoesConcatenadas = registros
    .filter(r => r.acoes_corretivas)
    .map(r => {
      const dia = r.data.slice(8, 10);
      return `Dia ${esc(dia)}: ${esc(r.acoes_corretivas)}`;
    })
    .join('<br>');

  // Colunas de dias (cabeçalho)
  const thDias = Array.from({ length: totalDias }, (_, i) => i + 1)
    .map(d => `<th>${d}</th>`)
    .join('');

  // Células Teor de Cloro
  const tdCloro = Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
    const r = porDia[d];
    const val = r?.teor_cloro ?? null;
    const alerta = cloroFora(val);
    return `<td class="${alerta ? 'alerta' : ''}">${fmtNum(val)}</td>`;
  }).join('');

  // Células pH
  const tdPH = Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
    const r = porDia[d];
    const val = r?.ph ?? null;
    const alerta = phFora(val);
    return `<td class="${alerta ? 'alerta' : ''}">${fmtNum(val)}</td>`;
  }).join('');

  // Células Responsável
  const tdResponsavel = Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
    const r = porDia[d];
    return `<td class="resp">${esc(r?.responsavel)}</td>`;
  }).join('');

  const mesNome = MESES_PT[mes];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #000; }
  h2 { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 6px; text-transform: uppercase; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 4px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 90px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th, table.main td { border: 1px solid #555; padding: 1px 2px; text-align: center; font-size: 7px; overflow: hidden; }
  table.main th { background: #d0d0d0; font-weight: bold; }
  table.main td.item { text-align: left; font-weight: bold; background: #e8e8e8; width: 80px; }
  table.main td.acoes { text-align: left; font-size: 7px; width: 90px; word-break: break-word; }
  table.main td.resp { font-size: 6px; }
  table.main td.alerta { background: #ffebee; color: #c0392b; font-weight: bold; }
  .rodape { margin-top: 8px; font-size: 7px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>PL 02/01 – Controle da Potabilidade da Água</h2>

<table class="info-table">
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Município</td>
    <td>${esc(info.cidade)} – ${esc(info.estado)}</td>
    <td class="label">ANO</td>
    <td>${ano}</td>
    <td class="label">Frequência</td>
    <td>DIÁRIA</td>
  </tr>
  <tr>
    <td class="label">Produtor</td>
    <td colspan="5">${esc(info.proprietario)}</td>
    <td class="label">Responsável</td>
    <td>${esc(responsavelFinal)}</td>
  </tr>
  <tr>
    <td class="label">Mês</td>
    <td colspan="7">${mesNome} / ${ano}</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th style="width:80px">ÍTENS</th>
      ${thDias}
      <th style="width:90px">Ações Corretivas</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="item">Teor de Cloro<br><span style="font-weight:normal;font-size:6px">(ppm · lim: ${CLORO_MIN}–${CLORO_MAX})</span></td>
      ${tdCloro}
      <td class="acoes" rowspan="3">${acoesConcatenadas}</td>
    </tr>
    <tr>
      <td class="item">pH<br><span style="font-weight:normal;font-size:6px">(lim: ${PH_MIN}–${PH_MAX})</span></td>
      ${tdPH}
    </tr>
    <tr>
      <td class="item">Responsável</td>
      ${tdResponsavel}
    </tr>
  </tbody>
</table>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;
}

export async function gerarPdfPotabilidade(
  mes: number,
  ano: number,
  propriedadeId: number
): Promise<void> {
  if (!db) return;

  // a) Buscar dados da propriedade e proprietário
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

  // b) Buscar registros do mês
  const prefixo = `${ano}-${pad2(mes)}`;
  let registros: RegistroPotabilidade[] = [];
  try {
    registros = db.getAllSync(
      `SELECT data, teor_cloro, ph, acoes_corretivas, responsavel
       FROM pl_potabilidade
       WHERE propriedade_id = ? AND data LIKE ?
       ORDER BY data ASC`,
      [propriedadeId, `${prefixo}-%`]
    ) as RegistroPotabilidade[];
  } catch {}

  // c) Gerar HTML e exportar PDF
  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  try {
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PL 02/01 – Potabilidade ${pad2(mes)}/${ano}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
