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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { gerarPdfMastiteSubclinica } from '../../utils/pdf/pdfMastiteSubclinica';

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

const db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

interface Sessao {
  id: number;
  data_teste: string;
  observacoes: string;
  total_vacas?: number;
  total_pos?: number;
}

interface Animal {
  id: number;
  sessao_id: number;
  nome_vaca: string;
  diagnostico: string;
  teto_1: string;
  teto_2: string;
  teto_3: string;
  teto_4: string;
  observacoes: string;
}

type Resultado = '+' | '-' | '';

const EMPTY_ANIMAL = {
  nome_vaca: '',
  diagnostico: '' as Resultado,
  teto_1: '' as Resultado,
  teto_2: '' as Resultado,
  teto_3: '' as Resultado,
  teto_4: '' as Resultado,
  observacoes: '',
};

// ─── componente reutilizável de botões +/− ───────────────────────────────────
function PlusMinus({ label, value, onChange }: {
  label?: string; value: Resultado; onChange: (v: Resultado) => void;
}) {
  return (
    <View style={styles.pmGroup}>
      {label && <Text style={styles.pmLabel}>{label}</Text>}
      <View style={styles.pmRow}>
        <TouchableOpacity
          style={[styles.pmBtn, value === '+' && styles.pmBtnPos]}
          onPress={() => onChange(value === '+' ? '' : '+')}
        >
          <Text style={[styles.pmBtnText, value === '+' && styles.pmBtnTextActive]}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pmBtn, value === '-' && styles.pmBtnNeg]}
          onPress={() => onChange(value === '-' ? '' : '-')}
        >
          <Text style={[styles.pmBtnText, value === '-' && styles.pmBtnTextActive]}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function tetosStr(a: Animal): string {
  const labels = ['T1','T2','T3','T4'];
  const vals = [a.teto_1, a.teto_2, a.teto_3, a.teto_4];
  const pos = labels.filter((_, i) => vals[i] === '+');
  return pos.length ? pos.join(' ') : '—';
}

