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
import { gerarPdfVestiario } from '../../utils/pdf/pdfVestiario';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

type SN = 'S' | 'N' | '';

const ITENS = [
  'Ambiente do vestiário está limpo e organizado?',
  'Há presença de lixeira com acionamento por pedal?',
  'Há saco plástico na lixeira?',
  'O lixo é recolhido semanalmente?',
  'Há presença de saboneteiras com sabonete líquido bactericida?',
  'Há presença de suporte de papel toalha?',
  'Há papel toalha para secar as mãos?',
  'Pias e ralos estão em bom estado de conservação e funcionando adequadamente?',
  'Lava-botas está em bom estado de conservação e funcionando adequadamente?',
  'Todos os manipuladores passam pelo vestiário antes de adentrar o ambiente de fabricação?',
];

interface VestiarioRecord {
  id?: number;
  mes: number;
  ano: number;
  semana: number;
  data_avaliacao: string;
  item_1: string; item_2: string; item_3: string; item_4: string; item_5: string;
  item_6: string; item_7: string; item_8: string; item_9: string; item_10: string;
  observacoes: string;
  acoes_corretivas: string;
  responsavel: string;
}

type WeekForm = {
  data_avaliacao: string;
  items: SN[];
  observacoes: string;
  acoes_corretivas: string;
  responsavel: string;
};

function emptyWeek(): WeekForm {
  return {
    data_avaliacao: '',
    items: Array(10).fill('') as SN[],
    observacoes: '',
    acoes_corretivas: '',
    responsavel: '',
  };
}

function recordToForm(r: VestiarioRecord): WeekForm {
  return {
    data_avaliacao: r.data_avaliacao ?? '',
    items: [
      (r.item_1 ?? '') as SN, (r.item_2 ?? '') as SN, (r.item_3 ?? '') as SN,
      (r.item_4 ?? '') as SN, (r.item_5 ?? '') as SN, (r.item_6 ?? '') as SN,
      (r.item_7 ?? '') as SN, (r.item_8 ?? '') as SN, (r.item_9 ?? '') as SN,
      (r.item_10 ?? '') as SN,
    ],
    observacoes: r.observacoes ?? '',
    acoes_corretivas: r.acoes_corretivas ?? '',
    responsavel: r.responsavel ?? '',
  };
}

function weekStatus(form: WeekForm): 'green' | 'red' | 'grey' {
  if (form.items.every(i => i === '')) return 'grey';
  if (form.items.some(i => i === 'N')) return 'red';
  if (form.items.every(i => i === 'S')) return 'green';
  return 'grey';
}

