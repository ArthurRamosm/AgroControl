import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnimalParams, RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { dataBrParaApi, formatarDataBrasileira, validarDataCompleta } from '../utils/animalHealth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveAnimaisSaudeCache, getAnimaisSaudeCache, getAnimaisLocal, addToSyncQueue } from '../database/localDb';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const PRIMARY = '#1a3d1f';
const CHIP_COR = '#0d2b10';
const COR_ATRASADA = '#dc2626';
const COR_PENDENTE = '#ea580c';
const COR_EM_DIA  = '#16a34a';
const VACINAS = ['Brucelose', 'Febre Aftosa', 'Raiva', 'Outra'];
const PERIODOS_HISTORICO = ['Este mês', 'Últimos 3 meses', 'Este ano', 'Personalizado'] as const;
type PeriodoHistorico = typeof PERIODOS_HISTORICO[number];

// ── Types ─────────────────────────────────────────────────────────────────────
type HistoricoVacina = {
  animalNome: string;
  animalBrinco: string;
  nomeVacina: string;
  dataAplicacao: string;
  dose?: string | null;
  observacao?: string | null;
};

const MOTIVOS_LOTE = [
  { label: 'Menos de 1 ano', min: 0, max: 11 },
  { label: '1 a 3 anos', min: 12, max: 47 },
  { label: '4 anos ou mais', min: 48, max: null },
  { label: 'Todos', min: null, max: null },
] as const;

type FaixaIdx = 0 | 1 | 2 | 3;
type TipoLote = 'vacina' | 'vermifugacao';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Saude'>;
};

export type AnimalSaude = {
  animalId: number;
  brinco: string;
  nome?: string | null;
  sexo: 'M' | 'F';
  tipo: string;
  raca: string;
  idade: string;
  idadeMeses?: number | null;
  status: 'Em dia' | 'Pendente' | 'Atrasada';
  vacinasPendentes: string[];
  vacinasAtrasadas: string[];
  alertasVermifugacao: string[];
};

type EstatisticasSaude = {
  vacinasEsteMes: number;
  vermifugacoesEsteMes: number;
  tratamentosAtivos: number;
  animaisAfastados: number;
  proximasVacinas: number;
};

type EstoqueMedicamento = {
  id: number;
  nome: string;
  tipo: string;
  unidade: string;
  quantidadeAtual: number;
  quantidadeMinima: number | null;
  estoqueBaixo: boolean;
};

type VacinaForm = {
  animalId: number | null;
  nomeVacina: string;
  dataAplicacao: string;
  dose: string;
  observacao: string;
  // Custo financeiro
  registrarCusto: boolean;
  valorCusto: string;
  descricaoCusto: string;
  // Estoque
  descontarEstoque: boolean;
  estoqueId: number | null;
  qtdDescontar: string;
};

type VermifugacaoForm = {
  animalId: number | null;
  dataAplicacao: string;
  produtoUtilizado: string;
  dose: string;
  proximaAplicacao: string;
  observacao: string;
  // Custo financeiro
  registrarCusto: boolean;
  valorCusto: string;
  descricaoCusto: string;
  // Estoque
  descontarEstoque: boolean;
  estoqueId: number | null;
  qtdDescontar: string;
};

type LoteVacinaForm = {
  nomeVacina: string;
  dataAplicacao: string;
  dose: string;
  observacao: string;
};

type LoteVermifugacaoForm = {
  produto: string;
  dataAplicacao: string;
  dose: string;
  observacao: string;
};

type LoteResultadoApi = {
  sucesso: boolean;
  registros: number;
  mensagem: string;
};

function dataBrParaIso(v: string) {
  const [d, m, y] = v.split('/');
  return `${y}-${m}-${d}T00:00:00`;
}

function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const formInicial: VacinaForm = {
  animalId: null,
  nomeVacina: 'Raiva',
  dataAplicacao: hojeBr(),
  dose: '',
  observacao: '',
  registrarCusto: false,
  valorCusto: '',
  descricaoCusto: '',
  descontarEstoque: false,
  estoqueId: null,
  qtdDescontar: '',
};

const vermifugacaoInicial: VermifugacaoForm = {
  animalId: null,
  dataAplicacao: hojeBr(),
  produtoUtilizado: '',
  dose: '',
  proximaAplicacao: '',
  observacao: '',
  registrarCusto: false,
  valorCusto: '',
  descricaoCusto: '',
  descontarEstoque: false,
  estoqueId: null,
  qtdDescontar: '',
};

// ── Campo de formulário ───────────────────────────────────────────────────────
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#aeb8b1"
        keyboardType={props.keyboardType}
        maxLength={props.maxLength}
        multiline={props.multiline}
        textAlignVertical={props.multiline ? 'top' : 'center'}
      />
    </>
  );
}

