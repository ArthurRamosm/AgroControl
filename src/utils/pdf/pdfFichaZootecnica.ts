import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

type PropriedadeInfo = { nome: string; cidade: string; estado: string; proprietario: string; };

type LactacaoLocal = {
  numero_parto?: number | null;
  data_parto?: string | null;
  inicio_controle?: string | null;
  data_secagem?: string | null;
  dias_lactacao?: number | null;
  producao_total_kg?: number | null;
  media_kg_dia?: number | null;
};

type CoberturaLocal = {
  data_cobertura?: string | null;
  tipo?: string | null;
  reprodutor?: string | null;
  diagnostico_gestacao?: string | null;
  data_diag?: string | null;
  data_prevista_parto?: string | null;
  data_real_parto?: string | null;
};

const VACCINE_TYPES = [
  'Aftosa', 'Brucelose', 'Leptospirose', 'Paralítico', 'Carbúnculo',
  'Raiva Animal', 'Botulismo', 'IBR', 'BVD', 'Tristeza Parasitária',
  'Clostridioses', 'Vermifugações', 'Exames Tub./Brucel.',
];

function esc(v: any): string {
  if (v == null || v === '') return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fld(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return esc(obj[k]);
  }
  return '';
}

function evFld(row: any, direct: string, jsonKey?: string): string {
  if (row[direct] !== undefined && row[direct] !== null && row[direct] !== '') return esc(row[direct]);
  if (row.dados_json) {
    try {
      const p = JSON.parse(row.dados_json);
      const k = jsonKey ?? direct;
      if (p[k] !== undefined && p[k] !== null) return esc(p[k]);
    } catch {}
  }
  return '';
}

