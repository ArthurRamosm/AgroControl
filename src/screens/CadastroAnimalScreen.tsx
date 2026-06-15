import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, Image, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, AnimalParams } from '../types/navigation';
import { api, ApiError } from '../config/api';
import { getSession } from '../services/session';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveAnimalLocalPending, addToSyncQueue } from '../database/localDb';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CadastroAnimal'>;
  route: RouteProp<RootStackParamList, 'CadastroAnimal'>;
};

type Aviso = { tipo: 'sucesso' | 'erro' | 'atencao'; mensagem: string } | null;
type FotoSelecionada = { uri: string; base64: string };
type PropriedadeResumo = {
  id: number;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
};
type FiliacaoAnimal = {
  id: number;
  brinco: string;
  numeroAnimal?: string | null;
  nome?: string | null;
  raca: string;
  sexo: 'M' | 'F';
};
type FiliacaoStatus = { tipo: 'sucesso' | 'atencao'; mensagem: string } | null;

type VacinaAnterior = {
  id: string;
  nomeChip: string;
  nomeCustom: string;
  dataAplicacao: string;
  proximaDose: string;
  observacao: string;
};

const PRIMARY = '#1a3d1f';
const RACAS = [
  'Angus', 'Brahman', 'Desconhecida', 'Gir', 'Girolando', 'Guzerá',
  'Hereford', 'Holandesa', 'Jersey', 'Nelore', 'Senepol', 'Simmental', 'Outra',
];
const TIPOS_FEMEA = ['Vaca', 'Novilha', 'Bezerra', 'Outra'];
const TIPOS_MACHO = ['Touro', 'Novilho', 'Bezerro', 'Reprodutor', 'Outro'];
const VACINAS_OPCOES = ['Brucelose', 'Febre Aftosa', 'Raiva', 'Outra'];

function resolverChip(valor: string, opcoes: string[]): { chip: string; custom: string } {
  const predefinidas = opcoes.slice(0, -1);
  if (predefinidas.includes(valor)) return { chip: valor, custom: '' };
  return { chip: 'Outra', custom: valor };
}

function somenteData(valor?: string | null, informada?: string | null) {
  if (informada) return informada;
  if (!valor) return '';
  const partes = valor.slice(0, 10).split('-');
  if (partes.length !== 3) return valor.slice(0, 10);
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataBrasileira(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 4) return numeros;
  if (numeros.length <= 6) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function validarDataInformada(valor: string) {
  const data = valor.trim();
  if (!data) return true;
  if (/^\d{4}$/.test(data)) return true;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!match) return false;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const dataReal = new Date(ano, mes - 1, dia);
  return dataReal.getFullYear() === ano &&
    dataReal.getMonth() === mes - 1 &&
    dataReal.getDate() === dia;
}

function dataParaApi(valor: string) {
  const data = valor.trim();
  if (!data) return { data: null, informada: null };
  if (/^\d{4}$/.test(data)) return { data: null, informada: data };
  const [dia, mes, ano] = data.split('/');
  return { data: `${ano}-${mes}-${dia}`, informada: data };
}