// ── Busca de animal ───────────────────────────────────────────────────────────
function BuscaAnimal({
  propriedadeId,
  animalSelecionadoId,
  onSelecionar,
  isOnline,
}: {
  propriedadeId: number;
  animalSelecionadoId: number | null;
  onSelecionar: (id: number | null, label: string) => void;
  isOnline: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<AnimalParams[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [labelSelecionado, setLabelSelecionado] = useState('');

  const pesquisar = useCallback(async (texto: string) => {
    if (texto.length < 2) { setResultados([]); return; }
    setBuscando(true);
    try {
      if (!isOnline) {
        const locais = await getAnimaisLocal(propriedadeId);
        const q = texto.toLowerCase();
        setResultados(locais.filter(a => (a.nome ?? '').toLowerCase().includes(q) || a.brinco.toLowerCase().includes(q)).slice(0, 5));
      } else {
        const res = await api.get<AnimalParams[]>(
          `/api/animais?propriedadeId=${propriedadeId}&busca=${encodeURIComponent(texto)}`
        );
        setResultados(res.slice(0, 5));
      }
    } catch { setResultados([]); }
    finally { setBuscando(false); }
  }, [propriedadeId, isOnline]);

  useEffect(() => {
    const t = setTimeout(() => pesquisar(busca), 350);
    return () => clearTimeout(t);
  }, [busca, pesquisar]);

  function selecionar(animal: AnimalParams) {
    const label = animal.nome ? `${animal.nome} (${animal.brinco})` : animal.brinco;
    setLabelSelecionado(label); setBusca(''); setResultados([]);
    onSelecionar(animal.id, label);
  }

  function remover() { setLabelSelecionado(''); onSelecionar(null, ''); }

  return (
    <View>
      <Text style={styles.label}>Animal</Text>
      {animalSelecionadoId !== null ? (
        <View style={styles.animalChip}>
          <Text style={styles.animalChipTexto}>{labelSelecionado}</Text>
          <TouchableOpacity onPress={remover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.buscaRow}>
            <Ionicons name="search-outline" size={16} color="#88938c" style={styles.buscaIcone} />
            <TextInput style={styles.buscaInput} value={busca} onChangeText={setBusca}
              placeholder="Buscar por nome ou brinco..." placeholderTextColor="#aeb8b1" autoCapitalize="none" />
            {buscando && <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 10 }} />}
          </View>
          {resultados.length > 0 && (
            <View style={styles.buscaResultados}>
              {resultados.map(a => (
                <TouchableOpacity key={a.id} style={styles.buscaItem} onPress={() => selecionar(a)}>
                  <Text style={styles.buscaItemNome}>{a.nome || 'Sem nome'}</Text>
                  <Text style={styles.buscaItemBrinco}>{a.brinco}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Card de integração financeira/estoque ─────────────────────────────────────
function CardCustoEstoque({
  registrarCusto,
  valorCusto,
  descricaoCusto,
  descontarEstoque,
  estoqueId,
  qtdDescontar,
  estoques,
  onToggleCusto,
  onChangeValor,
  onChangeDescricao,
  onToggleEstoque,
  onChangeEstoqueId,
  onChangeQtd,
}: {
  registrarCusto: boolean;
  valorCusto: string;
  descricaoCusto: string;
  descontarEstoque: boolean;
  estoqueId: number | null;
  qtdDescontar: string;
  estoques: EstoqueMedicamento[];
  onToggleCusto: (v: boolean) => void;
  onChangeValor: (v: string) => void;
  onChangeDescricao: (v: string) => void;
  onToggleEstoque: (v: boolean) => void;
  onChangeEstoqueId: (id: number | null) => void;
  onChangeQtd: (v: string) => void;
}) {
  return (
    <View style={styles.custoCard}>
      {/* Custo financeiro */}
      <View style={styles.custoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.custoTitulo}>Registrar custo financeiro?</Text>
          <Text style={styles.custoSub}>Lança automaticamente em Despesas › Medicamentos</Text>
        </View>
        <Switch
          value={registrarCusto}
          onValueChange={onToggleCusto}
          trackColor={{ false: '#ccc', true: '#2d6a4f' }}
          thumbColor={registrarCusto ? PRIMARY : '#f4f4f4'}
        />
      </View>

      {registrarCusto && (
        <View style={styles.custoDetalhes}>
          <Text style={styles.label}>Valor (R$) *</Text>
          <TextInput
            style={styles.input}
            value={valorCusto}
            onChangeText={onChangeValor}
            placeholder="Ex: 25,00"
            placeholderTextColor="#aeb8b1"
            keyboardType="decimal-pad"
          />
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={descricaoCusto}
            onChangeText={onChangeDescricao}
            placeholder="Ex: Vacina Raiva - 3 animais"
            placeholderTextColor="#aeb8b1"
          />
        </View>
      )}

      {/* Desconto de estoque */}
      {estoques.length > 0 && (
        <>
          <View style={[styles.custoRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.custoTitulo}>Descontar do estoque?</Text>
              <Text style={styles.custoSub}>Registra saída automática no estoque</Text>
            </View>
            <Switch
              value={descontarEstoque}
              onValueChange={onToggleEstoque}
              trackColor={{ false: '#ccc', true: '#2d6a4f' }}
              thumbColor={descontarEstoque ? PRIMARY : '#f4f4f4'}
            />
          </View>

          {descontarEstoque && (
            <View style={styles.custoDetalhes}>
              <Text style={styles.label}>Medicamento do estoque</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {estoques.map(e => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, estoqueId === e.id && styles.chipAtivo]}
                      onPress={() => onChangeEstoqueId(estoqueId === e.id ? null : e.id)}
                    >
                      <Text style={[styles.chipTexto, estoqueId === e.id && styles.chipTextoAtivo]}>
                        {e.nome} ({e.quantidadeAtual} {e.unidade})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.label}>Quantidade a descontar</Text>
              <TextInput
                style={styles.input}
                value={qtdDescontar}
                onChangeText={onChangeQtd}
                placeholder="Ex: 1"
                placeholderTextColor="#aeb8b1"
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ marcado, onPress }: { marcado: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.checkbox, marcado && styles.checkboxMarcado]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {marcado && <Ionicons name="checkmark" size={14} color="#fff" />}
    </TouchableOpacity>
  );
}

// ── Modal de vacina ───────────────────────────────────────────────────────────
function VacinaModal({
  visible, propriedadeId, form, saving, onChange, onClose, onSave, isOnline, estoques,
}: {
  visible: boolean; propriedadeId: number; form: VacinaForm; saving: boolean;
  onChange: (f: VacinaForm) => void; onClose: () => void; onSave: () => void;
  isOnline: boolean; estoques: EstoqueMedicamento[];
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalFundo}>
          <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>Registrar vacina</Text>

            <BuscaAnimal propriedadeId={propriedadeId} animalSelecionadoId={form.animalId}
              onSelecionar={(id) => onChange({ ...form, animalId: id })} isOnline={isOnline} />

            <Text style={styles.label}>Nome da vacina</Text>
            <View style={styles.chips}>
              {VACINAS.map(v => (
                <TouchableOpacity key={v}
                  style={[styles.chip, form.nomeVacina === v && styles.chipAtivo]}
                  onPress={() => onChange({ ...form, nomeVacina: v === 'Outra' ? '' : v })}>
                  <Text style={[styles.chipTexto, form.nomeVacina === v && styles.chipTextoAtivo]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Vacina" value={form.nomeVacina} onChangeText={v => onChange({ ...form, nomeVacina: v })} />
            <Field label="Data de aplicacao" value={form.dataAplicacao}
              onChangeText={v => onChange({ ...form, dataAplicacao: formatarDataBrasileira(v) })}
              keyboardType="number-pad" maxLength={10} />
            <Field label="Dose" value={form.dose} onChangeText={v => onChange({ ...form, dose: v })} placeholder="Ex: 1 dose" />
            <Field label="Observacao" value={form.observacao} onChangeText={v => onChange({ ...form, observacao: v })} multiline />

            <CardCustoEstoque
              registrarCusto={form.registrarCusto}
              valorCusto={form.valorCusto}
              descricaoCusto={form.descricaoCusto}
              descontarEstoque={form.descontarEstoque}
              estoqueId={form.estoqueId}
              qtdDescontar={form.qtdDescontar}
              estoques={estoques}
              onToggleCusto={v => onChange({ ...form, registrarCusto: v })}
              onChangeValor={v => onChange({ ...form, valorCusto: v })}
              onChangeDescricao={v => onChange({ ...form, descricaoCusto: v })}
              onToggleEstoque={v => onChange({ ...form, descontarEstoque: v })}
              onChangeEstoqueId={id => onChange({ ...form, estoqueId: id })}
              onChangeQtd={v => onChange({ ...form, qtdDescontar: v })}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={onClose} disabled={saving}>
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={onSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal de vermifugação ─────────────────────────────────────────────────────
function VermifugacaoModal({
  visible, propriedadeId, form, saving, onChange, onClose, onSave, isOnline, estoques,
}: {
  visible: boolean; propriedadeId: number; form: VermifugacaoForm; saving: boolean;
  onChange: (f: VermifugacaoForm) => void; onClose: () => void; onSave: () => void;
  isOnline: boolean; estoques: EstoqueMedicamento[];
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalFundo}>
          <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>Registrar vermifugacao</Text>

            <BuscaAnimal propriedadeId={propriedadeId} animalSelecionadoId={form.animalId}
              onSelecionar={(id) => onChange({ ...form, animalId: id })} isOnline={isOnline} />

            <Field label="Data da aplicacao" value={form.dataAplicacao}
              onChangeText={v => onChange({ ...form, dataAplicacao: formatarDataBrasileira(v) })}
              keyboardType="number-pad" maxLength={10} />
            <Field label="Produto utilizado" value={form.produtoUtilizado}
              onChangeText={v => onChange({ ...form, produtoUtilizado: v })} />
            <Field label="Dose" value={form.dose} onChangeText={v => onChange({ ...form, dose: v })} />
            <Field label="Proxima aplicacao" value={form.proximaAplicacao}
              onChangeText={v => onChange({ ...form, proximaAplicacao: formatarDataBrasileira(v) })}
              keyboardType="number-pad" maxLength={10} />
            <Field label="Observacao" value={form.observacao}
              onChangeText={v => onChange({ ...form, observacao: v })} multiline />

            <CardCustoEstoque
              registrarCusto={form.registrarCusto}
              valorCusto={form.valorCusto}
              descricaoCusto={form.descricaoCusto}
              descontarEstoque={form.descontarEstoque}
              estoqueId={form.estoqueId}
              qtdDescontar={form.qtdDescontar}
              estoques={estoques}
              onToggleCusto={v => onChange({ ...form, registrarCusto: v })}
              onChangeValor={v => onChange({ ...form, valorCusto: v })}
              onChangeDescricao={v => onChange({ ...form, descricaoCusto: v })}
              onToggleEstoque={v => onChange({ ...form, descontarEstoque: v })}
              onChangeEstoqueId={id => onChange({ ...form, estoqueId: id })}
              onChangeQtd={v => onChange({ ...form, qtdDescontar: v })}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={onClose} disabled={saving}>
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={onSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal de lote ─────────────────────────────────────────────────────────────
function LoteModal({
  visible, tipo, animaisSaude, propriedadeId, onClose, onSalvo,
}: {
  visible: boolean; tipo: TipoLote; animaisSaude: AnimalSaude[];
  propriedadeId: number; onClose: () => void; onSalvo: () => Promise<void>;
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [faixaIdx, setFaixaIdx] = useState<FaixaIdx>(3);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [buscaLote, setBuscaLote] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvando, setMensagemSalvando] = useState('');
  const [erroLote, setErroLote] = useState('');

  const [vacinaForm, setVacinaForm] = useState<LoteVacinaForm>({
    nomeVacina: 'Raiva', dataAplicacao: hojeBr(), dose: '', observacao: '',
  });
  const [vermifForm, setVermifForm] = useState<LoteVermifugacaoForm>({
    produto: '', dataAplicacao: hojeBr(), dose: '', observacao: '',
  });

  function resetar() {
    setPasso(1); setFaixaIdx(3); setSelecionados(new Set()); setBuscaLote('');
    setSalvando(false); setMensagemSalvando(''); setErroLote('');
    setVacinaForm({ nomeVacina: 'Raiva', dataAplicacao: hojeBr(), dose: '', observacao: '' });
    setVermifForm({ produto: '', dataAplicacao: hojeBr(), dose: '', observacao: '' });
  }

  function fechar() { resetar(); onClose(); }

  const faixa = MOTIVOS_LOTE[faixaIdx];

  const animaisFiltradosFaixa = useMemo(() => {
    if (faixa.min === null && faixa.max === null) return animaisSaude;
    return animaisSaude.filter(a => {
      const m = a.idadeMeses ?? null;
      if (m === null) return false;
      if (faixa.min !== null && m < faixa.min) return false;
      if (faixa.max !== null && m > faixa.max) return false;
      return true;
    });
  }, [animaisSaude, faixaIdx]);

  const animaisVisiveis = useMemo(() => {
    if (!buscaLote.trim()) return animaisFiltradosFaixa;
    const q = buscaLote.toLowerCase();
    return animaisFiltradosFaixa.filter(
      a => (a.nome ?? '').toLowerCase().includes(q) || a.brinco.toLowerCase().includes(q)
    );
  }, [animaisFiltradosFaixa, buscaLote]);

  function aplicarFiltro() {
    setSelecionados(new Set(animaisFiltradosFaixa.map(a => a.animalId)));
    setBuscaLote(''); setPasso(2);
  }

  function toggleAnimal(id: number) {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }

  function marcarTodos() { setSelecionados(new Set(animaisVisiveis.map(a => a.animalId))); }
  function desmarcarTodos() { setSelecionados(new Set()); }

  async function salvar() {
    setErroLote('');
    if (selecionados.size === 0) { setErroLote('Selecione ao menos um animal.'); return; }
    const dataForm = tipo === 'vacina' ? vacinaForm.dataAplicacao : vermifForm.dataAplicacao;
    if (!validarDataCompleta(dataForm)) { setErroLote('Informe a data no formato DD/MM/AAAA.'); return; }
    if (tipo === 'vacina' && !vacinaForm.nomeVacina.trim()) { setErroLote('Informe o nome da vacina.'); return; }
    if (tipo === 'vermifugacao' && !vermifForm.produto.trim()) { setErroLote('Informe o produto utilizado.'); return; }

    setSalvando(true);
    setMensagemSalvando(`Salvando ${selecionados.size} registros...`);
    try {
      const animalIds = Array.from(selecionados).map(id => Number(id));
      let resultado: LoteResultadoApi;

      if (tipo === 'vacina') {
        resultado = await api.post<LoteResultadoApi>(
          `/api/saude/vacinas/lote?propriedadeId=${propriedadeId}`,
          { animalIds, propriedadeId, nomeVacina: vacinaForm.nomeVacina.trim(),
            dataAplicacao: dataBrParaIso(vacinaForm.dataAplicacao),
            dose: vacinaForm.dose.trim() || null, observacao: vacinaForm.observacao.trim() || null }
        );
      } else {
        resultado = await api.post<LoteResultadoApi>(
          `/api/saude/vermifugacao/lote?propriedadeId=${propriedadeId}`,
          { animalIds, propriedadeId, produtoUtilizado: vermifForm.produto.trim(),
            dataAplicacao: dataBrParaIso(vermifForm.dataAplicacao),
            dose: vermifForm.dose.trim() || null, observacao: vermifForm.observacao.trim() || null }
        );
      }

      if (!resultado.sucesso) { setErroLote(resultado.mensagem || 'Erro ao salvar.'); return; }
      resetar();
      await onSalvo();
      Alert.alert('Sucesso', `${tipo === 'vacina' ? 'Vacinação' : 'Vermifugação'} registrada para ${resultado.registros} animal(is)!`);
    } catch (error) {
      setErroLote(getMensagemErro(error));
    } finally {
      setSalvando(false); setMensagemSalvando('');
    }
  }

  const tituloTipo = tipo === 'vacina' ? 'Vacinar Lote' : 'Vermifugar Lote';
  const PASSOS = ['Filtro', 'Animais', 'Dados'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalFundo}>
          <View style={styles.loteModalCaixa}>
            <View style={styles.loteCabecalho}>
              <TouchableOpacity onPress={fechar} style={styles.loteFecharBtn}>
                <Ionicons name="close" size={22} color={PRIMARY} />
              </TouchableOpacity>
              <Text style={styles.loteTitulo}>{tituloTipo}</Text>
              <View style={styles.passoIndicador}>
                {PASSOS.map((p, i) => (
                  <View key={p} style={styles.passoItem}>
                    <View style={[styles.passoPonto, passo > i + 1 && styles.passoPontoConcluido, passo === i + 1 && styles.passoPontoAtivo]}>
                      {passo > i + 1
                        ? <Ionicons name="checkmark" size={10} color="#fff" />
                        : <Text style={[styles.passoPontoTexto, passo === i + 1 && { color: '#fff' }]}>{i + 1}</Text>}
                    </View>
                    <Text style={[styles.passoLabel, passo === i + 1 && { color: PRIMARY, fontWeight: '800' }]}>{p}</Text>
                    {i < PASSOS.length - 1 && <View style={[styles.passoLinha, passo > i + 1 && { backgroundColor: PRIMARY }]} />}
                  </View>
                ))}
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.loteConteudo} keyboardShouldPersistTaps="handled">
              {passo === 1 && (
                <View>
                  <Text style={styles.passSubtitulo}>Filtrar animais por idade</Text>
                  <View style={styles.faixaChips}>
                    {MOTIVOS_LOTE.map((m, i) => (
                      <TouchableOpacity key={m.label} style={[styles.faixaChip, faixaIdx === i && styles.faixaChipAtivo]} onPress={() => setFaixaIdx(i as FaixaIdx)}>
                        <Text style={[styles.faixaChipTexto, faixaIdx === i && styles.faixaChipTextoAtivo]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.faixaInfo}>{animaisFiltradosFaixa.length} animal(is) nesta faixa</Text>
                  <TouchableOpacity style={styles.btnAvancar} onPress={aplicarFiltro}>
                    <Text style={styles.btnAvancarTexto}>Aplicar Filtro →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {passo === 2 && (
                <View>
                  <View style={styles.loteHeader2}>
                    <Text style={styles.passSubtitulo}>{selecionados.size} animal(is) selecionado(s)</Text>
                    <View style={styles.loteHeader2Btns}>
                      <TouchableOpacity onPress={marcarTodos}><Text style={styles.linkBtn}>Marcar todos</Text></TouchableOpacity>
                      <Text style={{ color: '#aaa' }}> · </Text>
                      <TouchableOpacity onPress={desmarcarTodos}><Text style={styles.linkBtn}>Desmarcar todos</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.buscaRow}>
                    <Ionicons name="search-outline" size={16} color="#88938c" style={styles.buscaIcone} />
                    <TextInput style={styles.buscaInput} value={buscaLote} onChangeText={setBuscaLote}
                      placeholder="Filtrar por nome ou brinco..." placeholderTextColor="#aeb8b1" autoCapitalize="none" />
                  </View>
                  {animaisVisiveis.map(a => {
                    const sel = selecionados.has(a.animalId);
                    return (
                      <TouchableOpacity key={a.animalId} style={[styles.loteAnimalItem, sel && styles.loteAnimalItemSel]} onPress={() => toggleAnimal(a.animalId)}>
                        <Checkbox marcado={sel} onPress={() => toggleAnimal(a.animalId)} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.loteAnimalNome}>{a.nome || 'Sem nome'}</Text>
                          <Text style={styles.loteAnimalBrinco}>{a.brinco} · {a.idade}</Text>
                        </View>
                        <View style={[styles.badge, a.status === 'Atrasada' ? styles.badgeAtrasada : a.status === 'Pendente' ? styles.badgePendente : styles.badgeOk]}>
                          <Text style={styles.badgeTexto}>{a.status}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={styles.modalBotoes}>
                    <TouchableOpacity style={styles.botaoCancelar} onPress={() => setPasso(1)}>
                      <Text style={styles.botaoCancelarTexto}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.botaoSalvar, selecionados.size === 0 && { opacity: 0.5 }]}
                      onPress={() => { if (selecionados.size > 0) setPasso(3); }} disabled={selecionados.size === 0}>
                      <Text style={styles.botaoSalvarTexto}>Dados →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {passo === 3 && (
                <View>
                  <Text style={styles.passSubtitulo}>Dados para {selecionados.size} animal(is)</Text>
                  {tipo === 'vacina' ? (
                    <>
                      <Text style={styles.label}>Nome da vacina</Text>
                      <View style={styles.chips}>
                        {VACINAS.map(v => (
                          <TouchableOpacity key={v} style={[styles.chip, vacinaForm.nomeVacina === v && styles.chipAtivo]}
                            onPress={() => setVacinaForm(f => ({ ...f, nomeVacina: v === 'Outra' ? '' : v }))}>
                            <Text style={[styles.chipTexto, vacinaForm.nomeVacina === v && styles.chipTextoAtivo]}>{v}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Field label="Vacina" value={vacinaForm.nomeVacina} onChangeText={v => setVacinaForm(f => ({ ...f, nomeVacina: v }))} />
                      <Field label="Data de aplicacao" value={vacinaForm.dataAplicacao}
                        onChangeText={v => setVacinaForm(f => ({ ...f, dataAplicacao: formatarDataBrasileira(v) }))}
                        keyboardType="number-pad" maxLength={10} />
                      <Field label="Dose (opcional)" value={vacinaForm.dose} onChangeText={v => setVacinaForm(f => ({ ...f, dose: v }))} />
                      <Field label="Observacao (opcional)" value={vacinaForm.observacao} onChangeText={v => setVacinaForm(f => ({ ...f, observacao: v }))} multiline />
                    </>
                  ) : (
                    <>
                      <Field label="Produto utilizado" value={vermifForm.produto} onChangeText={v => setVermifForm(f => ({ ...f, produto: v }))} />
                      <Field label="Data de aplicacao" value={vermifForm.dataAplicacao}
                        onChangeText={v => setVermifForm(f => ({ ...f, dataAplicacao: formatarDataBrasileira(v) }))}
                        keyboardType="number-pad" maxLength={10} />
                      <Field label="Dose/Dosagem (opcional)" value={vermifForm.dose} onChangeText={v => setVermifForm(f => ({ ...f, dose: v }))} />
                      <Field label="Observacao (opcional)" value={vermifForm.observacao} onChangeText={v => setVermifForm(f => ({ ...f, observacao: v }))} multiline />
                    </>
                  )}
                  <View style={styles.resumoConfirmacao}>
                    <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                    <Text style={styles.resumoTexto}>
                      Registrar {tipo === 'vacina' ? vacinaForm.nomeVacina || 'vacina' : vermifForm.produto || 'vermifugação'}{' '}
                      para {selecionados.size} animal(is) em {tipo === 'vacina' ? vacinaForm.dataAplicacao : vermifForm.dataAplicacao}
                    </Text>
                  </View>
                  {erroLote ? (
                    <View style={styles.erroLoteContainer}>
                      <Ionicons name="alert-circle-outline" size={16} color="#c0392b" />
                      <Text style={styles.erroLoteTexto}>{erroLote}</Text>
                    </View>
                  ) : null}
                  <View style={styles.modalBotoes}>
                    <TouchableOpacity style={styles.botaoCancelar} onPress={() => setPasso(2)} disabled={salvando}>
                      <Text style={styles.botaoCancelarTexto}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botaoSalvar} onPress={salvar} disabled={salvando}>
                      {salvando
                        ? <><ActivityIndicator color="#fff" size="small" /><Text style={[styles.botaoSalvarTexto, { marginLeft: 6 }]}>{mensagemSalvando}</Text></>
                        : <Text style={styles.botaoSalvarTexto}>Confirmar e Salvar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Card expansível ───────────────────────────────────────────────────────────
function CardExpansivel({
  label, count, cor, animaisGrupo, onRegistrarVacina,
}: {
  label: string; count: number; cor: string;
  animaisGrupo: AnimalSaude[]; onRegistrarVacina: (animalId: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotAnim, { toValue: aberto ? 0 : 1, duration: 220, useNativeDriver: true }).start();
    setAberto(v => !v);
  }

  const rotacao = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View style={[styles.accordionCard, { borderLeftColor: cor }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.75}>
        <Text style={[styles.accordionNumero, { color: cor }]}>{count}</Text>
        <Text style={styles.accordionLabel}>{label}</Text>
        <Animated.View style={{ transform: [{ rotate: rotacao }] }}>
          <Ionicons name="chevron-forward" size={18} color={cor} />
        </Animated.View>
      </TouchableOpacity>
      {aberto && (
        <View style={styles.accordionBody}>
          {animaisGrupo.length === 0 ? (
            <Text style={styles.accordionVazio}>Nenhum animal nesta categoria.</Text>
          ) : animaisGrupo.map((animal, idx) => (
            <View key={animal.animalId}>
              {idx > 0 && <View style={styles.accordionSeparador} />}
              <View style={styles.accordionAnimalCard}>
                <Text style={styles.accordionAnimalNome}>{animal.nome || 'Sem nome'}</Text>
                <Text style={styles.accordionAnimalBrinco}>Brinco: {animal.brinco}</Text>
                <Text style={styles.accordionAnimalIdade}>Idade: {animal.idade}</Text>
                {animal.vacinasAtrasadas.map(v => <Text key={v} style={styles.accordionLinhaAtrasada}>⚠ {v}</Text>)}
                {animal.vacinasPendentes.map(v => <Text key={v} style={styles.accordionLinhaPendente}>• {v}</Text>)}
                {animal.alertasVermifugacao.map(v => <Text key={v} style={styles.accordionLinhaPendente}>• {v}</Text>)}
                <TouchableOpacity style={styles.accordionBotaoRegistrar} onPress={() => onRegistrarVacina(animal.animalId)}>
                  <Text style={styles.accordionBotaoRegistrarTexto}>Registrar vacina</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Modal Histórico ───────────────────────────────────────────────────────────
function ModalHistorico({ visible, propriedadeId, onClose }: { visible: boolean; propriedadeId: number; onClose: () => void; }) {
  const [periodo, setPeriodo] = useState<PeriodoHistorico>('Este mês');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<HistoricoVacina[]>([]);
  const [buscou, setBuscou] = useState(false);

  function calcularDatas(p: PeriodoHistorico) {
    const hoje = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtBr = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const fim = fmtBr(hoje);
    if (p === 'Este mês') return { inicio: `01/${pad(hoje.getMonth() + 1)}/${hoje.getFullYear()}`, fim };
    if (p === 'Últimos 3 meses') { const d = new Date(hoje); d.setMonth(d.getMonth() - 3); return { inicio: fmtBr(d), fim }; }
    if (p === 'Este ano') return { inicio: `01/01/${hoje.getFullYear()}`, fim };
    return { inicio: '', fim: '' };
  }

  function selecionarPeriodo(p: PeriodoHistorico) {
    setPeriodo(p);
    if (p !== 'Personalizado') { const { inicio, fim } = calcularDatas(p); setDataInicio(inicio); setDataFim(fim); }
    else { setDataInicio(''); setDataFim(''); }
  }

  async function buscar() {
    setCarregando(true); setBuscou(true);
    try {
      let url = `/api/saude/historico?propriedadeId=${propriedadeId}`;
      if (dataInicio && validarDataCompleta(dataInicio)) url += `&dataInicio=${dataBrParaApi(dataInicio)}`;
      if (dataFim && validarDataCompleta(dataFim)) url += `&dataFim=${dataBrParaApi(dataFim)}`;
      setHistorico(await api.get<HistoricoVacina[]>(url));
    } catch (error) { Alert.alert('Erro', getMensagemErro(error)); }
    finally { setCarregando(false); }
  }

  function fmtData(iso: string) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function handleClose() { setBuscou(false); setHistorico([]); setPeriodo('Este mês'); setDataInicio(''); setDataFim(''); onClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { maxHeight: '92%' }]}>
            <View style={styles.alertaModalCabecalho}>
              <View>
                <Text style={styles.modalTitulo}>Histórico de Vacinas</Text>
                {buscou && !carregando && <Text style={styles.alertaSubtitulo}>{historico.length} vacinação(ões) encontrada(s)</Text>}
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Período</Text>
              <View style={styles.historicoChips}>
                {PERIODOS_HISTORICO.map(p => (
                  <TouchableOpacity key={p} style={[styles.historicoChip, periodo === p && styles.historicoChipAtivo]} onPress={() => selecionarPeriodo(p)}>
                    <Text style={[styles.historicoChipTexto, periodo === p && styles.historicoChipTextoAtivo]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {periodo === 'Personalizado' && (
                <>
                  <Text style={styles.label}>Data Início</Text>
                  <TextInput style={styles.input} value={dataInicio} onChangeText={v => setDataInicio(formatarDataBrasileira(v))}
                    placeholder="DD/MM/AAAA" placeholderTextColor="#aeb8b1" keyboardType="number-pad" maxLength={10} />
                  <Text style={styles.label}>Data Fim</Text>
                  <TextInput style={styles.input} value={dataFim} onChangeText={v => setDataFim(formatarDataBrasileira(v))}
                    placeholder="DD/MM/AAAA" placeholderTextColor="#aeb8b1" keyboardType="number-pad" maxLength={10} />
                </>
              )}
              <TouchableOpacity style={[styles.botaoSalvar, { marginTop: 16, paddingVertical: 14 }]} onPress={buscar} disabled={carregando}>
                {carregando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botaoSalvarTexto}>Buscar</Text>}
              </TouchableOpacity>
              {buscou && !carregando && (
                historico.length === 0
                  ? <Text style={[styles.vazio, { marginTop: 24 }]}>Nenhuma vacinação encontrada no período.</Text>
                  : historico.map((item, idx) => (
                    <View key={idx} style={styles.historicoItem}>
                      <View style={styles.historicoItemTopo}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nome}>{item.animalNome}</Text>
                          <Text style={styles.brinco}>{item.animalBrinco}</Text>
                        </View>
                        <Text style={styles.historicoData}>{fmtData(item.dataAplicacao)}</Text>
                      </View>
                      <View style={styles.historicoVacinaTag}>
                        <Text style={styles.historicoVacinaTexto}>{item.nomeVacina}</Text>
                      </View>
                      {item.dose ? <Text style={styles.historicoDetalhe}>Dose: {item.dose}</Text> : null}
                      {item.observacao ? <Text style={styles.historicoDetalhe}>{item.observacao}</Text> : null}
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function SaudeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();

  const [animais, setAnimais] = useState<AnimalSaude[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasSaude | null>(null);
  const [estoques, setEstoques] = useState<EstoqueMedicamento[]>([]);
  const [estoqueExpandido, setEstoqueExpandido] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alertasEstoque, setAlertasEstoque] = useState(0);

  const [modalVacina, setModalVacina] = useState(false);
  const [modalVermifugacao, setModalVermifugacao] = useState(false);
  const [loteVisivel, setLoteVisivel] = useState(false);
  const [tipoLote, setTipoLote] = useState<TipoLote>('vacina');
  const [modalHistoricoVisivel, setModalHistoricoVisivel] = useState(false);

  const [form, setForm] = useState<VacinaForm>(formInicial);
  const [vermifugacaoForm, setVermifugacaoForm] = useState<VermifugacaoForm>(vermifugacaoInicial);

  async function carregarSaude() {
    setCarregando(true);

    if (!isOnline) {
      const cache = await getAnimaisSaudeCache<AnimalSaude>(propriedadeId);
      setAnimais(cache);
      setCarregando(false);
      return;
    }

    try {
      const [dados, stats, stock] = await Promise.all([
        api.get<AnimalSaude[]>(`/api/saude?propriedadeId=${propriedadeId}`),
        api.get<EstatisticasSaude>(`/api/saude/${propriedadeId}/estatisticas`).catch(() => null),
        api.get<EstoqueMedicamento[]>(`/api/estoque/${propriedadeId}`).catch(() => [] as EstoqueMedicamento[]),
      ]);
      setAnimais(dados);
      setEstatisticas(stats);
      setEstoques(stock);
      setAlertasEstoque(stock.filter(e => e.estoqueBaixo).length);
      saveAnimaisSaudeCache(propriedadeId, dados).catch(() => {});
    } catch (error) {
      const cache = await getAnimaisSaudeCache<AnimalSaude>(propriedadeId);
      if (cache.length > 0) setAnimais(cache);
      else Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSaude();
    const unsubscribe = navigation.addListener('focus', carregarSaude);
    return unsubscribe;
  }, [navigation, propriedadeId]);

  async function salvarVacina() {
    if (!form.animalId) { Alert.alert('Atencao', 'Selecione um animal.'); return; }
    if (!form.nomeVacina.trim()) { Alert.alert('Atencao', 'Informe o nome da vacina.'); return; }
    if (!validarDataCompleta(form.dataAplicacao)) { Alert.alert('Atencao', 'Informe a data em DD/MM/AAAA.'); return; }

    const dadosVacina = {
      animalId: form.animalId,
      nomeVacina: form.nomeVacina.trim(),
      dataAplicacao: dataBrParaApi(form.dataAplicacao),
      dose: form.dose.trim() || null,
      observacao: form.observacao.trim() || null,
      registrarCustoFinanceiro: form.registrarCusto,
      valorCusto: form.registrarCusto && form.valorCusto ? parseFloat(form.valorCusto.replace(',', '.')) : null,
      descricaoCusto: form.registrarCusto && form.descricaoCusto ? form.descricaoCusto.trim() : null,
      estoqueId: form.descontarEstoque ? form.estoqueId : null,
      quantidadeDescontar: form.descontarEstoque && form.qtdDescontar
        ? parseFloat(form.qtdDescontar.replace(',', '.'))
        : null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('vacinas', 'INSERT', { propriedadeId, ...dadosVacina });
      setModalVacina(false); setForm(formInicial); setSalvando(false);
      Alert.alert('Salvo', 'Vacina salva localmente e será sincronizada quando houver internet.');
      return;
    }

    try {
      await api.post(`/api/saude/vacinas?propriedadeId=${propriedadeId}`, dadosVacina);
      setModalVacina(false); setForm(formInicial);
      await carregarSaude();
    } catch (error) {
      await addToSyncQueue('vacinas', 'INSERT', { propriedadeId, ...dadosVacina });
      setModalVacina(false); setForm(formInicial);
      Alert.alert('Sem conexão', 'Vacina salva localmente e será sincronizada automaticamente.');
    } finally { setSalvando(false); }
  }

  async function salvarVermifugacao() {
    if (!vermifugacaoForm.animalId) { Alert.alert('Atencao', 'Selecione um animal.'); return; }
    if (!validarDataCompleta(vermifugacaoForm.dataAplicacao)) { Alert.alert('Atencao', 'Informe a data em DD/MM/AAAA.'); return; }
    if (vermifugacaoForm.proximaAplicacao && !validarDataCompleta(vermifugacaoForm.proximaAplicacao)) {
      Alert.alert('Atencao', 'Informe a proxima aplicacao em DD/MM/AAAA.'); return;
    }

    const dadosVermif = {
      animalId: vermifugacaoForm.animalId,
      tipoRegistro: 'Vermifugacao',
      dataRegistro: dataBrParaApi(vermifugacaoForm.dataAplicacao),
      descricao: 'Vermifugacao',
      produtoUtilizado: vermifugacaoForm.produtoUtilizado.trim() || null,
      dose: vermifugacaoForm.dose.trim() || null,
      proximaAplicacao: vermifugacaoForm.proximaAplicacao ? dataBrParaApi(vermifugacaoForm.proximaAplicacao) : null,
      observacao: vermifugacaoForm.observacao.trim() || null,
      registrarCustoFinanceiro: vermifugacaoForm.registrarCusto,
      valorCusto: vermifugacaoForm.registrarCusto && vermifugacaoForm.valorCusto
        ? parseFloat(vermifugacaoForm.valorCusto.replace(',', '.'))
        : null,
      descricaoCusto: vermifugacaoForm.registrarCusto && vermifugacaoForm.descricaoCusto
        ? vermifugacaoForm.descricaoCusto.trim()
        : null,
      estoqueId: vermifugacaoForm.descontarEstoque ? vermifugacaoForm.estoqueId : null,
      quantidadeDescontar: vermifugacaoForm.descontarEstoque && vermifugacaoForm.qtdDescontar
        ? parseFloat(vermifugacaoForm.qtdDescontar.replace(',', '.'))
        : null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('saude_registros', 'INSERT', { propriedadeId, ...dadosVermif });
      setModalVermifugacao(false); setVermifugacaoForm(vermifugacaoInicial); setSalvando(false);
      Alert.alert('Salvo', 'Vermifugação salva localmente e será sincronizada quando houver internet.');
      return;
    }

    try {
      await api.post(`/api/saude/registros?propriedadeId=${propriedadeId}`, dadosVermif);
      setModalVermifugacao(false); setVermifugacaoForm(vermifugacaoInicial);
      await carregarSaude();
    } catch (error) {
      await addToSyncQueue('saude_registros', 'INSERT', { propriedadeId, ...dadosVermif });
      setModalVermifugacao(false); setVermifugacaoForm(vermifugacaoInicial);
      Alert.alert('Sem conexão', 'Vermifugação salva localmente e será sincronizada automaticamente.');
    } finally { setSalvando(false); }
  }

  const resumo = useMemo(() => ({
    atrasadas: animais.filter(a => a.status === 'Atrasada').length,
    pendentes: animais.filter(a => a.status === 'Pendente').length,
    emDia: animais.filter(a => a.status === 'Em dia').length,
  }), [animais]);

  function abrirLote(tipo: TipoLote) { setTipoLote(tipo); setLoteVisivel(true); }

  // Estoques divididos por tipo para o card resumo
  const estVacinas = estoques.filter(e => e.tipo === 'Vacina');
  const estMeds = estoques.filter(e => e.tipo !== 'Vacina');

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 134 + insets.bottom }]}>

        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Saude</Text>
          <Text style={styles.subtitulo}>Vacinas e alertas do rebanho</Text>
        </View>

        {/* ── SEÇÃO 1: Cards de estatísticas ──────────────────────────────── */}
        {estatisticas && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            {[
              { label: 'Vacinas este mês', valor: estatisticas.vacinasEsteMes, icon: 'medkit-outline' as const, cor: '#2d6a4f' },
              { label: 'Vermifugações', valor: estatisticas.vermifugacoesEsteMes, icon: 'flask-outline' as const, cor: '#7c3aed' },
              { label: 'Tratamentos ativos', valor: estatisticas.tratamentosAtivos, icon: 'pulse-outline' as const, cor: '#dc2626' },
              { label: 'Próximas vacinas', valor: estatisticas.proximasVacinas, icon: 'calendar-outline' as const, cor: '#ea580c' },
            ].map(card => (
              <View key={card.label} style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: card.cor + '20' }]}>
                  <Ionicons name={card.icon} size={20} color={card.cor} />
                </View>
                <Text style={styles.statValor}>{card.valor}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── SEÇÃO 2: Card de Estoque ─────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.estoqueCard}
          onPress={() => setEstoqueExpandido(v => !v)}
          activeOpacity={0.85}
        >
          <View style={styles.estoqueCardTopo}>
            <Ionicons name="cube-outline" size={20} color={PRIMARY} />
            <Text style={styles.estoqueCardTitulo}>Estoque de Medicamentos</Text>
            {alertasEstoque > 0 && (
              <View style={styles.estoqueBadgeAlerta}>
                <Text style={styles.estoqueBadgeAlertaTexto}>{alertasEstoque} baixo</Text>
              </View>
            )}
            <Ionicons
              name={estoqueExpandido ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={PRIMARY}
              style={{ marginLeft: 'auto' }}
            />
          </View>

          {estoqueExpandido && (
            <View style={styles.estoqueCardBody}>
              {estoques.length === 0 ? (
                <Text style={styles.estoqueVazio}>Nenhum item no estoque. Toque em "Gerenciar Estoque".</Text>
              ) : (
                <>
                  {estVacinas.length > 0 && (
                    <>
                      <Text style={styles.estoqueTipoLabel}>VACINAS</Text>
                      {estVacinas.map(e => (
                        <View key={e.id} style={styles.estoqueItem}>
                          <Text style={styles.estoqueItemNome}>
                            {e.estoqueBaixo && <Ionicons name="alert-circle" size={12} color={COR_PENDENTE} />}
                            {' '}{e.nome}
                          </Text>
                          <Text style={[styles.estoqueItemQtd, { color: e.quantidadeAtual === 0 ? COR_ATRASADA : e.estoqueBaixo ? COR_PENDENTE : COR_EM_DIA }]}>
                            {e.quantidadeAtual} {e.unidade}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                  {estMeds.length > 0 && (
                    <>
                      <Text style={[styles.estoqueTipoLabel, { marginTop: 10 }]}>MEDICAMENTOS</Text>
                      {estMeds.map(e => (
                        <View key={e.id} style={styles.estoqueItem}>
                          <Text style={styles.estoqueItemNome}>
                            {e.estoqueBaixo && <Ionicons name="alert-circle" size={12} color={COR_PENDENTE} />}
                            {' '}{e.nome}
                          </Text>
                          <Text style={[styles.estoqueItemQtd, { color: e.quantidadeAtual === 0 ? COR_ATRASADA : e.estoqueBaixo ? COR_PENDENTE : COR_EM_DIA }]}>
                            {e.quantidadeAtual} {e.unidade}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Cards expansíveis de status */}
        <View style={styles.accordionSection}>
          <CardExpansivel label="Atrasadas" count={resumo.atrasadas} cor={COR_ATRASADA}
            animaisGrupo={animais.filter(a => a.status === 'Atrasada')}
            onRegistrarVacina={(animalId) => { setForm({ ...formInicial, animalId }); setModalVacina(true); }} />
          <CardExpansivel label="Pendentes" count={resumo.pendentes} cor={COR_PENDENTE}
            animaisGrupo={animais.filter(a => a.status === 'Pendente')}
            onRegistrarVacina={(animalId) => { setForm({ ...formInicial, animalId }); setModalVacina(true); }} />
          <CardExpansivel label="Em dia" count={resumo.emDia} cor={COR_EM_DIA}
            animaisGrupo={animais.filter(a => a.status === 'Em dia')}
            onRegistrarVacina={(animalId) => { setForm({ ...formInicial, animalId }); setModalVacina(true); }} />
        </View>

        {carregando && <View style={styles.centro}><ActivityIndicator color={PRIMARY} /></View>}

        {/* Botões individuais */}
        <TouchableOpacity style={styles.botaoRegistrarTopo} onPress={() => { setForm(formInicial); setModalVacina(true); }}>
          <Text style={styles.botaoRegistrarTopoTexto}>+ Registrar vacina</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoSecundarioTopo} onPress={() => { setVermifugacaoForm(vermifugacaoInicial); setModalVermifugacao(true); }}>
          <Text style={styles.botaoSecundarioTopoTexto}>Registrar vermifugacao</Text>
        </TouchableOpacity>

        {/* Botões de lote */}
        <View style={styles.loteRow}>
          <TouchableOpacity style={styles.botaoLote} onPress={() => abrirLote('vacina')}>
            <Ionicons name="list-outline" size={15} color="#fff" />
            <Text style={styles.botaoLoteTexto}>Vacinar Lote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoLoteSecundario} onPress={() => abrirLote('vermifugacao')}>
            <Ionicons name="list-outline" size={15} color={PRIMARY} />
            <Text style={styles.botaoLoteSecundarioTexto}>Vermifugar Lote</Text>
          </TouchableOpacity>
        </View>

        {/* Gerenciar Estoque */}
        <TouchableOpacity style={styles.botaoEstoque} onPress={() => navigation.navigate('Estoque')}>
          <View style={styles.botaoEstoqueInner}>
            <Ionicons name="cube-outline" size={16} color="#92400e" />
            <Text style={styles.botaoEstoqueTexto}>Gerenciar Estoque</Text>
            {alertasEstoque > 0 && (
              <View style={styles.estoqueBtnBadge}>
                <Text style={styles.estoqueBtnBadgeTexto}>{alertasEstoque}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Acesso ao Afastamento */}
        <TouchableOpacity style={styles.botaoAfastamento} onPress={() => navigation.navigate('Afastamento')}>
          <Text style={styles.botaoAfastamentoTexto}>Controle de Afastamento (PL 04/07)</Text>
        </TouchableOpacity>

        {/* Histórico */}
        <TouchableOpacity style={styles.botaoHistorico} onPress={() => setModalHistoricoVisivel(true)}>
          <Ionicons name="time-outline" size={16} color={PRIMARY} />
          <Text style={styles.botaoHistoricoTexto}>Ver Histórico de Vacinas</Text>
        </TouchableOpacity>

        {!carregando && animais.length === 0 && (
          <Text style={[styles.vazio, { marginTop: 16 }]}>Nenhum animal cadastrado.</Text>
        )}
      </ScrollView>

      <VacinaModal
        visible={modalVacina} propriedadeId={propriedadeId} form={form} saving={salvando}
        onChange={setForm} onClose={() => setModalVacina(false)} onSave={salvarVacina}
        isOnline={isOnline} estoques={estoques} />

      <VermifugacaoModal
        visible={modalVermifugacao} propriedadeId={propriedadeId} form={vermifugacaoForm} saving={salvando}
        onChange={setVermifugacaoForm} onClose={() => setModalVermifugacao(false)} onSave={salvarVermifugacao}
        isOnline={isOnline} estoques={estoques} />

      <LoteModal
        visible={loteVisivel} tipo={tipoLote} animaisSaude={animais} propriedadeId={propriedadeId}
        onClose={() => setLoteVisivel(false)}
        onSalvo={async () => { setLoteVisivel(false); await carregarSaude(); }} />

      <ModalHistorico
        visible={modalHistoricoVisivel} propriedadeId={propriedadeId}
        onClose={() => setModalHistoricoVisivel(false)} />

      <BottomMenu activeItem="Saúde" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  content: { paddingBottom: 134 },
  cabecalho: { backgroundColor: PRIMARY, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitulo: { color: '#a8d5b5', fontSize: 13, marginTop: 3 },
  // Stats
  statsRow: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    width: 140,
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValor: { color: '#1a3d1f', fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#66746d', fontSize: 12, fontWeight: '700', marginTop: 2 },
  // Card estoque resumo
  estoqueCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  estoqueCardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  estoqueCardTitulo: { color: PRIMARY, fontSize: 15, fontWeight: '800' },
  estoqueBadgeAlerta: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  estoqueBadgeAlertaTexto: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  estoqueCardBody: { borderTopWidth: 1, borderTopColor: '#e8f0ea', paddingHorizontal: 14, paddingVertical: 10 },
  estoqueVazio: { color: '#88938c', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  estoqueTipoLabel: { color: '#88938c', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  estoqueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  estoqueItemNome: { color: '#1a3d1f', fontSize: 13, fontWeight: '700', flex: 1 },
  estoqueItemQtd: { fontSize: 13, fontWeight: '800' },
  // Accordions de status
  accordionSection: { gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  accordionCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  accordionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  accordionNumero: { fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  accordionLabel: { color: '#333', flex: 1, fontSize: 15, fontWeight: '700' },
  accordionBody: { backgroundColor: '#f9f9f9', paddingBottom: 12, paddingHorizontal: 12, paddingTop: 4 },
  accordionVazio: { color: '#88938c', fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  accordionSeparador: { backgroundColor: '#e8ece9', height: 1, marginVertical: 6 },
  accordionAnimalCard: { paddingVertical: 10 },
  accordionAnimalNome: { color: '#1f2d25', fontSize: 15, fontWeight: '800' },
  accordionAnimalBrinco: { color: '#66746d', fontSize: 12, marginTop: 2 },
  accordionAnimalIdade: { color: PRIMARY, fontSize: 12, fontWeight: '700', marginTop: 2 },
  accordionLinhaAtrasada: { color: '#dc2626', fontSize: 13, fontWeight: '700', marginTop: 4 },
  accordionLinhaPendente: { color: '#66746d', fontSize: 13, marginTop: 4 },
  accordionBotaoRegistrar: { alignItems: 'center', borderColor: PRIMARY, borderRadius: 10, borderWidth: 1.5, marginTop: 10, paddingVertical: 10 },
  accordionBotaoRegistrarTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  // Botões de ação
  botaoRegistrarTopo: { backgroundColor: PRIMARY, borderRadius: 12, marginHorizontal: 16, marginTop: 14, marginBottom: 4, padding: 14, alignItems: 'center' },
  botaoRegistrarTopoTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
  botaoSecundarioTopo: { alignItems: 'center', borderColor: PRIMARY, borderRadius: 12, borderWidth: 1.5, marginHorizontal: 16, marginTop: 10, padding: 13 },
  botaoSecundarioTopoTexto: { color: PRIMARY, fontSize: 14, fontWeight: '800' },
  loteRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 },
  botaoLote: { flex: 1, backgroundColor: '#2d6a4f', borderRadius: 12, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  botaoLoteTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  botaoLoteSecundario: { flex: 1, borderColor: PRIMARY, borderRadius: 12, borderWidth: 1.5, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  botaoLoteSecundarioTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  botaoEstoque: { alignItems: 'center', backgroundColor: '#fffbeb', borderColor: '#d97706', borderRadius: 12, borderWidth: 1.5, marginHorizontal: 16, marginTop: 10, padding: 13 },
  botaoEstoqueInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botaoEstoqueTexto: { color: '#92400e', fontSize: 14, fontWeight: '800' },
  estoqueBtnBadge: { backgroundColor: '#dc2626', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  estoqueBtnBadgeTexto: { color: '#fff', fontSize: 11, fontWeight: '900' },
  botaoAfastamento: { alignItems: 'center', backgroundColor: '#fff4e0', borderColor: '#d97706', borderRadius: 12, borderWidth: 1.5, marginHorizontal: 16, marginTop: 10, padding: 13 },
  botaoAfastamentoTexto: { color: '#92400e', fontSize: 14, fontWeight: '800' },
  botaoHistorico: { alignItems: 'center', borderColor: PRIMARY, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', gap: 8, justifyContent: 'center', marginHorizontal: 16, marginTop: 10, padding: 13 },
  botaoHistoricoTexto: { color: PRIMARY, fontSize: 14, fontWeight: '800' },
  centro: { padding: 28 },
  vazio: { color: '#88938c', fontSize: 14, marginTop: 30, textAlign: 'center' },
  // Card custo/estoque
  custoCard: { backgroundColor: '#FFF3CD', borderRadius: 12, marginTop: 18, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  custoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  custoTitulo: { color: '#92400e', fontSize: 14, fontWeight: '800' },
  custoSub: { color: '#a16207', fontSize: 12, marginTop: 2 },
  custoDetalhes: { marginTop: 10 },
  // Modais
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalCaixa: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  modalContent: { padding: 20, paddingBottom: 34 },
  modalTitulo: { color: PRIMARY, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  alertaModalCabecalho: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 4, borderTopColor: PRIMARY,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, paddingBottom: 8,
  },
  alertaSubtitulo: { color: '#66746d', fontSize: 13, marginTop: 3, fontWeight: '600' },
  label: { color: '#333', fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderColor: '#d6ded8', borderRadius: 10, borderWidth: 1, color: '#26342b', fontSize: 15, padding: 13 },
  textArea: { minHeight: 90 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: '#ccd6cf', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  chipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  chipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  chipTextoAtivo: { color: PRIMARY },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 22 },
  botaoCancelar: { alignItems: 'center', borderColor: '#cbd4ce', borderRadius: 12, borderWidth: 1.5, flex: 1, padding: 14 },
  botaoCancelarTexto: { color: '#5d675f', fontWeight: '800' },
  botaoSalvar: { alignItems: 'center', backgroundColor: PRIMARY, borderRadius: 12, flex: 1, padding: 14, flexDirection: 'row', justifyContent: 'center' },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
  // Busca de animal
  buscaRow: { flexDirection: 'row', alignItems: 'center', borderColor: '#d6ded8', borderRadius: 10, borderWidth: 1, backgroundColor: '#fff', marginTop: 6 },
  buscaIcone: { marginLeft: 12 },
  buscaInput: { flex: 1, color: '#26342b', fontSize: 15, padding: 13 },
  buscaResultados: { backgroundColor: '#fff', borderColor: '#d6ded8', borderRadius: 10, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  buscaItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buscaItemNome: { color: '#1f2d25', fontSize: 14, fontWeight: '700' },
  buscaItemBrinco: { color: '#66746d', fontSize: 13 },
  animalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5ee', borderColor: PRIMARY, borderRadius: 12, borderWidth: 1.5, marginTop: 6, paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignSelf: 'flex-start' },
  animalChipTexto: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
  // Histórico
  historicoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  historicoChip: { borderColor: '#ccd6cf', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  historicoChipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  historicoChipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  historicoChipTextoAtivo: { color: PRIMARY },
  historicoItem: { backgroundColor: '#fff', borderRadius: 12, marginTop: 12, padding: 14, elevation: 1, shadowColor: '#153d2e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  historicoItemTopo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  historicoData: { color: '#88938c', fontSize: 12, fontWeight: '700' },
  historicoVacinaTag: { backgroundColor: '#e8f5ee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  historicoVacinaTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  historicoDetalhe: { color: '#66746d', fontSize: 12, marginTop: 5 },
  nome: { color: '#1f2d25', fontSize: 16, fontWeight: '800' },
  brinco: { color: '#66746d', fontSize: 13, marginTop: 3 },
  // Lote modal
  loteModalCaixa: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '95%' },
  loteCabecalho: { padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e8f0ea' },
  loteFecharBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  loteTitulo: { color: PRIMARY, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  passoIndicador: { flexDirection: 'row', alignItems: 'center' },
  passoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  passoPonto: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccd6cf', alignItems: 'center', justifyContent: 'center' },
  passoPontoAtivo: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  passoPontoConcluido: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  passoPontoTexto: { color: '#88938c', fontSize: 10, fontWeight: '800' },
  passoLabel: { color: '#88938c', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  passoLinha: { flex: 1, height: 2, backgroundColor: '#e0e8e4', marginHorizontal: 4 },
  loteConteudo: { padding: 16, paddingBottom: 30 },
  passSubtitulo: { color: PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  faixaChips: { flexDirection: 'column', gap: 10, marginBottom: 16 },
  faixaChip: { borderColor: '#ccd6cf', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12 },
  faixaChipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  faixaChipTexto: { color: '#566159', fontSize: 14, fontWeight: '700' },
  faixaChipTextoAtivo: { color: PRIMARY },
  faixaInfo: { color: '#66746d', fontSize: 13, marginBottom: 16 },
  btnAvancar: { backgroundColor: PRIMARY, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnAvancarTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
  loteHeader2: { marginBottom: 10 },
  loteHeader2Btns: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  linkBtn: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  loteAnimalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f0', borderRadius: 8, paddingHorizontal: 4 },
  loteAnimalItemSel: { backgroundColor: '#f0faf4' },
  loteAnimalNome: { color: '#1f2d25', fontSize: 14, fontWeight: '700' },
  loteAnimalBrinco: { color: '#66746d', fontSize: 12, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccd6cf', alignItems: 'center', justifyContent: 'center' },
  checkboxMarcado: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  badgeAtrasada: { backgroundColor: '#fdecea' },
  badgePendente: { backgroundColor: '#fff4df' },
  badgeOk: { backgroundColor: '#e8f5ee' },
  badgeTexto: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  erroLoteContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fdecea', borderRadius: 10, padding: 12, marginTop: 12 },
  erroLoteTexto: { color: '#c0392b', fontSize: 13, fontWeight: '700', flex: 1 },
  resumoConfirmacao: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#e8f5ee', borderRadius: 10, padding: 12, marginTop: 16 },
  resumoTexto: { color: PRIMARY, fontSize: 13, fontWeight: '700', flex: 1 },
});