// ─── vista de detalhe de uma sessão ─────────────────────────────────────────
function SessaoDetail({
  sessao, onBack, onReload,
}: { sessao: Sessao; onBack: () => void; onReload: () => void }) {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataTeste, setDataTeste] = useState(sessao.data_teste);
  const [obs, setObs] = useState(sessao.observacoes ?? '');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnimalId, setEditingAnimalId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ANIMAL });

  const loadAnimais = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<Animal>(
        `SELECT * FROM mastite_subclinica_animal WHERE sessao_id=? ORDER BY id ASC`,
        [sessao.id]
      );
      setAnimais(rows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [sessao.id]);

  useEffect(() => { loadAnimais(); }, [loadAnimais]);

  async function saveSession() {
    if (!db) return;
    try {
      db.runSync(
        `UPDATE mastite_subclinica_sessao SET data_teste=?,observacoes=?,sync_status='pending' WHERE id=?`,
        [dataTeste, obs, sessao.id]
      );
      onReload();
      Alert.alert('Salvo', 'Sessão atualizada.');
    } catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
  }

  function openNewAnimal() {
    setEditingAnimalId(null);
    setForm({ ...EMPTY_ANIMAL });
    setModalVisible(true);
  }

  function openEditAnimal(a: Animal) {
    setEditingAnimalId(a.id);
    setForm({
      nome_vaca: a.nome_vaca ?? '',
      diagnostico: (a.diagnostico ?? '') as Resultado,
      teto_1: (a.teto_1 ?? '') as Resultado,
      teto_2: (a.teto_2 ?? '') as Resultado,
      teto_3: (a.teto_3 ?? '') as Resultado,
      teto_4: (a.teto_4 ?? '') as Resultado,
      observacoes: a.observacoes ?? '',
    });
    setModalVisible(true);
  }

  function confirmDeleteAnimal(id: number) {
    Alert.alert('Excluir vaca', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          if (!db) return;
          try {
            db.runSync(`DELETE FROM mastite_subclinica_animal WHERE id=?`, [id]);
            loadAnimais();
            onReload();
          } catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
        },
      },
    ]);
  }

  async function handleSaveAnimal() {
    if (!db) return;
    if (!form.nome_vaca.trim()) {
      Alert.alert('Atenção', 'Nome da vaca é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const vals = [
        form.nome_vaca, form.diagnostico,
        form.teto_1, form.teto_2, form.teto_3, form.teto_4, form.observacoes,
      ];
      if (editingAnimalId) {
        db.runSync(
          `UPDATE mastite_subclinica_animal SET
            nome_vaca=?,diagnostico=?,teto_1=?,teto_2=?,teto_3=?,teto_4=?,observacoes=?
          WHERE id=?`,
          [...vals, editingAnimalId]
        );
      } else {
        db.runSync(
          `INSERT INTO mastite_subclinica_animal
            (sessao_id,nome_vaca,diagnostico,teto_1,teto_2,teto_3,teto_4,observacoes)
          VALUES (?,?,?,?,?,?,?,?)`,
          [sessao.id, ...vals]
        );
      }
      setModalVisible(false);
      await loadAnimais();
      onReload();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
      console.error(e);
    } finally { setSaving(false); }
  }

  function setF<K extends keyof typeof EMPTY_ANIMAL>(key: K, val: typeof EMPTY_ANIMAL[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const handleGerarPdf = async () => {
    try {
      await gerarPdfMastiteSubclinica(sessao.id, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sessão CMT</Text>
          <Text style={styles.headerSub}>{sessao.data_teste}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={styles.pdfHeaderBtn} onPress={handleGerarPdf}>
            <Ionicons name="document-text-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={openNewAnimal}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newBtnText}>Vaca</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Dados da sessão */}
        <View style={[styles.card, { margin: 14, marginBottom: 0 }]}>
          <Text style={styles.fieldLabel}>Data do teste</Text>
          <TextInput
            style={styles.input}
            value={dataTeste}
            onChangeText={setDataTeste}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#bbb"
          />
          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Observações da sessão</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={obs}
            onChangeText={setObs}
            placeholder="Notas gerais do teste..."
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity style={[styles.saveBtn, { marginTop: 10 }]} onPress={saveSession}>
            <Text style={styles.saveBtnText}>Salvar sessão</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de animais */}
        <Text style={[styles.sectionTitle, { marginLeft: 14, marginTop: 16 }]}>
          Vacas testadas ({animais.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
        ) : animais.length === 0 ? (
          <Text style={styles.emptySubText}>Nenhuma vaca. Toque em "+ Vaca".</Text>
        ) : (
          animais.map(a => (
            <View key={a.id} style={[styles.card, { marginHorizontal: 14, marginBottom: 8 }]}>
              <View style={styles.cardMain}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardNome}>{a.nome_vaca}</Text>
                    <View style={[styles.diagBadge, a.diagnostico === '+' ? styles.diagPos : styles.diagNeg]}>
                      <Text style={styles.diagBadgeText}>{a.diagnostico || '?'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardTags}>
                    {['T1','T2','T3','T4'].map((t, i) => {
                      const v = [a.teto_1, a.teto_2, a.teto_3, a.teto_4][i];
                      if (!v) return null;
                      return (
                        <View key={t} style={[styles.tag, v === '+' && styles.tagRed]}>
                          <Text style={[styles.tagText, v === '+' && { color: '#c0392b' }]}>
                            {t}{v}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {!!a.observacoes && (
                    <Text style={styles.cardObs} numberOfLines={1}>{a.observacoes}</Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity onPress={() => openEditAnimal(a)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color="#888" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteAnimal(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.pdfBtn, { margin: 14 }]}
          onPress={handleGerarPdf}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar Relatório PDF</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal de vaca */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAnimalId ? 'Editar Vaca' : 'Adicionar Vaca'}
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
                onChangeText={v => setF('nome_vaca', v)}
                placeholder="Nome ou número"
                placeholderTextColor="#bbb"
              />
              <Text style={styles.fieldLabel}>Diagnóstico CMT</Text>
              <PlusMinus
                value={form.diagnostico}
                onChange={v => setF('diagnostico', v)}
              />
              <Text style={styles.fieldLabel}>Tetos</Text>
              <View style={styles.tetosRow}>
                {(['teto_1','teto_2','teto_3','teto_4'] as const).map((key, i) => (
                  <PlusMinus
                    key={key}
                    label={`T${i + 1}`}
                    value={form[key]}
                    onChange={v => setF(key, v)}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={styles.input}
                value={form.observacoes}
                onChangeText={v => setF('observacoes', v)}
                placeholder="Notas da vaca..."
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }, { marginTop: 16 }]}
                onPress={handleSaveAnimal}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── tela principal (lista de sessões) ───────────────────────────────────────
export default function MastiteSubclinicaScreen() {
  const navigation = useNavigation<any>();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailSessao, setDetailSessao] = useState<Sessao | null>(null);
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [novaData, setNovaData] = useState('');

  const loadSessoes = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = db.getAllSync<Sessao>(
        `SELECT s.*,
          COUNT(a.id) as total_vacas,
          SUM(CASE WHEN a.diagnostico='+' THEN 1 ELSE 0 END) as total_pos
         FROM mastite_subclinica_sessao s
         LEFT JOIN mastite_subclinica_animal a ON a.sessao_id = s.id
         GROUP BY s.id
         ORDER BY s.data_teste DESC`
      );
      setSessoes(rows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessoes(); }, [loadSessoes]);

  async function handleNewSessao() {
    if (!db) return;
    if (!novaData.trim()) {
      Alert.alert('Atenção', 'Informe a data do teste.');
      return;
    }
    setSaving(true);
    try {
      db.runSync(
        `INSERT INTO mastite_subclinica_sessao (propriedade_id, data_teste) VALUES (1, ?)`,
        [novaData]
      );
      setNewModalVisible(false);
      setNovaData('');
      await loadSessoes();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar sessão.');
    } finally { setSaving(false); }
  }

  function confirmDeleteSessao(id: number) {
    Alert.alert('Excluir sessão', 'Isso removerá todos os animais desta sessão. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          if (!db) return;
          try {
            db.runSync(`DELETE FROM mastite_subclinica_animal WHERE sessao_id=?`, [id]);
            db.runSync(`DELETE FROM mastite_subclinica_sessao WHERE id=?`, [id]);
            loadSessoes();
          } catch { Alert.alert('Erro', 'Não foi possível excluir.'); }
        },
      },
    ]);
  }

  // Estatísticas históricas
  const totalSessoes = sessoes.length;
  const ultimaSessao = sessoes[0]?.data_teste ?? '—';
  const totalVacas = sessoes.reduce((s, r) => s + (r.total_vacas || 0), 0);
  const totalPos = sessoes.reduce((s, r) => s + (r.total_pos || 0), 0);

  if (detailSessao) {
    return (
      <SessaoDetail
        sessao={detailSessao}
        onBack={() => setDetailSessao(null)}
        onReload={loadSessoes}
      />
    );
  }

  function renderSessao({ item }: { item: Sessao }) {
    const pct = item.total_vacas ? Math.round(((item.total_pos || 0) / item.total_vacas) * 100) : 0;
    return (
      <TouchableOpacity style={styles.card} onPress={() => setDetailSessao(item)} activeOpacity={0.85}>
        <View style={styles.cardMain}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNome}>{item.data_teste}</Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.total_vacas || 0} vacas</Text>
              </View>
              <View style={[styles.tag, (item.total_pos || 0) > 0 && styles.tagRed]}>
                <Text style={[styles.tagText, (item.total_pos || 0) > 0 && { color: '#c0392b' }]}>
                  {item.total_pos || 0} positivos ({pct}%)
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
            <TouchableOpacity
              onPress={() => confirmDeleteSessao(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mastite Subclínica (CMT)</Text>
          <Text style={styles.headerSub}>PL 02/07 — Controle por sessão</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setNewModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>Nova Sessão</Text>
        </TouchableOpacity>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalSessoes}</Text>
          <Text style={styles.statLabel}>Sessões</Text>
        </View>
        <View style={[styles.statCard, { flex: 1.4 }]}>
          <Text style={[styles.statValue, { fontSize: 12 }]}>{ultimaSessao}</Text>
          <Text style={styles.statLabel}>Última sessão</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalVacas}</Text>
          <Text style={styles.statLabel}>Vacas testadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, totalPos > 0 && { color: '#e74c3c' }]}>{totalPos}</Text>
          <Text style={styles.statLabel}>Positivos</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
      ) : sessoes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flask-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma sessão registrada</Text>
          <Text style={styles.emptySubText}>Toque em "Nova Sessão" para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={sessoes}
          keyExtractor={item => String(item.id)}
          renderItem={renderSessao}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal nova sessão */}
      <Modal visible={newModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContainer, { maxHeight: '40%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Sessão CMT</Text>
              <TouchableOpacity onPress={() => setNewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Data do teste *</Text>
            <TextInput
              style={styles.input}
              value={novaData}
              onChangeText={setNovaData}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#bbb"
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }, { marginTop: 16 }]}
              onPress={handleNewSessao}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Criar Sessão</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
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
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardNome: { fontSize: 15, fontWeight: '700', color: PRIMARY, flex: 1 },
  diagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diagPos: { backgroundColor: '#fdecea' },
  diagNeg: { backgroundColor: '#e8f5e9' },
  diagBadgeText: { fontSize: 14, fontWeight: '700', color: '#333' },
  cardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  tag: { backgroundColor: '#f0f4f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagRed: { backgroundColor: '#fdecea' },
  tagText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  cardObs: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptySubText: { fontSize: 13, color: '#bbb', textAlign: 'center', marginHorizontal: 32, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  pdfHeaderBtn: {
    backgroundColor: '#1a5c24', borderRadius: 8,
    padding: 8, alignItems: 'center', justifyContent: 'center',
  },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a5c24', borderRadius: 12,
    paddingVertical: 13,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
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
  inputMulti: { height: 64, textAlignVertical: 'top' },
  pmGroup: { alignItems: 'center' },
  pmLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '600' },
  pmRow: { flexDirection: 'row', gap: 4 },
  pmBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  pmBtnPos: { backgroundColor: '#fdecea', borderColor: '#e74c3c' },
  pmBtnNeg: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  pmBtnText: { fontSize: 18, fontWeight: '700', color: '#aaa' },
  pmBtnTextActive: { color: '#222' },
  tetosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
