import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Dimensions, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#1a3d1f';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

type Erros = {
  nomeCompleto?: string;
  email?: string;
  nomeProp?: string;
  cidade?: string;
  estado?: string;
  usuario?: string;
  senha?: string;
  confirmarSenha?: string;
};

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export default function RegisterScreen({ navigation }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [nomeProp, setNomeProp] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [modalEstado, setModalEstado] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');

  const estadoSelecionado = ESTADOS.find(e => e.sigla === estado);

  function limparErro(campo: keyof Erros) {
    setErros(prev => ({ ...prev, [campo]: undefined }));
  }

  function validar(): boolean {
    const novos: Erros = {};
    if (!nomeCompleto.trim()) novos.nomeCompleto = 'Nome completo é obrigatório.';
    if (!email.trim()) novos.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) novos.email = 'Informe um e-mail válido.';
    if (!nomeProp.trim()) novos.nomeProp = 'Nome da propriedade é obrigatório.';
    if (!cidade.trim()) novos.cidade = 'Cidade é obrigatória.';
    if (!estado) novos.estado = 'Selecione um estado.';
    if (!usuario.trim()) novos.usuario = 'Usuário é obrigatório.';
    else if (!/^[a-zA-Z0-9_]+$/.test(usuario.trim())) novos.usuario = 'Sem espaços ou caracteres especiais.';
    if (!senha) novos.senha = 'Senha é obrigatória.';
    else if (senha.length < 4) novos.senha = 'Mínimo 4 caracteres.';
    if (!confirmarSenha) novos.confirmarSenha = 'Confirme sua senha.';
    else if (senha !== confirmarSenha) novos.confirmarSenha = 'Senhas não coincidem.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function handleCadastrar() {
    if (carregando) return;
    setErroGeral('');
    if (!validar()) return;
    setCarregando(true);
    try {
      await api.post('/api/auth/register', {
        nome: nomeCompleto.trim(),
        email: email.trim().toLowerCase(),
        usuario: usuario.trim().toLowerCase(),
        senha,
        propriedade: { nome: nomeProp.trim(), cidade: cidade.trim(), estado },
      });
      Alert.alert(
        'Cadastro realizado!',
        'Sua conta foi criada com sucesso. Faça login para continuar.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
      );
    } catch (error) {
      setErroGeral(getMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: PRIMARY }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabeçalho verde ── */}
        <View style={styles.headerWrapper}>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require('../../assets/Logomenor.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

        </View>

        {/* ── Formulário ── */}
        <View style={styles.form}>

          {/* ── Seção 1: Dados Pessoais ── */}
          <View style={styles.secaoHeader}>
            <Ionicons name="person" size={15} color={PRIMARY} />
            <Text style={styles.secaoTitulo}>DADOS PESSOAIS</Text>
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Nome Completo <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.nomeCompleto && styles.inputBoxErro]}>
              <Ionicons name="person-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                value={nomeCompleto}
                onChangeText={t => { setNomeCompleto(t); limparErro('nomeCompleto'); }}
              />
            </View>
            {erros.nomeCompleto ? <Text style={styles.erro}>{erros.nomeCompleto}</Text> : null}
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>E-mail <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.email && styles.inputBoxErro]}>
              <Ionicons name="mail-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={t => { setEmail(t); limparErro('email'); }}
              />
            </View>
            {erros.email ? <Text style={styles.erro}>{erros.email}</Text> : null}
          </View>

          {/* ── Seção 2: Dados da Propriedade ── */}
          <View style={[styles.secaoHeader, styles.secaoMargem]}>
            <Ionicons name="home" size={15} color={PRIMARY} />
            <Text style={styles.secaoTitulo}>DADOS DA PROPRIEDADE</Text>
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Nome da Propriedade <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.nomeProp && styles.inputBoxErro]}>
              <Ionicons name="home-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                value={nomeProp}
                onChangeText={t => { setNomeProp(t); limparErro('nomeProp'); }}
              />
            </View>
            {erros.nomeProp ? <Text style={styles.erro}>{erros.nomeProp}</Text> : null}
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Cidade <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.cidade && styles.inputBoxErro]}>
              <Ionicons name="location-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                value={cidade}
                onChangeText={t => { setCidade(t); limparErro('cidade'); }}
              />
            </View>
            {erros.cidade ? <Text style={styles.erro}>{erros.cidade}</Text> : null}
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Estado <Text style={styles.obrigatorio}>*</Text></Text>
            <TouchableOpacity
              style={[styles.inputBox, erros.estado && styles.inputBoxErro]}
              onPress={() => setModalEstado(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <Text style={[styles.input, styles.inputTexto, !estado && { color: '#bbb' }]}>
                {estadoSelecionado
                  ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
                  : 'Selecione o estado...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#888" />
            </TouchableOpacity>
            {erros.estado ? <Text style={styles.erro}>{erros.estado}</Text> : null}
          </View>

          {/* ── Seção 3: Credenciais de Acesso ── */}
          <View style={[styles.secaoHeader, styles.secaoMargem]}>
            <Ionicons name="lock-closed" size={15} color={PRIMARY} />
            <Text style={styles.secaoTitulo}>CREDENCIAIS DE ACESSO</Text>
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Usuário <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.usuario && styles.inputBoxErro]}>
              <Ionicons name="person-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                value={usuario}
                onChangeText={t => { setUsuario(t); limparErro('usuario'); }}
              />
            </View>
            {erros.usuario ? <Text style={styles.erro}>{erros.usuario}</Text> : null}
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Senha <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.senha && styles.inputBoxErro]}>
              <Ionicons name="lock-closed-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                secureTextEntry={!senhaVisivel}
                value={senha}
                onChangeText={t => { setSenha(t); limparErro('senha'); }}
              />
              <TouchableOpacity
                onPress={() => setSenhaVisivel(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {erros.senha ? <Text style={styles.erro}>{erros.senha}</Text> : null}
          </View>

          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Confirmar Senha <Text style={styles.obrigatorio}>*</Text></Text>
            <View style={[styles.inputBox, erros.confirmarSenha && styles.inputBoxErro]}>
              <Ionicons name="lock-closed-outline" size={18} color={PRIMARY} style={styles.inputIcone} />
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#bbb"
                secureTextEntry={!confirmarSenhaVisivel}
                value={confirmarSenha}
                onChangeText={t => { setConfirmarSenha(t); limparErro('confirmarSenha'); }}
              />
              <TouchableOpacity
                onPress={() => setConfirmarSenhaVisivel(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={confirmarSenhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {erros.confirmarSenha ? <Text style={styles.erro}>{erros.confirmarSenha}</Text> : null}
          </View>

          {erroGeral ? <Text style={styles.erroGeral}>{erroGeral}</Text> : null}

          {/* ── Botão Cadastrar ── */}
          <TouchableOpacity
            style={[styles.botao, carregando && styles.botaoDesabilitado]}
            onPress={handleCadastrar}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botaoTexto}>Cadastrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkLogin} onPress={() => navigation.replace('Login')}>
            <Text style={styles.linkLoginTexto}>Já tenho conta — Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modal seletor de estado ── */}
      <Modal visible={modalEstado} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>Selecione o Estado</Text>
              <TouchableOpacity onPress={() => setModalEstado(false)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ESTADOS}
              keyExtractor={item => item.sigla}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.sigla === estado && styles.modalItemSelecionado]}
                  onPress={() => {
                    setEstado(item.sigla);
                    setModalEstado(false);
                    limparErro('estado');
                  }}
                >
                  <Text style={styles.modalItemSigla}>{item.sigla}</Text>
                  <Text style={[
                    styles.modalItemNome,
                    item.sigla === estado && styles.modalItemNomeSelecionado,
                  ]}>
                    {item.nome}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separador} />}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  // ── Header ──
  headerWrapper: {
    backgroundColor: PRIMARY,
  },
  btnVoltar: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  header: {
    minHeight: SCREEN_HEIGHT * 0.30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 28,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 14,
  },
  appNome: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  // ── Formulário ──
  form: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 52,
  },
  // ── Seção ──
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  secaoMargem: {
    marginTop: 16,
  },
  secaoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 1,
  },
  // ── Campo ──
  campoWrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  obrigatorio: {
    color: '#d32f2f',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputBoxErro: {
    borderColor: '#d32f2f',
  },
  inputIcone: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 13,
  },
  inputTexto: {
    paddingVertical: 13,
  },
  erro: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  erroGeral: {
    color: '#d32f2f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  // ── Botão ──
  botao: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  botaoDesabilitado: {
    backgroundColor: '#4a6b4d',
  },
  botaoTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  linkLogin: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkLoginTexto: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
  // ── Modal ──
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalItemSelecionado: {
    backgroundColor: '#e8f5ee',
  },
  modalItemSigla: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    width: 32,
  },
  modalItemNome: {
    fontSize: 15,
    color: '#333',
  },
  modalItemNomeSelecionado: {
    color: PRIMARY,
    fontWeight: '600',
  },
  separador: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
});
