import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';

const PRIMARY = '#0d2b10';
const COR_OK = '#16a34a';
const COR_BAIXO = '#ea580c';
const COR_ZERO = '#dc2626';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Estoque'>;
};

type EstoqueMedicamento = {
  id: number;
  propriedadeId: number;
  nome: string;
  tipo: string;
  unidade: string;
  quantidadeAtual: number;
  quantidadeMinima: number | null;
  valorUnitario: number | null;
  observacao: string | null;
  estoqueBaixo: boolean;
};

type MovimentacaoItem = {
  id: number;
  estoqueId: number;
  nomeMedicamento: string;
  tipoMovimentacao: string;
  quantidade: number;
  motivo: string | null;
  animalId: number | null;
  animalNome: string | null;
  dataMovimentacao: string;
  observacao: string | null;
  createdAt: string;
};

type Tab = 'Vacinas' | 'Medicamentos' | 'Histórico';

const TIPOS_VACINA = ['Vacina'];
const TIPOS_MED = ['Vermifugo', 'Antibiotico', 'Outro'];
const TIPOS = ['Vacina', 'Vermifugo', 'Antibiotico', 'Outro'];
const UNIDADES = ['doses', 'frascos', 'ml', 'comprimidos'];
const MOTIVOS_ENTRADA = ['Compra', 'Doação', 'Ajuste'];
const MOTIVOS_SAIDA = ['Aplicação', 'Vencimento', 'Ajuste', 'Perda'];

