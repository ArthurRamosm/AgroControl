import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CadastroAnimal'>;
  route: RouteProp<RootStackParamList, 'CadastroAnimal'>;
};

type Aviso = { tipo: 'sucesso' | 'erro' | 'atencao'; mensagem: string } | null;

const RACAS = [
  'Angus', 'Brahman', 'Desconhecida', 'Gir', 'Girolando', 'Guzerá',
  'Hereford', 'Holandesa', 'Jersey', 'Nelore', 'Senepol', 'Simmental', 'Outra',
];
const TIPOS = ['Vaca', 'Touro', 'Novilha', 'Novilho', 'Bezerro', 'Bezerra', 'Reprodutor', 'Outra'];

function resolverChip(valor: string, opcoes: string[]): { chip: string; custom: string } {
  const predefinidas = opcoes.slice(0, -1);
  if (predefinidas.includes(valor)) return { chip: valor, custom: '' };
  return { chip: 'Outra', custom: valor };
}

export default function CadastroAnimalScreen({ navigation, route }: Props) {
  const animalEdicao = route.params?.animal;
  const modoEdicao = !!animalEdicao;
  const { propriedadeId } = getSession();

  const [brinco, setBrinco] = useState('');
  const [nome, setNome] = useState('');
  const [racaChip, setRacaChip] = useState('');
  const [racaCustom, setRacaCustom] = useState('');
  const [tipoChip, setTipoChip] = useState('');
  const [tipoCustom, setTipoCustom] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('F');
  const [statusLeite, setStatusLeite] = useState('Produzindo');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    if (animalEdicao) {
      setBrinco(animalEdicao.brinco);
      setNome(animalEdicao.nome ?? '');
      setSexo(animalEdicao.sexo);
      setStatusLeite(animalEdicao.statusLeite || 'Produzindo');
      const r = resolverChip(animalEdicao.raca, RACAS);
      setRacaChip(r.chip);
      setRacaCustom(r.custom);
      const t = resolverChip(animalEdicao.tipo, TIPOS);
      setTipoChip(t.chip);
      setTipoCustom(t.custom);
    }
  }, []);

  function mostrarAviso(tipo: 'sucesso' | 'erro' | 'atencao', mensagem: string) {
    setAviso({ tipo, mensagem });
  }

  const racaFinal = racaChip === 'Outra' ? racaCustom.trim() : racaChip;
  const tipoFinal = tipoChip === 'Outra' ? tipoCustom.trim() : tipoChip;

  async function handleSalvar() {
    if (salvando) return;
    if (!brinco.trim() || !racaFinal || !tipoFinal) {
      mostrarAviso('atencao', 'Preencha os campos obrigatórios: Brinco, Raça e Tipo.');
      return;
    }
    if (racaChip === 'Outra' && !racaCustom.trim()) {
      mostrarAviso('atencao', 'Digite a raça no campo de texto.');
      return;
    }
    if (tipoChip === 'Outra' && !tipoCustom.trim()) {
      mostrarAviso('atencao', 'Digite o tipo no campo de texto.');
      return;
    }

    setSalvando(true);
    try {
      const body = {
        brinco: brinco.trim().toUpperCase(),
        nome: nome.trim(),
        raca: racaFinal,
        sexo,
        tipo: tipoFinal,
        statusLeite: sexo === 'F' ? statusLeite : 'N/A',
        propriedadeId,
      };

      if (modoEdicao) {
        await api.put(
          `/api/animais/${animalEdicao!.id}?propriedadeId=${propriedadeId}`,
          body
        );
      } else {
        await api.post('/api/animais', body);
      }

      mostrarAviso(
        'sucesso',
        modoEdicao ? 'Animal atualizado com sucesso!' : 'Animal cadastrado com sucesso!'
      );
    } catch (error) {
      mostrarAviso('erro', getMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  const corAviso = aviso?.tipo === 'sucesso' ? '#2d6a4f'
    : aviso?.tipo === 'atencao' ? '#e07b00' : '#c0392b';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Text style={styles.voltarTexto}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>{modoEdicao ? 'Editar Animal' : 'Cadastrar Animal'}</Text>
          {modoEdicao && <Text style={styles.subtitulo}>Brinco: {animalEdicao?.brinco}</Text>}
        </View>

        <View style={styles.form}>
          {/* Brinco */}
          <Text style={styles.label}>Brinco <Text style={styles.obrigatorio}>*</Text></Text>
          <TextInput
            style={[styles.input, modoEdicao && styles.inputDesabilitado]}
            placeholder="Ex: BR-006"
            placeholderTextColor="#bbb"
            autoCapitalize="characters"
            value={brinco}
            onChangeText={setBrinco}
            editable={!modoEdicao}
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

          {/* Raça — chips */}
          <Text style={styles.label}>Raça <Text style={styles.obrigatorio}>*</Text></Text>
          <View style={styles.grupo}>
            {RACAS.map((op) => (
              <TouchableOpacity
                key={op}
                style={[styles.chip, racaChip === op && styles.chipSelecionado, op === 'Outra' && styles.chipOutra]}
                onPress={() => { setRacaChip(op); setRacaCustom(''); }}
              >
                <Text style={[styles.chipTexto, racaChip === op && styles.chipTextoSelecionado]}>{op}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {racaChip === 'Outra' && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Digite a raça..."
              placeholderTextColor="#bbb"
              value={racaCustom}
              onChangeText={setRacaCustom}
            />
          )}

          {/* Tipo — chips */}
          <Text style={styles.label}>Tipo <Text style={styles.obrigatorio}>*</Text></Text>
          <View style={styles.grupo}>
            {TIPOS.map((op) => (
              <TouchableOpacity
                key={op}
                style={[styles.chip, tipoChip === op && styles.chipSelecionado, op === 'Outra' && styles.chipOutra]}
                onPress={() => { setTipoChip(op); setTipoCustom(''); }}
              >
                <Text style={[styles.chipTexto, tipoChip === op && styles.chipTextoSelecionado]}>{op}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tipoChip === 'Outra' && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Digite o tipo..."
              placeholderTextColor="#bbb"
              value={tipoCustom}
              onChangeText={setTipoCustom}
            />
          )}

          {/* Sexo */}
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.grupo}>
            {(['F', 'M'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.opcao, sexo === s && styles.opcaoSelecionada]}
                onPress={() => setSexo(s)}
              >
                <Text style={[styles.opcaoTexto, sexo === s && styles.opcaoTextoSelecionado]}>
                  {s === 'F' ? '🐄 Fêmea' : '🐂 Macho'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status do Leite */}
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
                    <Text style={[styles.opcaoTexto, statusLeite === s && styles.opcaoTextoSelecionado]}>{s}</Text>
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
              : <Text style={styles.botaoTexto}>{modoEdicao ? 'Salvar Alterações' : 'Salvar Animal'}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={aviso !== null} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { borderTopColor: corAviso }]}>
            <Text style={[styles.modalTitulo, { color: corAviso }]}>
              {aviso?.tipo === 'sucesso' ? '✓ Sucesso' : aviso?.tipo === 'atencao' ? '⚠ Atenção' : '✕ Erro'}
            </Text>
            <Text style={styles.modalMensagem}>{aviso?.mensagem}</Text>
            <TouchableOpacity
              style={[styles.modalBotao, { backgroundColor: corAviso }]}
              onPress={() => {
                setAviso(null);
                if (aviso?.tipo === 'sucesso') navigation.navigate('AnimalList');
              }}
            >
              <Text style={styles.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  subtitulo: { color: '#a8d5b5', fontSize: 13, marginTop: 4 },
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
  inputDesabilitado: { backgroundColor: '#f0f0f0', color: '#999' },
  grupo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipSelecionado: { borderColor: '#2d6a4f', backgroundColor: '#e8f5ee' },
  chipOutra: { borderStyle: 'dashed' },
  chipTexto: { color: '#555', fontWeight: '500', fontSize: 13 },
  chipTextoSelecionado: { color: '#2d6a4f', fontWeight: '700' },
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
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalMensagem: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBotao: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 48 },
  modalBotaoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
