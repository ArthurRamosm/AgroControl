import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { G, Rect, Text as SvgText, Path, Polyline, Circle, Line } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveFinanceiroCache, getFinanceiroCache, addToSyncQueue } from '../database/localDb';
import { formatarDataBrasileira, validarDataCompleta } from '../utils/animalHealth';
import { CATEGORIAS_IMA_DESPESA, SUBCATEGORIAS_IMA } from '../database/fazendaSchema';

const PRIMARY = '#0d2b10';
const SCREEN_W = Dimensions.get('window').width;

const noTranslateProps =
  Platform.OS === 'web' ? ({ translate: 'no', className: 'notranslate' } as any) : {};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Financeiro'>;
};

// ── Tipos ────────────────────────────────────────────────────────────────────

type ResumoFinanceiro = {
  receitaTotal: number;
  despesaTotal: number;
  lucroLiquido: number;
  margemLucro: number;
  roi: number;
  variacaoReceitaMes: number;
  variacaoDespesaMes: number;
  variacaoLucroMes: number;
};

type EvolucaoMensal = {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
};

type DespesaCategoria = {
  categoria: string;
  total: number;
  percentual: number;
};

type CustoPorAnimal = {
  totalAnimaisAtivos: number;
  custoPorCabeca: number;
  mes: string;
};

type AlertaFinanceiro = {
  tipo: string;
  mensagem: string;
  urgencia: 'alta' | 'media' | 'baixa';
};

type AnimalBusca = {
  id: number;
  brinco: string;
  nome: string | null;
  ativo: boolean;
};

type DespesaForm = {
  categoria: string;
  descricao: string;
  valor: string;
  dataDespesa: string;
  categoriaIma: string;
  subcategoriaIma: string;
  dataPagamento: string;
};

type ReceitaForm = {
  tipo: string;
  descricao: string;
  valor: string;
  dataReceita: string;
};

type VendaAnimalForm = {
  valor: string;
  data: string;
  observacao: string;
};

type CompraAnimalForm = {
  nomeAnimal: string;
  valor: string;
  data: string;
};

type InsumosForm = {
  produto: string;
  categoria: string;
  quantidade: string;
  valor: string;
  data: string;
};