function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatarDataBrasileira(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

function dataBrParaIso(v: string): string {
  const [d, m, y] = v.split('/');
  return `${y}-${m}-${d}T00:00:00`;
}

function fmtData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function corBarra(item: EstoqueMedicamento): string {
  if (item.quantidadeAtual === 0) return COR_ZERO;
  if (item.estoqueBaixo) return COR_BAIXO;
  return COR_OK;
}

function larguraBarra(item: EstoqueMedicamento, maxQty: number): number {
  if (maxQty === 0) return 0;
  return Math.min(1, item.quantidadeAtual / maxQty);
}

// ── Componente de item de estoque ─────────────────────────────────────────────
function ItemEstoque({
  item,
  maxQty,
  onEntrada,
  onSaida,
}: {
  item: EstoqueMedicamento;
  maxQty: number;
  onEntrada: () => void;
  onSaida: () => void;
}) {
  const cor = corBarra(item);
  const largura = larguraBarra(item, maxQty);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTopo}>
        <View style={{ flex: 1 }}>
          <View style={styles.itemNomeRow}>
            {item.estoqueBaixo && (
              <Ionicons name="alert-circle" size={14} color={COR_BAIXO} style={{ marginRight: 4 }} />
            )}
            <Text style={styles.itemNome}>{item.nome}</Text>
          </View>
          <Text style={styles.itemQtd}>
            {item.quantidadeAtual} {item.unidade}
            {item.quantidadeMinima != null && (
              <Text style={styles.itemMinimo}> (mín: {item.quantidadeMinima})</Text>
            )}
          </Text>
        </View>
        <View style={styles.itemAcoes}>
          <TouchableOpacity style={styles.btnEntrada} onPress={onEntrada}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSaida} onPress={onSaida}>
            <Ionicons name="remove" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de progresso */}
      <View style={styles.barraFundo}>
        <View style={[styles.barraPreenchimento, { flex: largura, backgroundColor: cor }]} />
        <View style={{ flex: 1 - largura }} />
      </View>

      {item.valorUnitario != null && (
        <Text style={styles.itemValor}>R$ {item.valorUnitario.toFixed(2)} / {item.unidade.replace(/s$/, '')}</Text>
      )}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function EstoqueScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();

  const [tab, setTab] = useState<Tab>('Vacinas');
  const [estoques, setEstoques] = useState<EstoqueMedicamento[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoHist, setCarregandoHist] = useState(false);
  const [alertas, setAlertas] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // Modal novo medicamento
  const [modalNovo, setModalNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState('Vacina');
  const [novaUnidade, setNovaUnidade] = useState('doses');
  const [novaQtdInicial, setNovaQtdInicial] = useState('');
  const [novaQtdMinima, setNovaQtdMinima] = useState('');
  const [novoValorUnit, setNovoValorUnit] = useState('');
  const [novaObs, setNovaObs] = useState('');

  // Modal entrada
  const [modalEntrada, setModalEntrada] = useState(false);
  const [entradaItem, setEntradaItem] = useState<EstoqueMedicamento | null>(null);
  const [entradaQtd, setEntradaQtd] = useState('');
  const [entradaMotivo, setEntradaMotivo] = useState('Compra');
  const [entradaData, setEntradaData] = useState(hojeBr());
  const [entradaObs, setEntradaObs] = useState('');

  // Modal saída
  const [modalSaida, setModalSaida] = useState(false);
  const [saidaItem, setSaidaItem] = useState<EstoqueMedicamento | null>(null);
  const [saidaQtd, setSaidaQtd] = useState('');
  const [saidaMotivo, setSaidaMotivo] = useState('Aplicação');
  const [saidaData, setSaidaData] = useState(hojeBr());
  const [saidaObs, setSaidaObs] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await api.get<EstoqueMedicamento[]>(`/api/estoque/${propriedadeId}`);
      setEstoques(dados);
      setAlertas(dados.filter(e => e.estoqueBaixo).length);
    } catch (e) {
      Alert.alert('Erro', getMensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }, [propriedadeId]);

  const carregarHistorico = useCallback(async () => {
    if (movimentacoes.length > 0) return;
    setCarregandoHist(true);
    try {
      const dados = await api.get<MovimentacaoItem[]>(`/api/estoque/${propriedadeId}/historico`);
      setMovimentacoes(dados);
    } catch (e) {
      Alert.alert('Erro', getMensagemErro(e));
    } finally {
      setCarregandoHist(false);
    }
  }, [propriedadeId, movimentacoes.length]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (tab === 'Histórico') carregarHistorico();
  }, [tab, carregarHistorico]);

  // ── Listas filtradas ──────────────────────────────────────────────────────
  const vacinas = estoques.filter(e => TIPOS_VACINA.includes(e.tipo));
  const medicamentos = estoques.filter(e => TIPOS_MED.includes(e.tipo));
  const listaAtual = tab === 'Vacinas' ? vacinas : tab === 'Medicamentos' ? medicamentos : [];
  const maxQtyAtual = Math.max(...listaAtual.map(e => e.quantidadeAtual), 1);

  // ── Ações ─────────────────────────────────────────────────────────────────
  function abrirEntrada(item: EstoqueMedicamento) {
    setEntradaItem(item);
    setEntradaQtd('');
    setEntradaMotivo('Compra');
    setEntradaData(hojeBr());
    setEntradaObs('');
    setModalEntrada(true);
  }

  function abrirSaida(item: EstoqueMedicamento) {
    setSaidaItem(item);
    setSaidaQtd('');
    setSaidaMotivo('Aplicação');
    setSaidaData(hojeBr());
    setSaidaObs('');
    setModalSaida(true);
  }

  async function salvarNovo() {
    if (!novoNome.trim()) { Alert.alert('Atenção', 'Informe o nome do medicamento.'); return; }
    setSalvando(true);
    try {
      await api.post('/api/estoque', {
        propriedadeId,
        nome: novoNome.trim(),
        tipo: novoTipo,
        unidade: novaUnidade,
        quantidadeInicial: parseFloat(novaQtdInicial.replace(',', '.')) || 0,
        quantidadeMinima: novaQtdMinima ? parseFloat(novaQtdMinima.replace(',', '.')) : null,
        valorUnitario: novoValorUnit ? parseFloat(novoValorUnit.replace(',', '.')) : null,
        observacao: novaObs.trim() || null,
      });
      setModalNovo(false);
      setNovoNome(''); setNovoTipo('Vacina'); setNovaUnidade('doses');
      setNovaQtdInicial(''); setNovaQtdMinima(''); setNovoValorUnit(''); setNovaObs('');
      setMovimentacoes([]);
      await carregar();
    } catch (e) {
      Alert.alert('Erro', getMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEntrada() {
    if (!entradaItem || !entradaQtd.trim()) { Alert.alert('Atenção', 'Informe a quantidade.'); return; }
    setSalvando(true);
    try {
      await api.post(`/api/estoque/${entradaItem.id}/entrada?propriedadeId=${propriedadeId}`, {
        quantidade: parseFloat(entradaQtd.replace(',', '.')),
        motivo: entradaMotivo,
        dataMovimentacao: dataBrParaIso(entradaData),
        observacao: entradaObs.trim() || null,
      });
      setModalEntrada(false);
      setMovimentacoes([]);
      await carregar();
    } catch (e) {
      Alert.alert('Erro', getMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarSaida() {
    if (!saidaItem || !saidaQtd.trim()) { Alert.alert('Atenção', 'Informe a quantidade.'); return; }
    setSalvando(true);
    try {
      await api.post(`/api/estoque/${saidaItem.id}/saida?propriedadeId=${propriedadeId}`, {
        quantidade: parseFloat(saidaQtd.replace(',', '.')),
        motivo: saidaMotivo,
        dataMovimentacao: dataBrParaIso(saidaData),
        observacao: saidaObs.trim() || null,
      });
      setModalSaida(false);
      setMovimentacoes([]);
      await carregar();
    } catch (e) {
      Alert.alert('Erro', getMensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Text style={styles.voltarTexto}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.cabecalhoRow}>
          <Text style={styles.titulo}>Estoque de Medicamentos</Text>
          {alertas > 0 && (
            <View style={styles.alertaBadge}>
              <Text style={styles.alertaBadgeTexto}>{alertas} baixo</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['Vacinas', 'Medicamentos', 'Histórico'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            testID={`aba-${t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}`}
            style={[styles.tabItem, tab === t && styles.tabItemAtivo]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabTexto, tab === t && styles.tabTextoAtivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <>
          {(tab === 'Vacinas' || tab === 'Medicamentos') && (
            <ScrollView
              style={styles.lista}
              contentContainerStyle={[styles.listaContent, { paddingBottom: 100 + insets.bottom }]}
            >
              {listaAtual.length === 0 ? (
                <View style={styles.vazio}>
                  <Ionicons name="cube-outline" size={40} color="#a8d5b5" />
                  <Text style={styles.vazioTexto}>
                    Nenhum {tab === 'Vacinas' ? 'vacina' : 'medicamento'} cadastrado.
                  </Text>
                  <Text style={styles.vazioSub}>Toque em "+ Novo" para adicionar.</Text>
                </View>
              ) : (
                listaAtual.map(item => (
                  <ItemEstoque
                    key={item.id}
                    item={item}
                    maxQty={maxQtyAtual}
                    onEntrada={() => abrirEntrada(item)}
                    onSaida={() => abrirSaida(item)}
                  />
                ))
              )}
            </ScrollView>
          )}

          {tab === 'Histórico' && (
            <ScrollView
              style={styles.lista}
              contentContainerStyle={[styles.listaContent, { paddingBottom: 100 + insets.bottom }]}
            >
              {carregandoHist ? (
                <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
              ) : movimentacoes.length === 0 ? (
                <View style={styles.vazio}>
                  <Ionicons name="time-outline" size={40} color="#a8d5b5" />
                  <Text style={styles.vazioTexto}>Nenhuma movimentação registrada.</Text>
                </View>
              ) : (
                movimentacoes.map(mov => (
                  <View key={mov.id} style={styles.movCard}>
                    <View style={styles.movTopo}>
                      <View style={[
                        styles.movBadge,
                        mov.tipoMovimentacao === 'entrada' ? styles.movBadgeEntrada : styles.movBadgeSaida,
                      ]}>
                        <Ionicons
                          name={mov.tipoMovimentacao === 'entrada' ? 'arrow-down' : 'arrow-up'}
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.movBadgeTexto}>
                          {mov.tipoMovimentacao === 'entrada' ? 'Entrada' : 'Saída'}
                        </Text>
                      </View>
                      <Text style={styles.movData}>{fmtData(mov.dataMovimentacao)}</Text>
                    </View>
                    <Text style={styles.movNome}>{mov.nomeMedicamento}</Text>
                    <Text style={styles.movQtd}>
                      {mov.tipoMovimentacao === 'entrada' ? '+' : '-'}{mov.quantidade}
                      {mov.motivo ? ` · ${mov.motivo}` : ''}
                    </Text>
                    {mov.animalNome && (
                      <Text style={styles.movAnimal}>Animal: {mov.animalNome}</Text>
                    )}
                    {mov.observacao && (
                      <Text style={styles.movObs}>{mov.observacao}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* FAB: Novo Medicamento */}
          {tab !== 'Histórico' && (
            <TouchableOpacity
              testID="btn-adicionar-item-estoque"
              style={[styles.fab, { bottom: 24 + insets.bottom }]}
              onPress={() => { setNovoTipo(tab === 'Vacinas' ? 'Vacina' : 'Vermifugo'); setModalNovo(true); }}
            >
              <Ionicons name="add" size={26} color="#fff" />
              <Text style={styles.fabTexto}>Novo</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Modal: Novo Medicamento ─────────────────────────────────────────── */}
      <Modal visible={modalNovo} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>Novo Medicamento</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput testID="input-nome-medicamento" style={styles.input} value={novoNome} onChangeText={setNovoNome} placeholder="Ex: Brucelose B19" placeholderTextColor="#aaa" />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chips}>
              {TIPOS.map(t => (
                <TouchableOpacity key={t} testID={`chip-tipo-estoque-${t.toLowerCase()}`} style={[styles.chip, novoTipo === t && styles.chipAtivo]} onPress={() => setNovoTipo(t)}>
                  <Text style={[styles.chipTexto, novoTipo === t && styles.chipTextoAtivo]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Unidade</Text>
            <View style={styles.chips}>
              {UNIDADES.map(u => (
                <TouchableOpacity key={u} testID={`chip-unidade-${u}`} style={[styles.chip, novaUnidade === u && styles.chipAtivo]} onPress={() => setNovaUnidade(u)}>
                  <Text style={[styles.chipTexto, novaUnidade === u && styles.chipTextoAtivo]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantidade inicial</Text>
            <TextInput testID="input-qtd-inicial" style={styles.input} value={novaQtdInicial} onChangeText={setNovaQtdInicial} placeholder="0" placeholderTextColor="#aaa" keyboardType="decimal-pad" />

            <Text style={styles.label}>Quantidade mínima (alerta)</Text>
            <TextInput testID="input-qtd-minima" style={styles.input} value={novaQtdMinima} onChangeText={setNovaQtdMinima} placeholder="Ex: 5" placeholderTextColor="#aaa" keyboardType="decimal-pad" />

            <Text style={styles.label}>Valor unitário (R$)</Text>
            <TextInput testID="input-valor-unitario" style={styles.input} value={novoValorUnit} onChangeText={setNovoValorUnit} placeholder="Ex: 12,50" placeholderTextColor="#aaa" keyboardType="decimal-pad" />

            <Text style={styles.label}>Observação</Text>
            <TextInput style={styles.input} value={novaObs} onChangeText={setNovaObs} placeholder="Opcional" placeholderTextColor="#aaa" />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalNovo(false)} disabled={salvando}>
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="btn-salvar-item-estoque" style={styles.botaoSalvar} onPress={salvarNovo} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal: Entrada ──────────────────────────────────────────────────── */}
      <Modal visible={modalEntrada} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Registrar Entrada</Text>
              {entradaItem && (
                <Text style={styles.modalSubtitulo}>{entradaItem.nome} · atual: {entradaItem.quantidadeAtual} {entradaItem.unidade}</Text>
              )}

              <Text style={styles.label}>Quantidade *</Text>
              <TextInput style={styles.input} value={entradaQtd} onChangeText={setEntradaQtd} placeholder="Ex: 10" placeholderTextColor="#aaa" keyboardType="decimal-pad" autoFocus />

              <Text style={styles.label}>Motivo</Text>
              <View style={styles.chips}>
                {MOTIVOS_ENTRADA.map(m => (
                  <TouchableOpacity key={m} style={[styles.chip, entradaMotivo === m && styles.chipAtivo]} onPress={() => setEntradaMotivo(m)}>
                    <Text style={[styles.chipTexto, entradaMotivo === m && styles.chipTextoAtivo]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Data</Text>
              <TextInput style={styles.input} value={entradaData} onChangeText={v => setEntradaData(formatarDataBrasileira(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#aaa" keyboardType="number-pad" maxLength={10} />

              <Text style={styles.label}>Observação</Text>
              <TextInput style={styles.input} value={entradaObs} onChangeText={setEntradaObs} placeholder="Opcional" placeholderTextColor="#aaa" />

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalEntrada(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoSalvar, { backgroundColor: COR_OK }]} onPress={salvarEntrada} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botaoSalvarTexto}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Saída ────────────────────────────────────────────────────── */}
      <Modal visible={modalSaida} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Registrar Saída</Text>
              {saidaItem && (
                <Text style={styles.modalSubtitulo}>{saidaItem.nome} · atual: {saidaItem.quantidadeAtual} {saidaItem.unidade}</Text>
              )}

              <Text style={styles.label}>Quantidade *</Text>
              <TextInput style={styles.input} value={saidaQtd} onChangeText={setSaidaQtd} placeholder="Ex: 2" placeholderTextColor="#aaa" keyboardType="decimal-pad" autoFocus />

              <Text style={styles.label}>Motivo</Text>
              <View style={styles.chips}>
                {MOTIVOS_SAIDA.map(m => (
                  <TouchableOpacity key={m} style={[styles.chip, saidaMotivo === m && styles.chipAtivo]} onPress={() => setSaidaMotivo(m)}>
                    <Text style={[styles.chipTexto, saidaMotivo === m && styles.chipTextoAtivo]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Data</Text>
              <TextInput style={styles.input} value={saidaData} onChangeText={v => setSaidaData(formatarDataBrasileira(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#aaa" keyboardType="number-pad" maxLength={10} />

              <Text style={styles.label}>Observação</Text>
              <TextInput style={styles.input} value={saidaObs} onChangeText={setSaidaObs} placeholder="Opcional" placeholderTextColor="#aaa" />

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalSaida(false)} disabled={salvando}>
                  <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoSalvar, { backgroundColor: COR_ZERO }]} onPress={salvarSaida} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botaoSalvarTexto}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f0f4f0' },
  cabecalho: { backgroundColor: PRIMARY, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  cabecalhoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800', flex: 1 },
  alertaBadge: { backgroundColor: COR_BAIXO, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  alertaBadgeTexto: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e8e4',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemAtivo: { borderBottomColor: PRIMARY },
  tabTexto: { color: '#88938c', fontSize: 13, fontWeight: '700' },
  tabTextoAtivo: { color: PRIMARY },
  lista: { flex: 1, backgroundColor: '#f0f4f0' },
  listaContent: { padding: 16, gap: 10 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazio: { alignItems: 'center', marginTop: 60, gap: 8 },
  vazioTexto: { color: '#66746d', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  vazioSub: { color: '#88938c', fontSize: 13 },
  // Item de estoque
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  itemTopo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  itemNomeRow: { flexDirection: 'row', alignItems: 'center' },
  itemNome: { color: '#1a3d1f', fontSize: 15, fontWeight: '800' },
  itemQtd: { color: '#555', fontSize: 13, marginTop: 3 },
  itemMinimo: { color: '#88938c', fontSize: 12 },
  itemValor: { color: '#88938c', fontSize: 12, marginTop: 6 },
  itemAcoes: { flexDirection: 'row', gap: 8 },
  btnEntrada: {
    backgroundColor: COR_OK,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaida: {
    backgroundColor: COR_ZERO,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barraFundo: {
    height: 6,
    backgroundColor: '#e8f0ea',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 2,
  },
  barraPreenchimento: { borderRadius: 3 },
  // Movimentações
  movCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 1,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  movTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  movBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  movBadgeEntrada: { backgroundColor: COR_OK },
  movBadgeSaida: { backgroundColor: COR_ZERO },
  movBadgeTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  movData: { color: '#88938c', fontSize: 12, fontWeight: '700' },
  movNome: { color: '#1a3d1f', fontSize: 14, fontWeight: '700' },
  movQtd: { color: '#555', fontSize: 13, marginTop: 2 },
  movAnimal: { color: '#66746d', fontSize: 12, marginTop: 2 },
  movObs: { color: '#88938c', fontSize: 12, marginTop: 2 },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: PRIMARY,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabTexto: { color: '#fff', fontSize: 14, fontWeight: '800' },
  // Modais
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalCaixa: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  modalContent: { padding: 20, paddingBottom: 34 },
  modalTitulo: { color: PRIMARY, fontSize: 19, fontWeight: '800', marginBottom: 4 },
  modalSubtitulo: { color: '#66746d', fontSize: 13, marginBottom: 8 },
  label: { color: '#333', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f7f9f7',
    borderColor: '#d6ded8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#26342b',
    fontSize: 15,
    padding: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: '#ccd6cf', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
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
  botaoSalvar: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    flex: 1,
    padding: 14,
  },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
});
