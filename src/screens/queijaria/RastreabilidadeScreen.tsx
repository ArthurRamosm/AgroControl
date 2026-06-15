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
import { gerarPdfRastreabilidade } from '../../utils/pdf/pdfRastreabilidade';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

interface Rastreabilidade {
  id: number;
  data_venda: string;
  quantidade_kg: number;
  lote: string;
  comprador: string;
  endereco_comprador: string;
  observacoes: string;
}

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const EMPTY_FORM = {
  data_venda: '',
  quantidade_kg: '',
  lote: '',
  comprador: '',
  endereco_comprador: '',
  observacoes: '',
};

export default function RastreabilidadeScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();
  const [records, setRecords] = useState<Rastreabilidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pdfMonth, setPdfMonth] = useState(today.getMonth() + 1);
  const [pdfYear, setPdfYear] = useState(today.getFullYear());

  const loadRecords = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<Rastreabilidade>(
        `SELECT * FROM pl_rastreabilidade ORDER BY data_venda DESC`
      );
      setRecords(rows);
    } catch (e) {
      console.error('Erro ao carregar rastreabilidade:', e);
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

  function openEdit(item: Rastreabilidade) {
    setEditingId(item.id);
    setForm({
      data_venda: item.data_venda ?? '',
      quantidade_kg: item.quantidade_kg != null ? String(item.quantidade_kg) : '',
      lote: item.lote ?? '',
      comprador: item.comprador ?? '',
      endereco_comprador: item.endereco_comprador ?? '',
      observacoes: item.observacoes ?? '',
    });
    setModalVisible(true);
  }

  function confirmDelete(id: number) {
    Alert.alert(
      'Excluir registro',
      'Tem certeza que deseja excluir este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: () => {
            if (!db) return;
            try {
              db.runSync(`DELETE FROM pl_rastreabilidade WHERE id=?`, [id]);
              loadRecords();
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!db) return;
    if (!form.data_venda.trim() || !form.quantidade_kg.trim() || !form.lote.trim()) {
      Alert.alert('Atenção', 'Data da venda, quantidade e lote são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const qty = parseFloat(form.quantidade_kg.replace(',', '.')) || 0;
      if (editingId) {
        db.runSync(
          `UPDATE pl_rastreabilidade SET
            data_venda=?, quantidade_kg=?, lote=?,
            comprador=?, endereco_comprador=?, observacoes=?,
            sync_status='pending'
          WHERE id=?`,
          [form.data_venda, qty, form.lote, form.comprador, form.endereco_comprador, form.observacoes, editingId]
        );
      } else {
        db.runSync(
          `INSERT INTO pl_rastreabilidade
            (propriedade_id, data_venda, quantidade_kg, lote, comprador, endereco_comprador, observacoes)
          VALUES (1,?,?,?,?,?,?)`,
          [form.data_venda, qty, form.lote, form.comprador, form.endereco_comprador, form.observacoes]
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
      await gerarPdfRastreabilidade(pdfMonth, pdfYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  function renderItem({ item }: { item: Rastreabilidade }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.85}>
        <View style={styles.cardMain}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardDate}>{item.data_venda}</Text>
            <Text style={styles.cardComprador} numberOfLines={1}>
              {item.comprador || 'Comprador não informado'}
            </Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}>
                <Ionicons name="scale-outline" size={12} color={PRIMARY} />
                <Text style={styles.tagText}>{item.quantidade_kg} kg</Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="pricetag-outline" size={12} color={PRIMARY} />
                <Text style={styles.tagText}>{item.lote}</Text>
              </View>
            </View>
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

      <View style={styles.header} testID="header-rastreabilidade">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rastreabilidade</Text>
          <Text style={styles.headerSub}>PL 02/04 — Controle por venda</Text>
        </View>
        <TouchableOpacity testID="btn-nova-venda" style={styles.newBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>Nova Venda</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de período para PDF */}
      <View style={styles.pdfSection}>
        <View style={styles.monthYearSelector}>
          <TouchableOpacity onPress={() => {
            if (pdfMonth > 1) setPdfMonth(m => m - 1);
            else { setPdfMonth(12); setPdfYear(y => y - 1); }
          }}>
            <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.monthYearLabel}>{MESES_FULL[pdfMonth - 1]} / {pdfYear}</Text>
          <TouchableOpacity onPress={() => {
            if (pdfMonth < 12) setPdfMonth(m => m + 1);
            else { setPdfMonth(1); setPdfYear(y => y + 1); }
          }}>
            <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.pdfBtn} onPress={handleGerarPdf}>
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma venda registrada</Text>
          <Text style={styles.emptySubText}>Toque em "Nova Venda" para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Formulário inline (substitui Modal para compatibilidade web/Playwright) */}
      {modalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999, elevation: 10 }}>
          <View style={[styles.modalContainer, { width: '100%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Venda' : 'Nova Venda'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Data da venda *</Text>
              <TextInput
                style={styles.input}
                value={form.data_venda}
                onChangeText={v => setForm(f => ({ ...f, data_venda: v }))}
                placeholder="Data (DD/MM/AAAA)"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Quantidade vendida (kg) *</Text>
              <TextInput
                style={styles.input}
                value={form.quantidade_kg}
                onChangeText={v => setForm(f => ({ ...f, quantidade_kg: v }))}
                placeholder="ex: 12.5"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Lote / Data de produção *</Text>
              <TextInput
                style={styles.input}
                value={form.lote}
                onChangeText={v => setForm(f => ({ ...f, lote: v }))}
                placeholder="ex: L2025-06-01"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Comprador</Text>
              <TextInput
                style={styles.input}
                value={form.comprador}
                onChangeText={v => setForm(f => ({ ...f, comprador: v }))}
                placeholder="Nome do comprador"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Endereço do comprador</Text>
              <TextInput
                style={styles.input}
                value={form.endereco_comprador}
                onChangeText={v => setForm(f => ({ ...f, endereco_comprador: v }))}
                placeholder="Rua, cidade, estado..."
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.observacoes}
                onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
                placeholder="Informações adicionais..."
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  list: { padding: 14, gap: 10 },
  card: {
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, elevation: 1,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardDate: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardComprador: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 6 },
  cardTags: { flexDirection: 'row', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0f4f0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  deleteBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptySubText: { fontSize: 13, color: '#bbb' },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    paddingVertical: 15, alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pdfSection: {
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 10,
  },
  monthYearLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
    minWidth: 170,
    textAlign: 'center',
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a5c24',
    borderRadius: 12,
    paddingVertical: 13,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
