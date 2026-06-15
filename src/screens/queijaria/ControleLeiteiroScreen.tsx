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
import { gerarPdfControleLeiteiro } from '../../utils/pdf/pdfControleLeiteiro';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface LeiteiroRecord {
  id?: number;
  data: string;
  kg_dia: number;
  litros_dia: number;
  vp_preco: number;
  vs: number;
  leite_familiar: number;
  leite_bezerro: number;
  leite_descarte: number;
  queijos_produzidos: number;
  observacoes: string;
}

const EMPTY_FORM = {
  kg_dia: '',
  litros_dia: '',
  vp_preco: '',
  vs: '',
  leite_familiar: '',
  leite_bezerro: '',
  leite_descarte: '',
  queijos_produzidos: '',
  observacoes: '',
};

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function n(v: string) { return parseFloat(v.replace(',', '.')) || 0; }

export default function ControleLeiteiroScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthData, setMonthData] = useState<Record<string, LeiteiroRecord>>({});
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadMonth = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const prefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      const rows = db.getAllSync<LeiteiroRecord>(
        `SELECT * FROM controle_leiteiro WHERE data LIKE ? ORDER BY data ASC`,
        [`${prefix}%`]
      );
      const map: Record<string, LeiteiroRecord> = {};
      rows.forEach(r => { map[r.data] = r; });
      setMonthData(map);
    } catch (e) {
      console.error('Erro ao carregar controle leiteiro:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  useEffect(() => {
    const key = isoDate(selectedYear, selectedMonth, selectedDay);
    const rec = monthData[key];
    if (rec) {
      setForm({
        kg_dia: rec.kg_dia ? String(rec.kg_dia) : '',
        litros_dia: rec.litros_dia ? String(rec.litros_dia) : '',
        vp_preco: rec.vp_preco ? String(rec.vp_preco) : '',
        vs: rec.vs ? String(rec.vs) : '',
        leite_familiar: rec.leite_familiar ? String(rec.leite_familiar) : '',
        leite_bezerro: rec.leite_bezerro ? String(rec.leite_bezerro) : '',
        leite_descarte: rec.leite_descarte ? String(rec.leite_descarte) : '',
        queijos_produzidos: rec.queijos_produzidos ? String(rec.queijos_produzidos) : '',
        observacoes: rec.observacoes ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [selectedDay, selectedMonth, selectedYear, monthData]);

  async function handleSave() {
    setSaving(true);
    try {
      const key = isoDate(selectedYear, selectedMonth, selectedDay);
      const rec = monthData[key];
      const vals = [
        n(form.kg_dia), n(form.litros_dia), n(form.vp_preco), n(form.vs),
        n(form.leite_familiar), n(form.leite_bezerro), n(form.leite_descarte),
        Math.round(n(form.queijos_produzidos)), form.observacoes,
      ];
      if (db) {
        if (rec?.id) {
          db.runSync(
            `UPDATE controle_leiteiro SET
              kg_dia=?,litros_dia=?,vp_preco=?,vs=?,
              leite_familiar=?,leite_bezerro=?,leite_descarte=?,
              queijos_produzidos=?,observacoes=?,sync_status='pending'
            WHERE id=?`,
            [...vals, rec.id]
          );
        } else {
          db.runSync(
            `INSERT INTO controle_leiteiro
              (propriedade_id,data,kg_dia,litros_dia,vp_preco,vs,
               leite_familiar,leite_bezerro,leite_descarte,queijos_produzidos,observacoes)
            VALUES (1,?,?,?,?,?,?,?,?,?,?)`,
            [key, ...vals]
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

  // Totais do mês
  const records = Object.values(monthData);
  const totalKg = records.reduce((s, r) => s + (r.kg_dia || 0), 0);
  const totalLitros = records.reduce((s, r) => s + (r.litros_dia || 0), 0);
  const totalQueijos = records.reduce((s, r) => s + (r.queijos_produzidos || 0), 0);
  const mediaLitros = records.length > 0 ? totalLitros / records.length : 0;

  // Resumo calculado do dia
  const litros = n(form.litros_dia);
  const familiar = n(form.leite_familiar);
  const bezerro = n(form.leite_bezerro);
  const descarte = n(form.leite_descarte);
  const disponivel = Math.max(0, litros - familiar - bezerro - descarte);
  const valorDia = n(form.vs) * n(form.vp_preco);

  const totalDays = daysInMonth(selectedMonth, selectedYear);

  const handleGerarPdf = async () => {
    try {
      await gerarPdfControleLeiteiro(selectedMonth + 1, selectedYear, 1);
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

  function setF(key: keyof typeof EMPTY_FORM, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header} testID="header-controle-leiteiro">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Controle Leiteiro</Text>
          <Text style={styles.headerSub}>Planilha mensal diária</Text>
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

        {/* Totais do mês */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalKg.toFixed(1)}</Text>
            <Text style={styles.statLabel}>kg/mês</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalLitros.toFixed(1)}</Text>
            <Text style={styles.statLabel}>litros/mês</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mediaLitros.toFixed(1)}</Text>
            <Text style={styles.statLabel}>média L/dia</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalQueijos}</Text>
            <Text style={styles.statLabel}>queijos</Text>
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
                const filled = !!monthData[key];
                const isSelected = day === selectedDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayBtn,
                      filled && styles.dayBtnFilled,
                      isSelected && styles.dayBtnSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.dayBtnText,
                      filled && styles.dayBtnTextFilled,
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

        {/* Formulário do dia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {String(selectedDay).padStart(2,'0')}/{String(selectedMonth+1).padStart(2,'0')}/{selectedYear}
          </Text>

          <View style={styles.card}>
            <View style={styles.row2}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Kg/dia</Text>
                <TextInput style={styles.input} value={form.kg_dia}
                  onChangeText={v => setF('kg_dia', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Litros/dia</Text>
                <TextInput testID="input-litros-dia" style={styles.input} value={form.litros_dia}
                  onChangeText={v => setF('litros_dia', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
            </View>
            <View style={[styles.row2, { marginTop: 10 }]}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>VP — Preço/litro (R$)</Text>
                <TextInput testID="input-vp-preco" style={styles.input} value={form.vp_preco}
                  onChangeText={v => setF('vp_preco', v)}
                  placeholder="0,00" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>VS — Vol. vendido (L)</Text>
                <TextInput testID="input-vs" style={styles.input} value={form.vs}
                  onChangeText={v => setF('vs', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Destino do leite</Text>
            <View style={styles.row3}>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Familiar (L)</Text>
                <TextInput testID="input-leite-familiar" style={styles.input} value={form.leite_familiar}
                  onChangeText={v => setF('leite_familiar', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Bezerro (L)</Text>
                <TextInput testID="input-leite-bezerro" style={styles.input} value={form.leite_bezerro}
                  onChangeText={v => setF('leite_bezerro', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.fieldLabel}>Descarte (L)</Text>
                <TextInput style={styles.input} value={form.leite_descarte}
                  onChangeText={v => setF('leite_descarte', v)}
                  placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Queijos produzidos (peças)</Text>
            <TextInput style={styles.input} value={form.queijos_produzidos}
              onChangeText={v => setF('queijos_produzidos', v)}
              placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Observações</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.observacoes}
              onChangeText={v => setF('observacoes', v)}
              placeholder="Anotações do dia..."
              placeholderTextColor="#bbb"
              multiline numberOfLines={3}
            />
          </View>

          {/* Resumo calculado */}
          {(litros > 0 || n(form.vs) > 0) && (
            <View style={styles.resumoCard}>
              <Text style={styles.resumoTitle}>Resumo calculado</Text>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Leite disponível</Text>
                <Text style={styles.resumoValue}>{disponivel.toFixed(1)} L</Text>
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Valor do dia</Text>
                <Text style={[styles.resumoValue, { color: '#27ae60' }]}>
                  R$ {valorDia.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {savedMsg ? <Text style={{ color: '#27ae60', textAlign: 'center', fontWeight: '600', fontSize: 14, marginBottom: 8 }}>{savedMsg}</Text> : null}
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
  statsGrid: {
    flexDirection: 'row', padding: 12, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 10, alignItems: 'center', elevation: 1,
  },
  statValue: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dayBtn: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eee',
  },
  dayBtnFilled: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#27ae60' },
  dayBtnSelected: { backgroundColor: PRIMARY },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayBtnTextFilled: { color: '#27ae60' },
  dayBtnTextSelected: { color: '#fff' },
  card: {
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: PRIMARY, marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#222', backgroundColor: '#fafafa',
  },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  row3: { flexDirection: 'row', gap: 8, marginTop: 4 },
  thirdField: { flex: 1 },
  resumoCard: {
    backgroundColor: '#f0f7f0', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  resumoTitle: { fontSize: 12, fontWeight: '700', color: PRIMARY, marginBottom: 8 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resumoLabel: { fontSize: 13, color: '#555' },
  resumoValue: { fontSize: 14, fontWeight: '700', color: PRIMARY },
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
});
