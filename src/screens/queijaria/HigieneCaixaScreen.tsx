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
import { gerarPdfHigieneCaixa } from '../../utils/pdf/pdfHigieneCaixa';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface HigieneCaixa {
  id?: number;
  mes: number;
  ano: number;
  data_realizacao: string;
  observacoes: string;
  acoes_corretivas: string;
  responsavel: string;
}

export default function HigieneCaixaScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [yearData, setYearData] = useState<Record<number, HigieneCaixa>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    data_realizacao: '',
    observacoes: '',
    acoes_corretivas: '',
    responsavel: '',
  });

  const loadYear = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<HigieneCaixa>(
        `SELECT * FROM pl_higiene_caixa WHERE ano = ? ORDER BY mes ASC`,
        [selectedYear]
      );
      const map: Record<number, HigieneCaixa> = {};
      rows.forEach(r => { map[r.mes] = r; });
      setYearData(map);
    } catch (e) {
      console.error('Erro ao carregar higiene caixa:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadYear(); }, [loadYear]);

  useEffect(() => {
    const existing = yearData[selectedMonth + 1];
    if (existing) {
      setForm({
        data_realizacao: existing.data_realizacao ?? '',
        observacoes: existing.observacoes ?? '',
        acoes_corretivas: existing.acoes_corretivas ?? '',
        responsavel: existing.responsavel ?? '',
      });
    } else {
      setForm({ data_realizacao: '', observacoes: '', acoes_corretivas: '', responsavel: '' });
    }
  }, [selectedMonth, selectedYear, yearData]);

  async function handleSave() {
    if (!db) return;
    setSaving(true);
    try {
      const mes = selectedMonth + 1;
      const existing = yearData[mes];
      if (existing?.id) {
        db.runSync(
          `UPDATE pl_higiene_caixa SET data_realizacao=?, observacoes=?, acoes_corretivas=?, responsavel=?, sync_status='pending', updated_at=datetime('now') WHERE id=?`,
          [form.data_realizacao, form.observacoes, form.acoes_corretivas, form.responsavel, existing.id]
        );
      } else {
        db.runSync(
          `INSERT INTO pl_higiene_caixa (propriedade_id, mes, ano, data_realizacao, observacoes, acoes_corretivas, responsavel)
           VALUES (1, ?, ?, ?, ?, ?, ?)`,
          [mes, selectedYear, form.data_realizacao, form.observacoes, form.acoes_corretivas, form.responsavel]
        );
      }
      await loadYear();
      Alert.alert('Salvo', `Higiene de ${MESES[selectedMonth]}/${selectedYear} salva.`);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const preenchidos = Object.keys(yearData).length;

  const handleGerarPdf = async () => {
    try {
      await gerarPdfHigieneCaixa(selectedYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Higiene das Caixas D'água</Text>
          <Text style={styles.headerSub}>PL 01/01 — Controle mensal</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Seletor de ano */}
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
            <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
            <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Resumo do ano */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{preenchidos}/12</Text>
            <Text style={styles.statLabel}>Meses registrados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{12 - preenchidos}</Text>
            <Text style={styles.statLabel}>Meses pendentes</Text>
          </View>
        </View>

        {/* Grade de 12 meses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o mês</Text>
          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.monthsGrid}>
              {MESES.map((mes, idx) => {
                const filled = !!yearData[idx + 1];
                const isSelected = idx === selectedMonth;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.monthBtn,
                      filled && styles.monthBtnFilled,
                      isSelected && styles.monthBtnSelected,
                    ]}
                    onPress={() => setSelectedMonth(idx)}
                  >
                    <Text style={[
                      styles.monthBtnText,
                      filled && styles.monthBtnTextFilled,
                      isSelected && styles.monthBtnTextSelected,
                    ]}>
                      {mes.substring(0, 3)}
                    </Text>
                    {filled && !isSelected && (
                      <Ionicons name="checkmark-circle" size={12} color="#27ae60" style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Formulário do mês selecionado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {MESES[selectedMonth]} / {selectedYear}
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Data de Realização (DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              value={form.data_realizacao}
              onChangeText={v => setForm(f => ({ ...f, data_realizacao: v }))}
              placeholder="ex: 15/06/2025"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Observações</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.observacoes}
              onChangeText={v => setForm(f => ({ ...f, observacoes: v }))}
              placeholder="Condições encontradas, detalhes da limpeza..."
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ações Corretivas</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.acoes_corretivas}
              onChangeText={v => setForm(f => ({ ...f, acoes_corretivas: v }))}
              placeholder="Descreva as ações corretivas tomadas..."
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Responsável</Text>
            <TextInput
              style={styles.input}
              value={form.responsavel}
              onChangeText={v => setForm(f => ({ ...f, responsavel: v }))}
              placeholder="Nome do responsável"
              placeholderTextColor="#bbb"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Salvar {MESES[selectedMonth]}</Text>
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
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 24,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  yearLabel: { fontSize: 20, fontWeight: '700', color: PRIMARY, minWidth: 60, textAlign: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: PRIMARY },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 14, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  monthBtn: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  monthBtnFilled: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#27ae60' },
  monthBtnSelected: { backgroundColor: PRIMARY },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  monthBtnTextFilled: { color: '#27ae60' },
  monthBtnTextSelected: { color: '#fff' },
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
  inputMulti: { height: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 4, marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 8,
    backgroundColor: CARD,
  },
  reportBtnText: { color: ACCENT, fontSize: 15, fontWeight: '600' },
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
