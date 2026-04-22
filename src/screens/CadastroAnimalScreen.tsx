import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { API_URL } from '../config/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CadastroAnimal'>;
};

export default function CadastroAnimalScreen({ navigation }: Props) {
  const [brinco, setBrinco] = useState('');
  const [nome, setNome] = useState('');
  const [raca, setRaca] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('F');
  const [tipo, setTipo] = useState('');
  const [statusLeite, setStatusLeite] = useState('Produzindo');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (salvando) return;
    if (!brinco.trim() || !raca.trim() || !tipo.trim()) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios: Brinco, Raça e Tipo.');
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch(`${API_URL}/api/animais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brinco: brinco.trim().toUpperCase(),
          nome: nome.trim(),
          raca: raca.trim(),
          sexo,
          tipo: tipo.trim(),
          statusLeite: sexo === 'F' ? statusLeite : 'N/A',
          propriedadeId: 1,
        }),
      });

      const resultado = await response.json();

      if (resultado.sucesso) {
        Alert.alert('Sucesso!', 'Animal cadastrado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Erro', resultado.mensagem ?? 'Não foi possível salvar.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível conectar à API. Verifique se o dotnet run está rodando.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Text style={styles.voltarTexto}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Cadastrar Animal</Text>
      </View>

      <View style={styles.form}>
        {/* Brinco */}
        <Text style={styles.label}>Brinco <Text style={styles.obrigatorio}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: BR-006"
          placeholderTextColor="#bbb"
          autoCapitalize="characters"
          value={brinco}
          onChangeText={setBrinco}
        />

        {/* Nome */}
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Mimosa"
          placeholderTextColor="#bbb"
          value={nome}
          onChangeText={setNome}
        />

        {/* Raça */}
        <Text style={styles.label}>Raça <Text style={styles.obrigatorio}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Holandesa, Nelore, Girolando"
          placeholderTextColor="#bbb"
          value={raca}
          onChangeText={setRaca}
        />

        {/* Tipo */}
        <Text style={styles.label}>Tipo <Text style={styles.obrigatorio}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Vaca, Touro, Novilha, Bezerro"
          placeholderTextColor="#bbb"
          value={tipo}
          onChangeText={setTipo}
        />

        {/* Sexo */}
        <Text style={styles.label}>Sexo</Text>
        <View style={styles.grupo}>
          <TouchableOpacity
            style={[styles.opcao, sexo === 'F' && styles.opcaoSelecionada]}
            onPress={() => setSexo('F')}
          >
            <Text style={[styles.opcaoTexto, sexo === 'F' && styles.opcaoTextoSelecionado]}>
              🐄 Fêmea
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.opcao, sexo === 'M' && styles.opcaoSelecionada]}
            onPress={() => setSexo('M')}
          >
            <Text style={[styles.opcaoTexto, sexo === 'M' && styles.opcaoTextoSelecionado]}>
              🐂 Macho
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status do Leite — só para fêmeas */}
        {sexo === 'F' && (
          <>
            <Text style={styles.label}>Status do Leite</Text>
            <View style={styles.grupo}>
              {['Produzindo', 'Seca', 'Gestante'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.opcao, statusLeite === s && styles.opcaoSelecionada]}
                  onPress={() => setStatusLeite(s)}
                >
                  <Text style={[styles.opcaoTexto, statusLeite === s && styles.opcaoTextoSelecionado]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={handleSalvar}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Salvar Animal</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  content: { paddingBottom: 40 },
  cabecalho: {
    backgroundColor: '#1a3c2e',
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  obrigatorio: { color: '#c0392b' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
  },
  grupo: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  opcao: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  opcaoSelecionada: { borderColor: '#2d6a4f', backgroundColor: '#e8f5ee' },
  opcaoTexto: { color: '#555', fontWeight: '600', fontSize: 14 },
  opcaoTextoSelecionado: { color: '#2d6a4f' },
  botao: {
    backgroundColor: '#2d6a4f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  botaoDesabilitado: { backgroundColor: '#7aab95' },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
