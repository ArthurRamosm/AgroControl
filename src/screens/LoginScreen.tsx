import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { setSession } from '../services/session';

type LoginResponse = {
  sucesso: boolean;
  nome?: string;
  propriedadeId?: number;
  mensagem?: string;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const PRIMARY = '#1a3d1f';

export default function LoginScreen({ navigation }: Props) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  async function handleLogin() {
    if (carregando) return;
    if (!usuario.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha usuário e senha.');
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
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          {/* Campo Usuário */}
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Usuário"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              value={usuario}
              onChangeText={setUsuario}
            />
          </View>

          {/* Campo Senha */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputSenha]}
              placeholder="Senha"
              placeholderTextColor="#bbb"
              secureTextEntry={!senhaVisivel}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity
              onPress={() => setSenhaVisivel(v => !v)}
              style={styles.olhoBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={senhaVisivel ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.botao, carregando && styles.botaoDesabilitado]}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botaoTexto}>Entrar</Text>
            }
          </TouchableOpacity>

          {/* Link Cadastro */}
          <View style={styles.cadastroRow}>
            <Text style={styles.cadastroLabel}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.cadastroLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logoArea: {
    marginHorizontal: -24,
    marginBottom: 36,
    marginTop: -48,
  },
  logo: {
    width: '100%',
    height: 340,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  inputSenha: {
    paddingRight: 4,
  },
  olhoBtn: {
    paddingLeft: 8,
  },
  botao: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  botaoDesabilitado: {
    backgroundColor: '#6a9070',
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cadastroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadastroLabel: {
    color: '#888',
    fontSize: 14,
  },
  cadastroLink: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
});
