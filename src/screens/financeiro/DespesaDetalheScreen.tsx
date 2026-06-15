import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { getSession } from '../../services/session';
import { formatarDataBrasileira, validarDataCompleta } from '../../utils/animalHealth';
import { CATEGORIAS_IMA_DESPESA, SUBCATEGORIAS_IMA } from '../../database/fazendaSchema';
import * as SQLite from 'expo-sqlite';

const dbLocal = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const PRIMARY = '#0d2b10';
const ACCENT = '#e67e22';
const BG = '#f4f6f4';
const CARD = '#fff';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DespesaDetalhe'>;
};

type DespesaDetalhe = {
  id: number;
  propriedade_id: number;
  data_compra: string;
  data_pagamento?: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  categoria_ima?: string | null;
  subcategoria_ima?: string | null;
};

type FormState = {
  data_compra: string;
  data_pagamento: string;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
  valor_total: string;
  categoria_ima: string;
  subcategoria_ima: string;
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const LABEL_MAP = Object.fromEntries(CATEGORIAS_IMA_DESPESA.map(c => [c.value, c.label]));

function hojeBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function brToIso(br: string) {
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
}

function isoToBr(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10).split('-').reverse().join('/');
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formInicial: FormState = {
  data_compra: hojeBr(),
  data_pagamento: '',
  descricao: '',
  quantidade: '1',
  valor_unitario: '',
  valor_total: '',
  categoria_ima: '',
  subcategoria_ima: '',
};

export default function DespesaDetalheScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [despesas, setDespesas] = useState<DespesaDetalhe[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<DespesaDetalhe | null>(null);
  const [form, setForm] = useState<FormState>(formInicial);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    if (!dbLocal) return;
    const prefix = `${ano}-${String(mes).padStart(2,'0')}`;
    try {
      const rows = dbLocal.getAllSync(
        `SELECT * FROM despesa_detalhe WHERE propriedade_id = ? AND data_compra LIKE ? ORDER BY data_compra DESC`,
        [propriedadeId, `${prefix}%`]
      ) as DespesaDetalhe[];
      setDespesas(rows);
    } catch {}
  }, [mes, ano, propriedadeId]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...formInicial, data_compra: hojeBr() });
    setModalVisible(true);
  }

  function abrirEditar(d: DespesaDetalhe) {
    setEditando(d);
    setForm({
      data_compra: isoToBr(d.data_compra),
      data_pagamento: isoToBr(d.data_pagamento),
      descricao: d.descricao,
      quantidade: String(d.quantidade),
      valor_unitario: String(d.valor_unitario),
      valor_total: String(d.valor_total),
      categoria_ima: d.categoria_ima ?? '',
      subcategoria_ima: d.subcategoria_ima ?? '',
    });
    setModalVisible(true);
  }

  function calcTotal(f: FormState) {
    const q = parseFloat(f.quantidade.replace(',', '.')) || 0;
    const v = parseFloat(f.valor_unitario.replace(',', '.')) || 0;
    if (q > 0 && v > 0) return String((q * v).toFixed(2));
    return f.valor_total;
  }

  function onQtdChange(v: string) {
    const next = { ...form, quantidade: v };
    setForm({ ...next, valor_total: calcTotal(next) });
  }

  function onVuChange(v: string) {
    const next = { ...form, valor_unitario: v };
    setForm({ ...next, valor_total: calcTotal(next) });
  }

  function salvar() {
    if (!dbLocal) return;
    if (!form.descricao.trim()) { Alert.alert('Atenção', 'Informe a descrição.'); return; }
    if (!validarDataCompleta(form.data_compra)) { Alert.alert('Atenção', 'Data da compra inválida (DD/MM/AAAA).'); return; }
    if (form.data_pagamento && !validarDataCompleta(form.data_pagamento)) { Alert.alert('Atenção', 'Data de pagamento inválida (DD/MM/AAAA).'); return; }
    const qtd = parseFloat(form.quantidade.replace(',', '.')) || 1;
    const vu = parseFloat(form.valor_unitario.replace(',', '.')) || 0;
    const vt = parseFloat(form.valor_total.replace(',', '.')) || vu * qtd;
    if (vt <= 0) { Alert.alert('Atenção', 'Informe o valor total.'); return; }
    setSalvando(true);
    try {
      if (editando) {
        dbLocal.runSync(
          `UPDATE despesa_detalhe SET data_compra=?, data_pagamento=?, descricao=?, quantidade=?, valor_unitario=?, valor_total=?, categoria_ima=?, subcategoria_ima=?, sync_status='pending' WHERE id=?`,
          [brToIso(form.data_compra), form.data_pagamento ? brToIso(form.data_pagamento) : null, form.descricao.trim(), qtd, vu, vt, form.categoria_ima || null, form.subcategoria_ima || null, editando.id]
        );
      } else {
        dbLocal.runSync(
          `INSERT INTO despesa_detalhe (propriedade_id, data_compra, data_pagamento, descricao, quantidade, valor_unitario, valor_total, categoria_ima, subcategoria_ima, sync_status) VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
          [propriedadeId, brToIso(form.data_compra), form.data_pagamento ? brToIso(form.data_pagamento) : null, form.descricao.trim(), qtd, vu, vt, form.categoria_ima || null, form.subcategoria_ima || null]
        );
      }
      setModalVisible(false);
      setForm({ ...formInicial, data_compra: hojeBr() });
      carregar();
    } catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  }

  function excluir(id: number) {
    Alert.alert('Excluir', 'Deseja excluir esta despesa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => {
        try { dbLocal?.runSync('DELETE FROM despesa_detalhe WHERE id=?', [id]); carregar(); } catch {}
      }},
    ]);
  }

  const totalGasto = despesas.reduce((s, d) => s + d.valor_total, 0);

  const porCategoria = CATEGORIAS_IMA_DESPESA.map(c => ({
    label: c.label,
    total: despesas.filter(d => d.categoria_ima === c.value).reduce((s, d) => s + d.valor_total, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);

  const subcats = form.categoria_ima ? (SUBCATEGORIAS_IMA[form.categoria_ima] ?? []) : [];

  return (
    <SafeAreaView style={[s.page, { backgroundColor: PRIMARY }]} edges={['top','left','right']}>
      <StatusBar style="light" />
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Text style={s.voltarTxt}>{'←'} Voltar</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.titulo}>Despesas Detalhadas</Text>
            <TouchableOpacity style={s.btnNovo} onPress={abrirNovo}>
              <Text style={s.btnNovoTxt}>+ Nova</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitulo}>Período</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {MESES.map((m, i) => (
              <TouchableOpacity key={m} style={[s.chip, mes === i+1 && s.chipAtivo]} onPress={() => setMes(i+1)}>
                <Text style={[s.chipTxt, mes === i+1 && s.chipAtivoTxt]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[ano-1, ano, ano+1].map(y => (
              <TouchableOpacity key={y} style={[s.chip, ano === y && s.chipAtivo]} onPress={() => setAno(y)}>
                <Text style={[s.chipTxt, ano === y && s.chipAtivoTxt]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitulo}>Totais do Período</Text>
          <Text style={s.totalPrincipal}>R$ {fmt(totalGasto)}</Text>
          {porCategoria.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {porCategoria.map(c => (
                <View key={c.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Text style={s.catLabel}>{c.label}</Text>
                  <Text style={s.catValor}>R$ {fmt(c.total)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitulo}>Lançamentos ({despesas.length})</Text>
          {despesas.length === 0 ? (
            <Text style={s.vazio}>Nenhuma despesa registrada neste período.</Text>
          ) : despesas.map(d => (
            <View key={d.id} style={s.item}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemDesc}>{d.descricao}</Text>
                  <Text style={s.itemSub}>
                    {isoToBr(d.data_compra)}{d.data_pagamento ? ` · Pago: ${isoToBr(d.data_pagamento)}` : ''}
                  </Text>
                  <Text style={s.itemCalc}>
                    {d.quantidade} × R$ {fmt(d.valor_unitario)} = <Text style={{ fontWeight: '800' }}>R$ {fmt(d.valor_total)}</Text>
                  </Text>
                  {d.categoria_ima && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{LABEL_MAP[d.categoria_ima] ?? d.categoria_ima}</Text>
                    </View>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity onPress={() => abrirEditar(d)} style={s.btnEdit}>
                    <Text style={s.btnEditTxt}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => excluir(d.id)} style={s.btnDel}>
                    <Text style={s.btnDelTxt}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalFundo}>
            <ScrollView style={s.modalCaixa} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitulo}>{editando ? 'Editar Despesa' : 'Nova Despesa'}</Text>

              <FLabel>Data da compra</FLabel>
              <FInput value={form.data_compra} onChangeText={v => setForm(f => ({ ...f, data_compra: formatarDataBrasileira(v) }))} keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />

              <FLabel>Data de pagamento (opcional)</FLabel>
              <FInput value={form.data_pagamento} onChangeText={v => setForm(f => ({ ...f, data_pagamento: formatarDataBrasileira(v) }))} keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" />

              <FLabel>Descrição</FLabel>
              <FInput value={form.descricao} onChangeText={v => setForm(f => ({ ...f, descricao: v }))} placeholder="Ex: Ração concentrada" />

              <FLabel>Quantidade</FLabel>
              <FInput value={form.quantidade} onChangeText={onQtdChange} keyboardType="decimal-pad" placeholder="1" />

              <FLabel>Valor unitário R$</FLabel>
              <FInput value={form.valor_unitario} onChangeText={onVuChange} keyboardType="decimal-pad" placeholder="0,00" />

              <FLabel>Valor total R$ (calculado)</FLabel>
              <FInput value={form.valor_total} onChangeText={v => setForm(f => ({ ...f, valor_total: v }))} keyboardType="decimal-pad" placeholder="0,00" />

              <FLabel>Categoria IMA</FLabel>
              <View style={s.chips}>
                {CATEGORIAS_IMA_DESPESA.map(c => (
                  <TouchableOpacity key={c.value} style={[s.chip, form.categoria_ima === c.value && s.chipAtivo]}
                    onPress={() => setForm(f => ({ ...f, categoria_ima: c.value, subcategoria_ima: '' }))}>
                    <Text style={[s.chipTxt, form.categoria_ima === c.value && s.chipAtivoTxt]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {subcats.length > 0 && (
                <>
                  <FLabel>Subcategoria IMA</FLabel>
                  <View style={s.chips}>
                    {subcats.map(sc => (
                      <TouchableOpacity key={sc} style={[s.chip, form.subcategoria_ima === sc && s.chipAtivo]}
                        onPress={() => setForm(f => ({ ...f, subcategoria_ima: sc }))}>
                        <Text style={[s.chipTxt, form.subcategoria_ima === sc && s.chipAtivoTxt]}>{sc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={s.modalBotoes}>
                <TouchableOpacity style={s.btnCancelar} onPress={() => setModalVisible(false)} disabled={salvando}>
                  <Text style={s.btnCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSalvar} onPress={salvar} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSalvarTxt}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function FLabel({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

function FInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      style={s.input}
      placeholderTextColor="#aab4aa"
      {...props}
    />
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: PRIMARY, paddingTop: 12, paddingBottom: 18, paddingHorizontal: 20 },
  voltar: { marginBottom: 8 },
  voltarTxt: { color: '#a8d5b5', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800', flex: 1 },
  btnNovo: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnNovoTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  card: { backgroundColor: CARD, borderRadius: 14, margin: 16, marginBottom: 0, padding: 16 },
  cardTitulo: { color: PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  totalPrincipal: { color: PRIMARY, fontSize: 26, fontWeight: '900' },
  catLabel: { color: '#555', fontSize: 13 },
  catValor: { color: PRIMARY, fontSize: 13, fontWeight: '700' },
  chip: { backgroundColor: '#e8f0e8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4 },
  chipAtivo: { backgroundColor: PRIMARY },
  chipTxt: { color: PRIMARY, fontSize: 12, fontWeight: '600' },
  chipAtivoTxt: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  vazio: { color: '#9aa59a', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  item: { borderTopWidth: 1, borderTopColor: '#eef2ee', paddingVertical: 12 },
  itemDesc: { color: '#1a2e1a', fontSize: 15, fontWeight: '700' },
  itemSub: { color: '#778c77', fontSize: 12, marginTop: 2 },
  itemCalc: { color: '#334a33', fontSize: 13, marginTop: 3 },
  badge: { backgroundColor: '#e8f0fe', borderRadius: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  badgeTxt: { color: '#1a56db', fontSize: 11, fontWeight: '700' },
  btnEdit: { backgroundColor: '#e8f5ee', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  btnEditTxt: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
  btnDel: { backgroundColor: '#fdecea', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  btnDelTxt: { color: '#c0392b', fontSize: 12, fontWeight: '700' },
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalCaixa: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalContent: { padding: 20, paddingBottom: 32 },
  modalTitulo: { color: PRIMARY, fontSize: 17, fontWeight: '800', marginBottom: 16 },
  label: { color: PRIMARY, fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#f0f4f0', borderRadius: 10, color: '#1a2e1a', fontSize: 15, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 2 },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancelar: { backgroundColor: '#eee', borderRadius: 12, flex: 1, paddingVertical: 13, alignItems: 'center' },
  btnCancelarTxt: { color: '#555', fontWeight: '700' },
  btnSalvar: { backgroundColor: PRIMARY, borderRadius: 12, flex: 1, paddingVertical: 13, alignItems: 'center' },
  btnSalvarTxt: { color: '#fff', fontWeight: '800' },
});
