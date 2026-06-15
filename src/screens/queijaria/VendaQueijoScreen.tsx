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
import { gerarPdfVendaQueijo } from '../../utils/pdf/pdfVendaQueijo';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface VendaQueijo {
  id: number;
  data_venda: string;
  cliente: string;
  tipo_queijo: string;
  quantidade_unid: number;
  peso_total_kg: number;
  peso_por_queijo_kg: number;
  preco_unit_kg: number;
  total_rs: number;
}

const EMPTY_FORM = {
  data_venda: '',
  cliente: '',
  tipo_queijo: '',
  quantidade_unid: '',
  peso_total_kg: '',
  peso_por_queijo_kg: '',
  preco_unit_kg: '',
  total_rs: '',
};

function n(v: string) { return parseFloat(v.replace(',', '.')) || 0; }
function fmt2(v: number) { return v.toFixed(2); }

export default function VendaQueijoScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [records, setRecords] = useState<VendaQueijo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadRecords = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const prefix = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;
      const rows = db.getAllSync<VendaQueijo>(
        `SELECT * FROM venda_queijo WHERE data_venda LIKE ? ORDER BY data_venda DESC`,
        [`${prefix}%`]
      );
      setRecords(rows);
    } catch (e) {
      console.error('Erro ao carregar vendas de queijo:', e);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Recalcula campos derivados ao digitar quantidade ou peso
  function setF(key: keyof typeof EMPTY_FORM, val: string) {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      const qty = n(key === 'quantidade_unid' ? val : next.quantidade_unid);
      const peso = n(key === 'peso_total_kg' ? val : next.peso_total_kg);
      const preco = n(key === 'preco_unit_kg' ? val : next.preco_unit_kg);

      if (key === 'quantidade_unid' || key === 'peso_total_kg') {
        if (qty > 0 && peso > 0) next.peso_por_queijo_kg = fmt2(peso / qty);
      }
      if (key === 'peso_total_kg' || key === 'preco_unit_kg') {
        next.total_rs = fmt2(peso * preco);
      }
      return next;
    });
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }

  function openEdit(item: VendaQueijo) {
    setEditingId(item.id);
    setForm({
      data_venda: item.data_venda ?? '',
      cliente: item.cliente ?? '',
      tipo_queijo: item.tipo_queijo ?? '',
      quantidade_unid: item.quantidade_unid ? String(item.quantidade_unid) : '',
      peso_total_kg: item.peso_total_kg ? String(item.peso_total_kg) : '',
      peso_por_queijo_kg: item.peso_por_queijo_kg ? fmt2(item.peso_por_queijo_kg) : '',
      preco_unit_kg: item.preco_unit_kg ? String(item.preco_unit_kg) : '',
      total_rs: item.total_rs ? fmt2(item.total_rs) : '',
    });
    setModalVisible(true);
  }

  function confirmDelete(id: number) {
    Alert.alert('Excluir venda', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          if (!db) return;
          try {
            db.runSync(`DELETE FROM venda_queijo WHERE id=?`, [id]);
            loadRecords();
          } catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
        },
      },
    ]);
  }

  async function handleSave() {
    if (!db) return;
    if (!form.data_venda.trim()) {
      Alert.alert('Atenção', 'Data da venda é obrigatória.');
      return;
    }
    setSaving(true);
    try {
      const vals = [
        form.data_venda, form.cliente, form.tipo_queijo,
        Math.round(n(form.quantidade_unid)), n(form.peso_total_kg),
        n(form.peso_por_queijo_kg), n(form.preco_unit_kg), n(form.total_rs),
      ];
      if (editingId) {
        db.runSync(
          `UPDATE venda_queijo SET
            data_venda=?,cliente=?,tipo_queijo=?,
            quantidade_unid=?,peso_total_kg=?,peso_por_queijo_kg=?,
            preco_unit_kg=?,total_rs=?,sync_status='pending'
          WHERE id=?`,
          [...vals, editingId]
        );
      } else {
        db.runSync(
          `INSERT INTO venda_queijo
            (propriedade_id,data_venda,cliente,tipo_queijo,
             quantidade_unid,peso_total_kg,peso_por_queijo_kg,preco_unit_kg,total_rs)
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

  // Totais do período
  const totalPecas = records.reduce((s, r) => s + (r.quantidade_unid || 0), 0);
  const totalKg = records.reduce((s, r) => s + (r.peso_total_kg || 0), 0);
  const totalRs = records.reduce((s, r) => s + (r.total_rs || 0), 0);
  const precoMedio = totalKg > 0 ? totalRs / totalKg : 0;

  const handleGerarPdf = async () => {
    try {
      await gerarPdfVendaQueijo(filterMonth + 1, filterYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };

  function renderItem({ item }: { item: VendaQueijo }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.85}>
        <View style={styles.cardMain}>
          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardDate}>{item.data_venda}</Text>
              {item.tipo_queijo ? (
                <View style={styles.tipoBadge}>
                  <Text style={styles.tipoBadgeText}>{item.tipo_queijo}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardCliente} numberOfLines={1}>
              {item.cliente || 'Cliente não informado'}
            </Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.quantidade_unid} un.</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{(item.peso_total_kg || 0).toFixed(2)} kg</Text>
              </View>
              <View style={[styles.tag, styles.tagGreen]}>
                <Text style={[styles.tagText, { color: '#27ae60' }]}>
                  R$ {(item.total_rs || 0).toFixed(2)}
                </Text>
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

      <View style={styles.header} testID="header-venda-queijo">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Venda de Queijo</Text>
          <Text style={styles.headerSub}>Controle de vendas</Text>
        </View>
        <TouchableOpacity testID="btn-nova-venda-queijo" style={styles.newBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>Nova Venda</Text>
        </TouchableOpacity>
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

      {/* Totais */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPecas}</Text>
          <Text style={styles.statLabel}>peças</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalKg.toFixed(1)}</Text>
          <Text style={styles.statLabel}>kg total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>R${precoMedio.toFixed(2)}</Text>
          <Text style={styles.statLabel}>preço médio/kg</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.statValue, { color: '#27ae60' }]}>R${totalRs.toFixed(2)}</Text>
          <Text style={styles.statLabel}>total recebido</Text>
        </View>
      </View>

      {/* Botão PDF — sempre visível */}
      <TouchableOpacity testID="btn-pdf-venda-queijo" style={styles.pdfBtn} onPress={handleGerarPdf}>
        <Ionicons name="document-text-outline" size={18} color="#fff" />
        <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma venda em {MESES[filterMonth]}</Text>
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
              <TextInput style={styles.input} value={form.data_venda}
                onChangeText={v => setF('data_venda', v)}
                placeholder="Data (DD/MM/AAAA)" placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Cliente</Text>
              <TextInput style={styles.input} value={form.cliente}
                onChangeText={v => setF('cliente', v)}
                placeholder="Nome do cliente" placeholderTextColor="#bbb" />

              <Text style={styles.fieldLabel}>Tipo de queijo</Text>
              <TextInput style={styles.input} value={form.tipo_queijo}
                onChangeText={v => setF('tipo_queijo', v)}
                placeholder="ex: Canastra, Meia Cura" placeholderTextColor="#bbb" />

              <View style={styles.row2}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Quantidade (unid.)</Text>
                  <TextInput style={styles.input} value={form.quantidade_unid}
                    onChangeText={v => setF('quantidade_unid', v)}
                    placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Peso total (kg)</Text>
                  <TextInput style={styles.input} value={form.peso_total_kg}
                    onChangeText={v => setF('peso_total_kg', v)}
                    placeholder="0,00" placeholderTextColor="#bbb" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Peso/queijo (kg/un) — auto</Text>
                  <TextInput style={styles.input} value={form.peso_por_queijo_kg}
                    onChangeText={v => setF('peso_por_queijo_kg', v)}
                    placeholder="0,00" placeholderTextColor="#bbb" keyboardType="numeric" />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Preço (R$/kg)</Text>
                  <TextInput style={styles.input} value={form.preco_unit_kg}
                    onChangeText={v => setF('preco_unit_kg', v)}
                    placeholder="0,00" placeholderTextColor="#bbb" keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Total R$ — auto</Text>
              <TextInput style={[styles.input, { backgroundColor: '#f0f7f0' }]}
                value={form.total_rs}
                onChangeText={v => setF('total_rs', v)}
                placeholder="0,00" placeholderTextColor="#bbb" keyboardType="numeric" />

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
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 24,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: PRIMARY, minWidth: 160, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', padding: 10, gap: 6 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 10, alignItems: 'center', elevation: 1,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' },
  list: { padding: 14, gap: 10 },
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, elevation: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#888' },
  tipoBadge: {
    backgroundColor: '#fff3e0', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tipoBadgeText: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  cardCliente: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 6 },
  cardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#f0f4f0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagGreen: { backgroundColor: '#e8f5e9' },
  tagText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  deleteBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptySubText: { fontSize: 13, color: '#bbb' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a5c24', borderRadius: 12,
    paddingVertical: 13, marginTop: 4, marginBottom: 8,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  row2: { flexDirection: 'row', gap: 10, marginTop: 0 },
  halfField: { flex: 1 },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
