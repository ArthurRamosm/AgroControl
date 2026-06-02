import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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
import { RootStackParamList, AnimalParams } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import {
  saveAnimaisLocal,
  getAnimaisLocal,
  saveAfastamentosCache,
  getAfastamentosCache,
} from '../database/localDb';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import AnimalCard from '../components/AnimalCard';
import BottomMenu from '../components/BottomMenu';

const PRIMARY = '#1a3d1f';
const CHIP_COR = '#0d2b10';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalList'>;
};

type FiltroSexo = 'Todos' | 'F' | 'M';
type FiltroLeite = 'Todos' | 'Produzindo' | 'Seca';
type FaixaEtaria = 'Menos de 1 ano' | '1 a 3 anos' | '4 anos ou mais';
type ChipRapido = 'Todos' | 'Machos' | 'Fêmeas' | 'Ativos' | 'Vendidos' | 'Doentes';

const FAIXAS: FaixaEtaria[] = ['Menos de 1 ano', '1 a 3 anos', '4 anos ou mais'];
const CHIPS_RAPIDOS: ChipRapido[] = ['Todos', 'Machos', 'Fêmeas', 'Ativos', 'Vendidos', 'Doentes'];

type AfastamentoResumo = { animalId: number; ativo: boolean; dataRetorno: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function idadeMeses(animal: AnimalParams): number | null {
  const hoje = new Date();
  const informada = animal.dataNascimentoInformada?.trim();

  if (informada && /^\d{2}\/\d{2}\/\d{4}$/.test(informada)) {
    const [d, m, y] = informada.split('/').map(Number);
    const data = new Date(y, m - 1, d);
    return Math.max(0, (hoje.getFullYear() - data.getFullYear()) * 12 + hoje.getMonth() - data.getMonth());
  }
  if (informada && /^\d{4}$/.test(informada)) {
    return Math.max(0, (hoje.getFullYear() - Number(informada)) * 12);
  }
  if (animal.dataNascimento) {
    const data = new Date(animal.dataNascimento);
    return Math.max(0, (hoje.getFullYear() - data.getFullYear()) * 12 + hoje.getMonth() - data.getMonth());
  }
  return null;
}

function passaFaixa(animal: AnimalParams, faixas: Set<FaixaEtaria>): boolean {
  if (faixas.size === 0) return true;
  const m = idadeMeses(animal);
  if (m === null) return true;
  if (faixas.has('Menos de 1 ano') && m < 12) return true;
  if (faixas.has('1 a 3 anos') && m >= 12 && m < 48) return true;
  if (faixas.has('4 anos ou mais') && m >= 48) return true;
  return false;
}

function passaLeite(animal: AnimalParams, filtro: FiltroLeite): boolean {
  if (filtro === 'Todos') return true;
  const s = (animal.statusLeite ?? '').toLowerCase();
  if (filtro === 'Produzindo') return s !== 'n/a' && !s.includes('seca');
  if (filtro === 'Seca') return s.includes('seca');
  return true;
}

// ── Chip de filtro ativo (filtros avançados aplicados) ───────────────────────
function ChipAtivo({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <TouchableOpacity style={styles.chipAtivo} onPress={onRemove}>
      <Text style={styles.chipAtivoTexto}>{label}</Text>
      <Ionicons name="close" size={13} color={PRIMARY} />
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function AnimalListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();

  const [animais, setAnimais] = useState<AnimalParams[]>([]);
  const [afastamentosIds, setAfastamentosIds] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoOffline, setModoOffline] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState<AnimalParams | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Busca
  const [buscaVisivel, setBuscaVisivel] = useState(false);
  const [textoBusca, setTextoBusca] = useState('');

  // Chip de filtro rápido
  const [chipRapido, setChipRapido] = useState<ChipRapido>('Todos');

  // Filtros avançados aplicados
  const [filtroSexo, setFiltroSexo] = useState<FiltroSexo>('Todos');
  const [filtroFaixas, setFiltroFaixas] = useState<Set<FaixaEtaria>>(new Set());
  const [filtroLeite, setFiltroLeite] = useState<FiltroLeite>('Todos');

  // Modal de filtros — estado temporário
  const [modalFiltros, setModalFiltros] = useState(false);
  const [tempSexo, setTempSexo] = useState<FiltroSexo>('Todos');
  const [tempFaixas, setTempFaixas] = useState<Set<FaixaEtaria>>(new Set());
  const [tempLeite, setTempLeite] = useState<FiltroLeite>('Todos');

  async function buscarAnimais() {
    setErro(null);

    if (!isOnline) {
      const local = await getAnimaisLocal(propriedadeId);
      setAnimais(local);
      const afCache = await getAfastamentosCache<AfastamentoResumo>(propriedadeId);
      setAfastamentosIds(new Set(afCache.filter(a => a.ativo).map(a => a.animalId)));
      setModoOffline(true);
      setCarregando(false);
      setAtualizando(false);
      return;
    }

    setModoOffline(false);
    try {
      const [dados, afastamentos] = await Promise.all([
        api.get<AnimalParams[]>(`/api/animais?propriedadeId=${propriedadeId}`),
        api.get<AfastamentoResumo[]>(`/api/afastamentos/${propriedadeId}`).catch(() => [] as AfastamentoResumo[]),
      ]);

      setAnimais(dados);
      setAfastamentosIds(new Set(afastamentos.filter(a => a.ativo).map(a => a.animalId)));
      saveAnimaisLocal(dados, propriedadeId).catch(() => {});
      saveAfastamentosCache(propriedadeId, afastamentos).catch(() => {});
    } catch (error) {
      const local = await getAnimaisLocal(propriedadeId);
      if (local.length > 0) {
        setAnimais(local);
        setModoOffline(true);
        const afCache = await getAfastamentosCache<AfastamentoResumo>(propriedadeId);
        setAfastamentosIds(new Set(afCache.filter(a => a.ativo).map(a => a.animalId)));
      } else {
        setErro(getMensagemErro(error));
      }
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener('focus', buscarAnimais);
    buscarAnimais();
    return unsub;
  }, [navigation]);

  function onRefresh() {
    setAtualizando(true);
    buscarAnimais();
  }

  async function handleExcluir() {
    if (!confirmarExclusao) return;
    setExcluindo(true);
    try {
      await api.delete(`/api/animais/${confirmarExclusao.id}?propriedadeId=${propriedadeId}`);
      setAnimais(prev => prev.filter(a => a.id !== confirmarExclusao.id));
      setConfirmarExclusao(null);
    } catch (error) {
      setConfirmarExclusao(null);
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setExcluindo(false);
    }
  }

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtrosAtivos = useMemo(() => {
    let c = 0;
    if (filtroSexo !== 'Todos') c++;
    if (filtroFaixas.size > 0) c++;
    if (filtroLeite !== 'Todos') c++;
    return c;
  }, [filtroSexo, filtroFaixas, filtroLeite]);

  const animaisFiltrados = useMemo(() => {
    const q = textoBusca.toLowerCase().trim();
    return animais.filter(a => {
      // Chip rápido
      if (chipRapido === 'Machos' && a.sexo !== 'M') return false;
      if (chipRapido === 'Fêmeas' && a.sexo !== 'F') return false;
      if (chipRapido === 'Ativos' && !a.ativo) return false;
      if (chipRapido === 'Vendidos') {
        if (a.ativo) return false;
        if (!(a.motivoSaida ?? '').toLowerCase().includes('venda')) return false;
      }
      if (chipRapido === 'Doentes' && !afastamentosIds.has(a.id)) return false;
      // Busca por texto
      if (q && !(a.nome ?? '').toLowerCase().includes(q) && !a.brinco.toLowerCase().includes(q)) return false;
      // Filtros avançados
      if (filtroSexo !== 'Todos' && a.sexo !== filtroSexo) return false;
      if (!passaFaixa(a, filtroFaixas)) return false;
      if (!passaLeite(a, filtroLeite)) return false;
      return true;
    });
  }, [animais, textoBusca, filtroSexo, filtroFaixas, filtroLeite, chipRapido, afastamentosIds]);

  function abrirModalFiltros() {
    setTempSexo(filtroSexo);
    setTempFaixas(new Set(filtroFaixas));
    setTempLeite(filtroLeite);
    setModalFiltros(true);
  }

  function aplicarFiltros() {
    setFiltroSexo(tempSexo);
    setFiltroFaixas(new Set(tempFaixas));
    setFiltroLeite(tempLeite);
    setModalFiltros(false);
  }

  function limparFiltrosTemp() {
    setTempSexo('Todos');
    setTempFaixas(new Set());
    setTempLeite('Todos');
  }

  function toggleFaixa(f: FaixaEtaria) {
    setTempFaixas(prev => {
      const s = new Set(prev);
      s.has(f) ? s.delete(f) : s.add(f);
      return s;
    });
  }

  function removerFaixaAtiva(f: FaixaEtaria) {
    setFiltroFaixas(prev => {
      const s = new Set(prev);
      s.delete(f);
      return s;
    });
  }

  // ── Labels para chips ativos ─────────────────────────────────────────────
  const labelSexo = filtroSexo === 'F' ? 'Fêmea' : filtroSexo === 'M' ? 'Macho' : '';
  const hayChipsAtivos = filtrosAtivos > 0;

  const totalLabel = useMemo(() => {
    const hasFilter = filtrosAtivos > 0 || textoBusca.trim() || chipRapido !== 'Todos';
    if (!hasFilter) return `${animais.length} animais`;
    return `${animaisFiltrados.length} de ${animais.length} animais`;
  }, [animais.length, animaisFiltrados.length, filtrosAtivos, textoBusca, chipRapido]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Text style={styles.voltarTexto}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                setBuscaVisivel(v => !v);
                if (buscaVisivel) setTextoBusca('');
              }}
            >
              <Ionicons name={buscaVisivel ? 'close-outline' : 'search-outline'} size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerIconBtn} onPress={abrirModalFiltros}>
              <Ionicons name="funnel-outline" size={20} color="#fff" />
              {filtrosAtivos > 0 && (
                <View style={styles.badgeFiltro}>
                  <Text style={styles.badgeFiltroTexto}>{filtrosAtivos}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.titulo}>Rebanho</Text>
        <Text style={styles.total}>{totalLabel}</Text>

        {/* Chips de filtro rápido */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRapidosRow}
        >
          {CHIPS_RAPIDOS.map(chip => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.chipRapido,
                chipRapido === chip && styles.chipRapidoAtivo,
              ]}
              onPress={() => setChipRapido(chip)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.chipRapidoTexto,
                chipRapido === chip && styles.chipRapidoTextoAtivo,
              ]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Barra de busca expansível */}
        {buscaVisivel && (
          <View style={styles.buscaRow}>
            <Ionicons name="search-outline" size={16} color="#a8d5b5" style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.buscaInput}
              value={textoBusca}
              onChangeText={setTextoBusca}
              placeholder="Buscar por nome ou brinco..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoFocus
              autoCapitalize="none"
            />
            {textoBusca.length > 0 && (
              <TouchableOpacity onPress={() => setTextoBusca('')} style={{ marginRight: 12 }}>
                <Ionicons name="close-circle" size={18} color="#a8d5b5" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Chips de filtros avançados ativos */}
        {hayChipsAtivos && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsAtivosRow}
          >
            {filtroSexo !== 'Todos' && (
              <ChipAtivo label={labelSexo} onRemove={() => setFiltroSexo('Todos')} />
            )}
            {Array.from(filtroFaixas).map(f => (
              <ChipAtivo key={f} label={f} onRemove={() => removerFaixaAtiva(f)} />
            ))}
            {filtroLeite !== 'Todos' && (
              <ChipAtivo label={`Leite: ${filtroLeite}`} onRemove={() => setFiltroLeite('Todos')} />
            )}
          </ScrollView>
        )}
      </View>

      {/* Banner offline */}
      {modoOffline && (
        <View style={styles.bannerOffline}>
          <Text style={styles.bannerOfflineTexto}>Modo offline — exibindo dados locais</Text>
        </View>
      )}

      {/* Conteúdo */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.carregandoTexto}>Carregando animais...</Text>
        </View>
      ) : erro ? (
        <View style={styles.erroContainer}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.botaoTentar}>
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={animaisFiltrados}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              afastado={afastamentosIds.has(item.id)}
              onPress={a => navigation.navigate('AnimalDetails', { animal: a })}
              onEdit={a => navigation.navigate('CadastroAnimal', { animal: a })}
              onDelete={a => setConfirmarExclusao(a)}
            />
          )}
          contentContainerStyle={[styles.lista, { paddingBottom: 134 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={onRefresh} colors={['#2d6a4f']} />
          }
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {filtrosAtivos > 0 || textoBusca || chipRapido !== 'Todos'
                ? 'Nenhum animal encontrado com esses filtros.'
                : 'Nenhum animal cadastrado.'}
            </Text>
          }
        />
      )}

      {/* Modal confirmação de exclusão */}
      <Modal visible={confirmarExclusao !== null} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Excluir Animal</Text>
            <Text style={styles.modalMensagem}>
              Tem certeza que deseja excluir{'\n'}
              <Text style={{ fontWeight: '700' }}>
                {confirmarExclusao?.nome || confirmarExclusao?.brinco}
              </Text>
              ?{'\n'}Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                onPress={() => setConfirmarExclusao(null)}
                disabled={excluindo}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBotaoExcluir} onPress={handleExcluir}>
                {excluindo
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBotaoExcluirTexto}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de filtros */}
      <Modal visible={modalFiltros} transparent animationType="slide">
        <View style={styles.filtroModalFundo}>
          <View style={styles.filtroModalCaixa}>
            <View style={styles.filtroModalCabecalho}>
              <Text style={styles.filtroModalTitulo}>Filtrar Rebanho</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.filtroModalContent}>

              {/* Filtro Sexo */}
              <Text style={styles.filtroLabel}>Sexo</Text>
              <View style={styles.filtroChips}>
                {([['Todos', 'Todos'], ['F', 'Fêmea'], ['M', 'Macho']] as [FiltroSexo, string][]).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.filtroChip, tempSexo === val && styles.filtroChipAtivo]}
                    onPress={() => setTempSexo(val)}
                  >
                    <Text style={[styles.filtroChipTexto, tempSexo === val && styles.filtroChipTextoAtivo]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filtro Faixa etária */}
              <Text style={styles.filtroLabel}>Faixa etária (múltipla)</Text>
              <View style={styles.filtroChips}>
                {FAIXAS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filtroChip, tempFaixas.has(f) && styles.filtroChipAtivo]}
                    onPress={() => toggleFaixa(f)}
                  >
                    <Text style={[styles.filtroChipTexto, tempFaixas.has(f) && styles.filtroChipTextoAtivo]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filtro Status leite */}
              <Text style={styles.filtroLabel}>Status do Leite</Text>
              <View style={styles.filtroChips}>
                {(['Todos', 'Produzindo', 'Seca'] as FiltroLeite[]).map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.filtroChip, tempLeite === val && styles.filtroChipAtivo]}
                    onPress={() => setTempLeite(val)}
                  >
                    <Text style={[styles.filtroChipTexto, tempLeite === val && styles.filtroChipTextoAtivo]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            </ScrollView>

            {/* Rodapé */}
            <View style={styles.filtroModalRodape}>
              <TouchableOpacity style={styles.filtroBtnLimpar} onPress={limparFiltrosTemp}>
                <Text style={styles.filtroBtnLimparTexto}>Limpar filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filtroBtnAplicar} onPress={aplicarFiltros}>
                <Text style={styles.filtroBtnAplicarTexto}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomMenu activeItem="Animais" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f0' },
  carregandoTexto: { color: '#666', fontSize: 14, marginTop: 12 },
  cabecalho: {
    backgroundColor: PRIMARY,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voltar: {},
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  headerIconBtn: { position: 'relative', padding: 6 },
  badgeFiltro: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e07b39',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeFiltroTexto: { color: '#fff', fontSize: 10, fontWeight: '900' },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  total: { color: '#a8d5b5', fontSize: 13, marginTop: 2, marginBottom: 10 },
  // Chips de filtro rápido
  chipsRapidosRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chipRapido: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: CHIP_COR,
  },
  chipRapidoAtivo: {
    backgroundColor: CHIP_COR,
    borderColor: CHIP_COR,
  },
  chipRapidoTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: CHIP_COR,
  },
  chipRapidoTextoAtivo: {
    color: '#fff',
  },
  // Busca
  buscaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginTop: 10,
    height: 40,
  },
  buscaInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 8,
    height: '100%',
  },
  // Chips ativos (filtros avançados)
  chipsAtivosRow: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  chipAtivo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipAtivoTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Lista
  lista: { padding: 16, paddingBottom: 134, gap: 12 },
  vazio: { color: '#999', fontSize: 15, marginTop: 40, textAlign: 'center' },
  erroContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 134 },
  erroTexto: { color: '#c0392b', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  botaoTentar: {
    borderColor: PRIMARY,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  botaoTentarTexto: { color: PRIMARY, fontWeight: '600' },
  // Modal exclusão
  modalFundo: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  modalCaixa: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderTopColor: '#c0392b',
    borderTopWidth: 5,
    maxWidth: 340,
    padding: 28,
    width: '100%',
  },
  modalTitulo: { color: '#c0392b', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalMensagem: { color: '#444', fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  modalBotoes: { flexDirection: 'row', gap: 12 },
  modalBotaoCancelar: {
    borderColor: '#ccc',
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  modalBotaoCancelarTexto: { color: '#666', fontSize: 14, fontWeight: '600' },
  modalBotaoExcluir: {
    alignItems: 'center',
    backgroundColor: '#c0392b',
    borderRadius: 10,
    minWidth: 80,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  modalBotaoExcluirTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Modal filtros
  filtroModalFundo: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  filtroModalCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '80%',
  },
  filtroModalCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0ea',
  },
  filtroModalTitulo: { color: PRIMARY, fontSize: 18, fontWeight: '800' },
  filtroModalContent: { padding: 20, paddingBottom: 8 },
  filtroLabel: { color: '#333', fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 16 },
  filtroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filtroChip: {
    borderColor: '#ccd6cf',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filtroChipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  filtroChipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  filtroChipTextoAtivo: { color: PRIMARY },
  filtroModalRodape: {
    borderTopColor: '#e8f0ea',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  filtroBtnLimpar: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    paddingVertical: 13,
  },
  filtroBtnLimparTexto: { color: PRIMARY, fontWeight: '800' },
  filtroBtnAplicar: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 13,
  },
  filtroBtnAplicarTexto: { color: '#fff', fontWeight: '800' },
  bannerOffline: {
    backgroundColor: '#e07b00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerOfflineTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
