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
import { gerarPdfAnaliseLab } from '../../utils/pdf/pdfAnaliseLab';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface AnaliseLabRecord {
  id?: number;
  mes: number;
  ano: number;
  agua_micro_sim_nao: string;
  agua_fisico_sim_nao: string;
  agua_lab_credenciado: string;
  agua_data_analise: string;
  agua_numero_analise: string;
  queijo_micro_sim_nao: string;
  queijo_fisico_sim_nao: string;
  queijo_lab_credenciado: string;
  queijo_data_analise: string;
  queijo_numero_analise: string;
  leite_analise_sim_nao: string;
  leite_lab_rbql: string;
  leite_data_analise: string;
  leite_numero_analise: string;
}

type SN = 'S' | 'N' | '';

const EMPTY_FORM = {
  agua_micro_sim_nao: '' as SN,
  agua_fisico_sim_nao: '' as SN,
  agua_lab_credenciado: '' as SN,
  agua_data_analise: '',
  agua_numero_analise: '',
  queijo_micro_sim_nao: '' as SN,
  queijo_fisico_sim_nao: '' as SN,
  queijo_lab_credenciado: '' as SN,
  queijo_data_analise: '',
  queijo_numero_analise: '',
  leite_analise_sim_nao: '' as SN,
  leite_lab_rbql: '' as SN,
  leite_data_analise: '',
  leite_numero_analise: '',
};

function sectionStatus(flags: SN[]): 'green' | 'red' | 'grey' {
  if (flags.every(f => f === '')) return 'grey';
  if (flags.every(f => f === 'S')) return 'green';
  if (flags.some(f => f === 'N')) return 'red';
  return 'grey';
}

function SimNaoBtn({ value, onChange }: { value: SN; onChange: (v: SN) => void }) {
  return (
    <View style={styles.simNaoRow}>
      <TouchableOpacity
        style={[styles.snBtn, value === 'S' && styles.snBtnSim]}
        onPress={() => onChange(value === 'S' ? '' : 'S')}
      >
        <Text style={[styles.snBtnText, value === 'S' && styles.snBtnTextActive]}>SIM</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.snBtn, value === 'N' && styles.snBtnNao]}
        onPress={() => onChange(value === 'N' ? '' : 'N')}
      >
        <Text style={[styles.snBtnText, value === 'N' && styles.snBtnTextActive]}>NÃO</Text>
      </TouchableOpacity>
    </View>
  );
}

