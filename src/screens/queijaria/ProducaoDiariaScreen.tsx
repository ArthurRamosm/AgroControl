import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

interface ProducaoDia {
  id?: number;
  data: string;
  leite_manha_litros: string;
  leite_tarde_litros: string;
  queijo_manha_pecas: string;
  queijo_tarde_pecas: string;
  lote_manha: string;
  lote_tarde: string;
  observacoes: string;
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

function toISO(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function ProducaoDiariaScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [monthData, setMonthData] = useState<Record<string, ProducaoDia>>({});

  const [form, setForm] = useState<ProducaoDia>({
    data: toISO(today),
    leite_manha_litros: '',
    leite_tarde_litros: '',
    queijo_manha_pecas: '',
    queijo_tarde_pecas: '',
    lote_manha: '',
    lote_tarde: '',
    observacoes: '',
  });

  // Carrega todos os registros do mês
  const loadMonth = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-31`;
      const rows = db.getAllSync<ProducaoDia>(
        `SELECT * FROM pl_producao_mp WHERE data >= ? AND data <= ? ORDER BY data ASC`,
        [startDate, endDate]
      );
      const map: Record<string, ProducaoDia> = {};
      rows.forEach(r => { map[r.data] = r; });
      setMonthData(map);
    } catch (e) {
      console.error('Erro ao carregar produção:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Carrega o dia selecionado no formulário
  useEffect(() => {
    const iso = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const existing = monthData[iso];
    if (existing) {
      setForm({
        ...existing,
        leite_manha_litros: String(existing.leite_manha_litros ?? ''),
        leite_tarde_litros: String(existing.leite_tarde_litros ?? ''),
        queijo_manha_pecas: String(existing.queijo_manha_pecas ?? ''),
        queijo_tarde_pecas: String(existing.queijo_tarde_pecas ?? ''),
      });
    } else {
      setForm({
        data: iso,
        leite_manha_litros: '',
        leite_tarde_litros: '',
        queijo_manha_pecas: '',
        queijo_tarde_pecas: '',
        lote_manha: '',
        lote_tarde: '',
        observacoes: '',
      });
    }
  }, [selectedDay, selectedMonth, selectedYear, monthData]);

  const totalLeiteManha = Object.values(monthData).reduce((s, r) => s + (parseFloat(String(r.leite_manha_litros)) || 0), 0);
  const totalLeiteTarde = Object.values(monthData).reduce((s, r) => s + (parseFloat(String(r.leite_tarde_litros)) || 0), 0);
  const totalQueijo = Object.values(monthData).reduce((s, r) => s + (parseInt(String(r.queijo_manha_pecas)) || 0) + (parseInt(String(r.queijo_tarde_pecas)) || 0), 0);

  async function handleSave() {
    const iso = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setSaving(true);
    try {
      const existing = monthData[iso];
      if (db) {
        if (existing?.id) {
          db.runSync(
            `UPDATE pl_producao_mp SET
              leite_manha_litros=?, leite_tarde_litros=?,
              queijo_manha_pecas=?, queijo_tarde_pecas=?,
              lote_manha=?, lote_tarde=?, observacoes=?,
              sync_status='pending', updated_at=datetime('now')
            WHERE id=?`,
            [
              parseFloat(form.leite_manha_litros) || 0,
              parseFloat(form.leite_tarde_litros) || 0,
              parseInt(form.queijo_manha_pecas) || 0,
              parseInt(form.queijo_tarde_pecas) || 0,
              form.lote_manha, form.lote_tarde, form.observacoes,
              existing.id,
            ]
          );
        } else {
          db.runSync(
            `INSERT INTO pl_producao_mp
              (propriedade_id, data, leite_manha_litros, leite_tarde_litros,
               queijo_manha_pecas, queijo_tarde_pecas, lote_manha, lote_tarde, observacoes)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              iso,
              parseFloat(form.leite_manha_litros) || 0,
              parseFloat(form.leite_tarde_litros) || 0,
              parseInt(form.queijo_manha_pecas) || 0,
              parseInt(form.queijo_tarde_pecas) || 0,
              form.lote_manha, form.lote_tarde, form.observacoes,
            ]
          );
        }
        await loadMonth();
      }
      setSavedMsg('Salvo com sucesso');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const selectedISO = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const hasData = (day: number) => {
    const iso = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return !!monthData[iso];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header */}
      <View style={styles.header} testID="header-producao-diaria">
        <TouchableOpacity testID="btn-voltar" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Produção Diária</Text>
          <Text style={styles.headerSub}>PL 01/04 — Matéria Prima</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Seletor mês/ano */}
        <View style={styles.monthSelector}>
          <TouchableOpacity testID="btn-mes-anterior" onPress={() => {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
            else setSelectedMonth(m => m - 1);
          }}>
            <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MESES[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity testID="btn-mes-proximo" onPress={() => {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
            else setSelectedMonth(m => m + 1);
          }}>
            <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Totais do mês */}
        <View style={styles.totaisRow}>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{(totalLeiteManha + totalLeiteTarde).toFixed(0)}L</Text>
            <Text style={styles.totalLabel}>Leite total</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{totalLeiteManha.toFixed(0)}L</Text>
            <Text style={styles.totalLabel}>Manhã</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{totalLeiteTarde.toFixed(0)}L</Text>
            <Text style={styles.totalLabel}>Tarde</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{totalQueijo}</Text>
            <Text style={styles.totalLabel}>Queijos</Text>
          </View>
        </View>

        {/* Grade de dias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o dia</Text>
          <View style={styles.daysGrid}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isSelected = day === selectedDay;
              const filled = hasData(day);
              return (
                <TouchableOpacity
                  key={day}
                  accessibilityRole="button"
                  style={[
                    styles.dayBtn,
                    filled && styles.dayBtnFilled,
                    isSelected && styles.dayBtnSelected,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.dayText,
                    filled && styles.dayTextFilled,
                    isSelected && styles.dayTextSelected,
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Formulário do dia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Dia {selectedDay} — {formatDisplay(selectedISO)}
          </Text>

          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Leite */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  <Ionicons name="water-outline" size={15} color={ACCENT} /> Leite (litros)
                </Text>
                <View style={styles.row2}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Manhã</Text>
                    <TextInput
                      style={styles.input}
                      value={form.leite_manha_litros}
                      onChangeText={v => setForm(f => ({ ...f, leite_manha_litros: v }))}
                      keyboardType="numeric"
                      placeholder="Leite Manhã"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Tarde</Text>
                    <TextInput
                      style={styles.input}
                      value={form.leite_tarde_litros}
                      onChangeText={v => setForm(f => ({ ...f, leite_tarde_litros: v }))}
                      keyboardType="numeric"
                      placeholder="Leite Tarde"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
                {(form.leite_manha_litros || form.leite_tarde_litros) ? (
                  <Text style={styles.subtotal}>
                    Total do dia: {((parseFloat(form.leite_manha_litros) || 0) + (parseFloat(form.leite_tarde_litros) || 0)).toFixed(1)}L
                  </Text>
                ) : null}
              </View>

              {/* Queijo */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  <Ionicons name="cube-outline" size={15} color={ACCENT} /> Queijo (peças)
                </Text>
                <View style={styles.row2}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Manhã</Text>
                    <TextInput
                      style={styles.input}
                      value={form.queijo_manha_pecas}
                      onChangeText={v => setForm(f => ({ ...f, queijo_manha_pecas: v }))}
                      keyboardType="numeric"
                      placeholder="Queijo Manhã"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Tarde</Text>
                    <TextInput
                      style={styles.input}
                      value={form.queijo_tarde_pecas}
                      onChangeText={v => setForm(f => ({ ...f, queijo_tarde_pecas: v }))}
                      keyboardType="numeric"
                      placeholder="Queijo Tarde"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
              </View>

              {/* Lotes */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  <Ionicons name="barcode-outline" size={15} color={ACCENT} /> Lotes
                </Text>
                <View style={styles.row2}>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Lote Manhã</Text>
                    <TextInput
                      style={styles.input}
                      value={form.lote_manha}
                      onChangeText={v => setForm(f => ({ ...f, lote_manha: v }))}
                      placeholder="Lote Manhã"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.fieldLabel}>Lote Tarde</Text>
                    <TextInput
                      style={styles.input}
                      value={form.lote_tarde}
                      onChangeText={v => setForm(f => ({ ...f, lote_tarde: v }))}
                      placeholder="Lote Tarde"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
              </View>

              {/* Observações */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={form.observacoes}
                  onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
                  placeholder="Observações do dia..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {savedMsg ? <Text style={{ color: '#27ae60', textAlign: 'center', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>{savedMsg}</Text> : null}
              {/* Botão salvar */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Salvar Dia {selectedDay}</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => Alert.alert('PDF', 'Gerar relatório PDF em breve')}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 20,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthLabel: { fontSize: 16, fontWeight: '600', color: PRIMARY, minWidth: 160, textAlign: 'center' },
  totaisRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  totalCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    elevation: 1,
  },
  totalValue: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  totalLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  section: { paddingHorizontal: 14, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayBtn: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eee',
  },
  dayBtnFilled: { backgroundColor: ACCENT + '22' },
  dayBtnSelected: { backgroundColor: PRIMARY },
  dayText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayTextFilled: { color: ACCENT },
  dayTextSelected: { color: '#fff' },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 10 },
  row2: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#fafafa',
  },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  subtotal: { fontSize: 12, color: ACCENT, fontWeight: '600', marginTop: 6, textAlign: 'right' },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pdfBtn: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 10,
    gap: 8,
  },
  pdfBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
