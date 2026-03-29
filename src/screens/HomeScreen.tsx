import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐄</Text>
      <Text style={styles.titulo}>Bem-vindo ao AgroControl</Text>
      <Text style={styles.subtitulo}>Painel principal do rebanho</Text>

      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardNumero}>0</Text>
          <Text style={styles.cardLabel}>Animais Ativos</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumero}>0</Text>
          <Text style={styles.cardLabel}>Vacinas Pendentes</Text>
        </View>
      </View>

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
  cards: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    minWidth: 130,
  },
  cardNumero: { fontSize: 36, fontWeight: '900', color: '#2d6a4f' },
  cardLabel: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  sair: {
    borderWidth: 2,
    borderColor: '#2d6a4f',
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  sairTexto: { color: '#2d6a4f', fontWeight: '700', fontSize: 15 },
});