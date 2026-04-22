import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { API_URL } from '../config/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalList'>;
};

type Animal = {
  id: number;
  brinco: string;
  nome: string;
  raca: string;
  sexo: 'M' | 'F';
  tipo: string;
  status_leite: string;
  ativo: boolean;
  propriedadeId: number;
};

export default function AnimalListScreen({ navigation }: Props) {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  async function buscarAnimais() {
    try {
      const response = await fetch(`${API_URL}/api/animais`);
      if (!response.ok) throw new Error();
      const dados: Animal[] = await response.json();
      setAnimais(dados);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os animais.\nVerifique a conexão com o servidor.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    buscarAnimais();
  }, []);

  function onRefresh() {
    setAtualizando(true);
    buscarAnimais();
  }

  function renderAnimal({ item }: { item: Animal }) {
    const icone = item.sexo === 'F' ? '🐄' : '🐂';
    const statusCor = item.ativo ? '#2d6a4f' : '#999';

    return (
      <View style={styles.card}>
        <Text style={styles.cardIcone}>{icone}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.cardTopo}>
            <Text style={styles.cardNome}>{item.nome || 'Sem nome'}</Text>
            <View style={[styles.badge, { backgroundColor: item.ativo ? '#d4edda' : '#e2e3e5' }]}>
              <Text style={[styles.badgeTexto, { color: statusCor }]}>
                {item.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardBrinco}>Brinco: {item.brinco}</Text>
          <Text style={styles.cardDetalhe}>{item.raca} · {item.tipo}</Text>
          {item.sexo === 'F' && (
            <Text style={styles.cardLeite}>Leite: {item.status_leite}</Text>
          )}
        </View>
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2d6a4f" />
        <Text style={styles.carregandoTexto}>Carregando animais...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Text style={styles.voltarTexto}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Rebanho</Text>
        <Text style={styles.total}>{animais.length} animais</Text>
      </View>

      <FlatList
        data={animais}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAnimal}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={onRefresh} colors={['#2d6a4f']} />
        }
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum animal cadastrado.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f0' },
  carregandoTexto: { marginTop: 12, color: '#666', fontSize: 14 },
  cabecalho: {
    backgroundColor: '#1a3c2e',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  total: { color: '#a8d5b5', fontSize: 13, marginTop: 2 },
  lista: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    gap: 14,
  },
  cardIcone: { fontSize: 36 },
  cardInfo: { flex: 1 },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#1a3c2e' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  cardBrinco: { fontSize: 12, color: '#888', marginBottom: 2 },
  cardDetalhe: { fontSize: 13, color: '#555' },
  cardLeite: { fontSize: 12, color: '#2d6a4f', marginTop: 2, fontWeight: '600' },
  vazio: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