function buildHtml(
  info: PropriedadeInfo,
  a: any,
  lactacoes: LactacaoLocal[],
  coberturas: CoberturaLocal[],
  eventos: any[],
  vacinas: any[]
): string {
  // ── Identification block ────────────────────────────────────────────────────
  const idRows = `
    <tr>
      <td class="lb">Propriedade</td><td>${esc(info.nome)}</td>
      <td class="lb">Município/Estado</td><td>${esc(info.cidade)} – ${esc(info.estado)}</td>
    </tr>
    <tr>
      <td class="lb">Proprietário</td><td colspan="3">${esc(info.proprietario)}</td>
    </tr>
    <tr>
      <td class="lb">Nome do animal</td><td>${fld(a,'nome')}</td>
      <td class="lb">Nº do animal</td><td>${fld(a,'brinco','numero')}</td>
    </tr>
    <tr>
      <td class="lb">Data de nascimento</td><td>${fld(a,'data_nascimento','dataNascimento')}</td>
      <td class="lb">Raça</td><td>${fld(a,'raca')}</td>
    </tr>
    <tr>
      <td class="lb">Sexo</td><td>${fld(a,'sexo')}</td>
      <td class="lb">Marca ou sinal</td><td>${fld(a,'marca_sinal','marcaSinal')}</td>
    </tr>
    <tr>
      <td class="lb">Nome do pai</td><td>${fld(a,'pai_nome','nomePai')}</td>
      <td class="lb">Nº do pai</td><td>${fld(a,'pai_numero')}</td>
    </tr>
    <tr>
      <td class="lb">Raça do pai</td><td colspan="3">${fld(a,'pai_raca')}</td>
    </tr>
    <tr>
      <td class="lb">Nome da mãe</td><td>${fld(a,'mae_nome','nomeMae')}</td>
      <td class="lb">Nº da mãe</td><td>${fld(a,'mae_numero')}</td>
    </tr>
    <tr>
      <td class="lb">Raça da mãe</td><td colspan="3">${fld(a,'mae_raca')}</td>
    </tr>
    <tr>
      <td class="lb">Procedência</td><td colspan="3">${fld(a,'procedencia')}</td>
    </tr>
    <tr>
      <td class="lb">Data de entrada</td><td>${fld(a,'data_entrada','dataEntrada')}</td>
      <td class="lb">Valor (R$)</td><td>${fld(a,'valor_entrada','valor')}</td>
    </tr>
    <tr>
      <td class="lb">Data de saída</td><td>${fld(a,'data_saida','dataSaida')}</td>
      <td class="lb">Motivo/Causa</td><td>${fld(a,'motivo_saida','motivoSaida')}</td>
    </tr>`;

  // ── Events (two halves side-by-side) ────────────────────────────────────────
  const evHeaders = `<tr>
    <th>Evento</th><th>Data</th><th>Peso(kg)</th><th>Ração(kg/d)</th><th>Col./Leite(L)</th>
  </tr>`;

  const half = Math.ceil(eventos.length / 2);
  const leftEvs = eventos.slice(0, half);
  const rightEvs = eventos.slice(half);
  const minRows = Math.max(leftEvs.length, rightEvs.length, 5);

  let leftEvRows = '';
  let rightEvRows = '';
  for (let i = 0; i < minRows; i++) {
    const le = leftEvs[i];
    leftEvRows += le
      ? `<tr>
          <td>${evFld(le,'tipo','tipoEvento')}</td>
          <td>${evFld(le,'data','dataEvento')}</td>
          <td class="c">${evFld(le,'peso_kg','pesoKg')}</td>
          <td class="c">${evFld(le,'racao_kg_dia','racaoKgDia')}</td>
          <td class="c">${evFld(le,'leite_litros_dia','leiteLitrosDia')}</td>
        </tr>`
      : '<tr><td></td><td></td><td></td><td></td><td></td></tr>';

    const re = rightEvs[i];
    rightEvRows += re
      ? `<tr>
          <td>${evFld(re,'tipo','tipoEvento')}</td>
          <td>${evFld(re,'data','dataEvento')}</td>
          <td class="c">${evFld(re,'peso_kg','pesoKg')}</td>
          <td class="c">${evFld(re,'racao_kg_dia','racaoKgDia')}</td>
          <td class="c">${evFld(re,'leite_litros_dia','leiteLitrosDia')}</td>
        </tr>`
      : '<tr><td></td><td></td><td></td><td></td><td></td></tr>';
  }

  // ── Lactations (up to 10 rows) ──────────────────────────────────────────────
  let lacRows = '';
  for (let i = 0; i < 10; i++) {
    const lac = lactacoes[i];
    lacRows += lac
      ? `<tr>
          <td class="c">${lac.numero_parto ?? i + 1}</td>
          <td>${esc(lac.data_parto)}</td>
          <td>${esc(lac.inicio_controle)}</td>
          <td>${esc(lac.data_secagem)}</td>
          <td class="c">${lac.dias_lactacao ?? ''}</td>
          <td class="c">${lac.producao_total_kg != null ? lac.producao_total_kg.toFixed(1) : ''}</td>
          <td class="c">${lac.media_kg_dia != null ? lac.media_kg_dia.toFixed(2) : ''}</td>
        </tr>`
      : `<tr><td class="c">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  // ── Coberturas / Inseminações ───────────────────────────────────────────────
  let cioRows = '';
  const minCio = Math.max(coberturas.length, 5);
  for (let i = 0; i < minCio; i++) {
    const c = coberturas[i];
    cioRows += c
      ? `<tr>
          <td class="c">${i + 1}</td>
          <td>${esc(c.data_cobertura)}</td>
          <td>${esc(c.reprodutor)}</td>
          <td>${esc(c.data_diag)}</td>
          <td class="c">${esc(c.diagnostico_gestacao)}</td>
          <td>${esc(c.data_prevista_parto)}</td>
          <td>${esc(c.data_real_parto)}</td>
          <td></td><td></td><td></td><td></td>
        </tr>`
      : `<tr><td class="c">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  // ── Vacinas grouped by type ─────────────────────────────────────────────────
  const vacinasPorTipo: Record<string, string[]> = {};
  for (const v of vacinas) {
    let tipo = v.nome_vacina ?? v.nome ?? '';
    if (!tipo && v.dados_json) {
      try {
        const p = JSON.parse(v.dados_json);
        tipo = p.nomeVacina ?? p.nome_vacina ?? p.descricao ?? '';
      } catch {}
    }
    let dataVal = v.data ?? v.data_aplicacao ?? '';
    if (!dataVal && v.dados_json) {
      try {
        const p = JSON.parse(v.dados_json);
        dataVal = p.dataAplicacao ?? p.data ?? '';
      } catch {}
    }
    if (!tipo) continue;
    if (!vacinasPorTipo[tipo]) vacinasPorTipo[tipo] = [];
    vacinasPorTipo[tipo].push(esc(dataVal));
  }

  const allVacTypes = [...VACCINE_TYPES];
  for (const t of Object.keys(vacinasPorTipo)) {
    if (!allVacTypes.includes(t)) allVacTypes.push(t);
  }

  let vacRows = '';
  for (const tipo of allVacTypes) {
    const doses = vacinasPorTipo[tipo] ?? [];
    let cells = `<td>${esc(tipo)}</td>`;
    for (let i = 0; i < 12; i++) {
      cells += `<td class="c">${doses[i] ?? ''}</td>`;
    }
    vacRows += `<tr>${cells}</tr>`;
  }

  const rodape = `<p class="rodape">Planilha elaborada por Alberto Schwaiger Paciulli – Zootecnista – CRMV/MG nº 0779/Z – EMATER/MG</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 7px; color: #000; }
  h2 { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 5px; text-transform: uppercase; }
  .stitle {
    font-size: 8px; font-weight: bold; background: #d0d0d0;
    padding: 2px 4px; margin-top: 5px; margin-bottom: 2px; border: 1px solid #555;
  }
  .page-break { page-break-before: always; }

  /* Identification */
  .id-wrap { display: table; width: 100%; margin-bottom: 4px; }
  .id-main { display: table-cell; vertical-align: top; }
  .id-foto {
    display: table-cell; width: 85px; vertical-align: top;
    border: 1px solid #555; text-align: center;
    padding-top: 28px; font-size: 9px; font-weight: bold; color: #bbb;
  }
  table.idt { width: 100%; border-collapse: collapse; }
  table.idt td { border: 1px solid #555; padding: 2px 3px; font-size: 7px; }
  table.idt td.lb { background: #d0d0d0; font-weight: bold; width: 82px; }

  /* Events (two halves) */
  .ev-wrap { display: table; width: 100%; }
  .ev-cell { display: table-cell; width: 50%; vertical-align: top; }
  .ev-cell:first-child { padding-right: 2px; }
  .ev-cell:last-child  { padding-left: 2px; }
  table.evt { width: 100%; border-collapse: collapse; }
  table.evt th { background:#d0d0d0; border:1px solid #555; padding:2px 1px; font-size:6px; text-align:center; }
  table.evt td { border:1px solid #ccc; padding:1px 2px; font-size:6px; height:9px; }

  /* Lactation */
  table.lac { width:100%; border-collapse:collapse; }
  table.lac th { background:#d0d0d0; border:1px solid #555; padding:2px 2px; font-size:6px; text-align:center; }
  table.lac td { border:1px solid #ccc; padding:1px 2px; font-size:6px; height:9px; }

  /* CIO */
  table.cio { width:100%; border-collapse:collapse; table-layout:fixed; }
  table.cio th { background:#d0d0d0; border:1px solid #555; padding:2px 1px; font-size:6px; text-align:center; word-wrap:break-word; }
  table.cio td { border:1px solid #ccc; padding:1px 2px; font-size:6px; height:9px; word-wrap:break-word; }

  /* Vaccines */
  table.vac { width:100%; border-collapse:collapse; table-layout:fixed; }
  table.vac th { background:#d0d0d0; border:1px solid #555; padding:2px 1px; font-size:6px; text-align:center; }
  table.vac td { border:1px solid #ccc; padding:1px 2px; font-size:6px; height:9px; }
  th.vtipo { width:22%; }

  .c { text-align:center; }
  .rodape { margin-top:8px; font-size:6px; text-align:center; color:#444; }
</style>
</head>
<body>

<!-- ═══ PAGE 1 ═══ -->
<h2>FICHA PARA CONTROLE ZOOTÉCNICO INDIVIDUAL</h2>

<div class="id-wrap">
  <div class="id-main">
    <table class="idt">
      ${idRows}
    </table>
  </div>
  <div class="id-foto">FOTO</div>
</div>

<p class="stitle">EVENTOS</p>
<div class="ev-wrap">
  <div class="ev-cell">
    <table class="evt">
      <thead>${evHeaders}</thead>
      <tbody>${leftEvRows}</tbody>
    </table>
  </div>
  <div class="ev-cell">
    <table class="evt">
      <thead>${evHeaders}</thead>
      <tbody>${rightEvRows}</tbody>
    </table>
  </div>
</div>

<p class="stitle">LACTAÇÃO</p>
<table class="lac">
  <thead>
    <tr>
      <th style="width:5%">Nº</th>
      <th style="width:13%">Parto</th>
      <th style="width:14%">Início controle</th>
      <th style="width:13%">Secagem</th>
      <th style="width:10%">Dias lact.</th>
      <th style="width:12%">Prod. total</th>
      <th style="width:12%">Média(kg/d)</th>
    </tr>
  </thead>
  <tbody>${lacRows}</tbody>
</table>

${rodape}

<!-- ═══ PAGE 2 ═══ -->
<div class="page-break"></div>

<p class="stitle">C/IO — COBERTURAS / INSEMINAÇÕES</p>
<table class="cio">
  <thead>
    <tr>
      <th style="width:4%">Nº</th>
      <th style="width:9%">Data</th>
      <th style="width:12%">Reprodutor</th>
      <th style="width:9%">Diag.Gest. Data</th>
      <th style="width:9%">Resultado</th>
      <th style="width:9%">Data prevista</th>
      <th style="width:9%">Data real</th>
      <th style="width:9%">Parição Sexo</th>
      <th style="width:8%">Peso(kg)</th>
      <th style="width:7%">Nº</th>
      <th style="width:7%">IP(dias)</th>
    </tr>
  </thead>
  <tbody>${cioRows}</tbody>
</table>

<p class="stitle">OCORRÊNCIAS DIVERSAS</p>
<table class="vac">
  <thead>
    <tr>
      <th class="vtipo">Tipo</th>
      <th>1ª</th><th>2ª</th><th>3ª</th><th>4ª</th><th>5ª</th><th>6ª</th>
      <th>7ª</th><th>8ª</th><th>9ª</th><th>10ª</th><th>11ª</th><th>12ª</th>
    </tr>
  </thead>
  <tbody>${vacRows}</tbody>
</table>

${rodape}

</body>
</html>`;
}

export async function gerarPdfFichaZootecnica(
  animalId: number,
  propriedadeId: number
): Promise<void> {
  if (!db) return;

  let info: PropriedadeInfo = { nome: '', cidade: '', estado: '', proprietario: '' };
  try {
    const rows = db.getAllSync(
      `SELECT p.nome, p.cidade, p.estado, u.nome as proprietario
       FROM PROPRIEDADE p
       JOIN USUARIO u ON u.propriedade_id = p.id
       WHERE p.id = ? LIMIT 1`,
      [propriedadeId]
    ) as PropriedadeInfo[];
    if (rows.length > 0) info = rows[0];
  } catch {}

  let animalData: any = {};
  try {
    const rows = db.getAllSync(
      `SELECT * FROM animal_local WHERE id = ?`,
      [animalId]
    ) as any[];
    if (rows.length > 0) animalData = rows[0];
  } catch {}

  let lactacoes: LactacaoLocal[] = [];
  try {
    lactacoes = db.getAllSync(
      `SELECT * FROM animal_lactacao WHERE animal_id = ? ORDER BY numero_parto ASC`,
      [animalId]
    ) as LactacaoLocal[];
  } catch {}

  let coberturas: CoberturaLocal[] = [];
  try {
    coberturas = db.getAllSync(
      `SELECT * FROM animal_cobertura WHERE animal_id = ? ORDER BY data_cobertura ASC`,
      [animalId]
    ) as CoberturaLocal[];
  } catch {}

  let eventos: any[] = [];
  try {
    eventos = db.getAllSync(
      `SELECT * FROM evento_local WHERE animal_id = ? ORDER BY data ASC`,
      [animalId]
    ) as any[];
  } catch {}

  let vacinas: any[] = [];
  try {
    vacinas = db.getAllSync(
      `SELECT * FROM vacina_local WHERE animal_id = ? ORDER BY data ASC`,
      [animalId]
    ) as any[];
  } catch {}

  const html = buildHtml(info, animalData, lactacoes, coberturas, eventos, vacinas);

  const { uri } = await Print.printToFileAsync({ html });

  const nomeAnimal = esc(animalData.nome ?? animalData.brinco) || String(animalId);
  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Ficha Zootécnica – ${nomeAnimal}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
