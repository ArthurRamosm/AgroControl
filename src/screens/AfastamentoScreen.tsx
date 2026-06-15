import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnimalParams, RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveAfastamentosCache, getAfastamentosCache, getAnimaisLocal, addToSyncQueue } from '../database/localDb';
import {
  dataBrParaApi,
  formatarDataBrasileira,
  validarDataCompleta,
} from '../utils/animalHealth';

const PRIMARY = '#1a3d1f';

const noTranslateProps =
  Platform.OS === 'web' ? ({ translate: 'no', className: 'notranslate' } as any) : {};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Afastamento'>;
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Afastamento = {
  id: number;
  animalId: number;
  animalNome: string;
  animalBrinco: string;
  motivoAfastamento: string;
  dataAfastamento: string;
  produtoUtilizado?: string | null;
  periodoCarencia?: number | null;
  dataRetorno?: string | null;
  observacao?: string | null;
  ativo: boolean;
};

type AfastamentoForm = {
  animalId: number | null;
  motivoAfastamento: string;
  dataAfastamento: string;
  produtoUtilizado: string;
  periodoCarencia: string;
  dataRetorno: string;
  observacao: string;
};

type FiltroStatus = 'Todos' | 'Afastados' | 'Retornaram';

const MOTIVOS = ['Vaca Seca', 'Doenca', 'Tratamento', 'Quarentena', 'Outro'];