type FuncionarioForm = {
  nomeFuncionario: string;
  tipo: string;
  valor: string;
  data: string;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const TODAS_CATEGORIAS = [
  'Racao', 'Medicamentos', 'SalMineral', 'Combustivel',
  'Funcionarios', 'Manutencao', 'Reproducao', 'Energia',
  'Reformas', 'CompraAnimais', 'InsumosGerais', 'Outros',
];

const CATEGORIAS_INSUMOS = ['Racao', 'SalMineral', 'Medicamentos', 'InsumosGerais'];

const TIPOS_RECEITA = ['Leite', 'Queijo', 'Outros'];

const TIPOS_FUNCIONARIO = ['Salario', 'Diaria', 'Servico'];

const CATEGORIA_CORES: Record<string, string> = {
  Racao: '#1b4332',
  Medicamentos: '#2196F3',
  SalMineral: '#F9A825',
  Combustivel: '#E65100',
  Funcionarios: '#7B1FA2',
  Manutencao: '#546E7A',
  Reproducao: '#C2185B',
  Energia: '#F57F17',
  Reformas: '#6D4C41',
  CompraAnimais: '#BF360C',
  InsumosGerais: '#2E7D32',
  Outros: '#9E9E9E',
};

const OPCOES_MESES = [3, 6, 12] as const;
type OpcaoMeses = typeof OPCOES_MESES[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBrParaIso(v: string) {
  const [d, m, y] = v.split('/');
  return `${y}-${m}-${d}T00:00:00`;
}

function variacaoTexto(v: number) {
  const sinal = v >= 0 ? '+' : '';
  return `${sinal}${v.toFixed(1)}% vs mês anterior`;
}

// ── Gráfico de Barras com linha de lucro ──────────────────────────────────────

function LucroBarChart({ data }: { data: EvolucaoMensal[] }) {
  if (data.length === 0) return null;
  const chartW = SCREEN_W - 40;
  const chartH = 200;
  const paddingLeft = 8;
  const paddingBottom = 30;
  const plotW = chartW - paddingLeft;
  const plotH = chartH - paddingBottom;

  const allPositive = data.flatMap(d => [d.receita, d.despesa]);
  const allLucro = data.map(d => d.lucro);
  const maxVal = Math.max(...allPositive, 1);
  const minVal = Math.min(0, ...allLucro);
  const range = maxVal - minVal || 1;

  function valueToY(v: number): number {
    return plotH - ((v - minVal) / range) * plotH;
  }

  const zeroY = valueToY(0);
  const groupW = plotW / data.length;
  const barW = Math.min((groupW - 12) / 2, 20);

  const lucroPoints = data
    .map((item, i) => {
      const x = paddingLeft + i * groupW + groupW / 2;
      const y = valueToY(item.lucro);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={chartW} height={chartH}>
      {/* Linha zero */}
      <Line
        x1={paddingLeft} y1={zeroY}
        x2={chartW} y2={zeroY}
        stroke="#d0d8d2" strokeDasharray="4 3" strokeWidth={1}
      />

      {data.map((item, i) => {
        const x0 = paddingLeft + i * groupW + (groupW - barW * 2 - 4) / 2;
        const yRec = valueToY(item.receita);
        const yDesp = valueToY(item.despesa);
        const labelX = paddingLeft + i * groupW + groupW / 2;
        const mes = item.mes.length > 3 ? item.mes.slice(0, 3) : item.mes;
        return (
          <G key={item.mes}>
            <Rect x={x0} y={yRec} width={barW} height={zeroY - yRec} fill="#2d6a4f" rx={2} />
            <Rect x={x0 + barW + 4} y={yDesp} width={barW} height={zeroY - yDesp} fill="#e07b39" rx={2} />
            <SvgText x={labelX} y={chartH - 8} fontSize={9} fill="#66746d" textAnchor="middle">
              {mes}
            </SvgText>
          </G>
        );
      })}

      {/* Linha de lucro */}
      {data.length > 1 && (
        <Polyline
          points={lucroPoints}
          fill="none"
          stroke="#1565C0"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {data.map((item, i) => {
        const x = paddingLeft + i * groupW + groupW / 2;
        const y = valueToY(item.lucro);
        return (
          <Circle
            key={`dot-${i}`}
            cx={x} cy={y} r={3.5}
            fill={item.lucro >= 0 ? '#1565C0' : '#c0392b'}
          />
        );
      })}
    </Svg>
  );
}

// ── Gráfico de Pizza ──────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(
  cx: number, cy: number, r: number, startDeg: number, endDeg: number,
): string {
  if (endDeg - startDeg >= 359.9) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function DespesasPieChart({ data }: { data: DespesaCategoria[] }) {
  if (data.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: '#88938c', fontSize: 13 }}>Sem despesas este mês</Text>
      </View>
    );
  }

  const size = 170;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;

  let cumulative = 0;
  const slices = data.map(item => {
    const start = cumulative;
    const sweep = (item.percentual / 100) * 360;
    cumulative += sweep;
    return { ...item, start, sweep };
  });

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <Svg width={size} height={size}>
          {slices.map(slice => (
            <Path
              key={slice.categoria}
              d={describeSlice(cx, cy, r, slice.start, slice.start + slice.sweep)}
              fill={CATEGORIA_CORES[slice.categoria] ?? '#9E9E9E'}
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>

      {data.map(item => (
        <View key={item.categoria} style={styles.pieLegendaRow}>
          <View style={[styles.pieLegendaDot, { backgroundColor: CATEGORIA_CORES[item.categoria] ?? '#9E9E9E' }]} />
          <Text {...noTranslateProps} style={styles.pieLegendaNome}>{item.categoria}</Text>
          <Text {...noTranslateProps} style={styles.pieLegendaValor}>{fmtBRL(item.total)}</Text>
          <Text {...noTranslateProps} style={styles.pieLegendaPct}>{item.percentual.toFixed(1)}%</Text>
        </View>
      ))}
    </View>
  );
}

// ── Componente de campo ───────────────────────────────────────────────────────

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        placeholderTextColor="#aeb8b1"
        textAlignVertical={props.multiline ? 'top' : 'center'}
        {...props}
      />
    </>
  );
}

// ── Chips de seleção ─────────────────────────────────────────────────────────

function ChipGroup({
  options, value, onChange, labelMap,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <View style={styles.chips}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, value === opt && styles.chipAtivo]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipTexto, value === opt && styles.chipTextoAtivo]}>
            {labelMap?.[opt] ?? opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function FinanceiroScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();

  // Dados
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);
  const [categorias, setCategorias] = useState<DespesaCategoria[]>([]);
  const [custoPorAnimal, setCustoPorAnimal] = useState<CustoPorAnimal | null>(null);
  const [alertas, setAlertas] = useState<AlertaFinanceiro[]>([]);

  // UI
  const [carregando, setCarregando] = useState(true);
  const [carregandoGrafico, setCarregandoGrafico] = useState(false);
  const [erro, setErro] = useState('');
  const [mesesSelecionados, setMesesSelecionados] = useState<OpcaoMeses>(3);
  const [salvando, setSalvando] = useState(false);

  // Modais
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalReceita, setModalReceita] = useState(false);
  const [modalVendaAnimal, setModalVendaAnimal] = useState(false);
  const [modalCompraAnimal, setModalCompraAnimal] = useState(false);
  const [modalInsumos, setModalInsumos] = useState(false);
  const [modalFuncionario, setModalFuncionario] = useState(false);

  // Formulários
  const [despesaForm, setDespesaForm] = useState<DespesaForm>({
    categoria: 'Racao', descricao: '', valor: '', dataDespesa: hojeBr(),
    categoriaIma: '', subcategoriaIma: '', dataPagamento: '',
  });
  const [receitaForm, setReceitaForm] = useState<ReceitaForm>({
    tipo: 'Outros', descricao: '', valor: '', dataReceita: hojeBr(),
  });
  const [vendaAnimalForm, setVendaAnimalForm] = useState<VendaAnimalForm>({
    valor: '', data: hojeBr(), observacao: '',
  });
  const [compraAnimalForm, setCompraAnimalForm] = useState<CompraAnimalForm>({
    nomeAnimal: '', valor: '', data: hojeBr(),
  });
  const [insumosForm, setInsumosForm] = useState<InsumosForm>({
    produto: '', categoria: 'Racao', quantidade: '', valor: '', data: hojeBr(),
  });
  const [funcionarioForm, setFuncionarioForm] = useState<FuncionarioForm>({
    nomeFuncionario: '', tipo: 'Salario', valor: '', data: hojeBr(),
  });

  // Busca de animal (para modal Venda)
  const [buscaAnimalTermo, setBuscaAnimalTermo] = useState('');
  const [animaisBuscados, setAnimaisBuscados] = useState<AnimalBusca[]>([]);
  const [animalSelecionado, setAnimalSelecionado] = useState<AnimalBusca | null>(null);
  const [buscandoAnimal, setBuscandoAnimal] = useState(false);
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga de dados ──────────────────────────────────────────────────────────

  const carregarEvolucao = useCallback(async (meses: OpcaoMeses) => {
    setCarregandoGrafico(true);
    try {
      const e = await api.get<EvolucaoMensal[]>(
        `/api/financeiro/${propriedadeId}/evolucao?meses=${meses}`
      );
      setEvolucao(e);
    } catch {
      // silencioso — mantém dados anteriores
    } finally {
      setCarregandoGrafico(false);
    }
  }, [propriedadeId]);

  const carregarTudo = useCallback(async (meses: OpcaoMeses = 3) => {
    setCarregando(true);
    setErro('');

    if (!isOnline) {
      const [cr, ce, cc, cca, cal] = await Promise.all([
        getFinanceiroCache<ResumoFinanceiro>(propriedadeId, 'resumo'),
        getFinanceiroCache<EvolucaoMensal[]>(propriedadeId, `evolucao_${meses}`),
        getFinanceiroCache<DespesaCategoria[]>(propriedadeId, 'categorias'),
        getFinanceiroCache<CustoPorAnimal>(propriedadeId, 'custoPorAnimal'),
        getFinanceiroCache<AlertaFinanceiro[]>(propriedadeId, 'alertas'),
      ]);
      if (cr) setResumo(cr);
      if (ce) setEvolucao(ce);
      if (cc) setCategorias(cc);
      if (cca) setCustoPorAnimal(cca);
      if (cal) setAlertas(cal);
      setCarregando(false);
      return;
    }

    try {
      const [r, e, c, custo, al] = await Promise.all([
        api.get<ResumoFinanceiro>(`/api/financeiro/${propriedadeId}/resumo`),
        api.get<EvolucaoMensal[]>(`/api/financeiro/${propriedadeId}/evolucao?meses=${meses}`),
        api.get<DespesaCategoria[]>(`/api/financeiro/${propriedadeId}/despesas-categoria`),
        api.get<CustoPorAnimal>(`/api/financeiro/${propriedadeId}/custo-por-animal`),
        api.get<AlertaFinanceiro[]>(`/api/financeiro/${propriedadeId}/alertas`),
      ]);
      setResumo(r);
      setEvolucao(e);
      setCategorias(c);
      setCustoPorAnimal(custo);
      setAlertas(al);

      saveFinanceiroCache(propriedadeId, 'resumo', r).catch(() => {});
      saveFinanceiroCache(propriedadeId, `evolucao_${meses}`, e).catch(() => {});
      saveFinanceiroCache(propriedadeId, 'categorias', c).catch(() => {});
      saveFinanceiroCache(propriedadeId, 'custoPorAnimal', custo).catch(() => {});
      saveFinanceiroCache(propriedadeId, 'alertas', al).catch(() => {});
    } catch (error) {
      const [cr, ce, cc] = await Promise.all([
        getFinanceiroCache<ResumoFinanceiro>(propriedadeId, 'resumo'),
        getFinanceiroCache<EvolucaoMensal[]>(propriedadeId, `evolucao_${meses}`),
        getFinanceiroCache<DespesaCategoria[]>(propriedadeId, 'categorias'),
      ]);
      if (cr || ce) {
        if (cr) setResumo(cr);
        if (ce) setEvolucao(ce);
        if (cc) setCategorias(cc);
      } else {
        setErro(getMensagemErro(error));
      }
    } finally {
      setCarregando(false);
    }
  }, [propriedadeId, isOnline]);

  useEffect(() => {
    carregarTudo(mesesSelecionados);
    const unsub = navigation.addListener('focus', () => carregarTudo(mesesSelecionados));
    return unsub;
  }, [navigation, carregarTudo, mesesSelecionados]);

  async function trocarMeses(meses: OpcaoMeses) {
    setMesesSelecionados(meses);
    await carregarEvolucao(meses);
  }

  // ── Busca de animal ─────────────────────────────────────────────────────────

  function handleBuscaAnimal(termo: string) {
    setBuscaAnimalTermo(termo);
    setAnimalSelecionado(null);
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    if (termo.length < 2) { setAnimaisBuscados([]); return; }
    buscaTimerRef.current = setTimeout(async () => {
      setBuscandoAnimal(true);
      try {
        const results = await api.get<AnimalBusca[]>(
          `/api/animais?propriedadeId=${propriedadeId}&busca=${encodeURIComponent(termo)}`
        );
        setAnimaisBuscados(results.filter(a => a.ativo));
      } catch {
        // silencioso
      } finally {
        setBuscandoAnimal(false);
      }
    }, 400);
  }

  // ── Helpers offline/online comuns ───────────────────────────────────────────

  async function postComOffline(
    endpoint: string,
    dados: Record<string, unknown>,
    tabela: string,
    onSuccess: () => void,
  ) {
    setSalvando(true);
    if (!isOnline) {
      await addToSyncQueue(tabela, 'INSERT', dados);
      onSuccess();
      setSalvando(false);
      Alert.alert('Salvo', 'Registro salvo localmente e será sincronizado quando houver internet.');
      return;
    }
    try {
      await api.post(endpoint, dados);
      onSuccess();
      await carregarTudo(mesesSelecionados);
    } catch {
      await addToSyncQueue(tabela, 'INSERT', dados);
      onSuccess();
      Alert.alert('Sem conexão', 'Registro salvo localmente e será sincronizado automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  // ── Salvar Despesa Geral ────────────────────────────────────────────────────

  async function salvarDespesa() {
    if (!despesaForm.valor.trim() || isNaN(Number(despesaForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(despesaForm.dataDespesa)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const dados = {
      propriedadeId,
      categoria: despesaForm.categoria,
      descricao: despesaForm.descricao.trim() || null,
      valor: parseFloat(despesaForm.valor.replace(',', '.')),
      dataDespesa: dataBrParaIso(despesaForm.dataDespesa),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/despesas`, dados, 'financeiro_despesas', () => {
      setModalDespesa(false);
      setDespesaForm({ categoria: 'Racao', descricao: '', valor: '', dataDespesa: hojeBr(), categoriaIma: '', subcategoriaIma: '', dataPagamento: '' });
    });
  }

  // ── Salvar Receita ──────────────────────────────────────────────────────────

  async function salvarReceita() {
    if (!receitaForm.valor.trim() || isNaN(Number(receitaForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(receitaForm.dataReceita)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const dados = {
      propriedadeId,
      tipo: receitaForm.tipo,
      descricao: receitaForm.descricao.trim() || null,
      valor: parseFloat(receitaForm.valor.replace(',', '.')),
      dataReceita: dataBrParaIso(receitaForm.dataReceita),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/receitas`, dados, 'financeiro_receitas', () => {
      setModalReceita(false);
      setReceitaForm({ tipo: 'Outros', descricao: '', valor: '', dataReceita: hojeBr() });
    });
  }

  // ── Salvar Venda de Animal ──────────────────────────────────────────────────

  async function salvarVendaAnimal() {
    if (!animalSelecionado) {
      Alert.alert('Atenção', 'Selecione o animal vendido.'); return;
    }
    if (!vendaAnimalForm.valor.trim() || isNaN(Number(vendaAnimalForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(vendaAnimalForm.data)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const dados = {
      propriedadeId,
      animalId: animalSelecionado.id,
      tipo: 'VendaAnimais',
      descricao: vendaAnimalForm.observacao.trim() ||
        `Venda: ${animalSelecionado.brinco}${animalSelecionado.nome ? ' — ' + animalSelecionado.nome : ''}`,
      valor: parseFloat(vendaAnimalForm.valor.replace(',', '.')),
      dataReceita: dataBrParaIso(vendaAnimalForm.data),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/receitas`, dados, 'financeiro_receitas', () => {
      setModalVendaAnimal(false);
      setVendaAnimalForm({ valor: '', data: hojeBr(), observacao: '' });
      setAnimalSelecionado(null);
      setBuscaAnimalTermo('');
      setAnimaisBuscados([]);
    });
  }

  // ── Salvar Compra de Animal ─────────────────────────────────────────────────

  async function salvarCompraAnimal() {
    if (!compraAnimalForm.valor.trim() || isNaN(Number(compraAnimalForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(compraAnimalForm.data)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const dados = {
      propriedadeId,
      categoria: 'CompraAnimais',
      descricao: compraAnimalForm.nomeAnimal.trim() || 'Compra de animal',
      valor: parseFloat(compraAnimalForm.valor.replace(',', '.')),
      dataDespesa: dataBrParaIso(compraAnimalForm.data),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/despesas`, dados, 'financeiro_despesas', () => {
      setModalCompraAnimal(false);
      setCompraAnimalForm({ nomeAnimal: '', valor: '', data: hojeBr() });
    });
  }

  // ── Salvar Compra de Insumos ────────────────────────────────────────────────

  async function salvarInsumos() {
    if (!insumosForm.valor.trim() || isNaN(Number(insumosForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(insumosForm.data)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const desc = [insumosForm.produto, insumosForm.quantidade]
      .filter(Boolean).join(' — ') || null;
    const dados = {
      propriedadeId,
      categoria: insumosForm.categoria,
      descricao: desc,
      valor: parseFloat(insumosForm.valor.replace(',', '.')),
      dataDespesa: dataBrParaIso(insumosForm.data),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/despesas`, dados, 'financeiro_despesas', () => {
      setModalInsumos(false);
      setInsumosForm({ produto: '', categoria: 'Racao', quantidade: '', valor: '', data: hojeBr() });
    });
  }

  // ── Salvar Pagamento Funcionário ────────────────────────────────────────────

  async function salvarFuncionario() {
    if (!funcionarioForm.valor.trim() || isNaN(Number(funcionarioForm.valor.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.'); return;
    }
    if (!validarDataCompleta(funcionarioForm.data)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.'); return;
    }
    const desc = funcionarioForm.nomeFuncionario.trim()
      ? `${funcionarioForm.tipo} — ${funcionarioForm.nomeFuncionario.trim()}`
      : funcionarioForm.tipo;
    const dados = {
      propriedadeId,
      categoria: 'Funcionarios',
      descricao: desc,
      valor: parseFloat(funcionarioForm.valor.replace(',', '.')),
      dataDespesa: dataBrParaIso(funcionarioForm.data),
    };
    await postComOffline(`/api/financeiro/${propriedadeId}/despesas`, dados, 'financeiro_despesas', () => {
      setModalFuncionario(false);
      setFuncionarioForm({ nomeFuncionario: '', tipo: 'Salario', valor: '', data: hojeBr() });
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const lucroPositivo = (resumo?.lucroLiquido ?? 0) >= 0;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 134 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.cabecalho}>
          <View style={styles.cabRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text {...noTranslateProps} style={styles.titulo}>Financeiro</Text>
              <Text {...noTranslateProps} style={styles.subtitulo}>Resultado da fazenda</Text>
            </View>
          </View>
        </View>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : erro ? (
          <View style={styles.centro}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity style={styles.btnRecarregar} onPress={() => carregarTudo(mesesSelecionados)}>
              <Text style={styles.btnRecarregarTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── SEÇÃO 1: Cards de resumo ─────────────────────────────── */}
            <View style={styles.secao}>
              <View style={styles.resumoGrid}>
                {/* Receita */}
                <View testID="card-receita-total" style={[styles.resumoCard, styles.resumoCardReceita]}>
                  <Text {...noTranslateProps} style={styles.resumoLabel}>Receita Total</Text>
                  <Text {...noTranslateProps} style={[styles.resumoValor, { color: '#1b5e20' }]}>
                    {fmtBRL(resumo?.receitaTotal ?? 0)}
                  </Text>
                  <Text
                    {...noTranslateProps}
                    style={[
                      styles.resumoVariacao,
                      (resumo?.variacaoReceitaMes ?? 0) >= 0
                        ? styles.variacaoPositiva : styles.variacaoNegativa,
                    ]}
                  >
                    {variacaoTexto(resumo?.variacaoReceitaMes ?? 0)}
                  </Text>
                </View>

                {/* Custos */}
                <View testID="card-custos-total" style={[styles.resumoCard, styles.resumoCardDespesa]}>
                  <Text {...noTranslateProps} style={styles.resumoLabel}>Custos Totais</Text>
                  <Text {...noTranslateProps} style={[styles.resumoValor, { color: '#b71c1c' }]}>
                    {fmtBRL(resumo?.despesaTotal ?? 0)}
                  </Text>
                  <Text
                    {...noTranslateProps}
                    style={[
                      styles.resumoVariacao,
                      (resumo?.variacaoDespesaMes ?? 0) <= 0
                        ? styles.variacaoPositiva : styles.variacaoNegativa,
                    ]}
                  >
                    {variacaoTexto(resumo?.variacaoDespesaMes ?? 0)}
                  </Text>
                </View>
              </View>

              {/* Lucro Líquido — card cheio */}
              <View testID="card-lucro-liquido" style={[styles.lucroCard, lucroPositivo ? styles.lucroCardPositivo : styles.lucroCardNegativo]}>
                <View>
                  <Text {...noTranslateProps} style={styles.lucroLabel}>Lucro Líquido</Text>
                  <Text {...noTranslateProps} style={styles.lucroValor}>
                    {fmtBRL(resumo?.lucroLiquido ?? 0)}
                  </Text>
                  <Text {...noTranslateProps} style={styles.lucroMargem}>
                    Margem: {(resumo?.margemLucro ?? 0).toFixed(1)}%
                    {'   '}
                    {variacaoTexto(resumo?.variacaoLucroMes ?? 0)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={lucroPositivo ? 'trending-up' : 'trending-down'}
                  size={44}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
            </View>

            {/* ── SEÇÃO 2: Pizza de despesas ───────────────────────────── */}
            <View style={[styles.secao, styles.card]}>
              <Text {...noTranslateProps} style={styles.cardTitulo}>Despesas por Categoria</Text>
              <Text {...noTranslateProps} style={styles.cardSubtitulo}>Mês atual</Text>
              <DespesasPieChart data={categorias} />
            </View>

            {/* ── SEÇÃO 3: Evolução do Lucro ───────────────────────────── */}
            <View style={[styles.secao, styles.card]}>
              <View style={styles.graficoHeader}>
                <View>
                  <Text {...noTranslateProps} style={styles.cardTitulo}>Evolução do Lucro</Text>
                  <Text {...noTranslateProps} style={styles.cardSubtitulo}>Receita × Custos × Lucro</Text>
                </View>
                <View style={styles.mesesChips}>
                  {OPCOES_MESES.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mesesChip, mesesSelecionados === m && styles.mesesChipAtivo]}
                      onPress={() => trocarMeses(m)}
                      disabled={carregandoGrafico}
                    >
                      <Text style={[styles.mesesChipTexto, mesesSelecionados === m && styles.mesesChipTextoAtivo]}>
                        {m}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {carregandoGrafico ? (
                <View style={styles.graficoLoading}>
                  <ActivityIndicator color={PRIMARY} />
                </View>
              ) : evolucao.length > 0 ? (
                <LucroBarChart data={evolucao} />
              ) : (
                <View style={styles.graficoLoading}>
                  <Text style={styles.graficoVazio}>Sem dados no período</Text>
                </View>
              )}

              <View style={styles.legenda}>
                <View style={styles.legendaItem}>
                  <View style={[styles.legendaDot, { backgroundColor: '#2d6a4f' }]} />
                  <Text {...noTranslateProps} style={styles.legendaTexto}>Receita</Text>
                </View>
                <View style={styles.legendaItem}>
                  <View style={[styles.legendaDot, { backgroundColor: '#e07b39' }]} />
                  <Text {...noTranslateProps} style={styles.legendaTexto}>Custos</Text>
                </View>
                <View style={styles.legendaItem}>
                  <View style={[styles.legendaDot, { backgroundColor: '#1565C0' }]} />
                  <Text {...noTranslateProps} style={styles.legendaTexto}>Lucro</Text>
                </View>
              </View>
            </View>

            {/* ── SEÇÃO 4: Custo por Animal ────────────────────────────── */}
            {custoPorAnimal && (
              <View style={[styles.secao, styles.card]}>
                <Text {...noTranslateProps} style={styles.cardTitulo}>Custo por Animal</Text>
                <Text {...noTranslateProps} style={styles.cardSubtitulo}>
                  {custoPorAnimal.totalAnimaisAtivos} animais ativos
                </Text>
                <View style={styles.custoCabecaBox}>
                  <MaterialCommunityIcons name="cow" size={32} color={PRIMARY} />
                  <View style={{ marginLeft: 14 }}>
                    <Text {...noTranslateProps} style={styles.custoCabecaValor}>
                      {fmtBRL(custoPorAnimal.custoPorCabeca)}
                    </Text>
                    <Text {...noTranslateProps} style={styles.custoCabecaLabel}>
                      por cabeça este mês
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── SEÇÃO 5: Alertas ────────────────────────────────────── */}
            <View style={[styles.secao, styles.alertaCard]}>
              <View style={styles.alertaHeader}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text {...noTranslateProps} style={styles.alertaTitulo}>Atenção</Text>
              </View>
              {alertas.length === 0 ? (
                <Text {...noTranslateProps} style={styles.alertaVazio}>
                  Tudo sob controle 👍
                </Text>
              ) : (
                alertas.map((a, i) => (
                  <View key={i} style={[
                    styles.alertaItem,
                    a.urgencia === 'alta' && styles.alertaItemAlta,
                  ]}>
                    <Text {...noTranslateProps} style={styles.alertaItemTexto}>
                      {a.mensagem}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* ── SEÇÃO 6: Botões de Lançamento ───────────────────────── */}
            <View style={styles.secao}>
              <Text {...noTranslateProps} style={styles.lancamentoTitulo}>Lançamentos</Text>
              <View style={styles.lancamentoGrid}>
                <TouchableOpacity testID="btn-nova-venda-animal" style={styles.lancamentoBtn} onPress={() => setModalVendaAnimal(true)}>
                  <Ionicons name="trending-up" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Venda de{'\n'}Animais</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="btn-nova-compra-animal" style={styles.lancamentoBtn} onPress={() => setModalCompraAnimal(true)}>
                  <Ionicons name="trending-down" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Compra de{'\n'}Animais</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="btn-nova-despesa" style={styles.lancamentoBtn} onPress={() => setModalDespesa(true)}>
                  <Ionicons name="wallet-outline" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Despesa{'\n'}Geral</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="btn-nova-receita" style={styles.lancamentoBtn} onPress={() => setModalReceita(true)}>
                  <Ionicons name="cash-outline" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Receita</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="btn-novo-insumo" style={styles.lancamentoBtn} onPress={() => setModalInsumos(true)}>
                  <MaterialCommunityIcons name="silo" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Compra de{'\n'}Insumos</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="btn-novo-funcionario" style={styles.lancamentoBtn} onPress={() => setModalFuncionario(true)}>
                  <Ionicons name="person-outline" size={22} color={PRIMARY} />
                  <Text {...noTranslateProps} style={styles.lancamentoBtnTexto}>Pgto.{'\n'}Funcionário</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── MODAL: Despesa Geral ──────────────────────────────────────────── */}
      <Modal visible={modalDespesa} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Despesa Geral</Text>
              <Text style={styles.label}>Categoria</Text>
              <ChipGroup
                options={TODAS_CATEGORIAS}
                value={despesaForm.categoria}
                onChange={v => setDespesaForm(f => ({ ...f, categoria: v }))}
              />
              <Text style={styles.label}>Categoria IMA</Text>
              <ChipGroup
                options={CATEGORIAS_IMA_DESPESA.map(c => c.value)}
                value={despesaForm.categoriaIma}
                onChange={v => setDespesaForm(f => ({ ...f, categoriaIma: v, subcategoriaIma: '' }))}
                labelMap={Object.fromEntries(CATEGORIAS_IMA_DESPESA.map(c => [c.value, c.label]))}
              />
              {despesaForm.categoriaIma !== '' && (SUBCATEGORIAS_IMA[despesaForm.categoriaIma] ?? []).length > 0 && (
                <>
                  <Text style={styles.label}>Subcategoria IMA</Text>
                  <ChipGroup
                    options={SUBCATEGORIAS_IMA[despesaForm.categoriaIma] ?? []}
                    value={despesaForm.subcategoriaIma}
                    onChange={v => setDespesaForm(f => ({ ...f, subcategoriaIma: v }))}
                  />
                </>
              )}
              <Field label="Data de pagamento (opcional)" value={despesaForm.dataPagamento}
                onChangeText={v => setDespesaForm(f => ({ ...f, dataPagamento: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <Field label="Descrição (opcional)" value={despesaForm.descricao}
                onChangeText={v => setDespesaForm(f => ({ ...f, descricao: v }))}
                placeholder="Ex: Compra de ração" />
              <Field label="Valor (R$)" testID="input-valor-despesa" value={despesaForm.valor}
                onChangeText={v => setDespesaForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={despesaForm.dataDespesa}
                onChangeText={v => setDespesaForm(f => ({ ...f, dataDespesa: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalDespesa(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-despesa" style={styles.botaoSalvar} onPress={salvarDespesa} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Receita ───────────────────────────────────────────────── */}
      <Modal visible={modalReceita} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Receita</Text>
              <Text style={styles.label}>Tipo</Text>
              <ChipGroup
                options={TIPOS_RECEITA}
                value={receitaForm.tipo}
                onChange={v => setReceitaForm(f => ({ ...f, tipo: v }))}
              />
              <Field label="Descrição (opcional)" value={receitaForm.descricao}
                onChangeText={v => setReceitaForm(f => ({ ...f, descricao: v }))}
                placeholder="Ex: Venda de leite" />
              <Field label="Valor (R$)" testID="input-valor-receita" value={receitaForm.valor}
                onChangeText={v => setReceitaForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={receitaForm.dataReceita}
                onChangeText={v => setReceitaForm(f => ({ ...f, dataReceita: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalReceita(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-receita" style={styles.botaoSalvar} onPress={salvarReceita} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Venda de Animal ───────────────────────────────────────── */}
      <Modal visible={modalVendaAnimal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Venda de Animal</Text>

              <Text style={styles.label}>Buscar animal (brinco ou nome)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: BR-001 ou Mimosa"
                placeholderTextColor="#aeb8b1"
                value={buscaAnimalTermo}
                onChangeText={handleBuscaAnimal}
              />

              {buscandoAnimal && <ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />}

              {animalSelecionado ? (
                <View style={styles.animalSelecionadoCard}>
                  <Ionicons name="checkmark-circle" size={20} color="#2d6a4f" />
                  <Text style={styles.animalSelecionadoTexto}>
                    {animalSelecionado.brinco}
                    {animalSelecionado.nome ? ` — ${animalSelecionado.nome}` : ''}
                  </Text>
                  <TouchableOpacity onPress={() => { setAnimalSelecionado(null); setBuscaAnimalTermo(''); }}>
                    <Ionicons name="close-circle-outline" size={18} color="#888" />
                  </TouchableOpacity>
                </View>
              ) : animaisBuscados.length > 0 ? (
                <View style={styles.animalBuscaLista}>
                  {animaisBuscados.slice(0, 5).map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.animalBuscaItem}
                      onPress={() => { setAnimalSelecionado(a); setAnimaisBuscados([]); setBuscaAnimalTermo(a.brinco); }}
                    >
                      <Text style={styles.animalBuscaTexto}>
                        {a.brinco}{a.nome ? ` — ${a.nome}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Field label="Valor da Venda (R$)" testID="input-valor-venda" value={vendaAnimalForm.valor}
                onChangeText={v => setVendaAnimalForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={vendaAnimalForm.data}
                onChangeText={v => setVendaAnimalForm(f => ({ ...f, data: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <Field label="Observação (opcional)" value={vendaAnimalForm.observacao}
                onChangeText={v => setVendaAnimalForm(f => ({ ...f, observacao: v }))}
                placeholder="Ex: Venda para Fazenda Boa Vista" multiline />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => {
                  setModalVendaAnimal(false);
                  setAnimalSelecionado(null); setBuscaAnimalTermo(''); setAnimaisBuscados([]);
                }} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-venda-animal" style={styles.botaoSalvar} onPress={salvarVendaAnimal} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Compra de Animal ──────────────────────────────────────── */}
      <Modal visible={modalCompraAnimal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Compra de Animal</Text>
              <Field label="Nome do animal (opcional)" value={compraAnimalForm.nomeAnimal}
                onChangeText={v => setCompraAnimalForm(f => ({ ...f, nomeAnimal: v }))}
                placeholder="Ex: Bezerro Pinta" />
              <Field label="Valor (R$)" testID="input-valor-compra" value={compraAnimalForm.valor}
                onChangeText={v => setCompraAnimalForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={compraAnimalForm.data}
                onChangeText={v => setCompraAnimalForm(f => ({ ...f, data: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalCompraAnimal(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-compra-animal" style={styles.botaoSalvar} onPress={salvarCompraAnimal} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Compra de Insumos ─────────────────────────────────────── */}
      <Modal visible={modalInsumos} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Compra de Insumos</Text>
              <Field label="Produto" value={insumosForm.produto}
                onChangeText={v => setInsumosForm(f => ({ ...f, produto: v }))}
                placeholder="Ex: Ração Bovigold 25kg" />
              <Text style={styles.label}>Categoria</Text>
              <ChipGroup
                options={CATEGORIAS_INSUMOS}
                value={insumosForm.categoria}
                onChange={v => setInsumosForm(f => ({ ...f, categoria: v }))}
              />
              <Field label="Quantidade (opcional)" value={insumosForm.quantidade}
                onChangeText={v => setInsumosForm(f => ({ ...f, quantidade: v }))}
                placeholder="Ex: 10 sacos" />
              <Field label="Valor Total (R$)" testID="input-valor-insumo" value={insumosForm.valor}
                onChangeText={v => setInsumosForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={insumosForm.data}
                onChangeText={v => setInsumosForm(f => ({ ...f, data: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalInsumos(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-insumo" style={styles.botaoSalvar} onPress={salvarInsumos} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Pagamento Funcionário ─────────────────────────────────── */}
      <Modal visible={modalFuncionario} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Pagamento Funcionário</Text>
              <Field label="Nome do funcionário" value={funcionarioForm.nomeFuncionario}
                onChangeText={v => setFuncionarioForm(f => ({ ...f, nomeFuncionario: v }))}
                placeholder="Ex: João Silva" />
              <Text style={styles.label}>Tipo</Text>
              <ChipGroup
                options={TIPOS_FUNCIONARIO}
                value={funcionarioForm.tipo}
                onChange={v => setFuncionarioForm(f => ({ ...f, tipo: v }))}
                labelMap={{ Salario: 'Salário', Diaria: 'Diária', Servico: 'Serviço' }}
              />
              <Field label="Valor (R$)" testID="input-valor-funcionario" value={funcionarioForm.valor}
                onChangeText={v => setFuncionarioForm(f => ({ ...f, valor: v }))}
                keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Data" value={funcionarioForm.data}
                onChangeText={v => setFuncionarioForm(f => ({ ...f, data: formatarDataBrasileira(v) }))}
                keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalFuncionario(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="btn-salvar-funcionario" style={styles.botaoSalvar} onPress={salvarFuncionario} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomMenu activeItem="Finanças" navigation={navigation} />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f0f4f0' },
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
  centro: { alignItems: 'center', padding: 40 },
  erroTexto: { color: '#c0392b', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  btnRecarregar: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnRecarregarTexto: { color: '#fff', fontWeight: '700' },

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
  },
  cardTitulo: { color: PRIMARY, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardSubtitulo: { color: '#88938c', fontSize: 12, fontWeight: '600', marginBottom: 14 },

  // Cards de resumo
  resumoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  resumoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  resumoCardReceita: { borderTopWidth: 3, borderTopColor: '#2d6a4f' },
  resumoCardDespesa: { borderTopWidth: 3, borderTopColor: '#c0392b' },
  resumoLabel: { color: '#66746d', fontSize: 11, fontWeight: '700', marginBottom: 5 },
  resumoValor: { fontSize: 16, fontWeight: '900', marginBottom: 5 },
  resumoVariacao: { fontSize: 10, fontWeight: '700' },
  variacaoPositiva: { color: '#2d6a4f' },
  variacaoNegativa: { color: '#c0392b' },

  // Lucro
  lucroCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  lucroCardPositivo: {
    backgroundColor: '#0d47a1',
    shadowColor: '#0d47a1',
  },
  lucroCardNegativo: {
    backgroundColor: '#b71c1c',
    shadowColor: '#b71c1c',
  },
  lucroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  lucroValor: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 36 },
  lucroMargem: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 4 },

  // Gráfico
  graficoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  mesesChips: { flexDirection: 'row', gap: 6 },
  mesesChip: {
    borderColor: '#ccd6cf',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mesesChipAtivo: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  mesesChipTexto: { color: '#66746d', fontSize: 12, fontWeight: '800' },
  mesesChipTextoAtivo: { color: '#fff' },
  graficoLoading: { alignItems: 'center', justifyContent: 'center', height: 200 },
  graficoVazio: { color: '#88938c', fontSize: 13 },
  legenda: { flexDirection: 'row', gap: 14, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaDot: { width: 10, height: 10, borderRadius: 5 },
  legendaTexto: { color: '#66746d', fontSize: 12, fontWeight: '700' },

  // Pizza legenda
  pieLegendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pieLegendaDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  pieLegendaNome: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  pieLegendaValor: { fontSize: 12, fontWeight: '700', color: PRIMARY, marginRight: 8 },
  pieLegendaPct: { fontSize: 12, fontWeight: '600', color: '#88938c', width: 40, textAlign: 'right' },

  // Custo por animal
  custoCabecaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f2',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  custoCabecaValor: { fontSize: 24, fontWeight: '900', color: PRIMARY },
  custoCabecaLabel: { fontSize: 13, color: '#66746d', fontWeight: '600', marginTop: 2 },

  // Alertas
  alertaCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
    elevation: 1,
  },
  alertaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertaTitulo: { color: '#7d5a00', fontSize: 16, fontWeight: '800' },
  alertaVazio: { color: '#7d5a00', fontSize: 14, fontWeight: '600' },
  alertaItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  alertaItemAlta: {
    backgroundColor: '#fde8e8',
    borderLeftColor: '#e53935',
  },
  alertaItemTexto: { color: '#5a4000', fontSize: 13, fontWeight: '600' },

  // Botões de lançamento
  lancamentoTitulo: { color: '#26342b', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  lancamentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lancamentoBtn: {
    width: (SCREEN_W - 32 - 10) / 2 - 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    gap: 8,
  },
  lancamentoBtnTexto: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalCaixa: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%' },
  modalContent: { padding: 20, paddingBottom: 34 },
  modalTitulo: { color: PRIMARY, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  label: { color: '#333', fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d6ded8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#26342b',
    fontSize: 15,
    padding: 13,
  },
  textArea: { minHeight: 80 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderColor: '#ccd6cf', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  chipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  chipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  chipTextoAtivo: { color: PRIMARY },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 22 },
  botaoCancelar: {
    alignItems: 'center', borderColor: '#cbd4ce', borderRadius: 12,
    borderWidth: 1.5, flex: 1, padding: 14,
  },
  botaoCancelarTexto: { color: '#5d675f', fontWeight: '800' },
  botaoSalvar: { alignItems: 'center', backgroundColor: PRIMARY, borderRadius: 12, flex: 1, padding: 14 },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },

  // Animal busca
  animalSelecionadoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e8f5ee', borderRadius: 10, padding: 12, marginTop: 8,
  },
  animalSelecionadoTexto: { flex: 1, color: '#1b4332', fontSize: 14, fontWeight: '700' },
  animalBuscaLista: { marginTop: 4, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#d6ded8' },
  animalBuscaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  animalBuscaTexto: { color: '#26342b', fontSize: 14, fontWeight: '600' },
});
