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
import { gerarPdfHigienizacaoEquip } from '../../utils/pdf/pdfHigienizacaoEquip';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

type CNc = 'C' | 'NC' | '';

const EQUIPAMENTOS: { key: string; label: string }[] = [
  { key: 'tambores_leite',      label: 'Tambores de Leite' },
  { key: 'bancas_bancadas',     label: 'Bancas e Bancadas' },
  { key: 'pias',                label: 'Pias' },
  { key: 'armarios',            label: 'Armários' },
  { key: 'pas_liras',           label: 'Pás ou Liras' },
  { key: 'formas_plastico',     label: 'Formas de Plástico' },
  { key: 'funil_coador',        label: 'Funil com Coador' },
  { key: 'tecidos',             label: 'Tecidos' },
  { key: 'baldes_plastico',     label: 'Baldes de Plástico' },
  { key: 'tanque_soro',         label: 'Tanque/Saída do Soro' },
  { key: 'prateleiras_madeira', label: 'Prateleiras de Madeira' },
  { key: 'ralos',               label: 'Ralos' },
];

type EquipKey = typeof EQUIPAMENTOS[number]['key'];

type FormState = Record<EquipKey, CNc> & { observacoes: string };

const EMPTY_FORM: FormState = {
  tambores_leite: '',
  bancas_bancadas: '',
  pias: '',
  armarios: '',
  pas_liras: '',
  formas_plastico: '',
  funil_coador: '',
  tecidos: '',
  baldes_plastico: '',
  tanque_soro: '',
  prateleiras_madeira: '',
  ralos: '',
  observacoes: '',
};

