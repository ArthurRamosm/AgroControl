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

type RegistroParasita = {
  nome_animal: string;
  produto: string;
  data_aplicacao: string;
  carencia: string;
  observacoes: string;
  origem: 'IMA' | 'Ficha';
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

function fmtDate(str: string): string {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}

function isEmCarencia(dataStr: string, carencia: string): boolean {
  if (!carencia || carencia.toLowerCase().includes('não') || carencia === '0') return false;
  const match = carencia.match(/(\d+)/);
  if (!match) return false;
  const dias = parseInt(match[1]);
  let data: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(dataStr)) {
    data = new Date(dataStr.substring(0, 10));
  } else {
    const parts = dataStr.split('/');
    if (parts.length < 3) return false;
    data = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  if (isNaN(data.getTime())) return false;
  const fim = new Date(data);
  fim.setDate(fim.getDate() + dias);
  return new Date() <= fim;
}

function buildHtml(
  info: PropriedadeInfo,
  mes: number,
  ano: number,
  registros: RegistroParasita[]
): string {
  const mesLabel = `${MESES_FULL[mes - 1]}/${ano}`;

  const emCarencia = registros.filter(r => isEmCarencia(r.data_aplicacao, r.carencia)).length;
  const prodCount: Record<string, number> = {};
  registros.forEach(r => { if (r.produto) prodCount[r.produto] = (prodCount[r.produto] || 0) + 1; });
  const prodMaisUsado = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  let tableBody = '';
  if (registros.length === 0) {
    tableBody = `<tr>
      <td colspan="5" style="text-align:center;color:#999;padding:16px 6px;">
        Nenhum registro neste período
      </td>
    </tr>`;
  } else {
    for (const r of registros) {
      const bg = isEmCarencia(r.data_aplicacao, r.carencia) ? '#fff3e0' : '#ffffff';
      const origemStyle = r.origem === 'IMA'
        ? 'background:#e8f0fe;color:#1565c0;'
        : 'background:#f3f3f3;color:#555;';
      tableBody += `<tr style="background:${bg};">
        <td>${esc(r.nome_animal)}</td>
        <td>${esc(r.produto)}</td>
        <td class="center">${esc(fmtDate(r.data_aplicacao))}</td>
        <td class="center">${esc(r.carencia)}</td>
        <td class="center">
          <span style="display:inline-block;padding:2px 5px;border-radius:4px;font-size:6px;font-weight:700;${origemStyle}">${esc(r.origem)}</span>
        </td>
      </tr>`;
    }
  }

  const resumo = `<div class="resumo">
    <p class="resumo-title">Resumo do período — ${mesLabel}</p>
    <table class="resumo-table">
      <tr>
        <td class="resumo-label">Total de aplicações</td>
        <td class="resumo-val">${registros.length}</td>
      </tr>
      <tr>
        <td class="resumo-label">Animais em carência</td>
        <td class="resumo-val" style="${emCarencia > 0 ? 'color:#c0392b;font-weight:bold;' : ''}">${emCarencia}</td>
      </tr>
      <tr>
        <td class="resumo-label">Produto mais utilizado</td>
        <td class="resumo-val">${esc(prodMaisUsado)}</td>
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
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .info-table td { border: 1px solid #555; padding: 2px 5px; font-size: 8px; }
  .info-table .label { background: #d0d0d0; font-weight: bold; width: 90px; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.main th {
    background: #d0d0d0; font-weight: bold; border: 1px solid #555;
    padding: 3px 2px; font-size: 7px; text-align: center;
  }
  th.animal-th  { width: 24%; }
  th.produto-th { width: 24%; }
  th.data-th    { width: 14%; }
  th.carencia-th { width: 22%; }
  th.origem-th  { width: 16%; }
  table.main td { border: 1px solid #ccc; padding: 2px 3px; font-size: 7px; vertical-align: top; }
  td.center { text-align: center; }
  .resumo { margin-top: 10px; }
  .resumo-title { font-size: 9px; font-weight: bold; margin-bottom: 4px; }
  .resumo-table { border-collapse: collapse; width: 65%; }
  .resumo-table td { padding: 3px 6px; font-size: 8px; border: 1px solid #ddd; }
  .resumo-label { background: #f5f5f5; font-weight: bold; width: 150px; }
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

<h2>PL 03/07 – CONTROLE DE APLICAÇÃO DE ENDO E ECTOPARASITAS</h2>

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
    <td class="label">Município</td>
    <td>${esc(info.cidade)}</td>
    <td class="label">Estado</td>
    <td>${esc(info.estado)}</td>
  </tr>
</table>

<table class="main">
  <thead>
    <tr>
      <th class="animal-th">Nome do Animal</th>
      <th class="produto-th">Produto utilizado</th>
      <th class="data-th">Data da aplicação</th>
      <th class="carencia-th">Período de carência</th>
      <th class="origem-th">Origem</th>
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

export async function gerarPdfParasitas(
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

  const registros: RegistroParasita[] = [];
  const prefix = `${ano}-${pad2(mes)}`;

  // Fonte 1 — despesa_detalhe (registros IMA com __tipo='parasita')
  try {
    const despesas = db.getAllSync(
      `SELECT id, data_compra, descricao FROM despesa_detalhe
       WHERE propriedade_id = ? AND categoria_ima = 'sanidade'
       AND data_compra LIKE ?`,
      [propriedadeId, `${prefix}-%`]
    ) as { id: number; data_compra: string; descricao: string }[];
    for (const row of despesas) {
      try {
        const parsed = JSON.parse(row.descricao);
        if (parsed.__tipo === 'parasita') {
          registros.push({
            nome_animal: parsed.animal ?? '',
            produto: parsed.produto ?? '',
            data_aplicacao: row.data_compra,
            carencia: parsed.carencia ?? '',
            observacoes: parsed.obs ?? '',
            origem: 'IMA',
          });
        }
      } catch {}
    }
  } catch {}

  // Fonte 2 — evento_local (tenta coluna tipo/data; cai no fallback JSON se falhar)
  let fichasCarregadas = false;
  try {
    const eventos = db.getAllSync(
      `SELECT id, dados_json FROM evento_local
       WHERE tipo IN ('Vermifugação', 'Antiparasitário')
       AND data LIKE ?`,
      [`${prefix}-%`]
    ) as { id: number; dados_json: string }[];
    for (const row of eventos) {
      try {
        const d = JSON.parse(row.dados_json);
        registros.push({
          nome_animal: d.nomeAnimal ?? d.animalNome ?? `Animal #${d.animalId ?? ''}`,
          produto: d.produtoUtilizado ?? '',
          data_aplicacao: d.dataRegistro ?? '',
          carencia: d.proximaAplicacao ? `Próxima: ${d.proximaAplicacao}` : 'Não tem',
          observacoes: d.observacao ?? '',
          origem: 'Ficha',
        });
      } catch {}
    }
    fichasCarregadas = true;
  } catch {}

  if (!fichasCarregadas) {
    try {
      const eventos = db.getAllSync(
        `SELECT id, dados_json FROM evento_local`
      ) as { id: number; dados_json: string }[];
      for (const row of eventos) {
        try {
          const d = JSON.parse(row.dados_json);
          if (d.tipoRegistro !== 'Vermifugacao') continue;
          if (!(d.dataRegistro ?? '').startsWith(prefix)) continue;
          registros.push({
            nome_animal: d.nomeAnimal ?? d.animalNome ?? `Animal #${d.animalId ?? ''}`,
            produto: d.produtoUtilizado ?? '',
            data_aplicacao: d.dataRegistro ?? '',
            carencia: d.proximaAplicacao ? `Próxima: ${d.proximaAplicacao}` : 'Não tem',
            observacoes: d.observacao ?? '',
            origem: 'Ficha',
          });
        } catch {}
      }
    } catch {}
  }

  registros.sort((a, b) => a.data_aplicacao.localeCompare(b.data_aplicacao));

  const html = buildHtml(info, mes, ano, registros);

  const { uri } = await Print.printToFileAsync({ html });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (podeCompartilhar) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Parasitas ${pad2(mes)}/${ano}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
