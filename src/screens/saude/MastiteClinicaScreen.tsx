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
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { gerarPdfMastiteClinica } from '../../utils/pdf/pdfMastiteClinica';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

interface MastiteClinica {
  id: number;
  nome_vaca: string;
  data_exame: string;
  diagnostico: string;
  teto_1: string;
  teto_2: string;
  teto_3: string;
  teto_4: string;
  observacoes: string;
}

type Resultado = '+' | '-' | '';

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const EMPTY_FORM = {
  nome_vaca: '',
  data_exame: '',
  diagnostico: '' as Resultado,
  teto_1: '' as Resultado,
  teto_2: '' as Resultado,
  teto_3: '' as Resultado,
  teto_4: '' as Resultado,
  observacoes: '',
};

function PlusMinus({
  label, value, onChange, plusTestID, minusTestID,
}: { label?: string; value: Resultado; onChange: (v: Resultado) => void; plusTestID?: string; minusTestID?: string }) {
  return (
    <View style={styles.pmGroup}>
      {label && <Text style={styles.pmLabel}>{label}</Text>}
      <View style={styles.pmRow}>
        <TouchableOpacity
          testID={plusTestID}
          style={[styles.pmBtn, value === '+' && styles.pmBtnPos]}
          onPress={() => onChange(value === '+' ? '' : '+')}
        >
          <Text style={[styles.pmBtnText, value === '+' && styles.pmBtnTextActive]}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={minusTestID}
          style={[styles.pmBtn, value === '-' && styles.pmBtnNeg]}
          onPress={() => onChange(value === '-' ? '' : '-')}
        >
          <Text style={[styles.pmBtnText, value === '-' && styles.pmBtnTextActive]}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function tetosAfetados(rec: MastiteClinica): string {
  const labels = ['T1','T2','T3','T4'];
  const vals = [rec.teto_1, rec.teto_2, rec.teto_3, rec.teto_4];
  const afetados = labels.filter((_, i) => vals[i] === '+');
  return afetados.length > 0 ? afetados.join(', ') : '—';
}

export default function MastiteClinicaScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [pdfMonth, setPdfMonth] = useState(today.getMonth() + 1);
  const [pdfYear, setPdfYear] = useState(today.getFullYear());

  const [records, setRecords] = useState<MastiteClinica[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadRecords = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<MastiteClinica>(
        `SELECT * FROM mastite_clinica ORDER BY data_exame DESC`
      );
      setRecords(rows);
    } catch (e) {
      console.error('Erro ao carregar mastite clínica:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }

  function openEdit(item: MastiteClinica) {
    setEditingId(item.id);
    setForm({
      nome_vaca: item.nome_vaca ?? '',
      data_exame: item.data_exame ?? '',
      diagnostico: (item.diagnostico ?? '') as Resultado,
      teto_1: (item.teto_1 ?? '') as Resultado,
      teto_2: (item.teto_2 ?? '') as Resultado,
      teto_3: (item.teto_3 ?? '') as Resultado,
      teto_4: (item.teto_4 ?? '') as Resultado,
      observacoes: item.observacoes ?? '',
    });
    setModalVisible(true);
  }

  function confirmDelete(id: number) {
    Alert.alert('Excluir registro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          if (!db) return;
          try {
            db.runSync(`DELETE FROM mastite_clinica WHERE id=?`, [id]);
            loadRecords();
          } catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
        },
      },
    ]);
  }

  async function handleSave() {
    if (!db) return;
    if (!form.nome_vaca.trim() || !form.data_exame.trim()) {
      Alert.alert('Atenção', 'Nome da vaca e data são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const vals = [
        form.nome_vaca, form.data_exame, form.diagnostico,
        form.teto_1, form.teto_2, form.teto_3, form.teto_4, form.observacoes,
      ];
      if (editingId) {
        db.runSync(
          `UPDATE mastite_clinica SET
            nome_vaca=?,data_exame=?,diagnostico=?,
            teto_1=?,teto_2=?,teto_3=?,teto_4=?,
            observacoes=?,sync_status='pending'
          WHERE id=?`,
          [...vals, editingId]
        );
      } else {
        db.runSync(
          `INSERT INTO mastite_clinica
            (propriedade_id,nome_vaca,data_exame,diagnostico,
             teto_1,teto_2,teto_3,teto_4,observacoes)
          VALUES (1,?,?,?,?,?,?,?,?)`,
          vals
        );
      }
      setModalVisible(false);
      await loadRecords();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const handleGerarPdf = async () => {
    try {
      await gerarPdfMastiteClinica(pdfMonth, pdfYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  // Estatísticas
  const totalOcorrencias = records.length;
  const ocorrenciasMes = records.filter(r => r.data_exame && r.data_exame.startsWith(mesAtual)).length;
  const vacasAfetadas = new Set(records.map(r => r.nome_vaca)).size;

  function renderItem({ item }: { item: MastiteClinica }) {
    const pos = item.diagnostico === '+';
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.85}>
        <View style={styles.cardMain}>
          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardNome}>{item.nome_vaca}</Text>
              <View style={[styles.diagBadge, pos ? styles.diagPos : styles.diagNeg]}>
                <Text style={styles.diagBadgeText}>{item.diagnostico || '?'}</Text>
              </View>
            </View>
            <Text style={styles.cardDate}>{item.data_exame}</Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>Tetos: {tetosAfetados(item)}</Text>
              </View>
            </View>
            {!!item.observacoes && (
              <Text style={styles.cardObs} numberOfLines={1}>{item.observacoes}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header} testID="header-mastite-clinica">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mastite Clínica</Text>
          <Text style={styles.headerSub}>PL 01/07 — Controle por ocorrência</Text>
        </View>
        <TouchableOpacity testID="btn-novo-registro-mastite" style={styles.newBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalOcorrencias}</Text>
          <Text style={styles.statLabel}>Total ocorrências</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, ocorrenciasMes > 0 && { color: '#e74c3c' }]}>
            {ocorrenciasMes}
          </Text>
          <Text style={styles.statLabel}>Este mês</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{vacasAfetadas}</Text>
          <Text style={styles.statLabel}>Vacas afetadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff8e1' }]}>
          <Text style={[styles.statValue, { fontSize: 11, color: ACCENT }]}>≤1%/mês</Text>
          <Text style={styles.statLabel}>Nível aceitável</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="medkit-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma ocorrência registrada</Text>
          <Text style={styles.emptySubText}>Toque em "Novo" para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => String(item.id)}
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
                  {MESES_FULL[pdfMonth - 1]} {pdfYear}
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

      {/* Formulário inline (substitui Modal para compatibilidade web/Playwright) */}
      {modalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999, elevation: 10 }}>
          <View style={[styles.modalContainer, { width: '100%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Registro' : 'Novo Registro'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nome da vaca *</Text>
              <TextInput
                style={styles.input}
                value={form.nome_vaca}
                onChangeText={v => setForm(f => ({ ...f, nome_vaca: v }))}
                placeholder="Nome ou número da vaca"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Data do exame *</Text>
              <TextInput
                style={styles.input}
                value={form.data_exame}
                onChangeText={v => setForm(f => ({ ...f, data_exame: v }))}
                placeholder="Data (DD/MM/AAAA)"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <PlusMinus
                plusTestID="btn-add-diagnostico"
                value={form.diagnostico}
                onChange={v => setForm(f => ({ ...f, diagnostico: v }))}
              />

              <Text style={styles.fieldLabel}>Tetos afetados</Text>
              <View style={styles.tetosRow}>
                {(['teto_1','teto_2','teto_3','teto_4'] as const).map((key, i) => (
                  <PlusMinus
                    key={key}
                    label={`T${i + 1}`}
                    value={form[key]}
                    onChange={v => setForm(f => ({ ...f, [key]: v }))}
                    plusTestID={i === 0 ? 'teto-1-btn-mais' : undefined}
                    minusTestID={i === 1 ? 'teto-2-btn-menos' : undefined}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.observacoes}
                onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
                placeholder="Tratamento, evolução, notas..."
                placeholderTextColor="#bbb"
                multiline
                numberOfLines={3}
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  list: { padding: 14, gap: 10 },
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, elevation: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardNome: { fontSize: 15, fontWeight: '700', color: PRIMARY, flex: 1 },
  diagBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  diagPos: { backgroundColor: '#fdecea' },
  diagNeg: { backgroundColor: '#e8f5e9' },
  diagBadgeText: { fontSize: 14, fontWeight: '700', color: '#333' },
  cardDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  cardTags: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tag: {
    backgroundColor: '#f0f4f0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
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
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, zIndex: 999 },
  modalContainer: {
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16, maxHeight: '92%',
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
  pmGroup: { alignItems: 'center' },
  pmLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '600' },
  pmRow: { flexDirection: 'row', gap: 4 },
  pmBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  pmBtnPos: { backgroundColor: '#fdecea', borderColor: '#e74c3c' },
  pmBtnNeg: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  pmBtnText: { fontSize: 18, fontWeight: '700', color: '#aaa' },
  pmBtnTextActive: { color: '#222' },
  tetosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
