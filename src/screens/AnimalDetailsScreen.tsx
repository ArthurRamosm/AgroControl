import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { dataBrParaApi, formatarDataBrasileira, idadeAnimal, validarDataCompleta } from '../utils/animalHealth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveAnimalFichaCache, getAnimalFichaCache, addToSyncQueue } from '../database/localDb';
import * as SQLite from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { gerarPdfFichaZootecnica } from '../utils/pdf/pdfFichaZootecnica';

const dbLocal = Platform.OS !== 'web' ? SQLite.openDatabaseSync('agrocontrol.db') : null as any;

const PRIMARY = '#1a3d1f';
const EVENTOS = [
  'Nascimento',
  'Cobertura',
  'Colostro',
  'Aleitamento',
  'Pesagem',
  'Vermifugacao',
  'Vacinacao',
  'Desmama',
  'Parto',
  'Secagem',
  'Outro',
];
const EVENTOS_REPRODUTIVOS = [
  'Cio',
  'Cobertura',
  'Inseminacao',
  'Diagnostico de gestacao',
  'Previsao de parto',
  'Parto realizado',
  'Secagem',
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalDetails'>;
  route: RouteProp<RootStackParamList, 'AnimalDetails'>;
};

type AnimalEvento = {
  id: number;
  animalId: number;
  tipoEvento: string;
  dataEvento: string;
  pesoKg?: number | null;
  racaoKgDia?: number | null;
  leiteLitrosDia?: number | null;
  observacao?: string | null;
};

type AnimalLactacao = {
  id: number;
  animalId: number;
  numeroLactacao: number;
  dataParto?: string | null;
  inicioControle?: string | null;
  dataSecagem?: string | null;
  diasLactacao?: number | null;
  producaoTotal?: number | null;
  mediaDiaria?: number | null;
};

type AnimalReproducao = {
  id: number;
  animalId: number;
  tipoEvento: string;
  dataEvento: string;
  reprodutor?: string | null;
  inseminador?: string | null;
  previsaoParto?: string | null;
  resultado?: string | null;
  observacao?: string | null;
};

type EventoForm = {
  tipoEvento: string;
  dataEvento: string;
  pesoKg: string;
  racaoKgDia: string;
  leiteLitrosDia: string;
  observacao: string;
};

type LactacaoForm = {
  numeroLactacao: string;
  dataParto: string;
  inicioControle: string;
  dataSecagem: string;
  diasLactacao: string;
  producaoTotal: string;
  mediaDiaria: string;
};

type ReproducaoForm = {
  tipoEvento: string;
  dataEvento: string;
  reprodutor: string;
  inseminador: string;
  previsaoParto: string;
  resultado: string;
  observacao: string;
};

type VacinaForm = {
  nomeVacina: string;
  dataAplicacao: string;
  dose: string;
  observacao: string;
};

type VermifugacaoForm = {
  dataAplicacao: string;
  produtoUtilizado: string;
  dose: string;
  proximaAplicacao: string;
  observacao: string;
};

type SaudeRegistro = {
  id: number;
  animalId: number;
  tipoRegistro: string;
  dataRegistro: string;
  descricao?: string | null;
  produtoUtilizado?: string | null;
  dose?: string | null;
  veterinario?: string | null;
  proximaAplicacao?: string | null;
  observacao?: string | null;
};

type LactacaoLocal = {
  id: number;
  animal_id: number;
  numero_parto: number;
  data_parto?: string | null;
  inicio_controle?: string | null;
  data_secagem?: string | null;
  dias_lactacao?: number | null;
  producao_total_kg?: number | null;
  media_kg_dia?: number | null;
};

type CoberturaLocal = {
  id: number;
  animal_id: number;
  data_cobertura: string;
  tipo?: string | null;
  reprodutor?: string | null;
  diagnostico_gestacao?: string | null;
  data_diag?: string | null;
  data_prevista_parto?: string | null;
  data_real_parto?: string | null;
};

type CuraUmbigoLocal = {
  id: number;
  animal_id: number;
  dia_1?: string | null;
  dia_2?: string | null;
  dia_3?: string | null;
  dia_4?: string | null;
  dia_5?: string | null;
  observacoes?: string | null;
};

const eventoInicial: EventoForm = {
  tipoEvento: 'Pesagem',
  dataEvento: hoje(),
  pesoKg: '',
  racaoKgDia: '',
  leiteLitrosDia: '',
  observacao: '',
};

const lactacaoInicial: LactacaoForm = {
  numeroLactacao: '',
  dataParto: '',
  inicioControle: '',
  dataSecagem: '',
  diasLactacao: '',
  producaoTotal: '',
  mediaDiaria: '',
};

const reproducaoInicial: ReproducaoForm = {
  tipoEvento: 'Cio',
  dataEvento: hojeBr(),
  reprodutor: '',
  inseminador: '',
  previsaoParto: '',
  resultado: '',
  observacao: '',
};

const vacinaInicial: VacinaForm = {
  nomeVacina: 'Raiva',
  dataAplicacao: hojeBr(),
  dose: '',
  observacao: '',
};

const vermifugacaoInicial: VermifugacaoForm = {
  dataAplicacao: hojeBr(),
  produtoUtilizado: '',
  dose: '',
  proximaAplicacao: '',
  observacao: '',
};

const lactacaoLocalInicial = {
  numero_parto: '',
  data_parto: '',
  inicio_controle: '',
  data_secagem: '',
  dias_lactacao: '',
  producao_total_kg: '',
  media_kg_dia: '',
};

const coberturaLocalInicial = {
  data_cobertura: '',
  tipo: 'Monta Natural',
  reprodutor: '',
  diagnostico_gestacao: '',
  data_diag: '',
  data_prevista_parto: '',
  data_real_parto: '',
};

const curaUmbigoInicial = {
  dia_1: 'N' as 'S' | 'N',
  dia_2: 'N' as 'S' | 'N',
  dia_3: 'N' as 'S' | 'N',
  dia_4: 'N' as 'S' | 'N',
  dia_5: 'N' as 'S' | 'N',
  observacoes: '',
};

