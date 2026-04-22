import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AnimalParams } from '../types/navigation';
import { API_URL } from '../config/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalList'>;
};

export default function AnimalListScreen({ navigation }: Props) {
  const [animais, setAnimais] = useState<AnimalParams[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState<AnimalParams | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function buscarAnimais() {
    try {
      const response = await fetch(`${API_URL}/api/animais`);
      if (!response.ok) throw new Error();
      const dados: AnimalParams[] = await response.json();
      setAnimais(dados);
    } catch {
      // silencioso — pull-to-refresh disponível
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', buscarAnimais);
    return unsubscribe;
  }, [navigation]);

  function onRefresh() {
    setAtualizando(true);
    buscarAnimais();
  }

  async function handleExcluir() {
    if (!confirmarExclusao) return;
    setExcluindo(true);
    try {
      const response = await fetch(`${API_URL}/api/animais/${confirmarExclusao.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setAnimais(prev => prev.filter(a => a.id !== confirmarExclusao.id));
      }
    } catch {
      // erro silencioso
    } finally {
      setExcluindo(false);
      setConfirmarExclusao(null);
    }
  }

  function renderAnimal({ item }: { item: AnimalParams }) {
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
            <Text style={styles.cardLeite}>Leite: {item.statusLeite}</Text>
          )}
        </View>

        <View style={styles.acoes}>
          <TouchableOpacity
            style={styles.botaoEditar}
            onPress={() => navigation.navigate('CadastroAnimal', { animal: item })}
          >
            <Text style={styles.botaoEditarTexto}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoExcluir}
            onPress={() => setConfirmarExclusao(item)}
          >
            <Text style={styles.botaoExcluirTexto}>🗑️</Text>
          </TouchableOpacity>
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

      {/* Modal confirmação de exclusão */}
      <Modal visible={confirmarExclusao !== null} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Excluir Animal</Text>
            <Text style={styles.modalMensagem}>
              Tem certeza que deseja excluir{'\n'}
              <Text style={{ fontWeight: '700' }}>
                {confirmarExclusao?.nome || confirmarExclusao?.brinco}
              </Text>
              ?{'\n'}Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                onPress={() => setConfirmarExclusao(null)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBotaoExcluir}
                onPress={handleExcluir}
              >
                {excluindo
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBotaoExcluirTexto}>Excluir</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 12,
  },
  cardIcone: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNome: { fontSize: 15, fontWeight: '700', color: '#1a3c2e', flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  cardBrinco: { fontSize: 12, color: '#888', marginBottom: 2 },
  cardDetalhe: { fontSize: 13, color: '#555' },
  cardLeite: { fontSize: 12, color: '#2d6a4f', marginTop: 2, fontWeight: '600' },
  acoes: { flexDirection: 'column', gap: 6 },
  botaoEditar: {
    backgroundColor: '#e8f5ee',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoEditarTexto: { fontSize: 16 },
  botaoExcluir: {
    backgroundColor: '#fdecea',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoExcluirTexto: { fontSize: 16 },
  vazio: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCaixa: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderTopWidth: 5,
    borderTopColor: '#c0392b',
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#c0392b', marginBottom: 12 },
  modalMensagem: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBotoes: { flexDirection: 'row', gap: 12 },
  modalBotaoCancelar: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalBotaoCancelarTexto: { color: '#666', fontWeight: '600', fontSize: 14 },
  modalBotaoExcluir: {
    backgroundColor: '#c0392b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: 'center',
  },
  modalBotaoExcluirTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
