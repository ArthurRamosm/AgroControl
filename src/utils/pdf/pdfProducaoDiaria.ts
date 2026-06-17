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

type RegistroDiario = {
  data: string;
  leite_manha: number | null;
  leite_tarde: number | null;
  queijo_manha: number | null;
  queijo_tarde: number | null;
  lote_manha: string | null;
  lote_tarde: string | null;
  observacao: string | null;
};

const MESES_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function diasNoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

// [OWASP M4-01] Escapa valores antes de interpolar no HTML do PDF, evitando
// que dados do usuário (nome da propriedade, lote, observação, etc.) quebrem
// a estrutura da tabela ou injetem HTML/script no documento gerado.
function esc(v: any): string {
  if (v == null || v === '') return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroDiario[]
): string {
  const totalDias = diasNoMes(mes, ano);
  const prefixo = `${ano}-${pad2(mes)}`;

  // Indexed by day-of-month (1-31)
  const porDia: Record<number, RegistroDiario> = {};
  for (const r of registros) {
    const dia = parseInt(r.data.slice(8, 10), 10);
    porDia[dia] = r;
  }

  // Totals
  let totLeiteM = 0, totLeiteT = 0, totQueijoM = 0, totQueijoT = 0;
  for (let d = 1; d <= totalDias; d++) {
    const r = porDia[d];
    if (r) {
      totLeiteM += r.leite_manha ?? 0;
      totLeiteT += r.leite_tarde ?? 0;
      totQueijoM += r.queijo_manha ?? 0;
      totQueijoT += r.queijo_tarde ?? 0;
    }
  }

  // Build rows
  const linhas: string[] = [];
  for (let d = 1; d <= 31; d++) {
    if (d > totalDias) {
      // Day doesn't exist in this month
      linhas.push(`
        <tr>
          <td class="dia" style="background:#f5f5f5;color:#bbb">${d}</td>
          <td colspan="7" style="background:#f5f5f5"></td>
        </tr>`);
    } else {
      const r = porDia[d];
      linhas.push(`
        <tr>
          <td class="dia">${d}</td>
          <td class="num">${r ? fmt(r.leite_manha) : ''}</td>
          <td class="num">${r ? fmt(r.leite_tarde) : ''}</td>
          <td class="num">${r ? fmt(r.queijo_manha) : ''}</td>
          <td class="num">${r ? fmt(r.queijo_tarde) : ''}</td>
          <td>${esc(r?.lote_manha)}</td>
          <td>${esc(r?.lote_tarde)}</td>
          <td class="obs">${esc(r?.observacao)}</td>
        </tr>`);
    }
  }

  const mesAno = `${pad2(mes)}/${ano}`;
  const mesNome = MESES_PT[mes];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #000; padding: 12px; }
  h2 { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 6px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #555; padding: 2px 4px; }
  .info-table td { border: 1px solid #555; padding: 3px 5px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; }
  .header-row th { background: #d0d0d0; font-weight: bold; text-align: center; font-size: 8px; }
  .sub-header th { background: #e8e8e8; text-align: center; font-size: 8px; }
  .dia { text-align: center; font-weight: bold; width: 24px; }
  .num { text-align: right; width: 52px; }
  .obs { min-width: 80px; }
  .total-row td { background: #d0d0d0; font-weight: bold; }
  .rodape { margin-top: 10px; font-size: 8px; text-align: center; color: #444; }
  .spacer { height: 8px; }
</style>
</head>
<body>

<h2>PL 01/04 – Controle da Produção da Matéria Prima</h2>

<table class="info-table" style="margin-bottom:6px">
  <tr>
    <td class="label">Produtor</td>
    <td>${esc(info.proprietario)}</td>
    <td class="label">Nº do Certificado</td>
    <td></td>
  </tr>
  <tr>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
    <td class="label">Microrregião</td>
    <td>Canastra</td>
  </tr>
  <tr>
    <td class="label">Município</td>
    <td>${esc(info.cidade)} – ${esc(info.estado)}</td>
    <td class="label">MÊS/ANO</td>
    <td>${mesNome} / ${ano}</td>
  </tr>
  <tr>
    <td class="label">Estado</td>
    <td>${esc(info.estado)}</td>
    <td class="label">Frequência</td>
    <td>DIARIAMENTE</td>
  </tr>
</table>

<table>
  <thead>
    <tr class="header-row">
      <th rowspan="2">DIA</th>
      <th colspan="2">Produção de Leite (litros)</th>
      <th colspan="2">Prod. de Queijo (peças)</th>
      <th colspan="2">LOTES</th>
      <th rowspan="2">OBSERVAÇÃO</th>
    </tr>
    <tr class="sub-header">
      <th>Manhã</th>
      <th>Tarde</th>
      <th>Manhã</th>
      <th>Tarde</th>
      <th>Manhã</th>
      <th>Tarde</th>
    </tr>
  </thead>
  <tbody>
    ${linhas.join('')}
    <tr class="total-row">
      <td class="dia">TOTAL</td>
      <td class="num">${totLeiteM || ''}</td>
      <td class="num">${totLeiteT || ''}</td>
      <td class="num">${totQueijoM || ''}</td>
      <td class="num">${totQueijoT || ''}</td>
      <td></td>
      <td></td>
      <td></td>
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

export async function gerarPdfProducaoDiaria(
  mes: number,
  ano: number,
  propriedadeId: number
): Promise<void> {
  if (!db) return;

  // a) Buscar dados da propriedade e proprietário
  let info: PropriedadeInfo = {
    nome: '',
    cidade: '',
    estado: '',
    proprietario: '',
  };
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
  } catch {
    // Se as tabelas não existirem, continua com campos em branco
  }

  // b) Buscar registros do mês
  const prefixo = `${ano}-${pad2(mes)}`;
  let registros: RegistroDiario[] = [];
  try {
    registros = db.getAllSync(
      `SELECT data, leite_manha, leite_tarde, queijo_manha, queijo_tarde,
              lote_manha, lote_tarde, observacao
       FROM pl_producao_mp
       WHERE propriedade_id = ? AND data LIKE ?
       ORDER BY data ASC`,
      [propriedadeId, `${prefixo}-%`]
    ) as RegistroDiario[];
  } catch {}

  // c) Gerar HTML e exportar PDF
  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  try {
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PL 01/04 – ${pad2(mes)}/${ano}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
