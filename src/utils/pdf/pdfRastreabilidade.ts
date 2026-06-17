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

type RegistroRastreabilidade = {
  id: number;
  data_venda: string | null;
  quantidade_kg: number | null;
  lote: string | null;
  comprador: string | null;
  endereco_comprador: string | null;
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

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroRastreabilidade[]
): string {
  const mesLabel = `${MESES_FULL[mes - 1]}/${ano}`;
  const totalKg = registros.reduce((sum, r) => sum + (r.quantidade_kg ?? 0), 0);

  let linhas = '';
  if (registros.length === 0) {
    linhas = `<tr><td colspan="4" style="text-align:center;color:#999;padding:16px 6px;">Nenhum registro neste período</td></tr>`;
  } else {
    for (const r of registros) {
      const endStr = r.endereco_comprador
        ? `<br/><span style="font-size:7px;color:#555">${esc(r.endereco_comprador)}</span>`
        : '';
      linhas += `
        <tr>
          <td>${esc(r.data_venda)}</td>
          <td style="text-align:center;">${r.quantidade_kg != null ? r.quantidade_kg : ''}</td>
          <td>${esc(r.lote)}</td>
          <td>${esc(r.comprador)}${endStr}</td>
        </tr>`;
    }
  }

  const totalRow = registros.length > 0
    ? `<tr style="background:#f0f4f0;font-weight:bold;">
        <td style="text-align:right;">TOTAL</td>
        <td style="text-align:center;">${totalKg.toFixed(2)} kg</td>
        <td colspan="2"></td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
  h2 { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 8px; text-transform: uppercase; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .info-table td { border: 1px solid #555; padding: 3px 5px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 120px; }
  table.main { width: 100%; border-collapse: collapse; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 4px 6px; font-size: 9px; text-align: left;
  }
  table.main td { border: 1px solid #999; padding: 4px 6px; font-size: 9px; vertical-align: top; }
  .assinatura { margin-top: 24px; display: table; width: 100%; }
  .assinatura-esq { display: table-cell; width: 45%; font-size: 9px; }
  .assinatura-dir {
    display: table-cell; width: 45%; font-size: 9px;
    border-top: 1px solid #000; text-align: center; padding-top: 4px;
    vertical-align: bottom;
  }
  .rodape { margin-top: 12px; font-size: 8px; text-align: center; color: #444; }
</style>
</head>
<body>

<h2>PL 02/04 – CONTROLE DE RASTREABILIDADE DO PRODUTO</h2>

<table class="info-table">
  <tr>
    <td class="label">Produtor</td>
    <td>${esc(info.proprietario)}</td>
    <td class="label">Propriedade</td>
    <td>${esc(info.nome)}</td>
  </tr>
  <tr>
    <td class="label">Município</td>
    <td>${esc(info.cidade)}${info.estado ? ' – ' + esc(info.estado) : ''}</td>
    <td class="label">MÊS/ANO</td>
    <td>${mesLabel}</td>
  </tr>
  <tr>
    <td class="label">Nº do Certificado</td>
    <td></td>
    <td class="label">Microrregião</td>
    <td>Canastra &nbsp;&nbsp;&nbsp; Estado: ${esc(info.estado)}</td>
  </tr>
  <tr>
    <td class="label">Frequência</td>
    <td>DIARIAMENTE</td>
    <td class="label">Observações</td>
    <td>Consumo próprio</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th style="width:18%">Data da venda</th>
      <th style="width:22%">Quantidade vendida (kg)</th>
      <th style="width:22%">Data da produção (LOTE)</th>
      <th>Comprador / Endereço</th>
    </tr>
  </thead>
  <tbody>
    ${linhas}
    ${totalRow}
  </tbody>
</table>

<div class="assinatura">
  <div class="assinatura-esq">Data: ___/___/______</div>
  <div style="display:table-cell;width:10%;"></div>
  <div class="assinatura-dir">Responsável: _________________</div>
</div>

<p class="rodape">
  Planilha elaborada por Alberto Schwaiger Paciulli
  – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG
</p>

</body>
</html>`;
}

export async function gerarPdfRastreabilidade(
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

  let registros: RegistroRastreabilidade[] = [];
  try {
    registros = db.getAllSync(
      `SELECT id, data_venda, quantidade_kg, lote, comprador, endereco_comprador, observacoes
       FROM pl_rastreabilidade
       WHERE propriedade_id = ? AND data_venda LIKE ?
       ORDER BY data_venda ASC`,
      [propriedadeId, `${ano}-${pad2(mes)}-%`]
    ) as RegistroRastreabilidade[];
  } catch {}

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  try {
    const podeCompartilhar = await Sharing.isAvailableAsync();
    if (podeCompartilhar) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PL 02/04 – Rastreabilidade ${pad2(mes)}/${ano}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
