import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

// Usuário fixo (sem backend por enquanto)
const USUARIO_FIXO = 'admin';
const SENHA_FIXA = '1234';

export default function LoginScreen({ navigation }: Props) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  function handleLogin() {
    if (usuario === USUARIO_FIXO && senha === SENHA_FIXA) {
      navigation.replace('Home');
    } else {
      Alert.alert('Erro', 'Usuário ou senha incorretos!');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🐄</Text>
        <Text style={styles.titulo}>AgroControl</Text>
        <Text style={styles.subtitulo}>Gestão do seu rebanho</Text>

        <TextInput
          style={styles.input}
          placeholder="Usuário"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          value={usuario}
          onChangeText={setUsuario}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={styles.botao} onPress={handleLogin}>
          <Text style={styles.botaoTexto}>Entrar</Text>
        </TouchableOpacity>

        <Text style={styles.dica}>Usuário: admin | Senha: 1234</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 8,
  },
  logo: { fontSize: 52, marginBottom: 8 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#1a3c2e', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 28 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  botao: {
    width: '100%',
    backgroundColor: '#2d6a4f',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dica: { marginTop: 20, color: '#aaa', fontSize: 12 },
});