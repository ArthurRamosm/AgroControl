import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, ScrollView, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { setSession } from '../services/session';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#1a3d1f';

type LoginResponse = {
  sucesso: boolean;
  nome?: string;
  propriedadeId?: number;
  mensagem?: string;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState('');

  async function handleLogin() {
    if (carregando) return;
    setErro('');
    if (!usuario.trim() || !senha.trim()) {
      setErro('Preencha usuário e senha.');
      return;
    }
    setCarregando(true);
    try {
      const resultado = await api.post<LoginResponse>('/api/auth/login', {
        usuario: usuario.trim(),
        senha: senha.trim(),
      });
      setSession({
        propriedadeId: resultado.propriedadeId!,
        nome: resultado.nome ?? usuario.trim(),
      });
      navigation.replace('Home');
    } catch (error) {
      setErro(getMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/Logoimagem.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appNome}>AgroControl</Text>
            <Text style={styles.subtitulo}>— TECNOLOGIA QUE FAZ O CAMPO EVOLUIR —</Text>
          </View>

        </View>


        <View style={styles.form}>
          <View style={styles.inputLinha}>
            <Ionicons name="person-outline" size={20} color={PRIMARY} style={styles.inputIcone} />
            <TextInput
              style={styles.input}
              placeholder="Usuário"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              value={usuario}
              onChangeText={t => { setUsuario(t); setErro(''); }}
            />
            {usuario.length > 0 && (
              <Ionicons name="checkmark" size={22} color={PRIMARY} />
            )}
          </View>

          <View style={styles.inputLinha}>
            <Ionicons name="lock-closed-outline" size={20} color={PRIMARY} style={styles.inputIcone} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#bbb"
              secureTextEntry={!senhaVisivel}
              value={senha}
              onChangeText={t => { setSenha(t); setErro(''); }}
            />
            <TouchableOpacity
              onPress={() => setSenhaVisivel(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

 
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <TouchableOpacity style={styles.esqueceuBtn}>
            <Text style={styles.esqueceuTexto}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoEntrar, carregando && styles.botaoDesabilitado]}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botaoEntrarTexto}>Entrar</Text>
            }
          </TouchableOpacity>

          <View style={styles.divisor}>
            <View style={styles.divisorLinha} />
            <Text style={styles.divisorTexto}>ou</Text>
            <View style={styles.divisorLinha} />
          </View>

          <TouchableOpacity
            style={styles.botaoCadastro}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoCadastroTexto}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY,
  },
  scroll: {
    flexGrow: 1,
  },
  headerWrapper: {
    backgroundColor: PRIMARY,
  },
  header: {
    minHeight: SCREEN_HEIGHT * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 28,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 14,
  },
  appNome: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 52,
  },
  inputLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e0e0e0',
    marginBottom: 28,
    paddingBottom: 10,
  },
  inputIcone: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 2,
  },
  erro: {
    color: '#d32f2f',
    fontSize: 13,
    marginTop: -18,
    marginBottom: 16,
  },
  esqueceuBtn: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  esqueceuTexto: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  botaoEntrar: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  botaoDesabilitado: {
    backgroundColor: '#5a7a5f',
  },
  botaoEntrarTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  divisorTexto: {
    marginHorizontal: 14,
    color: '#aaa',
    fontSize: 14,
  },
  botaoCadastro: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botaoCadastroTexto: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
