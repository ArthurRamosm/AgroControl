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
import { gerarPdfPotabilidade } from '../../utils/pdf/pdfPotabilidade';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

// Limites aceitáveis
const CLORO_MIN = 0.2;
const CLORO_MAX = 2.0;
const PH_MIN = 6.0;
const PH_MAX = 9.5;

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface PotabilidadeDia {
  id?: number;
  data: string;
  teor_cloro: number | null;
  ph: number | null;
  acoes_corretivas: string;
  responsavel: string;
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplay(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function statusCloro(val: number | null): 'ok' | 'alerta' | 'vazio' {
  if (val === null || val === undefined) return 'vazio';
  return val >= CLORO_MIN && val <= CLORO_MAX ? 'ok' : 'alerta';
}

function statusPH(val: number | null): 'ok' | 'alerta' | 'vazio' {
  if (val === null || val === undefined) return 'vazio';
  return val >= PH_MIN && val <= PH_MAX ? 'ok' : 'alerta';
}

export default function PotabilidadeScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthData, setMonthData] = useState<Record<string, PotabilidadeDia>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [form, setForm] = useState({
    teor_cloro: '',
    ph: '',
    acoes_corretivas: '',
    responsavel: '',
  });

  const loadMonth = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const end   = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-31`;
      const rows = db.getAllSync<PotabilidadeDia>(
        `SELECT * FROM pl_potabilidade WHERE data >= ? AND data <= ? ORDER BY data ASC`,
        [start, end]
      );
      const map: Record<string, PotabilidadeDia> = {};
      rows.forEach(r => { map[r.data] = r; });
      setMonthData(map);
    } catch (e) {
      console.error('Erro ao carregar potabilidade:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  useEffect(() => {
    const iso = toISO(selectedYear, selectedMonth, selectedDay);
    const existing = monthData[iso];
    if (existing) {
      setForm({
        teor_cloro: existing.teor_cloro !== null ? String(existing.teor_cloro) : '',
        ph: existing.ph !== null ? String(existing.ph) : '',
        acoes_corretivas: existing.acoes_corretivas ?? '',
        responsavel: existing.responsavel ?? '',
      });
    } else {
      setForm({ teor_cloro: '', ph: '', acoes_corretivas: '', responsavel: '' });
    }
  }, [selectedDay, selectedMonth, selectedYear, monthData]);

  async function handleSave() {
    const iso = toISO(selectedYear, selectedMonth, selectedDay);
    const cloro = form.teor_cloro ? parseFloat(form.teor_cloro) : null;
    const ph    = form.ph ? parseFloat(form.ph) : null;

    setSaving(true);
    try {
      const existing = monthData[iso];
      if (db) {
        if (existing?.id) {
          db.runSync(
            `UPDATE pl_potabilidade SET teor_cloro=?, ph=?, acoes_corretivas=?, responsavel=?, sync_status='pending' WHERE id=?`,
            [cloro, ph, form.acoes_corretivas, form.responsavel, existing.id]
          );
        } else {
          db.runSync(
            `INSERT INTO pl_potabilidade (propriedade_id, data, teor_cloro, ph, acoes_corretivas, responsavel)
             VALUES (1, ?, ?, ?, ?, ?)`,
            [iso, cloro, ph, form.acoes_corretivas, form.responsavel]
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
  const selectedISO = toISO(selectedYear, selectedMonth, selectedDay);

  const handleGerarPdf = async () => {
    try {
      await gerarPdfPotabilidade(selectedMonth + 1, selectedYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  // Estatísticas do mês
  const registros = Object.values(monthData);
  const diasRegistrados = registros.length;
  const alertasCloro = registros.filter(r => statusCloro(r.teor_cloro) === 'alerta').length;
  const alertasPH = registros.filter(r => statusPH(r.ph) === 'alerta').length;
  const mediaCloro = diasRegistrados
    ? (registros.reduce((s, r) => s + (r.teor_cloro ?? 0), 0) / diasRegistrados).toFixed(2)
    : '-';
  const mediaPH = diasRegistrados
    ? (registros.reduce((s, r) => s + (r.ph ?? 0), 0) / diasRegistrados).toFixed(1)
    : '-';

  function getDayColor(day: number) {
    const iso = toISO(selectedYear, selectedMonth, day);
    const r = monthData[iso];
    if (!r) return null;
    if (statusCloro(r.teor_cloro) === 'alerta' || statusPH(r.ph) === 'alerta') return '#e74c3c';
    return '#27ae60';
  }

  const cloroStatus = statusCloro(form.teor_cloro ? parseFloat(form.teor_cloro) : null);
  const phStatus = statusPH(form.ph ? parseFloat(form.ph) : null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header} testID="header-potabilidade">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Potabilidade da Água</Text>
          <Text style={styles.headerSub}>PL 02/01 — Controle diário</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Seletor mês */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
            else setSelectedMonth(m => m - 1);
          }}>
            <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MESES[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={() => {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
            else setSelectedMonth(m => m + 1);
          }}>
            <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{diasRegistrados}</Text>
            <Text style={styles.statLabel}>Dias registrados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mediaCloro}</Text>
            <Text style={styles.statLabel}>Média cloro (ppm)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mediaPH}</Text>
            <Text style={styles.statLabel}>Média pH</Text>
          </View>
          <View style={[styles.statCard, (alertasCloro + alertasPH) > 0 && styles.statCardAlerta]}>
            <Text style={[styles.statValue, (alertasCloro + alertasPH) > 0 && { color: '#e74c3c' }]}>
              {alertasCloro + alertasPH}
            </Text>
            <Text style={styles.statLabel}>Alertas</Text>
          </View>
        </View>

        {/* Legenda */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
            <Text style={styles.legendText}>Dentro dos limites</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
            <Text style={styles.legendText}>Fora dos limites</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ddd' }]} />
            <Text style={styles.legendText}>Sem registro</Text>
          </View>
        </View>

        {/* Gerar PDF */}
        <TouchableOpacity style={styles.pdfBtn} onPress={handleGerarPdf}>
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
        </TouchableOpacity>

        {/* Grade de dias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o dia</Text>
          <View style={styles.daysGrid}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isSelected = day === selectedDay;
              const color = getDayColor(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayBtn,
                    color && { backgroundColor: color + '22', borderColor: color, borderWidth: 1 },
                    isSelected && { backgroundColor: PRIMARY },
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.dayText,
                    color && { color },
                    isSelected && { color: '#fff' },
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Formulário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Dia {selectedDay} — {formatDisplay(selectedISO)}
          </Text>

          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Cloro */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Teor de Cloro (ppm)</Text>
                  {form.teor_cloro !== '' && (
                    <View style={[styles.badge, cloroStatus === 'ok' ? styles.badgeOk : styles.badgeAlerta]}>
                      <Text style={styles.badgeText}>
                        {cloroStatus === 'ok' ? '✓ OK' : '⚠ Fora'}
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  testID="input-teor-cloro"
                  style={[
                    styles.input,
                    form.teor_cloro !== '' && cloroStatus === 'alerta' && styles.inputAlerta,
                  ]}
                  value={form.teor_cloro}
                  onChangeText={v => setForm(f => ({ ...f, teor_cloro: v }))}
                  keyboardType="numeric"
                  placeholder="ex: 0.5"
                  placeholderTextColor="#bbb"
                />
                <Text style={styles.limiteText}>Limite: {CLORO_MIN} – {CLORO_MAX} ppm</Text>
              </View>

              {/* pH */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>pH</Text>
                  {form.ph !== '' && (
                    <View style={[styles.badge, phStatus === 'ok' ? styles.badgeOk : styles.badgeAlerta]}>
                      <Text style={styles.badgeText}>
                        {phStatus === 'ok' ? '✓ OK' : '⚠ Fora'}
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  testID="input-ph"
                  style={[
                    styles.input,
                    form.ph !== '' && phStatus === 'alerta' && styles.inputAlerta,
                  ]}
                  value={form.ph}
                  onChangeText={v => setForm(f => ({ ...f, ph: v }))}
                  keyboardType="numeric"
                  placeholder="ex: 7.0"
                  placeholderTextColor="#bbb"
                />
                <Text style={styles.limiteText}>Limite: {PH_MIN} – {PH_MAX}</Text>
              </View>

              {/* Ações corretivas — aparece só se algum valor estiver fora */}
              {(cloroStatus === 'alerta' || phStatus === 'alerta') && (
                <View style={[styles.card, styles.cardAlerta]}>
                  <Text style={[styles.cardTitle, { color: '#e74c3c' }]}>
                    ⚠ Ações Corretivas
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={form.acoes_corretivas}
                    onChangeText={v => setForm(f => ({ ...f, acoes_corretivas: v }))}
                    placeholder="Descreva as ações tomadas..."
                    placeholderTextColor="#bbb"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Responsável */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Responsável</Text>
                <TextInput
                  style={styles.input}
                  value={form.responsavel}
                  onChangeText={v => setForm(f => ({ ...f, responsavel: v }))}
                  placeholder="Nome do responsável"
                  placeholderTextColor="#bbb"
                />
              </View>

              {savedMsg ? <Text style={{ color: '#27ae60', textAlign: 'center', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>{savedMsg}</Text> : null}
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
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 10, alignItems: 'center', elevation: 1,
  },
  statCardAlerta: { borderWidth: 1, borderColor: '#e74c3c22' },
  statValue: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#666' },
  pdfBtn: {
    backgroundColor: '#1a5c24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { paddingHorizontal: 14, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  dayBtn: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eee',
  },
  dayText: { fontSize: 13, fontWeight: '600', color: '#555' },
  card: {
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
  },
  cardAlerta: { borderWidth: 1, borderColor: '#e74c3c33' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#e8f5e9' },
  badgeAlerta: { backgroundColor: '#fdecea' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#222', backgroundColor: '#fafafa',
  },
  inputAlerta: { borderColor: '#e74c3c', backgroundColor: '#fff5f5' },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  limiteText: { fontSize: 11, color: '#aaa', marginTop: 4 },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 4, marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
