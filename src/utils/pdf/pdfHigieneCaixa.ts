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

type RegistroHigiene = {
  mes: number;
  ano: number;
  data_realizacao: string | null;
  observacoes: string | null;
  acoes_corretivas: string | null;
  responsavel: string | null;
};

const MESES_ABREV = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(
  info: PropriedadeInfo,
  ano: number,
  registros: RegistroHigiene[]
): string {
  // Index por mês (1..12)
  const porMes: Record<number, RegistroHigiene> = {};
  for (const r of registros) {
    porMes[r.mes] = r;
  }

  const linhas = MESES_ABREV.map((abrev, i) => {
    const mes = i + 1;
    const r = porMes[mes];
    const bg = r ? '#ffffff' : '#f9f9f9';
    return `
      <tr style="background:${bg}">
        <td class="mes">${abrev}</td>
        <td>${esc(r?.data_realizacao)}</td>
        <td>${esc(r?.observacoes)}</td>
        <td>${esc(r?.acoes_corretivas)}</td>
        <td>${esc(r?.responsavel)}</td>
      </tr>`;
  }).join('');

  const preenchidos = Object.keys(porMes).length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
  h2 { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
  h3 { font-size: 9px; font-weight: normal; text-align: center; margin-bottom: 8px; color: #444; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .info-table td { border: 1px solid #555; padding: 3px 5px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 80px; }
  table.main { width: 100%; border-collapse: collapse; }
  table.main th { background: #d0d0d0; font-weight: bold; border: 1px solid #555; padding: 4px 6px; font-size: 9px; text-align: left; }
  table.main td { border: 1px solid #999; padding: 5px 6px; font-size: 9px; vertical-align: top; }
  table.main td.mes { font-weight: bold; text-align: center; background: #e8e8e8; width: 36px; }
  .resumo { font-size: 8px; color: #555; text-align: right; margin-bottom: 6px; }
  .rodape { margin-top: 12px; font-size: 8px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>PL 01/01 – Higiene das Caixas D'Água</h2>
<h3>Controle da higiene da caixa d'água e reservatório</h3>

<table class="info-table">
  <tr>
    <td class="label">Fazenda</td>
    <td>${esc(info.nome)}</td>
    <td class="label">ANO</td>
    <td>${ano}</td>
    <td class="label">Frequência</td>
    <td>TRIMESTRAL</td>
  </tr>
  <tr>
    <td class="label">Produtor</td>
    <td colspan="5">${esc(info.proprietario)}</td>
  </tr>
</table>

<p class="resumo">Meses registrados: ${preenchidos}/12</p>

<table class="main">
  <thead>
    <tr>
      <th>MESES</th>
      <th>DATA</th>
      <th>OBSERVAÇÕES</th>
      <th>AÇÕES CORRETIVAS</th>
      <th>RESPONSÁVEL</th>
    </tr>
  </thead>
  <tbody>
    ${linhas}
  </tbody>
</table>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;
}

export async function gerarPdfHigieneCaixa(
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
  let registros: RegistroHigiene[] = [];
  try {
    registros = db.getAllSync(
      `SELECT mes, ano, data_realizacao, observacoes, acoes_corretivas, responsavel
       FROM pl_higiene_caixa
       WHERE propriedade_id = ? AND ano = ?
       ORDER BY mes ASC`,
      [propriedadeId, ano]
    ) as RegistroHigiene[];
  } catch {}

  // c) Gerar e exportar PDF
  const html = buildHtml(info, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `PL 01/01 – Higiene Caixa D'Água ${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