function AccordionSection({
  title, status, open, onToggle, children,
}: {
  title: string;
  status: 'green' | 'red' | 'grey';
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const dotColor = status === 'green' ? '#27ae60' : status === 'red' ? '#e74c3c' : '#bbb';
  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.accordionLeft}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#555" />
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function AnaliseLabScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [recordId, setRecordId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<'agua' | 'queijo' | 'leite' | null>('agua');

  const loadRecord = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const mes = selectedMonth + 1;
      const rows = db.getAllSync<AnaliseLabRecord>(
        `SELECT * FROM pl_analise_lab WHERE mes = ? AND ano = ? LIMIT 1`,
        [mes, selectedYear]
      );
      if (rows.length > 0) {
        const r = rows[0];
        setRecordId(r.id);
        setForm({
          agua_micro_sim_nao: (r.agua_micro_sim_nao ?? '') as SN,
          agua_fisico_sim_nao: (r.agua_fisico_sim_nao ?? '') as SN,
          agua_lab_credenciado: (r.agua_lab_credenciado ?? '') as SN,
          agua_data_analise: r.agua_data_analise ?? '',
          agua_numero_analise: r.agua_numero_analise ?? '',
          queijo_micro_sim_nao: (r.queijo_micro_sim_nao ?? '') as SN,
          queijo_fisico_sim_nao: (r.queijo_fisico_sim_nao ?? '') as SN,
          queijo_lab_credenciado: (r.queijo_lab_credenciado ?? '') as SN,
          queijo_data_analise: r.queijo_data_analise ?? '',
          queijo_numero_analise: r.queijo_numero_analise ?? '',
          leite_analise_sim_nao: (r.leite_analise_sim_nao ?? '') as SN,
          leite_lab_rbql: (r.leite_lab_rbql ?? '') as SN,
          leite_data_analise: r.leite_data_analise ?? '',
          leite_numero_analise: r.leite_numero_analise ?? '',
        });
      } else {
        setRecordId(undefined);
        setForm({ ...EMPTY_FORM });
      }
    } catch (e) {
      console.error('Erro ao carregar análise lab:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  function setF<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!db) return;
    setSaving(true);
    try {
      const mes = selectedMonth + 1;
      if (recordId) {
        db.runSync(
          `UPDATE pl_analise_lab SET
            agua_micro_sim_nao=?, agua_fisico_sim_nao=?, agua_lab_credenciado=?,
            agua_data_analise=?, agua_numero_analise=?,
            queijo_micro_sim_nao=?, queijo_fisico_sim_nao=?, queijo_lab_credenciado=?,
            queijo_data_analise=?, queijo_numero_analise=?,
            leite_analise_sim_nao=?, leite_lab_rbql=?,
            leite_data_analise=?, leite_numero_analise=?,
            sync_status='pending', updated_at=datetime('now')
          WHERE id=?`,
          [
            form.agua_micro_sim_nao, form.agua_fisico_sim_nao, form.agua_lab_credenciado,
            form.agua_data_analise, form.agua_numero_analise,
            form.queijo_micro_sim_nao, form.queijo_fisico_sim_nao, form.queijo_lab_credenciado,
            form.queijo_data_analise, form.queijo_numero_analise,
            form.leite_analise_sim_nao, form.leite_lab_rbql,
            form.leite_data_analise, form.leite_numero_analise,
            recordId,
          ]
        );
      } else {
        db.runSync(
          `INSERT INTO pl_analise_lab (
            propriedade_id, mes, ano,
            agua_micro_sim_nao, agua_fisico_sim_nao, agua_lab_credenciado,
            agua_data_analise, agua_numero_analise,
            queijo_micro_sim_nao, queijo_fisico_sim_nao, queijo_lab_credenciado,
            queijo_data_analise, queijo_numero_analise,
            leite_analise_sim_nao, leite_lab_rbql,
            leite_data_analise, leite_numero_analise
          ) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            mes, selectedYear,
            form.agua_micro_sim_nao, form.agua_fisico_sim_nao, form.agua_lab_credenciado,
            form.agua_data_analise, form.agua_numero_analise,
            form.queijo_micro_sim_nao, form.queijo_fisico_sim_nao, form.queijo_lab_credenciado,
            form.queijo_data_analise, form.queijo_numero_analise,
            form.leite_analise_sim_nao, form.leite_lab_rbql,
            form.leite_data_analise, form.leite_numero_analise,
          ]
        );
      }
      await loadRecord();
      Alert.alert('Salvo', `Análise de ${MESES[selectedMonth]}/${selectedYear} salva.`);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const aguaStatus = sectionStatus([form.agua_micro_sim_nao, form.agua_fisico_sim_nao, form.agua_lab_credenciado]);
  const queijoStatus = sectionStatus([form.queijo_micro_sim_nao, form.queijo_fisico_sim_nao, form.queijo_lab_credenciado]);
  const leiteStatus = sectionStatus([form.leite_analise_sim_nao, form.leite_lab_rbql]);

  const handleGerarPdf = async () => {
    try {
      await gerarPdfAnaliseLab(selectedYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Análises Laboratoriais</Text>
          <Text style={styles.headerSub}>PL 01/03 — Controle mensal</Text>
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

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.content}>

            {/* SEÇÃO ÁGUA */}
            <AccordionSection
              title="Água"
              status={aguaStatus}
              open={openSection === 'agua'}
              onToggle={() => setOpenSection(s => s === 'agua' ? null : 'agua')}
            >
              <Text style={styles.fieldLabel}>Análise microbiológica?</Text>
              <SimNaoBtn value={form.agua_micro_sim_nao} onChange={v => setF('agua_micro_sim_nao', v)} />

              <Text style={styles.fieldLabel}>Análise físico-química?</Text>
              <SimNaoBtn value={form.agua_fisico_sim_nao} onChange={v => setF('agua_fisico_sim_nao', v)} />

              <Text style={styles.fieldLabel}>Laboratório credenciado?</Text>
              <SimNaoBtn value={form.agua_lab_credenciado} onChange={v => setF('agua_lab_credenciado', v)} />

              <Text style={styles.fieldLabel}>Data da análise</Text>
              <TextInput
                style={styles.input}
                value={form.agua_data_analise}
                onChangeText={v => setF('agua_data_analise', v)}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Número da análise</Text>
              <TextInput
                style={styles.input}
                value={form.agua_numero_analise}
                onChangeText={v => setF('agua_numero_analise', v)}
                placeholder="ex: 2025/001"
                placeholderTextColor="#bbb"
              />
            </AccordionSection>

            {/* SEÇÃO QUEIJO */}
            <AccordionSection
              title="Queijo"
              status={queijoStatus}
              open={openSection === 'queijo'}
              onToggle={() => setOpenSection(s => s === 'queijo' ? null : 'queijo')}
            >
              <Text style={styles.fieldLabel}>Análise microbiológica?</Text>
              <SimNaoBtn value={form.queijo_micro_sim_nao} onChange={v => setF('queijo_micro_sim_nao', v)} />

              <Text style={styles.fieldLabel}>Análise físico-química?</Text>
              <SimNaoBtn value={form.queijo_fisico_sim_nao} onChange={v => setF('queijo_fisico_sim_nao', v)} />

              <Text style={styles.fieldLabel}>Laboratório credenciado?</Text>
              <SimNaoBtn value={form.queijo_lab_credenciado} onChange={v => setF('queijo_lab_credenciado', v)} />

              <Text style={styles.fieldLabel}>Data da análise</Text>
              <TextInput
                style={styles.input}
                value={form.queijo_data_analise}
                onChangeText={v => setF('queijo_data_analise', v)}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Número da análise</Text>
              <TextInput
                style={styles.input}
                value={form.queijo_numero_analise}
                onChangeText={v => setF('queijo_numero_analise', v)}
                placeholder="ex: 2025/002"
                placeholderTextColor="#bbb"
              />
            </AccordionSection>

            {/* SEÇÃO LEITE */}
            <AccordionSection
              title="Leite"
              status={leiteStatus}
              open={openSection === 'leite'}
              onToggle={() => setOpenSection(s => s === 'leite' ? null : 'leite')}
            >
              <Text style={styles.fieldLabel}>Análise de leite nos últimos 3 meses?</Text>
              <SimNaoBtn value={form.leite_analise_sim_nao} onChange={v => setF('leite_analise_sim_nao', v)} />

              <Text style={styles.fieldLabel}>Laboratório RBQL credenciado pelo MAPA?</Text>
              <SimNaoBtn value={form.leite_lab_rbql} onChange={v => setF('leite_lab_rbql', v)} />

              <Text style={styles.fieldLabel}>Data da análise</Text>
              <TextInput
                style={styles.input}
                value={form.leite_data_analise}
                onChangeText={v => setF('leite_data_analise', v)}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.fieldLabel}>Número da análise</Text>
              <TextInput
                style={styles.input}
                value={form.leite_numero_analise}
                onChangeText={v => setF('leite_numero_analise', v)}
                placeholder="ex: 2025/003"
                placeholderTextColor="#bbb"
              />
            </AccordionSection>

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

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
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
  content: { padding: 14 },
  accordion: {
    backgroundColor: CARD,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  accordionTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 10, fontWeight: '500' },
  simNaoRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  snBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ddd',
    alignItems: 'center', backgroundColor: '#fafafa',
  },
  snBtnSim: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  snBtnNao: { backgroundColor: '#fdecea', borderColor: '#e74c3c' },
  snBtnText: { fontSize: 14, fontWeight: '600', color: '#888' },
  snBtnTextActive: { color: '#222' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#222', backgroundColor: '#fafafa',
    marginBottom: 4,
  },
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
