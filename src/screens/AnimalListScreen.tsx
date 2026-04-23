import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AnimalParams } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import AnimalCard from '../components/AnimalCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalList'>;
};

export default function AnimalListScreen({ navigation }: Props) {
  const [animais, setAnimais] = useState<AnimalParams[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<AnimalParams | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const { propriedadeId } = getSession();

  async function buscarAnimais() {
    setErro(null);
    try {
      const dados = await api.get<AnimalParams[]>(`/api/animais?propriedadeId=${propriedadeId}`);
      setAnimais(dados);
    } catch (error) {
      setErro(getMensagemErro(error));
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
      await api.delete(`/api/animais/${confirmarExclusao.id}?propriedadeId=${propriedadeId}`);
      setAnimais(prev => prev.filter(a => a.id !== confirmarExclusao.id));
      setConfirmarExclusao(null);
    } catch (error) {
      setConfirmarExclusao(null);
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setExcluindo(false);
    }
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

      {erro ? (
        <View style={styles.erroContainer}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.botaoTentar}>
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={animais}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              onEdit={(a) => navigation.navigate('CadastroAnimal', { animal: a })}
              onDelete={(a) => setConfirmarExclusao(a)}
            />
          )}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={onRefresh} colors={['#2d6a4f']} />
          }
          ListEmptyComponent={
            <Text style={styles.vazio}>Nenhum animal cadastrado.</Text>
          }
        />
      )}

      {/* Modal de confirmação de exclusão */}
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
                disabled={excluindo}
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
  vazio: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  erroContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  erroTexto: { color: '#c0392b', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  botaoTentar: {
    borderWidth: 2,
    borderColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  botaoTentarTexto: { color: '#2d6a4f', fontWeight: '600' },
  // Modal
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
