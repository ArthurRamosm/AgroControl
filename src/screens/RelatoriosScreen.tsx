import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveRelatorioCache, getRelatorioCache } from '../database/localDb';
import { formatarDataBrasileira, validarDataCompleta } from '../utils/animalHealth';

const PRIMARY = '#1a3d1f';

const noTranslateProps =
  Platform.OS === 'web' ? ({ translate: 'no', className: 'notranslate' } as any) : {};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Relatorios'>;
};

// ── Tipos de resposta da API ──────────────────────────────────────────────────
type RelatorioProdutividade = {
  totalAnimaisAtivos: number;
  totalMachos: number;
  totalFemeas: number;
  porRaca: Record<string, number>;
  porTipo: Record<string, number>;
  porStatusLeite: Record<string, number>;
};

type RelatorioSanitario = {
  totalAfastamentos: number;
  afastamentosAtivos: number;
  porMotivo: Record<string, number>;
  ultimosAfastamentos: {
    id: number;
    animalNome: string;
    animalBrinco: string;
    motivoAfastamento: string;
    dataAfastamento: string;
    dataRetorno?: string | null;
  }[];
};

type RelatorioFinanceiro = {
  receitaTotal: number;
  despesaTotal: number;
  lucro: number;
  margemLucro: number;
  evolucaoMensal: { mes: string; receita: number; despesa: number }[];
  despesasPorCategoria: { categoria: string; total: number; percentual: number }[];
};

type RelatorioReprodutivo = {
  totalGestantes: number;
  totalPartos: number;
  taxaNatalidade: number;
  mensagem: string;
};

type TipoRelatorio = 'produtividade' | 'sanitario' | 'financeiro' | 'reprodutivo';

type DadosAbertos = {
  tipo: TipoRelatorio;
  dados: unknown;
  periodoLabel: string;
};

