import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import {
  clearPersistedSession,
  getSession,
  savePasswordForOffline,
  updateSession,
  verifyPasswordOffline,
} from '../services/session';
import { api, getMensagemErro } from '../config/api';

const PRIMARY = '#0d2b10';
const noTranslateProps =
  Platform.OS === 'web' ? ({ translate: 'no', className: 'notranslate' } as any) : {};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Configuracoes'>;
};

export default function ConfiguracoesScreen({ navigation }: Props) {
  const initial = getSession();

  // displayed profile state (updates locally after save)
  const [nome, setNomeDisplay] = useState(initial.nome);
  const [email, setEmailDisplay] = useState(initial.email ?? '');
  const [cidade, setCidadeDisplay] = useState(initial.propriedade.cidade ?? '');
  const [estado, setEstadoDisplay] = useState(initial.propriedade.estado ?? '');
  const [focoProdutivo, setFocoProdutivo] = useState<'leite' | 'corte' | 'ambos'>(
    (initial.propriedade.focoProdutivo ?? 'ambos') as 'leite' | 'corte' | 'ambos'
  );

  const iniciais = useMemo(() => {
    const parts = nome.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [nome]);

  // ── Modal: Editar Perfil ─────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editFocoProdutivo, setEditFocoProdutivo] = useState<'leite' | 'corte' | 'ambos'>('ambos');
  const [editCarregando, setEditCarregando] = useState(false);
  const [editErro, setEditErro] = useState('');

  function abrirEditModal() {
    const s = getSession();
    setEditNome(s.nome);
    setEditEmail(s.email ?? '');
    setEditCidade(s.propriedade.cidade ?? '');
    setEditEstado(s.propriedade.estado ?? '');
    setEditFocoProdutivo((s.propriedade.focoProdutivo ?? 'ambos') as 'leite' | 'corte' | 'ambos');
    setEditErro('');
    setShowEditModal(true);
  }

  async function handleSalvarPerfil() {
    if (!editNome.trim()) { setEditErro('O nome é obrigatório.'); return; }
    if (!editEmail.trim()) { setEditErro('O e-mail é obrigatório.'); return; }
    setEditCarregando(true);
    setEditErro('');
    const s = getSession();
    try {
      await Promise.all([
        api.put('/api/auth/perfil', {
          usuarioId: s.id,
          nome: editNome.trim(),
          email: editEmail.trim().toLowerCase(),
        }),
        api.put(`/api/propriedades/${s.propriedadeId}`, {
          cidade: editCidade.trim(),
          estado: editEstado.trim().toUpperCase(),
          focoProdutivo: editFocoProdutivo,
        }),
      ]);
      const novaProp = {
        ...s.propriedade,
        cidade: editCidade.trim(),
        estado: editEstado.trim().toUpperCase(),
        focoProdutivo: editFocoProdutivo,
      };
      await updateSession({
        nome: editNome.trim(),
        email: editEmail.trim().toLowerCase(),
        propriedade: novaProp,
      });
      setNomeDisplay(editNome.trim());
      setEmailDisplay(editEmail.trim().toLowerCase());
      setCidadeDisplay(editCidade.trim());
      setEstadoDisplay(editEstado.trim().toUpperCase());
      setFocoProdutivo(editFocoProdutivo);
      setShowEditModal(false);
    } catch (error) {
      setEditErro(getMensagemErro(error));
    } finally {
      setEditCarregando(false);
    }
  }

  // ── Modal: Alterar Senha ─────────────────────────────────────────────────
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaCarregando, setSenhaCarregando] = useState(false);
  const [senhaErro, setSenhaErro] = useState('');

  async function handleAlterarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setSenhaErro('Preencha todos os campos.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaErro('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (novaSenha.length < 4) {
      setSenhaErro('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    setSenhaCarregando(true);
    setSenhaErro('');
    try {
      await api.put('/api/auth/alterar-senha', {
        usuarioId: getSession().id,
        senhaAtual,
        novaSenha,
      });
      await savePasswordForOffline(novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setShowSenhaModal(false);
    } catch (error) {
      setSenhaErro(getMensagemErro(error));
    } finally {
      setSenhaCarregando(false);
    }
  }

  // ── Modal: Confirmar Sair ────────────────────────────────────────────────
  const [showSairModal, setShowSairModal] = useState(false);

  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [sairErro, setSairErro] = useState('');
  const [sairCarregando, setSairCarregando] = useState(false);

  async function handleConfirmarSair() {
    if (!senhaConfirm) { setSairErro('Digite sua senha.'); return; }
    setSairCarregando(true);
    setSairErro('');
    const ok = await verifyPasswordOffline(senhaConfirm);
    setSairCarregando(false);
    if (!ok) { setSairErro('Senha incorreta.'); return; }
    await clearPersistedSession();
    navigation.replace('Login');
  }

  // ── Modal: Excluir Conta ─────────────────────────────────────────────────
  const [showExcluirModal, setShowExcluirModal] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [excluirErro, setExcluirErro] = useState('');
  const [excluirCarregando, setExcluirCarregando] = useState(false);

  async function handleExcluirConta() {
    if (!senhaExcluir) { setExcluirErro('Digite sua senha para confirmar.'); return; }
    setExcluirCarregando(true);
    setExcluirErro('');
    try {
      const senhaOk = await verifyPasswordOffline(senhaExcluir);
      if (!senhaOk) { setExcluirErro('Senha incorreta.'); setExcluirCarregando(false); return; }
      await api.deleteWithBody('/api/auth/conta', { usuarioId: getSession().id, senha: senhaExcluir });
      await clearPersistedSession();
      navigation.replace('Login');
    } catch (error) {
      setExcluirErro(getMensagemErro(error));
    } finally {
      setExcluirCarregando(false);
    }
  }

  const propriedadeNome = initial.propriedade.nome;
  const usuario = initial.usuario;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY }}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTexts}>
            <Text {...noTranslateProps} style={styles.headerTitle}>Configurações</Text>
            <Text {...noTranslateProps} style={styles.headerSubtitle}>Perfil e preferências</Text>
          </View>
        </View>

        {/* ── Seção Perfil ── */}
        <Text {...noTranslateProps} style={styles.secaoLabel}>PERFIL</Text>
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciais}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text {...noTranslateProps} style={styles.perfilNome} numberOfLines={1}>{nome}</Text>
              <Text {...noTranslateProps} style={styles.perfilEmail} numberOfLines={1}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={15} color="#66746d" />
            <Text {...noTranslateProps} style={styles.infoText} numberOfLines={1}>{propriedadeNome}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color="#66746d" />
            <Text {...noTranslateProps} style={styles.infoText}>
              {[cidade, estado].filter(Boolean).join(' – ') || '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="leaf-outline" size={15} color="#66746d" />
            <Text {...noTranslateProps} style={styles.infoText}>
              {focoProdutivo === 'leite' ? 'Leite / Queijo' : focoProdutivo === 'corte' ? 'Engorda / Corte' : 'Leite e Corte'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editarBtn} onPress={abrirEditModal} activeOpacity={0.85}>
            <Text style={styles.editarBtnText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ── Seção Segurança ── */}
        <Text {...noTranslateProps} style={styles.secaoLabel}>SEGURANÇA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => {
              setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha(''); setSenhaErro('');
              setShowSenhaModal(true);
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#e8f4fd' }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#1565c0" />
              </View>
              <Text {...noTranslateProps} style={styles.menuItemText}>Alterar Senha</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>
        </View>

        {/* ── Seção Conta ── */}
        <Text {...noTranslateProps} style={styles.secaoLabel}>CONTA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => { setSenhaConfirm(''); setSairErro(''); setShowSairModal(true); }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#fdecea' }]}>
                <Ionicons name="log-out-outline" size={18} color="#c62828" />
              </View>
              <Text {...noTranslateProps} style={[styles.menuItemText, styles.menuItemTextSair]}>
                Sair da Conta
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>
        </View>

        {/* ── Seção Zona de Perigo ── */}
        <Text {...noTranslateProps} style={styles.secaoLabel}>ZONA DE PERIGO</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => { setSenhaExcluir(''); setExcluirErro(''); setShowExcluirModal(true); }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#fdecea' }]}>
                <Ionicons name="trash-outline" size={18} color="#c62828" />
              </View>
              <Text {...noTranslateProps} style={[styles.menuItemText, styles.menuItemTextSair]}>
                Excluir Conta
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ══ Modal: Editar Perfil ══ */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>

            <Text style={styles.fieldLabel}>Usuário (não editável)</Text>
            <View style={styles.inputReadOnly}>
              <Text style={styles.inputReadOnlyText}>{usuario}</Text>
            </View>

            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput
              style={styles.modalInput}
              value={editNome}
              onChangeText={t => { setEditNome(t); setEditErro(''); }}
              placeholder="Nome completo"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>E-mail</Text>
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={t => { setEditEmail(t); setEditErro(''); }}
              placeholder="E-mail"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Cidade</Text>
            <TextInput
              style={styles.modalInput}
              value={editCidade}
              onChangeText={t => { setEditCidade(t); setEditErro(''); }}
              placeholder="Cidade"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>Estado (UF)</Text>
            <TextInput
              style={styles.modalInput}
              value={editEstado}
              onChangeText={t => { setEditEstado(t.toUpperCase()); setEditErro(''); }}
              placeholder="UF"
              placeholderTextColor="#bbb"
              maxLength={2}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Foco Produtivo da Fazenda</Text>
            <View style={styles.chipsRow}>
              {([
                { value: 'leite', label: '🥛 Leite / Queijo' },
                { value: 'corte', label: '🥩 Engorda / Corte' },
                { value: 'ambos', label: '🐄 Ambos' },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, editFocoProdutivo === opt.value && styles.chipAtivo]}
                  onPress={() => setEditFocoProdutivo(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, editFocoProdutivo === opt.value && styles.chipTextoAtivo]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editErro ? <Text style={styles.erroTexto}>{editErro}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancelar]}
                onPress={() => setShowEditModal(false)}
                disabled={editCarregando}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSalvar]}
                onPress={handleSalvarPerfil}
                disabled={editCarregando}
              >
                {editCarregando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSalvarText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Alterar Senha ══ */}
      <Modal visible={showSenhaModal} transparent animationType="slide" onRequestClose={() => setShowSenhaModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Alterar Senha</Text>

            <Text style={styles.fieldLabel}>Senha Atual</Text>
            <TextInput
              style={styles.modalInput}
              value={senhaAtual}
              onChangeText={t => { setSenhaAtual(t); setSenhaErro(''); }}
              secureTextEntry
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              placeholder="Senha atual"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>Nova Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={novaSenha}
              onChangeText={t => { setNovaSenha(t); setSenhaErro(''); }}
              secureTextEntry
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
              placeholder="Nova senha"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>Confirmar Nova Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmarSenha}
              onChangeText={t => { setConfirmarSenha(t); setSenhaErro(''); }}
              secureTextEntry
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
              placeholder="Confirmar nova senha"
              placeholderTextColor="#bbb"
            />

            {senhaErro ? <Text style={styles.erroTexto}>{senhaErro}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancelar]}
                onPress={() => setShowSenhaModal(false)}
                disabled={senhaCarregando}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSalvar]}
                onPress={handleAlterarSenha}
                disabled={senhaCarregando}
              >
                {senhaCarregando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSalvarText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Confirmar Sair ══ */}
      <Modal visible={showSairModal} transparent animationType="slide" onRequestClose={() => setShowSairModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sair da Conta</Text>
            <Text style={styles.modalDescricao}>
              Por segurança, confirme sua senha para sair.
            </Text>

            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              style={styles.modalInput}
              value={senhaConfirm}
              onChangeText={t => { setSenhaConfirm(t); setSairErro(''); }}
              secureTextEntry
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              placeholderTextColor="#bbb"
            />

            {sairErro ? <Text style={styles.erroTexto}>{sairErro}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancelar]}
                onPress={() => setShowSairModal(false)}
                disabled={sairCarregando}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#c62828', flex: 1 }]}
                onPress={handleConfirmarSair}
                disabled={sairCarregando}
              >
                {sairCarregando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSalvarText}>Confirmar e Sair</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Excluir Conta ══ */}
      <Modal visible={showExcluirModal} transparent animationType="slide" onRequestClose={() => setShowExcluirModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Excluir Conta</Text>
            <Text style={styles.modalDescricao}>
              Esta ação é irreversível. Seus dados pessoais serão removidos conforme a LGPD (Art. 18, VI).
            </Text>

            <Text style={styles.fieldLabel}>Confirme sua senha</Text>
            <TextInput
              style={styles.modalInput}
              value={senhaExcluir}
              onChangeText={t => { setSenhaExcluir(t); setExcluirErro(''); }}
              secureTextEntry
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              placeholderTextColor="#bbb"
            />

            {excluirErro ? <Text style={styles.erroTexto}>{excluirErro}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancelar]}
                onPress={() => setShowExcluirModal(false)}
                disabled={excluirCarregando}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#c62828', flex: 1 }]}
                onPress={handleExcluirConta}
                disabled={excluirCarregando}
              >
                {excluirCarregando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSalvarText}>Excluir Conta</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f0',
  },
  content: {
    paddingBottom: 40,
  },
  // ── Header
  header: {
    backgroundColor: PRIMARY,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a8d5b5',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  // ── Seção
  secaoLabel: {
    color: '#8f9892',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  // ── Perfil
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  avatarInfo: {
    flex: 1,
  },
  perfilNome: {
    color: '#1a2e1d',
    fontSize: 16,
    fontWeight: '800',
  },
  perfilEmail: {
    color: '#66746d',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f4f0',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
  },
  infoText: {
    color: '#66746d',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  editarBtn: {
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // ── Menu item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    color: '#1a2e1d',
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemTextSair: {
    color: '#c62828',
  },
  // ── Modais
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    color: '#1a2e1d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalDescricao: {
    color: '#66746d',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  fieldLabel: {
    color: '#66746d',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 10,
  },
  inputReadOnly: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  inputReadOnlyText: {
    color: '#999',
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1a2e1d',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  erroTexto: {
    color: '#c62828',
    fontSize: 13,
    marginTop: 8,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelar: {
    backgroundColor: '#f0f4f0',
    flex: 0.85,
  },
  modalBtnSalvar: {
    backgroundColor: PRIMARY,
    flex: 1,
  },
  modalBtnCancelarText: {
    color: '#66746d',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnSalvarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // ── Chips foco produtivo
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderColor: '#e0e0e0',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipAtivo: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    color: '#66746d',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: '#fff',
  },
});
