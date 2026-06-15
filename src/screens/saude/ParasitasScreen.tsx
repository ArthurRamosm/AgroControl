import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { gerarPdfParasitas } from '../../utils/pdf/pdfParasitas';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// Registros novos (IMA) são armazenados em despesa_detalhe com descricao em JSON
// Registros de Vermifugação existentes ficam em evento_local com dados_json
interface RegistroEvento {
  id: string;         // prefixado: "ima_123" | "ficha_456"
  origem: 'IMA' | 'Ficha';
  nome_animal: string;
  produto: string;
  data_aplicacao: string; // DD/MM/AAAA ou ISO
  carencia: string;       // ex: "15 dias" ou "Não tem"
  observacoes: string;
  rawId: number;
}

interface DespesaRow {
  id: number;
  data_compra: string;
  descricao: string;
  categoria_ima: string;
}

interface EventoRow {
  id: number;
  dados_json: string;
}

const EMPTY_FORM = {
  nome_animal: '',
  produto: '',
  data_aplicacao: '',
  carencia: '',
  observacoes: '',
};

// Converte DD/MM/AAAA ou YYYY-MM-DD para Date
function parseDate(str: string): Date | null {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.substring(0, 10));
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return null;
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function formatDateBr(str: string): string {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}

function carenciaStatus(dataAplicacao: string, carencia: string): 'em_carencia' | 'liberado' | 'sem_carencia' {
  if (!carencia || carencia.toLowerCase().includes('não') || carencia === '0') return 'sem_carencia';
  const match = carencia.match(/(\d+)/);
  if (!match) return 'sem_carencia';
  const dias = parseInt(match[1]);
  const data = parseDate(dataAplicacao);
  if (!data) return 'sem_carencia';
  const fim = new Date(data);
  fim.setDate(fim.getDate() + dias);
  return new Date() <= fim ? 'em_carencia' : 'liberado';
}