function dataVacinaParaIso(valor: string): string | null {
  const v = valor.trim();
  if (!v || !/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return null;
  const [dia, mes, ano] = v.split('/');
  return `${ano}-${mes}-${dia}T00:00:00`;
}

function valorOuNull(valor: string) {
  const normalizado = valor.replace(',', '.').trim();
  return normalizado ? Number(normalizado) : null;
}

function idadeMesesDaData(valor: string): number | null {
  const v = valor.trim();
  if (!v) return null;
  const hoje = new Date();
  if (/^\d{4}$/.test(v)) {
    return Math.max(0, (hoje.getFullYear() - Number(v)) * 12);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split('/').map(Number);
    const data = new Date(y, m - 1, d);
    return Math.max(0, (hoje.getFullYear() - data.getFullYear()) * 12 + hoje.getMonth() - data.getMonth());
  }
  return null;
}

export default function CadastroAnimalScreen({ navigation, route }: Props) {
  const animalEdicao = route.params?.animal;
  const modoEdicao = !!animalEdicao;
  const session = getSession();
  const { propriedadeId } = session;
  const { isOnline } = useNetworkStatus();

  const [brinco, setBrinco] = useState('');
  const [nome, setNome] = useState('');
  const [racaChip, setRacaChip] = useState('');
  const [racaCustom, setRacaCustom] = useState('');
  const [mostrarRaca2, setMostrarRaca2] = useState(false);
  const [racaChip2, setRacaChip2] = useState('');
  const [racaCustom2, setRacaCustom2] = useState('');
  const [tipoChip, setTipoChip] = useState('');
  const [tipoCustom, setTipoCustom] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | ''>('');
  const [statusLeite, setStatusLeite] = useState('Produzindo');
  const [dataNascimento, setDataNascimento] = useState('');
  const [paiBusca, setPaiBusca] = useState('');
  const [paiAnimalId, setPaiAnimalId] = useState<number | null>(null);
  const [paiStatus, setPaiStatus] = useState<FiliacaoStatus>(null);
  const [marcaSinal, setMarcaSinal] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [racaPai, setRacaPai] = useState('');
  const [maeBusca, setMaeBusca] = useState('');
  const [maeAnimalId, setMaeAnimalId] = useState<number | null>(null);
  const [maeStatus, setMaeStatus] = useState<FiliacaoStatus>(null);
  const [nomeMae, setNomeMae] = useState('');
  const [racaMae, setRacaMae] = useState('');
  const [procedencia, setProcedencia] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataSaida, setDataSaida] = useState('');
  const [valor, setValor] = useState('');
  const [numeroPai, setNumeroPai] = useState('');
  const [numeroMae, setNumeroMae] = useState('');
  const [motivoSaida, setMotivoSaida] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotos, setFotos] = useState<FotoSelecionada[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [brincoErro, setBrincoErro] = useState<string | null>(null);
  const [fotoModalVisivel, setFotoModalVisivel] = useState(false);
  const [propriedade, setPropriedade] = useState<PropriedadeResumo | null>(null);

  // ── Vacinas anteriores ───────────────────────────────────────────────────
  const [vacinas, setVacinas] = useState<VacinaAnterior[]>([]);
  const [modalVacinaVisivel, setModalVacinaVisivel] = useState(false);
  const [vacinaNomeChip, setVacinaNomeChip] = useState('');
  const [vacinaNomeCustom, setVacinaNomeCustom] = useState('');
  const [vacinaData, setVacinaData] = useState('');
  const [vacinaProximaDose, setVacinaProximaDose] = useState('');
  const [vacinaObservacao, setVacinaObservacao] = useState('');
  const [vacinaErro, setVacinaErro] = useState<string | null>(null);

  useEffect(() => {
    if (animalEdicao) {
      setBrinco(animalEdicao.brinco);
      setNome(animalEdicao.nome ?? '');
      setSexo(animalEdicao.sexo);
      const sl = animalEdicao.statusLeite || 'Produzindo';
      setStatusLeite(['Produzindo', 'Seca'].includes(sl) ? sl : 'Produzindo');
      setDataNascimento(somenteData(animalEdicao.dataNascimento, animalEdicao.dataNascimentoInformada));
      setPaiAnimalId(animalEdicao.paiAnimalId ?? null);
      setMarcaSinal(animalEdicao.marcaSinal ?? '');
      setNomePai(animalEdicao.nomePai ?? '');
      setRacaPai(animalEdicao.racaPai ?? '');
      setMaeAnimalId(animalEdicao.maeAnimalId ?? null);
      setNomeMae(animalEdicao.nomeMae ?? '');
      setRacaMae(animalEdicao.racaMae ?? '');
      setProcedencia(animalEdicao.procedencia ?? '');
      setDataEntrada(somenteData(animalEdicao.dataEntrada, animalEdicao.dataEntradaInformada));
      setDataSaida(somenteData(animalEdicao.dataSaida, animalEdicao.dataSaidaInformada));
      setValor(animalEdicao.valor != null ? String(animalEdicao.valor) : '');
      setMotivoSaida(animalEdicao.motivoSaida ?? '');
      setObservacao(animalEdicao.observacao ?? '');
      setFotos((animalEdicao.fotos ?? []).slice(0, 3).map(foto => ({
        uri: `data:image/jpeg;base64,${foto.fotoBase64}`,
        base64: foto.fotoBase64,
      })));

      const r = resolverChip(animalEdicao.raca, RACAS);
      setRacaChip(r.chip);
      setRacaCustom(r.custom);
      if (animalEdicao.raca2) {
        const r2 = resolverChip(animalEdicao.raca2, RACAS);
        setRacaChip2(r2.chip);
        setRacaCustom2(r2.custom);
        setMostrarRaca2(true);
      }
      const tiposEdicao = animalEdicao.sexo === 'F' ? TIPOS_FEMEA : TIPOS_MACHO;
      const t = resolverChip(animalEdicao.tipo, tiposEdicao);
      setTipoChip(t.chip);
      setTipoCustom(t.custom);
    }
  }, []);

  useEffect(() => {
    async function carregarPropriedade() {
      try {
        const dados = await api.get<PropriedadeResumo>(`/api/propriedades/${propriedadeId}`);
        setPropriedade(dados);
      } catch {
        setPropriedade(null);
      }
    }

    carregarPropriedade();
  }, [propriedadeId]);

  useEffect(() => {
    const termo = paiBusca.trim();
    if (!termo) {
      setPaiAnimalId(null);
      setPaiStatus(null);
      return;
    }

    const timer = setTimeout(() => buscarFiliacao('pai', termo), 550);
    return () => clearTimeout(timer);
  }, [paiBusca, propriedadeId]);

  useEffect(() => {
    const termo = maeBusca.trim();
    if (!termo) {
      setMaeAnimalId(null);
      setMaeStatus(null);
      return;
    }

    const timer = setTimeout(() => buscarFiliacao('mae', termo), 550);
    return () => clearTimeout(timer);
  }, [maeBusca, propriedadeId]);

  function mostrarAviso(tipo: 'sucesso' | 'erro' | 'atencao', mensagem: string) {
    setAviso({ tipo, mensagem });
  }

  async function buscarFiliacao(tipo: 'pai' | 'mae', termo: string) {
    try {
      const ignorar = modoEdicao ? `&ignorarAnimalId=${animalEdicao!.id}` : '';
      const animal = await api.get<FiliacaoAnimal>(
        `/api/animais/buscar-filiacao?propriedadeId=${propriedadeId}&termo=${encodeURIComponent(termo)}${ignorar}`
      );

      if (tipo === 'pai') {
        setPaiAnimalId(animal.id);
        setNomePai(animal.nome ?? '');
        setRacaPai(animal.raca ?? '');
        setPaiStatus({ tipo: 'sucesso', mensagem: 'Animal encontrado' });
      } else {
        setMaeAnimalId(animal.id);
        setNomeMae(animal.nome ?? '');
        setRacaMae(animal.raca ?? '');
        setMaeStatus({ tipo: 'sucesso', mensagem: 'Animal encontrado' });
      }
    } catch {
      if (tipo === 'pai') {
        setPaiAnimalId(null);
        setPaiStatus({ tipo: 'atencao', mensagem: 'Animal nao encontrado, preencha manualmente' });
      } else {
        setMaeAnimalId(null);
        setMaeStatus({ tipo: 'atencao', mensagem: 'Animal nao encontrado, preencha manualmente' });
      }
    }
  }

  async function adicionarFoto(origem: 'camera' | 'galeria') {
    setFotoModalVisivel(false);
    if (fotos.length >= 3) {
      mostrarAviso('atencao', 'Cada animal pode ter no máximo 3 fotos.');
      return;
    }

    const permissao = origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso para adicionar fotos do animal.');
      return;
    }

    const resultado = origem === 'camera'
      ? await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    if (!asset.base64) {
      mostrarAviso('erro', 'Não foi possível carregar a imagem selecionada.');
      return;
    }

    const base64 = asset.base64;
    setFotos(prev => [...prev, { uri: asset.uri, base64 }].slice(0, 3));
  }

  function removerFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index));
  }

  // ── Vacinas ───────────────────────────────────────────────────────────────
  function abrirModalVacina() {
    setVacinaNomeChip('');
    setVacinaNomeCustom('');
    setVacinaData('');
    setVacinaProximaDose('');
    setVacinaObservacao('');
    setVacinaErro(null);
    setModalVacinaVisivel(true);
  }

  function confirmarVacina() {
    const nome = vacinaNomeChip === 'Outra' ? vacinaNomeCustom.trim() : vacinaNomeChip;
    if (!nome) {
      setVacinaErro('Selecione ou informe o nome da vacina.');
      return;
    }
    if (!vacinaData.trim() || !validarDataInformada(vacinaData)) {
      setVacinaErro('Informe a data de aplicação em DD/MM/AAAA.');
      return;
    }
    if (vacinaProximaDose.trim() && !validarDataInformada(vacinaProximaDose)) {
      setVacinaErro('Data da próxima dose deve estar em DD/MM/AAAA.');
      return;
    }
    setVacinas(prev => [
      ...prev,
      {
        id: String(Date.now()),
        nomeChip: vacinaNomeChip,
        nomeCustom: vacinaNomeCustom.trim(),
        dataAplicacao: vacinaData.trim(),
        proximaDose: vacinaProximaDose.trim(),
        observacao: vacinaObservacao.trim(),
      },
    ]);
    setModalVacinaVisivel(false);
  }

  function removerVacina(id: string) {
    setVacinas(prev => prev.filter(v => v.id !== id));
  }

  function nomeVacinaDisplay(v: VacinaAnterior) {
    return v.nomeChip === 'Outra' ? v.nomeCustom || 'Outra' : v.nomeChip;
  }

  const tiposDisponiveis = sexo === 'F' ? TIPOS_FEMEA : sexo === 'M' ? TIPOS_MACHO : [];
  const racaFinal = racaChip === 'Outra' ? racaCustom.trim() : racaChip;
  const raca2Final = racaChip2 === 'Outra' ? racaCustom2.trim() : racaChip2;
  const tipoFinal = (tipoChip === 'Outra' || tipoChip === 'Outro') ? tipoCustom.trim() : tipoChip;

  const idadeMeses = idadeMesesDaData(dataNascimento);
  const exibirStatusLeite = sexo === 'F' && (idadeMeses === null || idadeMeses >= 24);

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
    if ((tipoChip === 'Outra' || tipoChip === 'Outro') && !tipoCustom.trim()) {
      mostrarAviso('atencao', 'Digite o tipo no campo de texto.');
      return;
    }

    const valorNumerico = valorOuNull(valor);
    if (valorNumerico !== null && Number.isNaN(valorNumerico)) {
      mostrarAviso('atencao', 'Digite um valor válido.');
      return;
    }

    const datas = [
      { label: 'Data de nascimento', valor: dataNascimento },
      { label: 'Data de entrada', valor: dataEntrada },
      { label: 'Data de saida', valor: dataSaida },
    ];
    const dataInvalida = datas.find(item => !validarDataInformada(item.valor));
    if (dataInvalida) {
      mostrarAviso('atencao', `${dataInvalida.label} deve estar em AAAA ou DD/MM/AAAA.`);
      return;
    }

    const nascimentoApi = dataParaApi(dataNascimento);
    const entradaApi = dataParaApi(dataEntrada);
    const saidaApi = dataParaApi(dataSaida);

    setSalvando(true);
    setAviso(null);
    setBrincoErro(null);

    const body = {
      numeroAnimal: null,
      brinco: brinco.trim().toUpperCase(),
      nome: nome.trim(),
      raca: racaFinal,
      raca2: mostrarRaca2 && raca2Final ? raca2Final : null,
      sexo,
      tipo: tipoFinal,
      statusLeite: exibirStatusLeite ? statusLeite : (sexo === 'M' ? 'N/A' : null),
      dataNascimento: nascimentoApi.data,
      dataNascimentoInformada: nascimentoApi.informada,
      marcaSinal: marcaSinal.trim() || null,
      paiAnimalId,
      nomePai: nomePai.trim() || null,
      racaPai: racaPai.trim() || null,
      maeAnimalId,
      nomeMae: nomeMae.trim() || null,
      racaMae: racaMae.trim() || null,
      procedencia: procedencia.trim() || null,
      dataEntrada: entradaApi.data,
      dataEntradaInformada: entradaApi.informada,
      dataSaida: saidaApi.data,
      dataSaidaInformada: saidaApi.informada,
      valor: valorNumerico,
      motivoSaida: motivoSaida.trim() || null,
      observacao: observacao.trim() || null,
      propriedadeId,
      fotos: fotos.map((foto, index) => ({
        fotoBase64: foto.base64,
        ordem: index + 1,
      })),
    };

    if (!isOnline) {
      const tempId = modoEdicao ? animalEdicao!.id : -Date.now();
      await saveAnimalLocalPending({ ...body, id: tempId } as unknown as AnimalParams, propriedadeId);
      await addToSyncQueue('animais', modoEdicao ? 'UPDATE' : 'INSERT', modoEdicao ? { ...body, id: animalEdicao!.id } : body);
      for (const v of vacinas) {
        const nomeVacina = v.nomeChip === 'Outra' ? v.nomeCustom : v.nomeChip;
        if (!nomeVacina || !v.dataAplicacao) continue;
        await addToSyncQueue('vacinas', 'INSERT', {
          animalId: tempId,
          nomeVacina,
          dataAplicacao: dataVacinaParaIso(v.dataAplicacao),
          proximaAplicacao: dataVacinaParaIso(v.proximaDose),
          observacao: v.observacao || null,
          propriedadeId,
        });
      }
      setSalvando(false);
      mostrarAviso('sucesso', 'Animal salvo localmente. Será sincronizado quando houver internet.');
      return;
    }

    try {
      let animalId: number;

      if (modoEdicao) {
        await api.put(`/api/animais/${animalEdicao!.id}?propriedadeId=${propriedadeId}`, body);
        animalId = animalEdicao!.id;
      } else {
        const resp = await api.post<{ sucesso: boolean; id: number }>('/api/animais', body);
        animalId = resp.id;
      }

      // Registrar vacinas anteriores
      for (const v of vacinas) {
        const nomeVacina = v.nomeChip === 'Outra' ? v.nomeCustom : v.nomeChip;
        if (!nomeVacina || !v.dataAplicacao) continue;
        try {
          await api.post(`/api/saude/vacinas?propriedadeId=${propriedadeId}`, {
            animalId,
            nomeVacina,
            dataAplicacao: dataVacinaParaIso(v.dataAplicacao),
            proximaAplicacao: dataVacinaParaIso(v.proximaDose) || null,
            observacao: v.observacao || null,
          });
        } catch {
          // não falha o cadastro por vacinas
        }
      }

      navigation.navigate('AnimalList');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.message.toLowerCase().includes('brinco')) {
          setBrincoErro(error.message);
        } else {
          mostrarAviso('erro', error.message);
        }
      } else {
        const tempId = modoEdicao ? animalEdicao!.id : -Date.now();
        await saveAnimalLocalPending({ ...body, id: tempId } as unknown as AnimalParams, propriedadeId);
        await addToSyncQueue('animais', modoEdicao ? 'UPDATE' : 'INSERT', modoEdicao ? { ...body, id: animalEdicao!.id } : body);
        mostrarAviso('atencao', 'Falha na conexão. Animal salvo localmente e será sincronizado automaticamente.');
      }
    } finally {
      setSalvando(false);
    }
  }

  const corAviso = aviso?.tipo === 'sucesso' ? PRIMARY
    : aviso?.tipo === 'atencao' ? '#e07b00' : '#c0392b';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Text style={styles.voltarTexto}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>{modoEdicao ? 'Editar Animal' : 'Ficha Zootécnica'}</Text>
          {modoEdicao && <Text style={styles.subtitulo}>Brinco: {animalEdicao?.brinco}</Text>}
        </View>

        <View style={styles.form}>
          <View style={styles.propriedadeInfo}>
            <Text style={styles.propriedadeTitulo}>Dados da propriedade</Text>
            <Text style={styles.propriedadeTexto}>Responsável: {session.nome}</Text>
            <Text style={styles.propriedadeTexto}>
              Fazenda: {propriedade?.nome ?? `Propriedade ${propriedadeId}`}
            </Text>
            <Text style={styles.propriedadeTexto}>
              Localização: {propriedade?.cidade || 'Cidade não informada'} / {propriedade?.estado || 'UF'}
            </Text>
          </View>

          <Section title="Identificação do Animal">
            <Field label="Brinco" required testID="input-brinco" value={brinco} onChangeText={(t) => { setBrinco(t); setBrincoErro(null); }} placeholder="Ex: BR-006" editable={!modoEdicao} disabled={modoEdicao} autoCapitalize="characters" />
            {brincoErro && <Text style={styles.erroInline}>{brincoErro}</Text>}
            <Field label="Nome" testID="input-nome" value={nome} onChangeText={setNome} placeholder="Ex: Mimosa" />

            <Text style={styles.label}>Raça <Text style={styles.obrigatorio}>*</Text></Text>
            <ChipGroup options={RACAS} value={racaChip} onChange={(op) => { setRacaChip(op); setRacaCustom(''); }} testIDPrefix="chip-raca" />
            {racaChip === 'Outra' && (
              <Field value={racaCustom} onChangeText={setRacaCustom} placeholder="Digite a raça..." compact />
            )}

            {!mostrarRaca2 ? (
              <TouchableOpacity style={styles.addRaca2Btn} onPress={() => setMostrarRaca2(true)}>
                <Text style={styles.addRaca2Texto}>+ Adicionar segunda raça</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.label}>Segunda Raça</Text>
                <ChipGroup options={RACAS} value={racaChip2} onChange={(op) => { setRacaChip2(op); setRacaCustom2(''); }} />
                {racaChip2 === 'Outra' && (
                  <Field value={racaCustom2} onChangeText={setRacaCustom2} placeholder="Digite a segunda raça..." compact />
                )}
                <TouchableOpacity
                  style={styles.removerRaca2Btn}
                  onPress={() => { setMostrarRaca2(false); setRacaChip2(''); setRacaCustom2(''); }}
                >
                  <Text style={styles.removerRaca2Texto}>- Remover segunda raça</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Sexo</Text>
            <View style={styles.grupo}>
              {(['F', 'M'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  testID={`btn-sexo-${s === 'F' ? 'femea' : 'macho'}`}
                  style={[styles.opcao, sexo === s && styles.opcaoSelecionada]}
                  onPress={() => { setSexo(s); setTipoChip(''); setTipoCustom(''); }}
                >
                  <Text style={[styles.opcaoTexto, sexo === s && styles.opcaoTextoSelecionado]}>
                    {s === 'F' ? 'Fêmea' : 'Macho'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tipo <Text style={styles.obrigatorio}>*</Text></Text>
            {sexo === '' ? (
              <Text style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Selecione o sexo antes de escolher o tipo</Text>
            ) : (
              <ChipGroup options={tiposDisponiveis} value={tipoChip} onChange={(op) => { setTipoChip(op); setTipoCustom(''); }} testIDPrefix="chip-tipo" />
            )}
            {(tipoChip === 'Outra' || tipoChip === 'Outro') && (
              <Field value={tipoCustom} onChangeText={setTipoCustom} placeholder="Digite o tipo..." compact />
            )}

            {exibirStatusLeite && (
              <>
                <Text style={styles.label}>Status do Leite</Text>
                <ChipGroup options={['Produzindo', 'Seca']} value={statusLeite} onChange={setStatusLeite} square />
              </>
            )}

            <Field
              label="Data de nascimento"
              value={dataNascimento}
              onChangeText={(value) => setDataNascimento(formatarDataBrasileira(value))}
              placeholder="DD/MM/AAAA ou AAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Field label="Marca ou sinal" value={marcaSinal} onChangeText={setMarcaSinal} placeholder="Ex: Mancha branca na testa" />
          </Section>

          <Section title="Filiação">
            <Field
              label="Brinco do pai"
              value={paiBusca}
              onChangeText={setPaiBusca}
              placeholder="Ex: BR-006"
              autoCapitalize="characters"
            />
            {paiStatus && <Text style={[styles.statusBusca, paiStatus.tipo === 'sucesso' && styles.statusBuscaSucesso]}>{paiStatus.mensagem}</Text>}
            <Field label="Nome do pai" value={nomePai} onChangeText={setNomePai} placeholder="Ex: Catague" />
            <Field label="Nº do pai" value={numeroPai} onChangeText={setNumeroPai} placeholder="Ex: 001" />
            <Field label="Raca do pai" value={racaPai} onChangeText={setRacaPai} placeholder="Ex: Gir" />
            <Field
              label="Brinco da mae"
              value={maeBusca}
              onChangeText={setMaeBusca}
              placeholder="Ex: BR-003"
              autoCapitalize="characters"
            />
            {maeStatus && <Text style={[styles.statusBusca, maeStatus.tipo === 'sucesso' && styles.statusBuscaSucesso]}>{maeStatus.mensagem}</Text>}
            <Field label="Nome da mãe" value={nomeMae} onChangeText={setNomeMae} placeholder="Ex: Pitanga" />
            <Field label="Nº da mãe" value={numeroMae} onChangeText={setNumeroMae} placeholder="Ex: 003" />
            <Field label="Raça da mãe" value={racaMae} onChangeText={setRacaMae} placeholder="Ex: Holandesa" />
          </Section>

          <Section title="Procedência">
            <Field label="Procedência" value={procedencia} onChangeText={setProcedencia} placeholder="Ex: Nascimento na propriedade" />
          </Section>

          <Section title="Entrada/Saída">
            <Field
              label="Data de entrada"
              value={dataEntrada}
              onChangeText={(value) => setDataEntrada(formatarDataBrasileira(value))}
              placeholder="DD/MM/AAAA ou AAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Field
              label="Data de saida"
              value={dataSaida}
              onChangeText={(value) => setDataSaida(formatarDataBrasileira(value))}
              placeholder="DD/MM/AAAA ou AAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Field label="Valor" value={valor} onChangeText={setValor} placeholder="Ex: 2500,00" keyboardType="decimal-pad" />
            <Field label="Motivo da saída" value={motivoSaida} onChangeText={setMotivoSaida} placeholder="Venda, descarte, óbito..." />
          </Section>

          <Section title="Fotos do Animal">
            <View style={styles.fotosHeader}>
              <Text style={styles.fotosContador}>{fotos.length}/3 fotos</Text>
              <TouchableOpacity
                style={[styles.fotoAddBotao, fotos.length >= 3 && styles.fotoAddBotaoDisabled]}
                onPress={() => setFotoModalVisivel(true)}
                disabled={fotos.length >= 3}
              >
                <Ionicons name="camera-outline" size={18} color={fotos.length >= 3 ? '#999' : PRIMARY} />
                <Text style={[styles.fotoAddTexto, fotos.length >= 3 && styles.fotoAddTextoDisabled]}>
                  Adicionar
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fotosGrid}>
              {fotos.map((foto, index) => (
                <View key={`${foto.uri}-${index}`} style={styles.fotoPreviewWrap}>
                  <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
                  <TouchableOpacity style={styles.fotoRemover} onPress={() => removerFoto(index)}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {fotos.length === 0 && (
                <Text style={styles.fotosVazio}>Nenhuma foto selecionada.</Text>
              )}
            </View>
          </Section>

          {/* Seção de vacinas anteriores — apenas no cadastro */}
          {!modoEdicao && (
            <View style={styles.vacinasSection}>
              <Text style={styles.vacinasSectionTitulo}>VACINAS JÁ APLICADAS</Text>
              <Text style={styles.vacinasSectionSubtitulo}>
                Registre vacinas que o animal já tomou antes de ser cadastrado no sistema
              </Text>

              {vacinas.map(v => (
                <View key={v.id} style={styles.vacinaItem}>
                  <View style={styles.vacinaItemInfo}>
                    <Text style={styles.vacinaItemNome}>{nomeVacinaDisplay(v)}</Text>
                    <Text style={styles.vacinaItemData}>{v.dataAplicacao}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removerVacina(v.id)} style={styles.vacinaRemover}>
                    <Ionicons name="close" size={18} color="#c0392b" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.vacinaAddBotao} onPress={abrirModalVacina}>
                <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                <Text style={styles.vacinaAddTexto}>Adicionar Vacina Anterior</Text>
              </TouchableOpacity>
            </View>
          )}

          <Section title="Observações">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Anotações livres sobre o animal..."
              placeholderTextColor="#bbb"
              value={observacao}
              onChangeText={setObservacao}
              multiline
              textAlignVertical="top"
            />
          </Section>

          <TouchableOpacity
            testID="btn-salvar-animal"
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

      {/* Modal: foto */}
      <Modal visible={fotoModalVisivel} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.fotoModalCaixa}>
            <Text style={styles.modalTitulo}>Adicionar foto</Text>
            <TouchableOpacity style={styles.fotoOpcao} onPress={() => adicionarFoto('camera')}>
              <Ionicons name="camera-outline" size={22} color={PRIMARY} />
              <Text style={styles.fotoOpcaoTexto}>Usar câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoOpcao} onPress={() => adicionarFoto('galeria')}>
              <Ionicons name="images-outline" size={22} color={PRIMARY} />
              <Text style={styles.fotoOpcaoTexto}>Escolher da galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoCancelar} onPress={() => setFotoModalVisivel(false)}>
              <Text style={styles.fotoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: adicionar vacina anterior */}
      <Modal visible={modalVacinaVisivel} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { borderTopColor: PRIMARY }]}>
            <Text style={[styles.modalTitulo, { color: PRIMARY }]}>Adicionar Vacina Anterior</Text>

            <Text style={styles.vacinaModalLabel}>Vacina</Text>
            <View style={styles.grupo}>
              {VACINAS_OPCOES.map(op => (
                <TouchableOpacity
                  key={op}
                  style={[styles.chip, vacinaNomeChip === op && styles.chipSelecionado]}
                  onPress={() => { setVacinaNomeChip(op); setVacinaNomeCustom(''); setVacinaErro(null); }}
                >
                  <Text style={[styles.chipTexto, vacinaNomeChip === op && styles.chipTextoSelecionado]}>
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {vacinaNomeChip === 'Outra' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Nome da vacina..."
                placeholderTextColor="#bbb"
                value={vacinaNomeCustom}
                onChangeText={t => { setVacinaNomeCustom(t); setVacinaErro(null); }}
              />
            )}

            <Text style={styles.vacinaModalLabel}>Data de aplicação <Text style={styles.obrigatorio}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#bbb"
              value={vacinaData}
              onChangeText={t => { setVacinaData(formatarDataBrasileira(t)); setVacinaErro(null); }}
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.vacinaModalLabel}>Próxima dose (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#bbb"
              value={vacinaProximaDose}
              onChangeText={t => { setVacinaProximaDose(formatarDataBrasileira(t)); setVacinaErro(null); }}
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.vacinaModalLabel}>Observação (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Dose de reforço"
              placeholderTextColor="#bbb"
              value={vacinaObservacao}
              onChangeText={t => { setVacinaObservacao(t); }}
            />

            {vacinaErro && (
              <Text style={styles.erroInline}>{vacinaErro}</Text>
            )}

            <View style={styles.modalBotoesRow}>
              <TouchableOpacity
                style={styles.modalBotaoCancelarVacina}
                onPress={() => setModalVacinaVisivel(false)}
              >
                <Text style={styles.modalBotaoCancelarVacinaTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBotaoConfirmarVacina} onPress={confirmarVacina}>
                <Text style={styles.modalBotaoConfirmarVacinaTexto}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: aviso */}
      <Modal visible={aviso !== null} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { borderTopColor: corAviso }]}>
            <Text style={[styles.modalTitulo, { color: corAviso }]}>
              {aviso?.tipo === 'sucesso' ? '✓ Sucesso' : aviso?.tipo === 'atencao' ? 'Atenção' : 'Erro'}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & {
  label?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

function Field({ label, required, disabled, compact, style, ...props }: FieldProps) {
  return (
    <>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.obrigatorio}>*</Text>}
        </Text>
      )}
      <TextInput
        {...props}
        style={[
          styles.input,
          disabled && styles.inputDesabilitado,
          compact && { marginTop: 10 },
          style,
        ]}
        placeholderTextColor="#bbb"
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  square,
  testIDPrefix,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  square?: boolean;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.grupo}>
      {options.map((op) => (
        <TouchableOpacity
          key={op}
          testID={testIDPrefix ? `${testIDPrefix}-${op.toLowerCase()}` : undefined}
          style={[
            square ? styles.opcao : styles.chip,
            value === op && (square ? styles.opcaoSelecionada : styles.chipSelecionado),
            op === 'Outra' && styles.chipOutra,
          ]}
          onPress={() => onChange(op)}
        >
          <Text style={[
            square ? styles.opcaoTexto : styles.chipTexto,
            value === op && (square ? styles.opcaoTextoSelecionado : styles.chipTextoSelecionado),
          ]}>
            {op}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  content: { paddingBottom: 40 },
  cabecalho: {
    backgroundColor: PRIMARY,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitulo: { color: '#a8d5b5', fontSize: 13, marginTop: 4 },
  form: { padding: 20 },
  propriedadeInfo: {
    backgroundColor: '#e8f5ee',
    borderColor: '#c7dfcf',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    padding: 14,
  },
  propriedadeTitulo: { color: PRIMARY, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  propriedadeTexto: { color: '#4b5b52', fontSize: 13, marginTop: 2 },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    color: PRIMARY,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
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
  statusBusca: { color: '#e07b00', fontSize: 12, fontWeight: '700', marginTop: 6 },
  statusBuscaSucesso: { color: PRIMARY },
  textArea: { minHeight: 110 },
  grupo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipSelecionado: { borderColor: PRIMARY, backgroundColor: '#e8f5ee' },
  chipOutra: { borderStyle: 'dashed' },
  chipTexto: { color: '#555', fontWeight: '500', fontSize: 13 },
  chipTextoSelecionado: { color: PRIMARY, fontWeight: '700' },
  opcao: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  opcaoSelecionada: { borderColor: PRIMARY, backgroundColor: '#e8f5ee' },
  opcaoTexto: { color: '#555', fontWeight: '600', fontSize: 14 },
  opcaoTextoSelecionado: { color: PRIMARY },
  fotosHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  fotosContador: { color: '#66746d', fontSize: 13, fontWeight: '700' },
  fotoAddBotao: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fotoAddBotaoDisabled: { borderColor: '#ccc' },
  fotoAddTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  fotoAddTextoDisabled: { color: '#999' },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  fotoPreviewWrap: { height: 92, width: 92 },
  fotoPreview: { borderRadius: 12, height: '100%', width: '100%' },
  fotoRemover: {
    alignItems: 'center',
    backgroundColor: '#c0392b',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
  },
  fotosVazio: { color: '#999', fontSize: 13, marginTop: 4 },
  // Vacinas anteriores
  vacinasSection: {
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  vacinasSectionTitulo: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vacinasSectionSubtitulo: {
    color: '#666',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  vacinaItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vacinaItemInfo: { flex: 1 },
  vacinaItemNome: { color: '#1a3d1f', fontSize: 13, fontWeight: '700' },
  vacinaItemData: { color: '#888', fontSize: 12, marginTop: 1 },
  vacinaRemover: { padding: 4 },
  vacinaAddBotao: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 11,
  },
  vacinaAddTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  vacinaModalLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 14, marginBottom: 6 },
  modalBotoesRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBotaoCancelarVacina: {
    flex: 1,
    alignItems: 'center',
    borderColor: '#ccc',
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 12,
  },
  modalBotaoCancelarVacinaTexto: { color: '#666', fontSize: 14, fontWeight: '700' },
  modalBotaoConfirmarVacina: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
  },
  modalBotaoConfirmarVacinaTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Botão
  botao: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  botaoDesabilitado: { backgroundColor: '#7aab95' },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // Modais
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCaixa: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderTopWidth: 5,
  },
  fotoModalCaixa: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 340,
  },
  modalTitulo: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  modalMensagem: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBotao: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 48 },
  modalBotaoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fotoOpcao: {
    alignItems: 'center',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  fotoOpcaoTexto: { color: '#333', fontSize: 15, fontWeight: '700' },
  fotoCancelar: { alignItems: 'center', marginTop: 14, paddingVertical: 10 },
  fotoCancelarTexto: { color: '#888', fontSize: 14, fontWeight: '700' },
  addRaca2Btn: { marginTop: 12, alignSelf: 'flex-start' },
  addRaca2Texto: { color: PRIMARY, fontSize: 13, fontWeight: '700' },
  removerRaca2Btn: { marginTop: 10, alignSelf: 'flex-start' },
  removerRaca2Texto: { color: '#c0392b', fontSize: 13, fontWeight: '700' },
  erroInline: { color: '#c0392b', fontSize: 12, marginTop: 4, marginBottom: 4 },
});