// ── Helpers de data ───────────────────────────────────────────────────────────
function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function primeiroDiaMesBr() {
  const d = new Date();
  return `01/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function brParaIso(br: string) {
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function dictParaLinhas(dict: Record<string, number>) {
  return Object.entries(dict)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

// ── Geração de HTML para PDF ─────────────────────────────────────────────────
function gerarHtml(
  tipo: TipoRelatorio,
  dados: unknown,
  nomePropriedade: string,
  periodoLabel: string,
): string {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const titulos: Record<TipoRelatorio, string> = {
    produtividade: 'Relatório de Produtividade',
    sanitario: 'Relatório Sanitário',
    financeiro: 'Relatório Financeiro',
    reprodutivo: 'Relatório Reprodutivo',
  };

  let corpo = '';

  if (tipo === 'produtividade') {
    const d = dados as RelatorioProdutividade;
    corpo = `
      <table><tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Animais Ativos</td><td>${d.totalAnimaisAtivos}</td></tr>
        <tr><td>Machos</td><td>${d.totalMachos}</td></tr>
        <tr><td>Fêmeas</td><td>${d.totalFemeas}</td></tr>
        <tr><td>Por Raça</td><td>${dictParaLinhas(d.porRaca)}</td></tr>
        <tr><td>Por Tipo</td><td>${dictParaLinhas(d.porTipo)}</td></tr>
        <tr><td>Status Leite</td><td>${dictParaLinhas(d.porStatusLeite)}</td></tr>
      </table>`;
  } else if (tipo === 'sanitario') {
    const d = dados as RelatorioSanitario;
    const linhasAfastamentos = d.ultimosAfastamentos
      .map(a => `<tr><td>${a.animalNome || a.animalBrinco}</td><td>${a.motivoAfastamento}</td><td>${fmtData(a.dataAfastamento)}</td><td>${a.dataRetorno ? fmtData(a.dataRetorno) : 'Em curso'}</td></tr>`)
      .join('');
    corpo = `
      <table><tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Total Afastamentos</td><td>${d.totalAfastamentos}</td></tr>
        <tr><td>Afastamentos Ativos</td><td>${d.afastamentosAtivos}</td></tr>
        <tr><td>Por Motivo</td><td>${dictParaLinhas(d.porMotivo)}</td></tr>
      </table>
      ${linhasAfastamentos.length > 0 ? `
        <h3 style="color:#1a3d1f;margin-top:20px">Afastamentos no Período</h3>
        <table><tr><th>Animal</th><th>Motivo</th><th>Data</th><th>Retorno</th></tr>
          ${linhasAfastamentos}
        </table>` : ''}`;
  } else if (tipo === 'financeiro') {
    const d = dados as RelatorioFinanceiro;
    const linhasCat = d.despesasPorCategoria
      .map(c => `<tr><td>${c.categoria}</td><td>${fmtBRL(c.total)}</td><td>${c.percentual.toFixed(1)}%</td></tr>`)
      .join('');
    corpo = `
      <table><tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Receita Total</td><td>${fmtBRL(d.receitaTotal)}</td></tr>
        <tr><td>Despesa Total</td><td>${fmtBRL(d.despesaTotal)}</td></tr>
        <tr><td>Lucro</td><td>${fmtBRL(d.lucro)}</td></tr>
        <tr><td>Margem de Lucro</td><td>${d.margemLucro.toFixed(1)}%</td></tr>
      </table>
      ${linhasCat.length > 0 ? `
        <h3 style="color:#1a3d1f;margin-top:20px">Despesas por Categoria</h3>
        <table><tr><th>Categoria</th><th>Total</th><th>%</th></tr>${linhasCat}</table>` : ''}`;
  } else {
    const d = dados as RelatorioReprodutivo;
    corpo = `
      <table><tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Gestantes</td><td>${d.totalGestantes}</td></tr>
        <tr><td>Total de Partos</td><td>${d.totalPartos}</td></tr>
        <tr><td>Taxa de Natalidade</td><td>${d.taxaNatalidade.toFixed(1)}%</td></tr>
      </table>
      <p style="margin-top:14px;color:#555">${d.mensagem}</p>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #1f2d25; }
    .header { border-bottom: 3px solid #1a3d1f; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { color: #1a3d1f; font-size: 22px; font-weight: bold; }
    .prop { color: #555; font-size: 13px; margin-top: 4px; }
    .periodo { background: #f0f8f3; border-left: 3px solid #1a3d1f; padding: 8px 12px; margin-bottom: 16px; font-size: 13px; color: #1a3d1f; font-weight: bold; }
    h2 { color: #1a3d1f; margin-bottom: 4px; }
    .data { color: #888; font-size: 12px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #1a3d1f; color: #fff; padding: 10px; text-align: left; font-size: 13px; }
    td { padding: 9px 10px; border-bottom: 1px solid #e0e8e4; font-size: 13px; }
    tr:nth-child(even) td { background: #f5faf6; }
    .footer { margin-top: 40px; border-top: 1px solid #d0ddd5; padding-top: 12px; color: #888; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">AgroControl</div>
    <div class="prop">${nomePropriedade}</div>
  </div>
  <h2>${titulos[tipo]}</h2>
  <div class="data">Gerado em: ${hoje}</div>
  <div class="periodo">Período: ${periodoLabel}</div>
  ${corpo}
  <div class="footer">AgroControl — Tecnologia que faz o campo evoluir</div>
</body>
</html>`;
}

// ── Definição dos cards ───────────────────────────────────────────────────────
type CardDef = {
  tipo: TipoRelatorio;
  titulo: string;
  descricao: string;
  icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  cor: string;
};

const CARDS: CardDef[] = [
  {
    tipo: 'produtividade',
    titulo: 'Produtividade',
    descricao: 'Análise do rebanho por raça, tipo e status',
    icone: 'chart-bar',
    cor: '#2563eb',
  },
  {
    tipo: 'sanitario',
    titulo: 'Sanitário',
    descricao: 'Afastamentos, tratamentos e histórico',
    icone: 'heart-pulse',
    cor: '#2d6a4f',
  },
  {
    tipo: 'financeiro',
    titulo: 'Financeiro',
    descricao: 'Custos, receitas e ROI detalhado',
    icone: 'cash-multiple',
    cor: '#d97706',
  },
  {
    tipo: 'reprodutivo',
    titulo: 'Reprodutivo',
    descricao: 'Gestações, partos e taxa de natalidade',
    icone: 'calendar-heart',
    cor: '#e07b39',
  },
];

// ── Componentes de resultado ──────────────────────────────────────────────────
function ResultadoProdutividade({ dados }: { dados: RelatorioProdutividade }) {
  return (
    <View>
      <LinhaInfo label="Animais Ativos" valor={String(dados.totalAnimaisAtivos)} />
      <LinhaInfo label="Machos" valor={String(dados.totalMachos)} />
      <LinhaInfo label="Fêmeas" valor={String(dados.totalFemeas)} />
      {Object.entries(dados.porRaca).map(([k, v]) => (
        <LinhaInfo key={k} label={`Raça: ${k}`} valor={String(v)} />
      ))}
      {Object.entries(dados.porTipo).map(([k, v]) => (
        <LinhaInfo key={k} label={`Tipo: ${k}`} valor={String(v)} />
      ))}
    </View>
  );
}

function ResultadoSanitario({ dados }: { dados: RelatorioSanitario }) {
  return (
    <View>
      <LinhaInfo label="Total de Afastamentos" valor={String(dados.totalAfastamentos)} />
      <LinhaInfo label="Afastamentos Ativos" valor={String(dados.afastamentosAtivos)} cor="#c0392b" />
      {Object.entries(dados.porMotivo).map(([k, v]) => (
        <LinhaInfo key={k} label={k} valor={String(v)} />
      ))}
      {dados.ultimosAfastamentos.length > 0 && (
        <>
          <Text style={styles.subTitulo}>Afastamentos no Período</Text>
          {dados.ultimosAfastamentos.slice(0, 5).map(a => (
            <View key={a.id} style={styles.itemLista}>
              <Text style={styles.itemNome}>{a.animalNome || a.animalBrinco}</Text>
              <Text style={styles.itemDetalhe}>{a.motivoAfastamento} · {fmtData(a.dataAfastamento)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function ResultadoFinanceiro({ dados }: { dados: RelatorioFinanceiro }) {
  return (
    <View>
      <LinhaInfo label="Receita Total" valor={fmtBRL(dados.receitaTotal)} cor="#2d6a4f" />
      <LinhaInfo label="Despesa Total" valor={fmtBRL(dados.despesaTotal)} cor="#c0392b" />
      <LinhaInfo label="Lucro" valor={fmtBRL(dados.lucro)} cor={dados.lucro >= 0 ? '#2d6a4f' : '#c0392b'} />
      <LinhaInfo label="Margem de Lucro" valor={`${dados.margemLucro.toFixed(1)}%`} />
      {dados.despesasPorCategoria.length > 0 && (
        <>
          <Text style={styles.subTitulo}>Por Categoria</Text>
          {dados.despesasPorCategoria.map(c => (
            <LinhaInfo key={c.categoria} label={c.categoria} valor={`${fmtBRL(c.total)} (${c.percentual.toFixed(1)}%)`} />
          ))}
        </>
      )}
    </View>
  );
}

function ResultadoReprodutivo({ dados }: { dados: RelatorioReprodutivo }) {
  return (
    <View>
      <LinhaInfo label="Gestantes" valor={String(dados.totalGestantes)} />
      <LinhaInfo label="Total de Partos" valor={String(dados.totalPartos)} />
      <LinhaInfo label="Taxa de Natalidade" valor={`${dados.taxaNatalidade.toFixed(1)}%`} />
      {dados.mensagem ? <Text style={styles.mensagem}>{dados.mensagem}</Text> : null}
    </View>
  );
}

function LinhaInfo({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <View style={styles.linhaInfo}>
      <Text style={styles.linhaLabel}>{label}</Text>
      <Text style={[styles.linhaValor, cor ? { color: cor } : {}]}>{valor}</Text>
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function RelatoriosScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId, nome: nomeUsuario } = getSession();
  const { isOnline } = useNetworkStatus();

  const [carregando, setCarregando] = useState<TipoRelatorio | null>(null);
  const [dadosAbertos, setDadosAbertos] = useState<DadosAbertos | null>(null);
  const [exportando, setExportando] = useState(false);

  // Estado do modal de período
  const [modalPeriodo, setModalPeriodo] = useState<TipoRelatorio | null>(null);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMesBr());
  const [dataFim, setDataFim] = useState(hojeBr());

  function abrirModalPeriodo(tipo: TipoRelatorio) {
    setDataInicio(primeiroDiaMesBr());
    setDataFim(hojeBr());
    setModalPeriodo(tipo);
  }

  async function confirmarGerar() {
    if (!modalPeriodo) return;

    if (!validarDataCompleta(dataInicio)) {
      Alert.alert('Atenção', 'Data Início inválida. Use o formato DD/MM/AAAA.');
      return;
    }
    if (!validarDataCompleta(dataFim)) {
      Alert.alert('Atenção', 'Data Fim inválida. Use o formato DD/MM/AAAA.');
      return;
    }

    const tipo = modalPeriodo;
    setModalPeriodo(null);
    setCarregando(tipo);

    const isoInicio = brParaIso(dataInicio);
    const isoFim = brParaIso(dataFim);
    const periodoLabel = `${dataInicio} a ${dataFim}`;

    if (!isOnline) {
      const cached = await getRelatorioCache(propriedadeId, tipo);
      if (cached) {
        setDadosAbertos({ tipo, dados: cached.dados, periodoLabel: cached.periodoLabel });
      } else {
        Alert.alert('Sem conexão', 'Nenhum relatório em cache para este tipo. Conecte-se à internet para gerar.');
      }
      setCarregando(null);
      return;
    }

    try {
      const dados = await api.get(
        `/api/relatorios/${propriedadeId}/${tipo}?dataInicio=${isoInicio}&dataFim=${isoFim}`
      );
      setDadosAbertos({ tipo, dados, periodoLabel });
      saveRelatorioCache(propriedadeId, tipo, { dados, periodoLabel }).catch(() => {});
    } catch (error) {
      const cached = await getRelatorioCache(propriedadeId, tipo);
      if (cached) {
        setDadosAbertos({ tipo, dados: cached.dados, periodoLabel: cached.periodoLabel });
        Alert.alert('Sem conexão', 'Exibindo último relatório em cache.');
      } else {
        Alert.alert('Erro', getMensagemErro(error));
      }
    } finally {
      setCarregando(null);
    }
  }

  async function exportarPdf() {
    if (!dadosAbertos) return;
    setExportando(true);
    try {
      const html = gerarHtml(
        dadosAbertos.tipo,
        dadosAbertos.dados,
        nomeUsuario,
        dadosAbertos.periodoLabel,
      );
      const { uri } = await Print.printToFileAsync({ html });
      const podeCompartilhar = await Sharing.isAvailableAsync();
      if (podeCompartilhar) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exportar Relatório AgroControl',
        });
      } else {
        Alert.alert('Aviso', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (error) {
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setExportando(false);
    }
  }

  function renderConteudo() {
    if (!dadosAbertos) return null;
    const { tipo, dados } = dadosAbertos;
    if (tipo === 'produtividade') return <ResultadoProdutividade dados={dados as RelatorioProdutividade} />;
    if (tipo === 'sanitario') return <ResultadoSanitario dados={dados as RelatorioSanitario} />;
    if (tipo === 'financeiro') return <ResultadoFinanceiro dados={dados as RelatorioFinanceiro} />;
    if (tipo === 'reprodutivo') return <ResultadoReprodutivo dados={dados as RelatorioReprodutivo} />;
    return null;
  }

  const cardAberto = dadosAbertos ? CARDS.find(c => c.tipo === dadosAbertos.tipo) : null;

  return (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 134 + insets.bottom }]} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho */}
        <View style={styles.cabecalho}>
          <View style={styles.cabRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text {...noTranslateProps} style={styles.titulo}>Relatórios</Text>
              <Text {...noTranslateProps} style={styles.subtitulo}>Análises do seu rebanho</Text>
            </View>
          </View>
        </View>

        {/* Cards de relatório */}
        <View style={styles.secao}>
          {CARDS.map(card => (
            <View key={card.tipo} style={styles.card}>
              <View style={styles.cardEsquerda}>
                <View style={[styles.iconeCont, { backgroundColor: `${card.cor}18` }]}>
                  <MaterialCommunityIcons name={card.icone} size={26} color={card.cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text {...noTranslateProps} style={styles.cardTitulo}>{card.titulo}</Text>
                  <Text {...noTranslateProps} style={styles.cardDescricao}>{card.descricao}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.btnGerar, carregando === card.tipo && styles.btnGerarLoading]}
                onPress={() => abrirModalPeriodo(card.tipo)}
                disabled={carregando !== null}
              >
                {carregando === card.tipo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnGerarTexto}>Gerar</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Card de Insights */}
        <View style={[styles.secao, styles.insightsCard]}>
          <MaterialCommunityIcons name="file-document-outline" size={36} color="rgba(255,255,255,0.7)" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text {...noTranslateProps} style={styles.insightsTitulo}>Análises do rebanho</Text>
            <Text {...noTranslateProps} style={styles.insightsDesc}>
              Selecione o período e gere um relatório para visualizar os dados completos.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Modal de seleção de período ────────────────────────────────────── */}
      <Modal visible={modalPeriodo !== null} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalPeriodoCaixa}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>Selecionar Período</Text>
              <TouchableOpacity onPress={() => setModalPeriodo(null)}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalPeriodoContent}>
              <Text style={styles.periodoDesc}>
                Defina o intervalo de datas para gerar o relatório de{' '}
                <Text style={{ fontWeight: '900', color: PRIMARY }}>
                  {CARDS.find(c => c.tipo === modalPeriodo)?.titulo}
                </Text>
              </Text>

              <Text style={styles.labelPeriodo}>Data Início</Text>
              <TextInput
                style={styles.inputPeriodo}
                value={dataInicio}
                onChangeText={v => setDataInicio(formatarDataBrasileira(v))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#aeb8b1"
              />

              <Text style={styles.labelPeriodo}>Data Fim</Text>
              <TextInput
                style={styles.inputPeriodo}
                value={dataFim}
                onChangeText={v => setDataFim(formatarDataBrasileira(v))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#aeb8b1"
              />

              <View style={styles.modalBotoes}>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => setModalPeriodo(null)}
                >
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botaoSalvar} onPress={confirmarGerar}>
                  <MaterialCommunityIcons name="file-chart-outline" size={16} color="#fff" />
                  <Text style={styles.botaoSalvarTexto}>Gerar Relatório</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal de resultado do relatório ───────────────────────────────── */}
      <Modal visible={dadosAbertos !== null} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <View style={styles.modalCabecalho}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitulo}>
                  Relatório {cardAberto?.titulo}
                </Text>
                {dadosAbertos && (
                  <View style={styles.periodoBadge}>
                    <Ionicons name="calendar-outline" size={12} color={PRIMARY} />
                    <Text style={styles.periodoBadgeTexto}>{dadosAbertos.periodoLabel}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setDadosAbertos(null)}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {renderConteudo()}
            </ScrollView>

            <View style={styles.modalRodape}>
              <TouchableOpacity
                style={styles.btnExportar}
                onPress={exportarPdf}
                disabled={exportando}
              >
                {exportando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
                    <Text style={styles.btnExportarTexto}>Exportar PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFechar} onPress={() => setDadosAbertos(null)}>
                <Text style={styles.btnFecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomMenu activeItem="Relatórios" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1 },
  content: { paddingBottom: 134 },
  cabecalho: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  cabRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 8,
  },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitulo: { color: '#a8d5b5', fontSize: 13, marginTop: 2 },
  secao: { marginHorizontal: 16, marginTop: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardEsquerda: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconeCont: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: { color: '#1f2d25', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  cardDescricao: { color: '#66746d', fontSize: 12, fontWeight: '600' },
  btnGerar: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  btnGerarLoading: { opacity: 0.7 },
  btnGerarTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  insightsCard: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 4,
  },
  insightsTitulo: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  insightsDesc: { color: '#cfe8db', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  // Modal período
  modalPeriodoCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  modalPeriodoContent: { padding: 20, paddingBottom: 34 },
  periodoDesc: { color: '#66746d', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  labelPeriodo: { color: '#333', fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 16 },
  inputPeriodo: {
    backgroundColor: '#f5f9f5',
    borderColor: '#d6ded8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#26342b',
    fontSize: 16,
    fontWeight: '700',
    padding: 14,
    letterSpacing: 1,
  },
  // Modal resultado
  modalCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  modalCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0ea',
  },
  modalTitulo: { color: PRIMARY, fontSize: 18, fontWeight: '800' },
  periodoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    backgroundColor: '#e8f5ee',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  periodoBadgeTexto: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
  modalContent: { padding: 20, paddingBottom: 8 },
  modalRodape: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8f0ea',
  },
  btnExportar: {
    backgroundColor: '#c0392b',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnExportarTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnFechar: {
    borderColor: '#cbd4ce',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnFecharTexto: { color: '#5d675f', fontWeight: '800', fontSize: 14 },
  // Compartilhado entre os dois modais
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 22 },
  botaoCancelar: {
    alignItems: 'center',
    borderColor: '#cbd4ce',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    padding: 14,
  },
  botaoCancelarTexto: { color: '#5d675f', fontWeight: '800' },
  botaoSalvar: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    flex: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
  // Resultado
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f0',
  },
  linhaLabel: { color: '#66746d', fontSize: 14, fontWeight: '600', flex: 1 },
  linhaValor: { color: PRIMARY, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  subTitulo: { color: PRIMARY, fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 4 },
  itemLista: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f0',
  },
  itemNome: { color: '#1f2d25', fontSize: 14, fontWeight: '700' },
  itemDetalhe: { color: '#66746d', fontSize: 12, marginTop: 2 },
  mensagem: { color: '#66746d', fontSize: 13, marginTop: 12, lineHeight: 20 },
});
