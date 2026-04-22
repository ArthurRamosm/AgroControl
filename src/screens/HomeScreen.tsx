import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { API_URL } from '../config/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [totalAnimais, setTotalAnimais] = useState<number | null>(null);
  const [vacinasPendentes, setVacinasPendentes] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resAnimais = await fetch(`${API_URL}/api/animais`);
        const animais = await resAnimais.json();
        const ativos = animais.filter((a: { ativo: boolean }) => a.ativo);
        setTotalAnimais(ativos.length);
        setVacinasPendentes(0);
      } catch {
        setTotalAnimais(0);
        setVacinasPendentes(0);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐄</Text>
      <Text style={styles.titulo}>Bem-vindo ao AgroControl</Text>
      <Text style={styles.subtitulo}>Painel principal do rebanho</Text>

      {carregando ? (
        <ActivityIndicator size="large" color="#2d6a4f" style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardNumero}>{totalAnimais}</Text>
            <Text style={styles.cardLabel}>Animais Ativos</Text>
          </View>
          <View style={[styles.card, (vacinasPendentes ?? 0) > 0 && styles.cardAlerta]}>
            <Text style={[styles.cardNumero, (vacinasPendentes ?? 0) > 0 && styles.cardNumeroAlerta]}>
              {vacinasPendentes}
            </Text>
            <Text style={styles.cardLabel}>Vacinas Pendentes</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.botaoPrincipal}
        onPress={() => navigation.navigate('CadastroAnimal')}
      >
        <Text style={styles.botaoPrincipalTexto}>+ Cadastrar Animal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoSecundario}
        onPress={() => navigation.navigate('AnimalList')}
      >
        <Text style={styles.botaoSecundarioTexto}>Ver Rebanho</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sair} onPress={() => navigation.replace('Login')}>
        <Text style={styles.sairTexto}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#1a3c2e', textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 32 },
  cards: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    minWidth: 130,
  },
  cardAlerta: { borderWidth: 2, borderColor: '#e07b00' },
  cardNumero: { fontSize: 36, fontWeight: '900', color: '#2d6a4f' },
  cardNumeroAlerta: { color: '#e07b00' },
  cardLabel: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  botaoPrincipal: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  botaoPrincipalTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  botaoSecundario: {
    borderWidth: 2,
    borderColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  botaoSecundarioTexto: { color: '#2d6a4f', fontWeight: '700', fontSize: 15 },
  sair: {
    paddingVertical: 8,
  },
  sairTexto: { color: '#999', fontSize: 14 },
});