export default function CondicoesVestiarioScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [monthRecords, setMonthRecords] = useState<Record<number, VestiarioRecord>>({});
  const [forms, setForms] = useState<Record<number, WeekForm>>({
    1: emptyWeek(), 2: emptyWeek(), 3: emptyWeek(), 4: emptyWeek(),
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadMonth = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<VestiarioRecord>(
        `SELECT * FROM pl_vestiario WHERE mes=? AND ano=? ORDER BY semana ASC`,
        [selectedMonth + 1, selectedYear]
      );
      const map: Record<number, VestiarioRecord> = {};
      rows.forEach(r => { map[r.semana] = r; });
      setMonthRecords(map);
      setForms({
        1: map[1] ? recordToForm(map[1]) : emptyWeek(),
        2: map[2] ? recordToForm(map[2]) : emptyWeek(),
        3: map[3] ? recordToForm(map[3]) : emptyWeek(),
        4: map[4] ? recordToForm(map[4]) : emptyWeek(),
      });
    } catch (e) {
      console.error('Erro ao carregar vestiário:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  function setItem(idx: number, val: SN) {
    setForms(prev => {
      const wf = { ...prev[selectedWeek] };
      const items = [...wf.items] as SN[];
      items[idx] = val;
      return { ...prev, [selectedWeek]: { ...wf, items } };
    });
  }

  function setField(field: keyof Omit<WeekForm, 'items'>, val: string) {
    setForms(prev => ({
      ...prev,
      [selectedWeek]: { ...prev[selectedWeek], [field]: val },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const wf = forms[selectedWeek];
      const mes = selectedMonth + 1;
      const rec = monthRecords[selectedWeek];
      const itemVals = wf.items;

      if (db) {
        if (rec?.id) {
          db.runSync(
            `UPDATE pl_vestiario SET
              data_avaliacao=?,
              item_1=?,item_2=?,item_3=?,item_4=?,item_5=?,
              item_6=?,item_7=?,item_8=?,item_9=?,item_10=?,
              observacoes=?,acoes_corretivas=?,responsavel=?,
              sync_status='pending'
            WHERE id=?`,
            [wf.data_avaliacao, ...itemVals, wf.observacoes, wf.acoes_corretivas, wf.responsavel, rec.id]
          );
        } else {
          db.runSync(
            `INSERT INTO pl_vestiario
              (propriedade_id,mes,ano,semana,data_avaliacao,
               item_1,item_2,item_3,item_4,item_5,
               item_6,item_7,item_8,item_9,item_10,
               observacoes,acoes_corretivas,responsavel)
            VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [mes, selectedYear, selectedWeek, wf.data_avaliacao, ...itemVals,
             wf.observacoes, wf.acoes_corretivas, wf.responsavel]
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

  const handleGerarPdf = async () => {
    try {
      await gerarPdfVestiario(selectedMonth + 1, selectedYear, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
    setSelectedWeek(1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
    setSelectedWeek(1);
  };

  const currentForm = forms[selectedWeek];
  const hasNao = currentForm.items.some(i => i === 'N');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header} testID="header-vestiario">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Condições do Vestiário</Text>
          <Text style={styles.headerSub}>PL 02/05 — Avaliação semanal</Text>
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

      {/* Abas de semana */}
      <View style={styles.weekTabs}>
        {[1,2,3,4].map(w => {
          const st = weekStatus(forms[w]);
          const dotColor = st === 'green' ? '#27ae60' : st === 'red' ? '#e74c3c' : '#ccc';
          const isActive = w === selectedWeek;
          return (
            <TouchableOpacity
              key={w}
              style={[styles.weekTab, isActive && styles.weekTabActive]}
              onPress={() => setSelectedWeek(w)}
            >
              <View style={[styles.weekDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.weekTabText, isActive && styles.weekTabTextActive]}>
                Semana {w}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* Data e responsável */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Data da avaliação</Text>
              <TextInput
                style={styles.input}
                value={currentForm.data_avaliacao}
                onChangeText={v => setField('data_avaliacao', v)}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#bbb"
              />
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Responsável</Text>
              <TextInput
                style={styles.input}
                value={currentForm.responsavel}
                onChangeText={v => setField('responsavel', v)}
                placeholder="Nome do responsável"
                placeholderTextColor="#bbb"
              />
            </View>

            {/* Lista de itens */}
            <View style={styles.itemsCard}>
              {ITENS.map((texto, idx) => {
                const val = currentForm.items[idx];
                return (
                  <View key={idx} style={[styles.itemRow, idx === ITENS.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.itemText}>{idx + 1}. {texto}</Text>
                    <View style={styles.snRow}>
                      <TouchableOpacity
                        style={[styles.snBtn, val === 'S' && styles.snBtnSim]}
                        onPress={() => setItem(idx, val === 'S' ? '' : 'S')}
                      >
                        <Text style={[styles.snBtnText, val === 'S' && styles.snBtnTextActive]}>SIM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.snBtn, val === 'N' && styles.snBtnNao]}
                        onPress={() => setItem(idx, val === 'N' ? '' : 'N')}
                      >
                        <Text style={[styles.snBtnText, val === 'N' && styles.snBtnTextActive]}>NÃO</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Observações — aparecem se houver NÃO */}
            {hasNao && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={currentForm.observacoes}
                  onChangeText={v => setField('observacoes', v)}
                  placeholder="Descreva as não conformidades..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Ações Corretivas</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={currentForm.acoes_corretivas}
                  onChangeText={v => setField('acoes_corretivas', v)}
                  placeholder="Descreva as ações tomadas..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                />
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
                : <Text style={styles.saveBtnText}>Salvar Semana {selectedWeek}</Text>
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
  weekTabs: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weekTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  weekTabActive: { borderBottomColor: PRIMARY },
  weekDot: { width: 8, height: 8, borderRadius: 4 },
  weekTabText: { fontSize: 12, fontWeight: '600', color: '#999' },
  weekTabTextActive: { color: PRIMARY },
  content: { padding: 14 },
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
  itemsCard: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4,
    marginBottom: 10, elevation: 1,
  },
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  itemText: { fontSize: 13, color: '#333', lineHeight: 18 },
  snRow: { flexDirection: 'row', gap: 8 },
  snBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ddd',
    alignItems: 'center', backgroundColor: '#fafafa',
  },
  snBtnSim: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  snBtnNao: { backgroundColor: '#fdecea', borderColor: '#e74c3c' },
  snBtnText: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  snBtnTextActive: { color: '#222' },
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