function hojeBr() {
  const data = new Date();
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function texto(valor?: string | number | boolean | null) {
  if (valor === null || valor === undefined || valor === '') return 'Nao informado';
  if (typeof valor === 'boolean') return valor ? 'Ativo' : 'Inativo';
  return String(valor);
}

function data(valor?: string | null) {
  return valor ? valor.slice(0, 10) : 'Nao informado';
}

function moeda(valor?: number | null) {
  if (valor === null || valor === undefined) return 'Nao informado';
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function numeroOuNull(valor: string) {
  const normalizado = valor.replace(',', '.').trim();
  if (!normalizado) return null;
  const numero = Number(normalizado);
  return Number.isNaN(numero) ? NaN : numero;
}

function inteiroOuNull(valor: string) {
  const normalizado = valor.trim();
  if (!normalizado) return null;
  const numero = Number(normalizado);
  return Number.isInteger(numero) ? numero : NaN;
}

export default function AnimalDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { animal } = route.params;
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();
  const [eventos, setEventos] = useState<AnimalEvento[]>([]);
  const [lactacoes, setLactacoes] = useState<AnimalLactacao[]>([]);
  const [reproducoes, setReproducoes] = useState<AnimalReproducao[]>([]);
  const [saudeRegistros, setSaudeRegistros] = useState<SaudeRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [eventoModal, setEventoModal] = useState(false);
  const [lactacaoModal, setLactacaoModal] = useState(false);
  const [reproducaoModal, setReproducaoModal] = useState(false);
  const [vacinaModal, setVacinaModal] = useState(false);
  const [vermifugacaoModal, setVermifugacaoModal] = useState(false);
  const [eventoForm, setEventoForm] = useState<EventoForm>(eventoInicial);
  const [lactacaoForm, setLactacaoForm] = useState<LactacaoForm>(lactacaoInicial);
  const [reproducaoForm, setReproducaoForm] = useState<ReproducaoForm>(reproducaoInicial);
  const [vacinaForm, setVacinaForm] = useState<VacinaForm>(vacinaInicial);
  const [vermifugacaoForm, setVermifugacaoForm] = useState<VermifugacaoForm>(vermifugacaoInicial);
  const [lactacoesLocal, setLactacoesLocal] = useState<LactacaoLocal[]>([]);
  const [coberturasLocal, setCoberturasLocal] = useState<CoberturaLocal[]>([]);
  const [curaUmbigoList, setCuraUmbigoList] = useState<CuraUmbigoLocal[]>([]);
  const [lactacaoLocalModal, setLactacaoLocalModal] = useState(false);
  const [coberturaLocalModal, setCoberturaLocalModal] = useState(false);
  const [curaUmbigoModal, setCuraUmbigoModal] = useState(false);
  const [lactacaoLocalForm, setLactacaoLocalForm] = useState(lactacaoLocalInicial);
  const [coberturaLocalForm, setCoberturaLocalForm] = useState(coberturaLocalInicial);
  const [curaUmbigoForm, setCuraUmbigoForm] = useState(curaUmbigoInicial);

  type FichaCache = {
    eventos: AnimalEvento[];
    lactacoes: AnimalLactacao[];
    reproducoes: AnimalReproducao[];
    saudeRegistros: SaudeRegistro[];
  };

  async function carregarFicha() {
    setCarregando(true);

    if (!isOnline) {
      const cache = await getAnimalFichaCache<FichaCache>(animal.id);
      if (cache) {
        setEventos(cache.eventos);
        setLactacoes(cache.lactacoes);
        setReproducoes(cache.reproducoes);
        setSaudeRegistros(cache.saudeRegistros);
      }
      setCarregando(false);
      return;
    }

    try {
      const [eventosDados, lactacoesDados, reproducoesDados, registrosDados] = await Promise.all([
        api.get<AnimalEvento[]>(`/api/animais/${animal.id}/eventos?propriedadeId=${propriedadeId}`),
        api.get<AnimalLactacao[]>(`/api/animais/${animal.id}/lactacoes?propriedadeId=${propriedadeId}`),
        api.get<AnimalReproducao[]>(`/api/animais/${animal.id}/reproducoes?propriedadeId=${propriedadeId}`),
        api.get<SaudeRegistro[]>(`/api/saude/registros?propriedadeId=${propriedadeId}&animalId=${animal.id}`),
      ]);
      setEventos(eventosDados);
      setLactacoes(lactacoesDados);
      setReproducoes(reproducoesDados);
      setSaudeRegistros(registrosDados);
      saveAnimalFichaCache(animal.id, {
        eventos: eventosDados,
        lactacoes: lactacoesDados,
        reproducoes: reproducoesDados,
        saudeRegistros: registrosDados,
      }).catch(() => {});
    } catch (error) {
      const cache = await getAnimalFichaCache<FichaCache>(animal.id);
      if (cache) {
        setEventos(cache.eventos);
        setLactacoes(cache.lactacoes);
        setReproducoes(cache.reproducoes);
        setSaudeRegistros(cache.saudeRegistros);
      } else {
        Alert.alert('Erro', getMensagemErro(error));
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarFicha();
  }, [animal.id, propriedadeId]);

  const carregarLactacoesLocal = useCallback(() => {
    if (!dbLocal) return;
    try {
      const rows = dbLocal.getAllSync<LactacaoLocal>(
        'SELECT * FROM animal_lactacao WHERE animal_id = ? ORDER BY numero_parto DESC',
        [animal.id]
      );
      setLactacoesLocal(rows);
    } catch {}
  }, [animal.id]);

  const carregarCoberturasLocal = useCallback(() => {
    if (!dbLocal) return;
    try {
      const rows = dbLocal.getAllSync<CoberturaLocal>(
        'SELECT * FROM animal_cobertura WHERE animal_id = ? ORDER BY data_cobertura DESC',
        [animal.id]
      );
      setCoberturasLocal(rows);
    } catch {}
  }, [animal.id]);

  const carregarCuraUmbigo = useCallback(() => {
    if (!dbLocal) return;
    try {
      const rows = dbLocal.getAllSync<CuraUmbigoLocal>(
        'SELECT * FROM animal_cura_umbigo WHERE animal_id = ? ORDER BY created_at DESC',
        [animal.id]
      );
      setCuraUmbigoList(rows);
    } catch {}
  }, [animal.id]);

  useEffect(() => { carregarLactacoesLocal(); }, [carregarLactacoesLocal]);
  useEffect(() => { carregarCoberturasLocal(); }, [carregarCoberturasLocal]);
  useEffect(() => { carregarCuraUmbigo(); }, [carregarCuraUmbigo]);

  async function salvarEvento() {
    const pesoKg = numeroOuNull(eventoForm.pesoKg);
    const racaoKgDia = numeroOuNull(eventoForm.racaoKgDia);
    const leiteLitrosDia = numeroOuNull(eventoForm.leiteLitrosDia);

    if (!eventoForm.tipoEvento || !eventoForm.dataEvento) {
      Alert.alert('Atencao', 'Informe o tipo e a data do evento.');
      return;
    }
    if ([pesoKg, racaoKgDia, leiteLitrosDia].some(Number.isNaN)) {
      Alert.alert('Atencao', 'Confira os campos numericos do evento.');
      return;
    }

    const dadosEvento = {
      tipoEvento: eventoForm.tipoEvento,
      dataEvento: eventoForm.dataEvento,
      pesoKg,
      racaoKgDia,
      leiteLitrosDia,
      observacao: eventoForm.observacao.trim() || null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('eventos', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosEvento });
      setEventos(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosEvento }, ...prev]);
      setEventoModal(false);
      setEventoForm({ ...eventoInicial, dataEvento: hoje() });
      setSalvando(false);
      return;
    }

    try {
      await api.post(`/api/animais/${animal.id}/eventos?propriedadeId=${propriedadeId}`, dadosEvento);
      setEventoModal(false);
      setEventoForm({ ...eventoInicial, dataEvento: hoje() });
      carregarFicha();
    } catch (error) {
      await addToSyncQueue('eventos', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosEvento });
      setEventos(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosEvento }, ...prev]);
      setEventoModal(false);
      setEventoForm({ ...eventoInicial, dataEvento: hoje() });
      Alert.alert('Sem conexão', 'Evento salvo localmente e será sincronizado automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarLactacao() {
    const numeroLactacao = inteiroOuNull(lactacaoForm.numeroLactacao);
    const diasLactacao = inteiroOuNull(lactacaoForm.diasLactacao);
    const producaoTotal = numeroOuNull(lactacaoForm.producaoTotal);
    const mediaDiaria = numeroOuNull(lactacaoForm.mediaDiaria);

    if (!numeroLactacao || Number.isNaN(numeroLactacao)) {
      Alert.alert('Atencao', 'Informe o numero da lactacao.');
      return;
    }
    if ([diasLactacao, producaoTotal, mediaDiaria].some(Number.isNaN)) {
      Alert.alert('Atencao', 'Confira os campos numericos da lactacao.');
      return;
    }

    const dadosLactacao = {
      numeroLactacao,
      dataParto: lactacaoForm.dataParto.trim() || null,
      inicioControle: lactacaoForm.inicioControle.trim() || null,
      dataSecagem: lactacaoForm.dataSecagem.trim() || null,
      diasLactacao,
      producaoTotal,
      mediaDiaria,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('lactacoes', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosLactacao });
      setLactacoes(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosLactacao }, ...prev]);
      setLactacaoModal(false);
      setLactacaoForm(lactacaoInicial);
      setSalvando(false);
      return;
    }

    try {
      await api.post(`/api/animais/${animal.id}/lactacoes?propriedadeId=${propriedadeId}`, dadosLactacao);
      setLactacaoModal(false);
      setLactacaoForm(lactacaoInicial);
      carregarFicha();
    } catch (error) {
      await addToSyncQueue('lactacoes', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosLactacao });
      setLactacoes(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosLactacao }, ...prev]);
      setLactacaoModal(false);
      setLactacaoForm(lactacaoInicial);
      Alert.alert('Sem conexão', 'Lactação salva localmente e será sincronizada automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarReproducao() {
    if (!reproducaoForm.tipoEvento.trim()) {
      Alert.alert('Atencao', 'Informe o tipo do evento reprodutivo.');
      return;
    }
    if (!validarDataCompleta(reproducaoForm.dataEvento)) {
      Alert.alert('Atencao', 'Informe a data do evento em DD/MM/AAAA.');
      return;
    }
    if (reproducaoForm.previsaoParto && !validarDataCompleta(reproducaoForm.previsaoParto)) {
      Alert.alert('Atencao', 'Informe a previsao de parto em DD/MM/AAAA.');
      return;
    }

    const dadosReproducao = {
      tipoEvento: reproducaoForm.tipoEvento,
      dataEvento: dataBrParaApi(reproducaoForm.dataEvento),
      reprodutor: reproducaoForm.reprodutor.trim() || null,
      inseminador: reproducaoForm.inseminador.trim() || null,
      previsaoParto: reproducaoForm.previsaoParto ? dataBrParaApi(reproducaoForm.previsaoParto) : null,
      resultado: reproducaoForm.resultado.trim() || null,
      observacao: reproducaoForm.observacao.trim() || null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('reproducoes', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosReproducao });
      setReproducoes(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosReproducao }, ...prev]);
      setReproducaoModal(false);
      setReproducaoForm(reproducaoInicial);
      setSalvando(false);
      return;
    }

    try {
      await api.post(`/api/animais/${animal.id}/reproducoes?propriedadeId=${propriedadeId}`, dadosReproducao);
      setReproducaoModal(false);
      setReproducaoForm(reproducaoInicial);
      carregarFicha();
    } catch (error) {
      await addToSyncQueue('reproducoes', 'INSERT', { animalId: animal.id, propriedadeId, ...dadosReproducao });
      setReproducoes(prev => [{ id: -Date.now(), animalId: animal.id, ...dadosReproducao }, ...prev]);
      setReproducaoModal(false);
      setReproducaoForm(reproducaoInicial);
      Alert.alert('Sem conexão', 'Evento reprodutivo salvo localmente e será sincronizado automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarVacina() {
    if (!vacinaForm.nomeVacina.trim()) {
      Alert.alert('Atencao', 'Informe o nome da vacina.');
      return;
    }
    if (!validarDataCompleta(vacinaForm.dataAplicacao)) {
      Alert.alert('Atencao', 'Informe a data em DD/MM/AAAA.');
      return;
    }

    const dadosVacina = {
      animalId: animal.id,
      nomeVacina: vacinaForm.nomeVacina.trim(),
      dataAplicacao: dataBrParaApi(vacinaForm.dataAplicacao),
      dose: vacinaForm.dose.trim() || null,
      observacao: vacinaForm.observacao.trim() || null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('vacinas', 'INSERT', { propriedadeId, ...dadosVacina });
      const reg: SaudeRegistro = { id: -Date.now(), animalId: animal.id, tipoRegistro: 'Vacina', dataRegistro: dadosVacina.dataAplicacao, descricao: dadosVacina.nomeVacina, dose: dadosVacina.dose, observacao: dadosVacina.observacao };
      const novosSaudeRegistros = [reg, ...saudeRegistros];
      setSaudeRegistros(novosSaudeRegistros);
      saveAnimalFichaCache(animal.id, { eventos, lactacoes, reproducoes, saudeRegistros: novosSaudeRegistros }).catch(() => {});
      setVacinaModal(false);
      setVacinaForm(vacinaInicial);
      setSalvando(false);
      return;
    }

    try {
      await api.post(`/api/saude/vacinas?propriedadeId=${propriedadeId}`, dadosVacina);
      setVacinaModal(false);
      setVacinaForm(vacinaInicial);
      carregarFicha();
    } catch (error) {
      await addToSyncQueue('vacinas', 'INSERT', { propriedadeId, ...dadosVacina });
      const reg: SaudeRegistro = { id: -Date.now(), animalId: animal.id, tipoRegistro: 'Vacina', dataRegistro: dadosVacina.dataAplicacao, descricao: dadosVacina.nomeVacina, dose: dadosVacina.dose, observacao: dadosVacina.observacao };
      const novosSaudeRegistros = [reg, ...saudeRegistros];
      setSaudeRegistros(novosSaudeRegistros);
      saveAnimalFichaCache(animal.id, { eventos, lactacoes, reproducoes, saudeRegistros: novosSaudeRegistros }).catch(() => {});
      setVacinaModal(false);
      setVacinaForm(vacinaInicial);
      Alert.alert('Sem conexão', 'Vacina salva localmente e será sincronizada automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarVermifugacao() {
    if (!validarDataCompleta(vermifugacaoForm.dataAplicacao)) {
      Alert.alert('Atencao', 'Informe a data da aplicacao em DD/MM/AAAA.');
      return;
    }
    if (vermifugacaoForm.proximaAplicacao && !validarDataCompleta(vermifugacaoForm.proximaAplicacao)) {
      Alert.alert('Atencao', 'Informe a proxima aplicacao em DD/MM/AAAA.');
      return;
    }

    const dadosVermifugacao = {
      animalId: animal.id,
      tipoRegistro: 'Vermifugacao',
      dataRegistro: dataBrParaApi(vermifugacaoForm.dataAplicacao),
      descricao: 'Vermifugacao',
      produtoUtilizado: vermifugacaoForm.produtoUtilizado.trim() || null,
      dose: vermifugacaoForm.dose.trim() || null,
      proximaAplicacao: vermifugacaoForm.proximaAplicacao ? dataBrParaApi(vermifugacaoForm.proximaAplicacao) : null,
      observacao: vermifugacaoForm.observacao.trim() || null,
    };

    setSalvando(true);

    if (!isOnline) {
      await addToSyncQueue('saude_registros', 'INSERT', { propriedadeId, ...dadosVermifugacao });
      setSaudeRegistros(prev => [{ id: -Date.now(), ...dadosVermifugacao }, ...prev]);
      setVermifugacaoModal(false);
      setVermifugacaoForm(vermifugacaoInicial);
      setSalvando(false);
      return;
    }

    try {
      await api.post(`/api/saude/registros?propriedadeId=${propriedadeId}`, dadosVermifugacao);
      setVermifugacaoModal(false);
      setVermifugacaoForm(vermifugacaoInicial);
      carregarFicha();
    } catch (error) {
      await addToSyncQueue('saude_registros', 'INSERT', { propriedadeId, ...dadosVermifugacao });
      setSaudeRegistros(prev => [{ id: -Date.now(), ...dadosVermifugacao }, ...prev]);
      setVermifugacaoModal(false);
      setVermifugacaoForm(vermifugacaoInicial);
      Alert.alert('Sem conexão', 'Vermifugação salva localmente e será sincronizada automaticamente.');
    } finally {
      setSalvando(false);
    }
  }

  function salvarLactacaoLocal() {
    if (!dbLocal) return;
    if (!lactacaoLocalForm.numero_parto.trim()) {
      Alert.alert('Atencao', 'Informe o numero do parto.');
      return;
    }
    try {
      dbLocal.runSync(
        `INSERT INTO animal_lactacao (animal_id, numero_parto, data_parto, inicio_controle, data_secagem, dias_lactacao, producao_total_kg, media_kg_dia, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          animal.id,
          Number(lactacaoLocalForm.numero_parto) || 0,
          lactacaoLocalForm.data_parto.trim() || null,
          lactacaoLocalForm.inicio_controle.trim() || null,
          lactacaoLocalForm.data_secagem.trim() || null,
          lactacaoLocalForm.dias_lactacao.trim() ? Number(lactacaoLocalForm.dias_lactacao) : null,
          lactacaoLocalForm.producao_total_kg.trim() ? Number(lactacaoLocalForm.producao_total_kg.replace(',', '.')) : null,
          lactacaoLocalForm.media_kg_dia.trim() ? Number(lactacaoLocalForm.media_kg_dia.replace(',', '.')) : null,
        ]
      );
      setLactacaoLocalModal(false);
      setLactacaoLocalForm(lactacaoLocalInicial);
      carregarLactacoesLocal();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar a lactacao.');
    }
  }

  function salvarCoberturaLocal() {
    if (!dbLocal) return;
    if (!coberturaLocalForm.data_cobertura.trim()) {
      Alert.alert('Atencao', 'Informe a data da cobertura.');
      return;
    }
    if (!validarDataCompleta(coberturaLocalForm.data_cobertura)) {
      Alert.alert('Atencao', 'Informe a data em DD/MM/AAAA.');
      return;
    }
    try {
      dbLocal.runSync(
        `INSERT INTO animal_cobertura (animal_id, data_cobertura, tipo, reprodutor, diagnostico_gestacao, data_diag, data_prevista_parto, data_real_parto, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          animal.id,
          dataBrParaApi(coberturaLocalForm.data_cobertura),
          coberturaLocalForm.tipo.trim() || null,
          coberturaLocalForm.reprodutor.trim() || null,
          coberturaLocalForm.diagnostico_gestacao.trim() || null,
          coberturaLocalForm.data_diag.trim() ? dataBrParaApi(coberturaLocalForm.data_diag) : null,
          coberturaLocalForm.data_prevista_parto.trim() ? dataBrParaApi(coberturaLocalForm.data_prevista_parto) : null,
          coberturaLocalForm.data_real_parto.trim() ? dataBrParaApi(coberturaLocalForm.data_real_parto) : null,
        ]
      );
      setCoberturaLocalModal(false);
      setCoberturaLocalForm(coberturaLocalInicial);
      carregarCoberturasLocal();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar a cobertura.');
    }
  }

  function salvarCuraUmbigo() {
    if (!dbLocal) return;
    try {
      dbLocal.runSync(
        `INSERT INTO animal_cura_umbigo (animal_id, dia_1, dia_2, dia_3, dia_4, dia_5, observacoes, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          animal.id,
          curaUmbigoForm.dia_1,
          curaUmbigoForm.dia_2,
          curaUmbigoForm.dia_3,
          curaUmbigoForm.dia_4,
          curaUmbigoForm.dia_5,
          curaUmbigoForm.observacoes.trim() || null,
        ]
      );
      setCuraUmbigoModal(false);
      setCuraUmbigoForm(curaUmbigoInicial);
      carregarCuraUmbigo();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar a cura do umbigo.');
    }
  }

  const handleGerarFicha = async () => {
    try {
      await gerarPdfFichaZootecnica(animal.id, 1);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar a ficha.');
    }
  };

  const diasDeVida = animal.dataNascimento
    ? Math.floor((Date.now() - new Date(animal.dataNascimento).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const ehBezerroRecemNascido = diasDeVida < 30;

  const fotoPrincipal = animal.fotos?.[0]?.fotoBase64;
  const fotoUri = fotoPrincipal ? `data:image/jpeg;base64,${fotoPrincipal}` : null;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 126 + insets.bottom }]}>
        <View style={styles.cabecalho}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
              <Text style={styles.voltarTexto}>{'\u2190'} Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="btn-pdf-ficha" onPress={handleGerarFicha} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Gerar Relatório PDF</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.titulo}>Ficha do Animal</Text>
          <Text style={styles.subtitulo}>{animal.nome || animal.brinco || 'Animal'}</Text>
        </View>

        <View style={styles.fotoCard}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.foto} />
          ) : (
            <View style={styles.semFoto}>
              <Text style={styles.semFotoTexto}>Sem foto</Text>
            </View>
          )}
        </View>

        <Section title="Dados principais">
          <TouchableOpacity
            style={styles.botaoLinha}
            onPress={() => navigation.navigate('AnimalReport', { animal })}
          >
            <Text style={styles.botaoLinhaTexto}>Visualizar Ficha</Text>
          </TouchableOpacity>
          <Info label="Nome" value={animal.nome} />
          <Info label="Brinco" value={animal.brinco} />
          <Info label="Raca" value={animal.raca} />
          <Info label="Sexo" value={animal.sexo === 'F' ? 'Femea' : 'Macho'} />
          <Info label="Tipo" value={animal.tipo} />
          <Info label="Status do leite" value={animal.statusLeite} />
          <Info label="Situacao" value={texto(animal.ativo)} />
          <Info label="Data de nascimento" value={animal.dataNascimentoInformada || data(animal.dataNascimento)} />
          <Info label="Idade" value={idadeAnimal(animal)} />
          <Info label="Marca ou sinal" value={animal.marcaSinal} />
          <Info label="Nome do pai" value={animal.nomePai} />
          <Info label="Nome da mae" value={animal.nomeMae} />
          <Info label="Procedencia" value={animal.procedencia} />
          <Info label="Data de entrada" value={animal.dataEntradaInformada || data(animal.dataEntrada)} />
          <Info label="Data de saida" value={animal.dataSaidaInformada || data(animal.dataSaida)} />
          <Info label="Valor" value={moeda(animal.valor)} />
          <Info label="Motivo da saida" value={animal.motivoSaida} />
          <Info label="Observacao" value={animal.observacao} />
        </Section>

        <Section
          title="Saude"
          action="Registrar vacina"
          onAction={() => setVacinaModal(true)}
          actionTestID="btn-registrar-vacina"
        >
          <TouchableOpacity style={styles.botaoLinha} onPress={() => setVermifugacaoModal(true)}>
            <Text style={styles.botaoLinhaTexto}>Registrar vermifugacao</Text>
          </TouchableOpacity>
          <Text style={styles.vazio}>Registre vacinas e vermifugacoes para atualizar as pendencias na tela Saude.</Text>
        </Section>

        <Section title="Historico de Saude">
          {carregando ? <ActivityIndicator color={PRIMARY} /> : saudeRegistros.length === 0 ? (
            <Text style={styles.vazio}>Nenhum registro de saude cadastrado.</Text>
          ) : saudeRegistros.map(registro => (
            <View key={registro.id} style={styles.item}>
              <Text style={styles.itemTitulo}>{registro.tipoRegistro}</Text>
              <Info label="Data" value={data(registro.dataRegistro)} compact />
              <Info label="Descricao" value={registro.descricao} compact />
              <Info label="Produto utilizado" value={registro.produtoUtilizado} compact />
              <Info label="Dose" value={registro.dose} compact />
              <Info label="Veterinario" value={registro.veterinario} compact />
              <Info label="Proxima aplicacao" value={data(registro.proximaAplicacao)} compact />
              <Info label="Observacao" value={registro.observacao} compact />
            </View>
          ))}
        </Section>

        <Section
          title="Reproducao"
          action="+ Registrar evento reprodutivo"
          onAction={() => setReproducaoModal(true)}
        >
          {carregando ? <ActivityIndicator color={PRIMARY} /> : reproducoes.length === 0 ? (
            <Text style={styles.vazio}>Nenhum evento reprodutivo cadastrado.</Text>
          ) : reproducoes.map(registro => (
            <View key={registro.id} style={styles.item}>
              <Text style={styles.itemTitulo}>{registro.tipoEvento}</Text>
              <Info label="Data" value={data(registro.dataEvento)} compact />
              <Info label="Reprodutor" value={registro.reprodutor} compact />
              <Info label="Inseminador" value={registro.inseminador} compact />
              <Info label="Previsao de parto" value={data(registro.previsaoParto)} compact />
              <Info label="Resultado" value={registro.resultado} compact />
              <Info label="Observacao" value={registro.observacao} compact />
            </View>
          ))}
        </Section>

        <Section
          title="Eventos Zootecnicos"
          action="+ Adicionar Evento"
          onAction={() => setEventoModal(true)}
        >
          {carregando ? <ActivityIndicator color={PRIMARY} /> : eventos.length === 0 ? (
            <Text style={styles.vazio}>Nenhum evento cadastrado.</Text>
          ) : eventos.map(evento => (
            <View key={evento.id} style={styles.item}>
              <Text style={styles.itemTitulo}>{evento.tipoEvento}</Text>
              <Info label="Data" value={data(evento.dataEvento)} compact />
              <Info label="Peso em kg" value={evento.pesoKg != null ? `${evento.pesoKg} kg` : null} compact />
              <Info label="Racao kg/dia" value={evento.racaoKgDia != null ? `${evento.racaoKgDia} kg/dia` : null} compact />
              <Info label="Leite litros/dia" value={evento.leiteLitrosDia != null ? `${evento.leiteLitrosDia} L/dia` : null} compact />
              <Info label="Observacao" value={evento.observacao} compact />
            </View>
          ))}
        </Section>

        <Section
          title="Lactacao"
          action="+ Adicionar Lactacao"
          onAction={() => setLactacaoModal(true)}
        >
          {carregando ? <ActivityIndicator color={PRIMARY} /> : lactacoes.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma lactacao cadastrada.</Text>
          ) : lactacoes.map(lactacao => (
            <View key={lactacao.id} style={styles.item}>
              <Text style={styles.itemTitulo}>Lactacao {lactacao.numeroLactacao}</Text>
              <Info label="Data do parto" value={data(lactacao.dataParto)} compact />
              <Info label="Inicio do controle" value={data(lactacao.inicioControle)} compact />
              <Info label="Data de secagem" value={data(lactacao.dataSecagem)} compact />
              <Info label="Dias de lactacao" value={lactacao.diasLactacao} compact />
              <Info label="Producao total" value={lactacao.producaoTotal != null ? `${lactacao.producaoTotal} L` : null} compact />
              <Info label="Media diaria" value={lactacao.mediaDiaria != null ? `${lactacao.mediaDiaria} L/dia` : null} compact />
            </View>
          ))}
        </Section>

        <Section title="Lactacoes (Local)" action="+ Adicionar" onAction={() => setLactacaoLocalModal(true)}>
          {lactacoesLocal.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma lactacao local registrada.</Text>
          ) : lactacoesLocal.map(lac => (
            <View key={lac.id} style={styles.item}>
              <Text style={styles.itemTitulo}>Parto {lac.numero_parto}</Text>
              <Info label="Data do parto" value={data(lac.data_parto)} compact />
              <Info label="Inicio controle" value={data(lac.inicio_controle)} compact />
              <Info label="Data de secagem" value={data(lac.data_secagem)} compact />
              <Info label="Dias de lactacao" value={lac.dias_lactacao} compact />
              <Info label="Producao total" value={lac.producao_total_kg != null ? `${lac.producao_total_kg} kg` : null} compact />
              <Info label="Media kg/dia" value={lac.media_kg_dia != null ? `${lac.media_kg_dia} kg/dia` : null} compact />
            </View>
          ))}
        </Section>

        <Section title="Coberturas / Inseminacoes" action="+ Adicionar" onAction={() => setCoberturaLocalModal(true)}>
          {coberturasLocal.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma cobertura registrada.</Text>
          ) : coberturasLocal.map(cob => (
            <View key={cob.id} style={styles.item}>
              <Text style={styles.itemTitulo}>{cob.tipo || 'Cobertura'}</Text>
              <Info label="Data" value={data(cob.data_cobertura)} compact />
              <Info label="Reprodutor" value={cob.reprodutor} compact />
              <Info label="Diagnostico" value={cob.diagnostico_gestacao} compact />
              <Info label="Data do diag." value={data(cob.data_diag)} compact />
              <Info label="Prev. parto" value={data(cob.data_prevista_parto)} compact />
              <Info label="Parto real" value={data(cob.data_real_parto)} compact />
            </View>
          ))}
        </Section>

        {ehBezerroRecemNascido && (
          <Section title="Cura do Umbigo" action="+ Registrar" onAction={() => setCuraUmbigoModal(true)}>
            {curaUmbigoList.length === 0 ? (
              <Text style={styles.vazio}>Nenhum registro de cura do umbigo.</Text>
            ) : curaUmbigoList.map(cur => (
              <View key={cur.id} style={styles.item}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  {(['dia_1', 'dia_2', 'dia_3', 'dia_4', 'dia_5'] as const).map((d, i) => (
                    <View key={d} style={[styles.diaChip, { backgroundColor: cur[d] === 'S' ? '#d4edda' : '#f8d7da' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: cur[d] === 'S' ? '#155724' : '#721c24' }}>
                        Dia {i + 1}: {cur[d] === 'S' ? 'SIM' : 'NAO'}
                      </Text>
                    </View>
                  ))}
                </View>
                {cur.observacoes ? <Info label="Observacoes" value={cur.observacoes} compact /> : null}
              </View>
            ))}
          </Section>
        )}
      </ScrollView>

      <EventoModal
        visible={eventoModal}
        form={eventoForm}
        saving={salvando}
        onChange={setEventoForm}
        onClose={() => setEventoModal(false)}
        onSave={salvarEvento}
      />

      <LactacaoModal
        visible={lactacaoModal}
        form={lactacaoForm}
        saving={salvando}
        onChange={setLactacaoForm}
        onClose={() => setLactacaoModal(false)}
        onSave={salvarLactacao}
      />

      <ReproducaoModal
        visible={reproducaoModal}
        form={reproducaoForm}
        saving={salvando}
        onChange={setReproducaoForm}
        onClose={() => setReproducaoModal(false)}
        onSave={salvarReproducao}
      />

      <VacinaModal
        visible={vacinaModal}
        form={vacinaForm}
        saving={salvando}
        onChange={setVacinaForm}
        onClose={() => setVacinaModal(false)}
        onSave={salvarVacina}
      />

      <VermifugacaoModal
        visible={vermifugacaoModal}
        form={vermifugacaoForm}
        saving={salvando}
        onChange={setVermifugacaoForm}
        onClose={() => setVermifugacaoModal(false)}
        onSave={salvarVermifugacao}
      />

      <Modal visible={lactacaoLocalModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Registrar Lactacao</Text>
              <Field label="Numero do parto" value={lactacaoLocalForm.numero_parto} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, numero_parto: v }))} keyboardType="number-pad" />
              <Field label="Data do parto" value={lactacaoLocalForm.data_parto} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, data_parto: v }))} placeholder="AAAA-MM-DD" />
              <Field label="Inicio do controle" value={lactacaoLocalForm.inicio_controle} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, inicio_controle: v }))} placeholder="AAAA-MM-DD" />
              <Field label="Data de secagem" value={lactacaoLocalForm.data_secagem} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, data_secagem: v }))} placeholder="AAAA-MM-DD" />
              <Field label="Dias de lactacao" value={lactacaoLocalForm.dias_lactacao} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, dias_lactacao: v }))} keyboardType="number-pad" />
              <Field label="Producao total (kg)" value={lactacaoLocalForm.producao_total_kg} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, producao_total_kg: v }))} keyboardType="decimal-pad" />
              <Field label="Media kg/dia" value={lactacaoLocalForm.media_kg_dia} onChangeText={v => setLactacaoLocalForm(f => ({ ...f, media_kg_dia: v }))} keyboardType="decimal-pad" />
              <ModalActions saving={salvando} onClose={() => setLactacaoLocalModal(false)} onSave={salvarLactacaoLocal} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={coberturaLocalModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Registrar Cobertura / IA</Text>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chips}>
                {['Monta Natural', 'IA'].map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, coberturaLocalForm.tipo === t && styles.chipAtivo]} onPress={() => setCoberturaLocalForm(f => ({ ...f, tipo: t }))}>
                    <Text style={[styles.chipTexto, coberturaLocalForm.tipo === t && styles.chipTextoAtivo]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Data da cobertura" value={coberturaLocalForm.data_cobertura} onChangeText={v => setCoberturaLocalForm(f => ({ ...f, data_cobertura: formatarDataBrasileira(v) }))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} />
              <Field label="Reprodutor / Touro" value={coberturaLocalForm.reprodutor} onChangeText={v => setCoberturaLocalForm(f => ({ ...f, reprodutor: v }))} />
              <Text style={styles.label}>Diagnostico de gestacao</Text>
              <View style={styles.chips}>
                {['+', '-', ''].map(d => (
                  <TouchableOpacity key={d || 'nd'} style={[styles.chip, coberturaLocalForm.diagnostico_gestacao === d && styles.chipAtivo]} onPress={() => setCoberturaLocalForm(f => ({ ...f, diagnostico_gestacao: d }))}>
                    <Text style={[styles.chipTexto, coberturaLocalForm.diagnostico_gestacao === d && styles.chipTextoAtivo]}>{d === '+' ? 'Positivo' : d === '-' ? 'Negativo' : 'Nao avaliado'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Data do diagnostico" value={coberturaLocalForm.data_diag} onChangeText={v => setCoberturaLocalForm(f => ({ ...f, data_diag: formatarDataBrasileira(v) }))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} />
              <Field label="Previsao de parto" value={coberturaLocalForm.data_prevista_parto} onChangeText={v => setCoberturaLocalForm(f => ({ ...f, data_prevista_parto: formatarDataBrasileira(v) }))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} />
              <Field label="Data do parto real" value={coberturaLocalForm.data_real_parto} onChangeText={v => setCoberturaLocalForm(f => ({ ...f, data_real_parto: formatarDataBrasileira(v) }))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} />
              <ModalActions saving={salvando} onClose={() => setCoberturaLocalModal(false)} onSave={salvarCoberturaLocal} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={curaUmbigoModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalFundo}>
            <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Cura do Umbigo</Text>
              {(['dia_1', 'dia_2', 'dia_3', 'dia_4', 'dia_5'] as const).map((d, i) => (
                <View key={d} style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>Dia {i + 1}</Text>
                  <View style={styles.chips}>
                    {(['S', 'N'] as const).map(v => (
                      <TouchableOpacity key={v} style={[styles.chip, curaUmbigoForm[d] === v && styles.chipAtivo]} onPress={() => setCuraUmbigoForm(f => ({ ...f, [d]: v }))}>
                        <Text style={[styles.chipTexto, curaUmbigoForm[d] === v && styles.chipTextoAtivo]}>{v === 'S' ? 'SIM' : 'NAO'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <Field label="Observacoes" value={curaUmbigoForm.observacoes} onChangeText={v => setCuraUmbigoForm(f => ({ ...f, observacoes: v }))} multiline />
              <ModalActions saving={salvando} onClose={() => setCuraUmbigoModal(false)} onSave={salvarCuraUmbigo} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomMenu activeItem="Animais" navigation={navigation} />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  action,
  onAction,
  actionTestID,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
  actionTestID?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && (
          <TouchableOpacity testID={actionTestID} style={styles.addButton} onPress={onAction}>
            <Text style={styles.addButtonText}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function Info({ label, value, compact }: { label: string; value?: string | number | null; compact?: boolean }) {
  return (
    <View style={[styles.infoRow, compact && styles.infoRowCompact]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{texto(value)}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  maxLength?: number;
  multiline?: boolean;
  testID?: string;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aeb8b1"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        testID={testID}
      />
    </>
  );
}

function EventoModal({
  visible,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: EventoForm;
  saving: boolean;
  onChange: (form: EventoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitulo}>Adicionar Evento</Text>
          <Text style={styles.label}>Tipo do evento</Text>
          <View style={styles.chips}>
            {EVENTOS.map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={[styles.chip, form.tipoEvento === tipo && styles.chipAtivo]}
                onPress={() => onChange({ ...form, tipoEvento: tipo })}
              >
                <Text style={[styles.chipTexto, form.tipoEvento === tipo && styles.chipTextoAtivo]}>{tipo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Data" value={form.dataEvento} onChangeText={(v) => onChange({ ...form, dataEvento: v })} placeholder="AAAA-MM-DD" />
          <Field label="Peso em kg" value={form.pesoKg} onChangeText={(v) => onChange({ ...form, pesoKg: v })} keyboardType="decimal-pad" />
          <Field label="Racao kg/dia" value={form.racaoKgDia} onChangeText={(v) => onChange({ ...form, racaoKgDia: v })} keyboardType="decimal-pad" />
          <Field label="Leite litros/dia" value={form.leiteLitrosDia} onChangeText={(v) => onChange({ ...form, leiteLitrosDia: v })} keyboardType="decimal-pad" />
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <ModalActions saving={saving} onClose={onClose} onSave={onSave} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LactacaoModal({
  visible,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: LactacaoForm;
  saving: boolean;
  onChange: (form: LactacaoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitulo}>Adicionar Lactacao</Text>
          <Field label="Numero da lactacao" value={form.numeroLactacao} onChangeText={(v) => onChange({ ...form, numeroLactacao: v })} keyboardType="number-pad" />
          <Field label="Data do parto" value={form.dataParto} onChangeText={(v) => onChange({ ...form, dataParto: v })} placeholder="AAAA-MM-DD" />
          <Field label="Inicio do controle" value={form.inicioControle} onChangeText={(v) => onChange({ ...form, inicioControle: v })} placeholder="AAAA-MM-DD" />
          <Field label="Data de secagem" value={form.dataSecagem} onChangeText={(v) => onChange({ ...form, dataSecagem: v })} placeholder="AAAA-MM-DD" />
          <Field label="Dias de lactacao" value={form.diasLactacao} onChangeText={(v) => onChange({ ...form, diasLactacao: v })} keyboardType="number-pad" />
          <Field label="Producao total" value={form.producaoTotal} onChangeText={(v) => onChange({ ...form, producaoTotal: v })} keyboardType="decimal-pad" />
          <Field label="Media diaria" value={form.mediaDiaria} onChangeText={(v) => onChange({ ...form, mediaDiaria: v })} keyboardType="decimal-pad" />
          <ModalActions saving={saving} onClose={onClose} onSave={onSave} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReproducaoModal({
  visible,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: ReproducaoForm;
  saving: boolean;
  onChange: (form: ReproducaoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitulo}>Registrar evento reprodutivo</Text>
          <Text style={styles.label}>Tipo do evento</Text>
          <View style={styles.chips}>
            {EVENTOS_REPRODUTIVOS.map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={[styles.chip, form.tipoEvento === tipo && styles.chipAtivo]}
                onPress={() => onChange({ ...form, tipoEvento: tipo })}
              >
                <Text style={[styles.chipTexto, form.tipoEvento === tipo && styles.chipTextoAtivo]}>{tipo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field
            label="Data do evento"
            value={form.dataEvento}
            onChangeText={(v) => onChange({ ...form, dataEvento: formatarDataBrasileira(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Field label="Reprodutor" value={form.reprodutor} onChangeText={(v) => onChange({ ...form, reprodutor: v })} />
          <Field label="Inseminador" value={form.inseminador} onChangeText={(v) => onChange({ ...form, inseminador: v })} />
          <Field
            label="Previsao de parto"
            value={form.previsaoParto}
            onChangeText={(v) => onChange({ ...form, previsaoParto: formatarDataBrasileira(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Field label="Resultado" value={form.resultado} onChangeText={(v) => onChange({ ...form, resultado: v })} />
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <ModalActions saving={saving} onClose={onClose} onSave={onSave} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VacinaModal({
  visible,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: VacinaForm;
  saving: boolean;
  onChange: (form: VacinaForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitulo}>Registrar vacina</Text>
          <Field label="Nome da vacina" value={form.nomeVacina} onChangeText={(v) => onChange({ ...form, nomeVacina: v })} testID="input-nome-vacina" />
          <Field
            label="Data de aplicacao"
            value={form.dataAplicacao}
            onChangeText={(v) => onChange({ ...form, dataAplicacao: formatarDataBrasileira(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            testID="input-data-vacina"
          />
          <Field label="Dose" value={form.dose} onChangeText={(v) => onChange({ ...form, dose: v })} placeholder="Ex: 1 dose" />
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <ModalActions saving={saving} onClose={onClose} onSave={onSave} saveTestID="btn-salvar-vacina" />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VermifugacaoModal({
  visible,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: VermifugacaoForm;
  saving: boolean;
  onChange: (form: VermifugacaoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitulo}>Registrar vermifugacao</Text>
          <Field
            label="Data da aplicacao"
            value={form.dataAplicacao}
            onChangeText={(v) => onChange({ ...form, dataAplicacao: formatarDataBrasileira(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            testID="input-data-vermifugacao"
          />
          <Field label="Produto utilizado" value={form.produtoUtilizado} onChangeText={(v) => onChange({ ...form, produtoUtilizado: v })} testID="input-nome-vermifugo" />
          <Field label="Dose" value={form.dose} onChangeText={(v) => onChange({ ...form, dose: v })} />
          <Field
            label="Proxima aplicacao"
            value={form.proximaAplicacao}
            onChangeText={(v) => onChange({ ...form, proximaAplicacao: formatarDataBrasileira(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <ModalActions saving={saving} onClose={onClose} onSave={onSave} saveTestID="btn-salvar-vermifugacao" />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalActions({ saving, onClose, onSave, saveTestID }: { saving: boolean; onClose: () => void; onSave: () => void; saveTestID?: string }) {
  return (
    <View style={styles.modalBotoes}>
      <TouchableOpacity style={styles.botaoCancelar} onPress={onClose} disabled={saving}>
        <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity testID={saveTestID} style={styles.botaoSalvar} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  content: { paddingBottom: 126 },
  cabecalho: {
    backgroundColor: PRIMARY,
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: '#a8d5b5', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitulo: { color: '#a8d5b5', fontSize: 13, marginTop: 3 },
  fotoCard: { padding: 16, paddingBottom: 0 },
  foto: { backgroundColor: '#dbe7dd', borderRadius: 14, height: 210, width: '100%' },
  semFoto: {
    alignItems: 'center',
    backgroundColor: '#dfe9e1',
    borderRadius: 14,
    height: 150,
    justifyContent: 'center',
  },
  semFotoTexto: { color: PRIMARY, fontSize: 15, fontWeight: '800' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { color: PRIMARY, flex: 1, fontSize: 17, fontWeight: '800' },
  addButton: {
    backgroundColor: '#e8f5ee',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addButtonText: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  infoRow: {
    borderBottomColor: '#eef2ee',
    borderBottomWidth: 1,
    paddingVertical: 9,
  },
  infoRowCompact: { paddingVertical: 4 },
  infoLabel: { color: '#6b766f', fontSize: 12, fontWeight: '700' },
  infoValue: { color: '#213228', fontSize: 14, marginTop: 2 },
  item: {
    backgroundColor: '#f8fbf8',
    borderColor: '#e1ebe3',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  itemTitulo: { color: PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  botaoLinha: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 8,
    padding: 11,
  },
  botaoLinhaTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  vazio: { color: '#8a958e', fontSize: 14, paddingVertical: 10, textAlign: 'center' },
  diaChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  modalFundo: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCaixa: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
  },
  modalContent: { padding: 20, paddingBottom: 34 },
  modalTitulo: { color: PRIMARY, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  label: { color: '#333', fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d6ded8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#26342b',
    fontSize: 15,
    padding: 13,
  },
  textArea: { minHeight: 92 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: '#ccd6cf',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  chipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  chipTextoAtivo: { color: PRIMARY },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 22 },
  botaoCancelar: {
    alignItems: 'center',
    borderColor: '#cbd4ce',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    padding: 14,
  },
  botaoCancelarTexto: { color: '#5d675f', fontWeight: '800' },
  botaoSalvar: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    flex: 1,
    padding: 14,
  },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
});