function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtData(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function estaAfastado(af: Afastamento): boolean {
  if (!af.dataRetorno) return true;
  return new Date(af.dataRetorno) > new Date();
}

const formInicial: AfastamentoForm = {
  animalId: null,
  motivoAfastamento: 'Tratamento',
  dataAfastamento: hojeBr(),
  produtoUtilizado: '',
  periodoCarencia: '',
  dataRetorno: '',
  observacao: '',
};

// ── Campo de formulário ───────────────────────────────────────────────────────
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

// ── Card de afastamento ───────────────────────────────────────────────────────
function CardAfastamento({
  item,
  onRetorno,
  onEditar,
  onExcluir,
}: {
  item: Afastamento;
  onRetorno: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const afastado = estaAfastado(item);
  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <View style={{ flex: 1 }}>
          <Text {...noTranslateProps} style={styles.cardNome}>
            {item.animalNome || 'Sem nome'}
          </Text>
          <Text {...noTranslateProps} style={styles.cardBrinco}>Brinco: {item.animalBrinco}</Text>
        </View>
        <View style={[styles.badge, afastado ? styles.badgeAfastado : styles.badgeRetornou]}>
          <Text style={[styles.badgeTexto, afastado ? styles.badgeTextoAfastado : styles.badgeTextoRetornou]}>
            {afastado ? 'Afastado' : 'Retornou'}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem label="Motivo" valor={item.motivoAfastamento} />
        <InfoItem label="Data" valor={fmtData(item.dataAfastamento) ?? '-'} />
        {item.produtoUtilizado ? <InfoItem label="Produto" valor={item.produtoUtilizado} /> : null}
        {item.periodoCarencia ? <InfoItem label="Carência" valor={`${item.periodoCarencia} dias`} /> : null}
        {item.dataRetorno ? <InfoItem label="Retorno Previsto" valor={fmtData(item.dataRetorno) ?? '-'} /> : null}
      </View>

      {item.observacao ? (
        <Text {...noTranslateProps} style={styles.observacao}>{item.observacao}</Text>
      ) : null}

      <View style={styles.cardBotoes}>
        {afastado && (
          <TouchableOpacity style={styles.btnRetorno} onPress={onRetorno}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#2d6a4f" />
            <Text style={styles.btnRetornoTexto}>Registrar Retorno</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnEditar} onPress={onEditar}>
          <Ionicons name="pencil-outline" size={15} color={PRIMARY} />
          <Text style={styles.btnEditarTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnExcluir} onPress={onExcluir}>
          <Ionicons name="trash-outline" size={15} color="#c0392b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function AfastamentoScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();

  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [animais, setAnimais] = useState<AnimalParams[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroStatus>('Todos');
  const [buscaAnimal, setBuscaAnimal] = useState('');

  const [modalVisivel, setModalVisivel] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<AfastamentoForm>(formInicial);

  const carregarDados = useCallback(async () => {
    setCarregando(true);

    if (!isOnline) {
      const [afsCache, animaisCache] = await Promise.all([
        getAfastamentosCache<Afastamento>(propriedadeId),
        getAnimaisLocal(propriedadeId),
      ]);
      setAfastamentos(afsCache);
      setAnimais(animaisCache);
      setCarregando(false);
      return;
    }

    try {
      const [afs, ants] = await Promise.all([
        api.get<Afastamento[]>(`/api/afastamentos/${propriedadeId}`),
        api.get<AnimalParams[]>(`/api/animais?propriedadeId=${propriedadeId}`),
      ]);
      setAfastamentos(afs);
      setAnimais(ants);
      saveAfastamentosCache(propriedadeId, afs).catch(() => {});
    } catch (error) {
      const [afsCache, animaisCache] = await Promise.all([
        getAfastamentosCache<Afastamento>(propriedadeId),
        getAnimaisLocal(propriedadeId),
      ]);
      if (afsCache.length > 0 || animaisCache.length > 0) {
        setAfastamentos(afsCache);
        setAnimais(animaisCache);
      } else {
        Alert.alert('Erro', getMensagemErro(error));
      }
    } finally {
      setCarregando(false);
    }
  }, [propriedadeId, isOnline]);

  useEffect(() => {
    carregarDados();
    const unsub = navigation.addListener('focus', carregarDados);
    return unsub;
  }, [navigation, carregarDados]);

  const listafiltrada = useMemo(() => {
    return afastamentos.filter(af => {
      if (filtro === 'Afastados') return estaAfastado(af);
      if (filtro === 'Retornaram') return !estaAfastado(af);
      return true;
    });
  }, [afastamentos, filtro]);

  const animaisFiltrados = useMemo(() => {
    if (!buscaAnimal.trim()) return animais;
    const q = buscaAnimal.toLowerCase();
    return animais.filter(
      a => (a.nome ?? '').toLowerCase().includes(q) || a.brinco.toLowerCase().includes(q)
    );
  }, [animais, buscaAnimal]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(formInicial);
    setBuscaAnimal('');
    setModalVisivel(true);
  }

  function abrirEditar(af: Afastamento) {
    setEditandoId(af.id);
    setForm({
      animalId: af.animalId,
      motivoAfastamento: af.motivoAfastamento,
      dataAfastamento: fmtData(af.dataAfastamento) ?? hojeBr(),
      produtoUtilizado: af.produtoUtilizado ?? '',
      periodoCarencia: af.periodoCarencia ? String(af.periodoCarencia) : '',
      dataRetorno: fmtData(af.dataRetorno) ?? '',
      observacao: af.observacao ?? '',
    });
    setBuscaAnimal('');
    setModalVisivel(true);
  }

  function calcularDataRetorno(dias: string) {
    const n = parseInt(dias, 10);
    if (isNaN(n) || n <= 0) return;
    const base = validarDataCompleta(form.dataAfastamento)
      ? (() => {
          const [d, m, y] = form.dataAfastamento.split('/').map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date();
    base.setDate(base.getDate() + n);
    const retorno = `${String(base.getDate()).padStart(2, '0')}/${String(base.getMonth() + 1).padStart(2, '0')}/${base.getFullYear()}`;
    setForm(f => ({ ...f, dataRetorno: retorno }));
  }

  async function salvar() {
    if (!form.animalId) {
      Alert.alert('Atenção', 'Selecione um animal.');
      return;
    }
    if (!form.motivoAfastamento.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do afastamento.');
      return;
    }
    if (!validarDataCompleta(form.dataAfastamento)) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.');
      return;
    }
    if (form.dataRetorno && !validarDataCompleta(form.dataRetorno)) {
      Alert.alert('Atenção', 'Informe a data de retorno no formato DD/MM/AAAA.');
      return;
    }

    const body = {
      animalId: form.animalId,
      propriedadeId,
      motivoAfastamento: form.motivoAfastamento.trim(),
      dataAfastamento: dataBrParaApi(form.dataAfastamento),
      produtoUtilizado: form.produtoUtilizado.trim() || null,
      periodoCarencia: form.periodoCarencia ? parseInt(form.periodoCarencia, 10) : null,
      dataRetorno: form.dataRetorno ? dataBrParaApi(form.dataRetorno) : null,
      observacao: form.observacao.trim() || null,
    };

    setSalvando(true);

    if (!isOnline) {
      const tempId = editandoId ?? -Date.now();
      if (editandoId !== null) {
        await addToSyncQueue('afastamentos', 'UPDATE', { id: editandoId, ...body });
        setAfastamentos(prev => prev.map(a => a.id === editandoId ? { ...a, ...body, id: editandoId, animalNome: a.animalNome, animalBrinco: a.animalBrinco, ativo: a.ativo } : a));
      } else {
        const animal = animais.find(a => a.id === body.animalId);
        const novoAf: Afastamento = { ...body, id: tempId, animalNome: animal?.nome ?? '', animalBrinco: animal?.brinco ?? '', ativo: true };
        await addToSyncQueue('afastamentos', 'INSERT', body);
        setAfastamentos(prev => [novoAf, ...prev]);
      }
      setModalVisivel(false);
      setSalvando(false);
      return;
    }

    try {
      if (editandoId !== null) {
        await api.put(`/api/afastamentos/${editandoId}`, {
          produtoUtilizado: body.produtoUtilizado,
          periodoCarencia: body.periodoCarencia,
          dataRetorno: body.dataRetorno,
          observacao: body.observacao,
        });
      } else {
        await api.post('/api/afastamentos', body);
      }
      setModalVisivel(false);
      await carregarDados();
    } catch (error) {
      await addToSyncQueue('afastamentos', editandoId !== null ? 'UPDATE' : 'INSERT', editandoId !== null ? { id: editandoId, ...body } : body);
      setModalVisivel(false);
      Alert.alert('Sem conexão', 'Afastamento salvo localmente e será sincronizado automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function registrarRetorno(id: number) {
    const dataIso = new Date().toISOString();
    const update = { dataRetorno: dataIso };

    if (!isOnline) {
      await addToSyncQueue('afastamentos', 'UPDATE', { id, ...update });
      setAfastamentos(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
      return;
    }

    try {
      await api.put(`/api/afastamentos/${id}`, update);
      await carregarDados();
    } catch (error) {
      await addToSyncQueue('afastamentos', 'UPDATE', { id, ...update });
      setAfastamentos(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
      Alert.alert('Sem conexão', 'Retorno salvo localmente e será sincronizado automaticamente.');
    }
  }

  function confirmarExclusao(id: number) {
    Alert.alert(
      'Excluir Afastamento',
      'Tem certeza que deseja remover este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!isOnline) {
              await addToSyncQueue('afastamentos', 'DELETE', { id });
              setAfastamentos(prev => prev.filter(a => a.id !== id));
              return;
            }
            try {
              await api.delete(`/api/afastamentos/${id}`);
              await carregarDados();
            } catch (error) {
              await addToSyncQueue('afastamentos', 'DELETE', { id });
              setAfastamentos(prev => prev.filter(a => a.id !== id));
              Alert.alert('Sem conexão', 'Exclusão salva localmente e será sincronizada automaticamente.');
            }
          },
        },
      ]
    );
  }

  const FILTROS: FiltroStatus[] = ['Todos', 'Afastados', 'Retornaram'];

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <View style={styles.cabRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text {...noTranslateProps} style={styles.titulo}>Controle de Afastamento</Text>
            <Text {...noTranslateProps} style={styles.subtitulo}>PL 04/07 — Rebanho</Text>
          </View>
        </View>

        {/* Chips de filtro */}
        <View style={styles.filtros}>
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filtroChip, filtro === f && styles.filtroChipAtivo]}
              onPress={() => setFiltro(f)}
            >
              <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoAtivo]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista */}
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 158 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : listafiltrada.length === 0 ? (
          <View style={styles.centro}>
            <Text style={styles.vazio}>Nenhum afastamento encontrado.</Text>
          </View>
        ) : (
          listafiltrada.map(af => (
            <CardAfastamento
              key={af.id}
              item={af}
              onRetorno={() => registrarRetorno(af.id)}
              onEditar={() => abrirEditar(af)}
              onExcluir={() => confirmarExclusao(af.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Botão fixo no rodapé */}
      <View style={styles.rodape}>
        <TouchableOpacity testID="btn-registrar-afastamento" style={styles.btnRegistrar} onPress={abrirNovo}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text {...noTranslateProps} style={styles.btnRegistrarTexto}>Registrar Afastamento</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de cadastro/edição */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalFundo}>
          <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>
              {editandoId !== null ? 'Editar Afastamento' : 'Registrar Afastamento'}
            </Text>

            {/* Seleção de animal */}
            <Text style={styles.label}>Animal</Text>
            <TextInput
              testID="input-busca-animal-afastamento"
              style={styles.input}
              value={buscaAnimal}
              onChangeText={setBuscaAnimal}
              placeholder="Buscar por nome ou brinco..."
              placeholderTextColor="#aeb8b1"
            />
            {buscaAnimal.length > 0 && (
              <View style={styles.autocompleteLista}>
                {animaisFiltrados.slice(0, 6).map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.autocompleteItem,
                      form.animalId === a.id && styles.autocompleteItemAtivo,
                    ]}
                    onPress={() => {
                      setForm(f => ({ ...f, animalId: a.id }));
                      setBuscaAnimal(a.nome ? `${a.nome} (${a.brinco})` : a.brinco);
                    }}
                  >
                    <Text style={styles.autocompleteTexto}>
                      {a.nome ? `${a.nome} — ` : ''}{a.brinco}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {form.animalId !== null && (
              <Text style={styles.animalSelecionado}>
                Animal selecionado: ID {form.animalId}
              </Text>
            )}

            {/* Motivo */}
            <Text style={styles.label}>Motivo do Afastamento</Text>
            <View style={styles.chips}>
              {MOTIVOS.map(m => (
                <TouchableOpacity
                  key={m}
                  testID={`chip-motivo-${m.toLowerCase().replace(/ /g, '-')}`}
                  style={[styles.chip, form.motivoAfastamento === m && styles.chipAtivo]}
                  onPress={() => setForm(f => ({ ...f, motivoAfastamento: m }))}
                >
                  <Text style={[styles.chipTexto, form.motivoAfastamento === m && styles.chipTextoAtivo]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label="Data do Afastamento"
              value={form.dataAfastamento}
              onChangeText={v => setForm(f => ({ ...f, dataAfastamento: formatarDataBrasileira(v) }))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="DD/MM/AAAA"
              testID="input-data-afastamento"
            />
            <Field
              label="Produto Utilizado (opcional)"
              value={form.produtoUtilizado}
              onChangeText={v => setForm(f => ({ ...f, produtoUtilizado: v }))}
              placeholder="Ex: Penicilina"
              testID="input-produto-afastamento"
            />
            <Field
              label="Período de Carência (dias, opcional)"
              value={form.periodoCarencia}
              onChangeText={v => {
                setForm(f => ({ ...f, periodoCarencia: v }));
                calcularDataRetorno(v);
              }}
              keyboardType="number-pad"
              placeholder="Ex: 7"
              testID="input-periodo-carencia"
            />
            <Field
              label="Data de Retorno (opcional)"
              value={form.dataRetorno}
              onChangeText={v => setForm(f => ({ ...f, dataRetorno: formatarDataBrasileira(v) }))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="DD/MM/AAAA (auto calculado)"
              testID="input-data-retorno"
            />
            <Field
              label="Observação (opcional)"
              value={form.observacao}
              onChangeText={v => setForm(f => ({ ...f, observacao: v }))}
              multiline
              placeholder="Anotações adicionais..."
              testID="input-observacao-afastamento"
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalVisivel(false)}
                disabled={salvando}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="btn-salvar-afastamento" style={styles.botaoSalvar} onPress={salvar} disabled={salvando}>
                {salvando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botaoSalvarTexto}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomMenu activeItem="Saúde" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1 },
  content: { paddingBottom: 158, paddingTop: 8 },
  cabecalho: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  cabRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 8,
  },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitulo: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  filtros: { flexDirection: 'row', gap: 8 },
  filtroChip: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filtroChipAtivo: { backgroundColor: '#fff', borderColor: '#fff' },
  filtroTexto: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  filtroTextoAtivo: { color: PRIMARY },
  centro: { alignItems: 'center', padding: 40 },
  vazio: { color: '#88938c', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardNome: { color: '#1f2d25', fontSize: 16, fontWeight: '800' },
  cardBrinco: { color: '#66746d', fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeAfastado: { backgroundColor: '#fdecea' },
  badgeRetornou: { backgroundColor: '#e8f5ee' },
  badgeTexto: { fontSize: 12, fontWeight: '800' },
  badgeTextoAfastado: { color: '#c0392b' },
  badgeTextoRetornou: { color: '#2d6a4f' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  infoItem: { backgroundColor: '#f5f9f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  infoLabel: { color: '#88938c', fontSize: 11, fontWeight: '700' },
  infoValor: { color: '#1f2d25', fontSize: 13, fontWeight: '700', marginTop: 2 },
  observacao: { color: '#66746d', fontSize: 12, fontStyle: 'italic', marginBottom: 8, marginTop: 4 },
  cardBotoes: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  btnRetorno: {
    alignItems: 'center',
    borderColor: '#2d6a4f',
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  btnRetornoTexto: { color: '#2d6a4f', fontSize: 12, fontWeight: '800' },
  btnEditar: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  btnEditarTexto: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  btnExcluir: {
    alignItems: 'center',
    borderColor: '#fdecea',
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#fdecea',
    padding: 9,
  },
  rodape: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    bottom: 92,
    left: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
  },
  btnRegistrar: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnRegistrarTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
  },
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
  autocompleteLista: {
    backgroundColor: '#fff',
    borderColor: '#d6ded8',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  autocompleteItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f0' },
  autocompleteItemAtivo: { backgroundColor: '#e8f5ee' },
  autocompleteTexto: { color: '#1f2d25', fontSize: 14, fontWeight: '600' },
  animalSelecionado: { color: '#2d6a4f', fontSize: 12, fontWeight: '700', marginTop: 6, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderColor: '#ccd6cf', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  chipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  chipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  chipTextoAtivo: { color: PRIMARY },
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
  botaoSalvar: { alignItems: 'center', backgroundColor: PRIMARY, borderRadius: 12, flex: 1, padding: 14 },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
});
