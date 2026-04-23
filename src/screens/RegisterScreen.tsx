import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import InputField from '../components/InputField';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
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

  const estadoSelecionado = ESTADOS.find(e => e.sigla === estado);

  function validar(): string | null {
    if (!nomeCompleto.trim()) return 'Nome completo é obrigatório.';
    if (!email.trim()) return 'E-mail é obrigatório.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido.';
    if (!nomeProp.trim()) return 'Nome da propriedade é obrigatório.';
    if (!cidade.trim()) return 'Cidade é obrigatória.';
    if (!estado) return 'Selecione um estado.';
    if (!usuario.trim()) return 'Usuário é obrigatório.';
    if (!/^[a-zA-Z0-9_]+$/.test(usuario.trim()))
      return 'Usuário não pode ter espaços ou caracteres especiais.';
    if (!senha) return 'Senha é obrigatória.';
    if (senha.length < 4) return 'Senha deve ter pelo menos 4 caracteres.';
    if (senha !== confirmarSenha) return 'Senha e confirmação não coincidem.';
    return null;
  }

  async function handleCadastrar() {
    if (carregando) return;

    const erro = validar();
    if (erro) {
      Alert.alert('Atenção', erro);
      return;
    }

    setCarregando(true);
    try {
      await api.post('/api/auth/register', {
        nome: nomeCompleto.trim(),
        email: email.trim().toLowerCase(),
        usuario: usuario.trim().toLowerCase(),
        senha,
        propriedade: {
          nome: nomeProp.trim(),
          cidade: cidade.trim(),
          estado,
        },
      });

      Alert.alert(
        'Sucesso',
        'Cadastro realizado com sucesso! Faça login para continuar.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error) {
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.cabecalho}>
          <Text style={styles.logo}>🐄</Text>
          <Text style={styles.titulo}>Criar Conta</Text>
          <Text style={styles.subtitulo}>AgroControl</Text>
        </View>

        <View style={styles.form}>
          {/* Dados pessoais */}
          <Text style={styles.secao}>Dados Pessoais</Text>

          <InputField
            label="Nome Completo"
            required
            placeholder="Ex: João da Silva"
            value={nomeCompleto}
            onChangeText={setNomeCompleto}
          />

          <InputField
            label="E-mail"
            required
            placeholder="Ex: joao@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {/* Dados da propriedade */}
          <Text style={[styles.secao, { marginTop: 20 }]}>Dados da Propriedade</Text>

          <InputField
            label="Nome da Propriedade"
            required
            placeholder="Ex: Fazenda Boa Vista"
            value={nomeProp}
            onChangeText={setNomeProp}
          />

          <InputField
            label="Cidade"
            required
            placeholder="Ex: Uberaba"
            value={cidade}
            onChangeText={setCidade}
          />

          {/* Seletor de Estado */}
          <View style={{ marginBottom: 4 }}>
            <Text style={styles.label}>
              Estado <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.seletor}
              onPress={() => setModalEstado(true)}
            >
              <Text style={estadoSelecionado ? styles.seletorTexto : styles.seletorPlaceholder}>
                {estadoSelecionado
                  ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
                  : 'Selecione o estado...'}
              </Text>
              <Text style={styles.seletorIcone}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Credenciais */}
          <Text style={[styles.secao, { marginTop: 20 }]}>Credenciais de Acesso</Text>

          <InputField
            label="Usuário"
            required
            placeholder="Ex: joao123 (sem espaços)"
            autoCapitalize="none"
            value={usuario}
            onChangeText={setUsuario}
          />

          <InputField
            label="Senha"
            required
            placeholder="Mínimo 4 caracteres"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          <InputField
            label="Confirmar Senha"
            required
            placeholder="Repita a senha"
            secureTextEntry
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />

          <TouchableOpacity
            style={[styles.botao, carregando && styles.botaoDesabilitado]}
            onPress={handleCadastrar}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botaoTexto}>Cadastrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkLogin}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.linkLoginTexto}>Já tenho conta — Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal seletor de estado */}
      <Modal visible={modalEstado} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>Selecione o Estado</Text>
              <TouchableOpacity onPress={() => setModalEstado(false)}>
                <Text style={styles.modalFechar}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={ESTADOS}
              keyExtractor={item => item.sigla}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.sigla === estado && styles.modalItemSelecionado,
                  ]}
                  onPress={() => {
                    setEstado(item.sigla);
                    setModalEstado(false);
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
  container: { flex: 1, backgroundColor: '#1a3c2e' },
  content: { paddingBottom: 40 },
  cabecalho: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  logo: { fontSize: 44, marginBottom: 8 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitulo: { fontSize: 14, color: '#a8d5b5', marginTop: 2 },
  form: {
    backgroundColor: '#f0f4f0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 600,
  },
  secao: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2d6a4f',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  obrigatorio: { color: '#c0392b' },
  seletor: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seletorTexto: { fontSize: 15, color: '#333' },
  seletorPlaceholder: { fontSize: 15, color: '#bbb' },
  seletorIcone: { fontSize: 16, color: '#888' },
  botao: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  botaoDesabilitado: { backgroundColor: '#7aab95' },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkLogin: { alignItems: 'center', paddingVertical: 16 },
  linkLoginTexto: { color: '#2d6a4f', fontWeight: '600', fontSize: 14 },
  // Modal
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
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#1a3c2e' },
  modalFechar: { fontSize: 18, color: '#888', paddingHorizontal: 4 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalItemSelecionado: { backgroundColor: '#e8f5ee' },
  modalItemSigla: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d6a4f',
    width: 32,
  },
  modalItemNome: { fontSize: 15, color: '#333' },
  modalItemNomeSelecionado: { color: '#1a3c2e', fontWeight: '600' },
  separador: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 20 },
});