function monthPrefix(month: number, year: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function dataBrToISO(br: string): string {
  const [d, m, y] = br.split('/');
  if (!d || !m || !y) return br;
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

export default function ParasitasScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [pdfMonth, setPdfMonth] = useState(today.getMonth() + 1);
  const [pdfYear, setPdfYear] = useState(today.getFullYear());

  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [records, setRecords] = useState<RegistroEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadRecords = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const prefix = monthPrefix(filterMonth, filterYear);
      const resultado: RegistroEvento[] = [];

      // ── Registros IMA (despesa_detalhe, categoria_ima='sanidade') ──────────
      const despesas = db.getAllSync<DespesaRow>(
        `SELECT id, data_compra, descricao, categoria_ima FROM despesa_detalhe
         WHERE categoria_ima='sanidade' AND data_compra LIKE ?
         ORDER BY data_compra DESC`,
        [`${prefix}%`]
      );
      for (const row of despesas) {
        try {
          const parsed = JSON.parse(row.descricao);
          if (parsed.__tipo === 'parasita') {
            resultado.push({
              id: `ima_${row.id}`,
              origem: 'IMA',
              nome_animal: parsed.animal ?? '',
              produto: parsed.produto ?? '',
              data_aplicacao: formatDateBr(row.data_compra),
              carencia: parsed.carencia ?? '',
              observacoes: parsed.obs ?? '',
              rawId: row.id,
            });
          }
        } catch { /* ignora entradas que não são JSON de parasitas */ }
      }

      // ── Registros de Ficha (evento_local, tipoRegistro='Vermifugacao') ──────
      const eventos = db.getAllSync<EventoRow>(
        `SELECT id, dados_json FROM evento_local`
      );
      for (const row of eventos) {
        try {
          const d = JSON.parse(row.dados_json);
          if (d.tipoRegistro !== 'Vermifugacao') continue;
          // filtro por mês/ano
          const dataISO: string = d.dataRegistro ?? '';
          if (!dataISO.startsWith(prefix)) continue;
          resultado.push({
            id: `ficha_${row.id}`,
            origem: 'Ficha',
            nome_animal: d.nomeAnimal ?? d.animalNome ?? `Animal #${d.animalId ?? ''}`,
            produto: d.produtoUtilizado ?? '',
            data_aplicacao: formatDateBr(dataISO),
            carencia: d.proximaAplicacao ? `Próxima: ${formatDateBr(d.proximaAplicacao)}` : 'Não tem',
            observacoes: d.observacao ?? '',
            rawId: row.id,
          });
        } catch { /* ignora linhas inválidas */ }
      }

      // ordena por data desc
      resultado.sort((a, b) => {
        const da = parseDate(a.data_aplicacao);
        const db2 = parseDate(b.data_aplicacao);
        if (!da || !db2) return 0;
        return db2.getTime() - da.getTime();
      });

      setRecords(resultado);
    } catch (e) {
      console.error('Erro ao carregar parasitas:', e);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }

  function openEdit(item: RegistroEvento) {
    if (item.origem !== 'IMA') {
      Alert.alert('Aviso', 'Registros da Ficha Animal só podem ser editados na tela do animal.');
      return;
    }
    setEditingId(item.rawId);
    setForm({
      nome_animal: item.nome_animal,
      produto: item.produto,
      data_aplicacao: item.data_aplicacao,
      carencia: item.carencia,
      observacoes: item.observacoes,
    });
    setModalVisible(true);
  }

  function confirmDelete(item: RegistroEvento) {
    if (item.origem !== 'IMA') {
      Alert.alert('Aviso', 'Registros da Ficha Animal não podem ser excluídos aqui.');
      return;
    }
    Alert.alert('Excluir registro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          if (!db) return;
          try {
            db.runSync(`DELETE FROM despesa_detalhe WHERE id=?`, [item.rawId]);
            loadRecords();
          } catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
        },
      },
    ]);
  }

  async function handleSave() {
    if (!db) return;
    if (!form.nome_animal.trim() || !form.data_aplicacao.trim() || !form.produto.trim()) {
      Alert.alert('Atenção', 'Animal, produto e data são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const isoDate = dataBrToISO(form.data_aplicacao);
      const descricaoJson = JSON.stringify({
        __tipo: 'parasita',
        animal: form.nome_animal.trim(),
        produto: form.produto.trim(),
        carencia: form.carencia.trim(),
        obs: form.observacoes.trim(),
      });
      if (editingId) {
        db.runSync(
          `UPDATE despesa_detalhe SET data_compra=?,descricao=?,sync_status='pending' WHERE id=?`,
          [isoDate, descricaoJson, editingId]
        );
      } else {
        db.runSync(
          `INSERT INTO despesa_detalhe (propriedade_id,data_compra,descricao,categoria_ima)
           VALUES (1,?,?,'sanidade')`,
          [isoDate, descricaoJson]
        );
      }
      setModalVisible(false);
      await loadRecords();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally { setSaving(false); }
  }

  // Estatísticas
  const totalAplicacoes = records.length;
  const mesAtualPrefix = monthPrefix(today.getMonth(), today.getFullYear());
  const aplicacoesMes = records.filter(r => {
    const d = parseDate(r.data_aplicacao);
    if (!d) return false;
    const p = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return p === mesAtualPrefix;
  }).length;
  const emCarencia = records.filter(r => carenciaStatus(r.data_aplicacao, r.carencia) === 'em_carencia').length;
  const produtoCount: Record<string, number> = {};
  records.forEach(r => { if (r.produto) produtoCount[r.produto] = (produtoCount[r.produto] || 0) + 1; });
  const produtoMaisUsado = Object.entries(produtoCount).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };

  const handleGerarPdf = async () => {
    try {
      await gerarPdfParasitas(pdfMonth, pdfYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  function renderItem({ item }: { item: RegistroEvento }) {
    const st = carenciaStatus(item.data_aplicacao, item.carencia);
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.85}>
        <View style={styles.cardMain}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardNome}>{item.nome_animal || 'Animal não informado'}</Text>
              <View style={[
                styles.origemBadge,
                item.origem === 'IMA' ? styles.origemIMA : styles.origemFicha,
              ]}>
                <Text style={styles.origemText}>{item.origem}</Text>
              </View>
            </View>
            <Text style={styles.cardProduto}>{item.produto || 'Produto não informado'}</Text>
            <Text style={styles.cardDate}>{item.data_aplicacao}</Text>
            <View style={styles.cardTags}>
              {item.carencia ? (
                <View style={[
                  styles.tag,
                  st === 'em_carencia' && styles.tagRed,
                  st === 'liberado' && styles.tagGreen,
                ]}>
                  <Text style={[
                    styles.tagText,
                    st === 'em_carencia' && { color: '#c0392b' },
                    st === 'liberado' && { color: '#27ae60' },
                  ]}>
                    {st === 'em_carencia' ? 'Em carência' : st === 'liberado' ? 'Liberado' : item.carencia}
                  </Text>
                </View>
              ) : null}
            </View>
            {!!item.observacoes && (
              <Text style={styles.cardObs} numberOfLines={1}>{item.observacoes}</Text>
            )}
          </View>
          {item.origem === 'IMA' && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Controle de Parasitas</Text>
          <Text style={styles.headerSub}>PL 03/07 — Endo e Ectoparasitas</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalAplicacoes}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, emCarencia > 0 && { color: '#e74c3c' }]}>{emCarencia}</Text>
          <Text style={styles.statLabel}>Em carência</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{aplicacoesMes}</Text>
          <Text style={styles.statLabel}>Este mês</Text>
        </View>
        <View style={[styles.statCard, { flex: 1.4 }]}>
          <Text style={[styles.statValue, { fontSize: 11 }]} numberOfLines={1}>{produtoMaisUsado}</Text>
          <Text style={styles.statLabel}>Produto frequente</Text>
        </View>
      </View>

      {/* Filtro mês/ano */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MESES[filterMonth]} / {filterYear}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bug-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma aplicação em {MESES[filterMonth]}</Text>
          <Text style={styles.emptySubText}>Toque em "Nova" para registrar</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.pdfSection}>
              <View style={styles.monthYearSelector}>
                <TouchableOpacity onPress={() => {
                  if (pdfMonth === 1) { setPdfMonth(12); setPdfYear(y => y - 1); }
                  else { setPdfMonth(m => m - 1); }
                }}>
                  <Ionicons name="chevron-back" size={22} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.monthYearLabel}>
                  {MESES[pdfMonth - 1]} {pdfYear}
                </Text>
                <TouchableOpacity onPress={() => {
                  if (pdfMonth === 12) { setPdfMonth(1); setPdfYear(y => y + 1); }
                  else { setPdfMonth(m => m + 1); }
                }}>
                  <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.pdfBtn} onPress={handleGerarPdf}>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal de formulário */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Aplicação' : 'Nova Aplicação'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nome do animal *</Text>
              <TextInput style={styles.input} value={form.nome_animal}
                onChangeText={v => setForm(f => ({ ...f, nome_animal: v }))}
                placeholder="Nome ou número do animal" placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Produto utilizado *</Text>
              <TextInput style={styles.input} value={form.produto}
                onChangeText={v => setForm(f => ({ ...f, produto: v }))}
                placeholder="ex: Ivermectina, Deltametrina" placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Data da aplicação *</Text>
              <TextInput style={styles.input} value={form.data_aplicacao}
                onChangeText={v => setForm(f => ({ ...f, data_aplicacao: v }))}
                placeholder="DD/MM/AAAA" placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Período de carência</Text>
              <TextInput style={styles.input} value={form.carencia}
                onChangeText={v => setForm(f => ({ ...f, carencia: v }))}
                placeholder='ex: "15 dias" ou "Não tem"' placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.observacoes}
                onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
                placeholder="Dose, lote, notas..."
                placeholderTextColor="#bbb"
                multiline numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', padding: 10, gap: 6 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 10, alignItems: 'center', elevation: 1,
  },
  statValue: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 24,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: PRIMARY, minWidth: 160, textAlign: 'center' },
  list: { padding: 14, gap: 10 },
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, elevation: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardNome: { fontSize: 15, fontWeight: '700', color: PRIMARY, flex: 1 },
  origemBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  origemIMA: { backgroundColor: '#e8f0fe' },
  origemFicha: { backgroundColor: '#f3e5f5' },
  origemText: { fontSize: 10, fontWeight: '700', color: '#555' },
  cardProduto: { fontSize: 13, color: '#555', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  cardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  tag: { backgroundColor: '#f0f4f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagRed: { backgroundColor: '#fdecea' },
  tagGreen: { backgroundColor: '#e8f5e9' },
  tagText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  cardObs: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptySubText: { fontSize: 13, color: '#bbb' },
  pdfSection: { marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
  monthYearSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginBottom: 10,
  },
  monthYearLabel: { fontSize: 15, fontWeight: '700', color: PRIMARY, minWidth: 170, textAlign: 'center' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a5c24', borderRadius: 12,
    paddingVertical: 13, marginBottom: 8,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: PRIMARY },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 10, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#222', backgroundColor: '#fafafa',
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