interface HigienizacaoRecord {
  id?: number;
  data: string;
  tambores_leite: string;
  bancas_bancadas: string;
  pias: string;
  armarios: string;
  pas_liras: string;
  formas_plastico: string;
  funil_coador: string;
  tecidos: string;
  baldes_plastico: string;
  tanque_soro: string;
  prateleiras_madeira: string;
  ralos: string;
  observacoes: string;
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dayStatus(rec: HigienizacaoRecord): 'green' | 'red' {
  const vals = EQUIPAMENTOS.map(e => (rec as any)[e.key] as string);
  return vals.some(v => v === 'NC') ? 'red' : 'green';
}

export default function HigienizacaoEquipScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthData, setMonthData] = useState<Record<string, HigienizacaoRecord>>({});
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadMonth = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const prefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      const rows = db.getAllSync<HigienizacaoRecord>(
        `SELECT * FROM pl_higienizacao_equip WHERE data LIKE ? ORDER BY data ASC`,
        [`${prefix}%`]
      );
      const map: Record<string, HigienizacaoRecord> = {};
      rows.forEach(r => { map[r.data] = r; });
      setMonthData(map);
    } catch (e) {
      console.error('Erro ao carregar higienizacao:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  useEffect(() => {
    const key = isoDate(selectedYear, selectedMonth, selectedDay);
    const rec = monthData[key];
    if (rec) {
      const f: FormState = { ...EMPTY_FORM };
      EQUIPAMENTOS.forEach(e => { (f as any)[e.key] = (rec as any)[e.key] ?? ''; });
      f.observacoes = rec.observacoes ?? '';
      setForm(f);
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [selectedDay, selectedMonth, selectedYear, monthData]);

  function setEquip(key: EquipKey, val: CNc) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const hasNC = EQUIPAMENTOS.some(e => (form as any)[e.key] === 'NC');

  async function handleSave() {
    setSaving(true);
    try {
      const key = isoDate(selectedYear, selectedMonth, selectedDay);
      const rec = monthData[key];
      const vals = EQUIPAMENTOS.map(e => (form as any)[e.key] as string);
      if (db) {
        if (rec?.id) {
          db.runSync(
            `UPDATE pl_higienizacao_equip SET
              tambores_leite=?, bancas_bancadas=?, pias=?, armarios=?,
              pas_liras=?, formas_plastico=?, funil_coador=?, tecidos=?,
              baldes_plastico=?, tanque_soro=?, prateleiras_madeira=?, ralos=?,
              observacoes=?, sync_status='pending'
            WHERE id=?`,
            [...vals, form.observacoes, rec.id]
          );
        } else {
          db.runSync(
            `INSERT INTO pl_higienizacao_equip
              (propriedade_id, data, tambores_leite, bancas_bancadas, pias, armarios,
               pas_liras, formas_plastico, funil_coador, tecidos,
               baldes_plastico, tanque_soro, prateleiras_madeira, ralos, observacoes)
            VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [key, ...vals, form.observacoes]
          );
        }
        await loadMonth();
      }
      setFeedback('Salvo com sucesso');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // Stats
  const recordList = Object.values(monthData);
  const diasRegistrados = recordList.length;
  const diasNC = recordList.filter(r => EQUIPAMENTOS.some(e => (r as any)[e.key] === 'NC')).length;
  const ncCounts: Record<string, number> = {};
  EQUIPAMENTOS.forEach(e => {
    ncCounts[e.key] = recordList.filter(r => (r as any)[e.key] === 'NC').length;
  });
  const maxNcKey = Object.entries(ncCounts).sort((a, b) => b[1] - a[1])[0];
  const maxNcLabel = maxNcKey && maxNcKey[1] > 0
    ? EQUIPAMENTOS.find(e => e.key === maxNcKey[0])?.label ?? '—'
    : '—';

  const totalDays = daysInMonth(selectedMonth, selectedYear);

  const handleGerarPdf = async () => {
    try {
      await gerarPdfHigienizacaoEquip(selectedMonth + 1, selectedYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
    setSelectedDay(1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
    setSelectedDay(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header} testID="header-higienizacao-equip">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Higienização de Equipamentos</Text>
          <Text style={styles.headerSub}>PL 01/05 — Avaliação diária</Text>
        </View>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MESES[selectedMonth]} / {selectedYear}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{diasRegistrados}</Text>
            <Text style={styles.statLabel}>Dias registrados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, diasNC > 0 && { color: '#e74c3c' }]}>{diasNC}</Text>
            <Text style={styles.statLabel}>Dias com NC</Text>
          </View>
          <View style={[styles.statCard, { flex: 1.6 }]}>
            <Text style={[styles.statValue, { fontSize: 12 }]} numberOfLines={1}>{maxNcLabel}</Text>
            <Text style={styles.statLabel}>Equip. com mais NC</Text>
          </View>
        </View>

        {/* Grade de dias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o dia</Text>
          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.daysGrid}>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const key = isoDate(selectedYear, selectedMonth, day);
                const rec = monthData[key];
                const status = rec ? dayStatus(rec) : null;
                const isSelected = day === selectedDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayBtn,
                      status === 'green' && styles.dayBtnGreen,
                      status === 'red' && styles.dayBtnRed,
                      isSelected && styles.dayBtnSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.dayBtnText,
                      (status === 'green' || status === 'red') && styles.dayBtnTextFilled,
                      isSelected && styles.dayBtnTextSelected,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Formulário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {String(selectedDay).padStart(2,'0')}/{String(selectedMonth+1).padStart(2,'0')}/{selectedYear}
          </Text>

          <View style={styles.equipCard}>
            {EQUIPAMENTOS.map(equip => {
              const val = (form as any)[equip.key] as CNc;
              return (
                <View key={equip.key} style={styles.equipRow}>
                  <Text style={styles.equipLabel} numberOfLines={1}>{equip.label}</Text>
                  <View style={styles.cnRow}>
                    <TouchableOpacity
                      style={[styles.cnBtn, val === 'C' && styles.cnBtnC]}
                      onPress={() => setEquip(equip.key, val === 'C' ? '' : 'C')}
                    >
                      <Text style={[styles.cnBtnText, val === 'C' && styles.cnBtnTextActive]}>C</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cnBtn, val === 'NC' && styles.cnBtnNC]}
                      onPress={() => setEquip(equip.key, val === 'NC' ? '' : 'NC')}
                    >
                      <Text style={[styles.cnBtnText, val === 'NC' && styles.cnBtnTextActive]}>NC</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {hasNC && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Observações e Ações Corretivas</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.observacoes}
                onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
                placeholder="Descreva os itens não conformes e ações tomadas..."
                placeholderTextColor="#bbb"
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Salvar dia {selectedDay}</Text>
            }
          </TouchableOpacity>
          {feedback ? <Text testID="feedback-salvo" style={styles.feedbackText}>{feedback}</Text> : null}

          <TouchableOpacity style={styles.pdfBtn} onPress={handleGerarPdf}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
          </TouchableOpacity>
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
    gap: 24,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthLabel: { fontSize: 17, fontWeight: '700', color: PRIMARY, minWidth: 160, textAlign: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 12, alignItems: 'center', elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dayBtn: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eee',
  },
  dayBtnGreen: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#27ae60' },
  dayBtnRed: { backgroundColor: '#fdecea', borderWidth: 1, borderColor: '#e74c3c' },
  dayBtnSelected: { backgroundColor: PRIMARY },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayBtnTextFilled: { color: '#333' },
  dayBtnTextSelected: { color: '#fff' },
  equipCard: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 10, elevation: 1,
  },
  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  equipLabel: { flex: 1, fontSize: 14, color: '#333', marginRight: 12 },
  cnRow: { flexDirection: 'row', gap: 6 },
  cnBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 7, borderWidth: 1.5, borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  cnBtnC: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  cnBtnNC: { backgroundColor: '#fdecea', borderColor: '#e74c3c' },
  cnBtnText: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  cnBtnTextActive: { color: '#222' },
  card: {
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
  },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#222', backgroundColor: '#fafafa',
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 4, marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a5c24',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 8,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  feedbackText: {
    textAlign: 'center', color: '#27ae60', fontWeight: '600',
    fontSize: 14, marginBottom: 8,
  },
});
