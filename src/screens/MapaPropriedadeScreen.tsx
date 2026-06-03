import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { ApiError, api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveMapaCache, getMapaCache, addToSyncQueue } from '../database/localDb';

let CircleMarker: any = null;
let MapContainer: any = null;
let Marker: any = null;
let Polygon: any = null;
let Polyline: any = null;
let Popup: any = null;
let TileLayer: any = null;
let useMap: any = null;
let useMapEvents: any = null;
let divIcon: any = null;

if (Platform.OS === 'web') {
  const rl = require('react-leaflet');
  CircleMarker = rl.CircleMarker;
  MapContainer = rl.MapContainer;
  Marker = rl.Marker;
  Polygon = rl.Polygon;
  Polyline = rl.Polyline;
  Popup = rl.Popup;
  TileLayer = rl.TileLayer;
  useMap = rl.useMap;
  useMapEvents = rl.useMapEvents;
  divIcon = require('leaflet').divIcon;
  require('leaflet/dist/leaflet.css');
}

const PRIMARY = '#1a3d1f';
const TIPOS_AREA = ['Pasto', 'Piquete', 'Curral', 'Reserva', 'Plantio', 'Outro'];
const PALETA_AREA = ['#35a853', '#1f7a3a', '#8fd19e', '#d9a420', '#8b5a2b', '#2f80ed', '#9b51e0', '#eb5757', '#7b8794'];
const MAP_HEIGHT = 340;
const BRASIL_CENTER: [number, number] = [-15.7801, -47.9292];
const ESRI_WORLD_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const LeafletMapContainer = MapContainer as any;
const LeafletTileLayer = TileLayer as any;
const LeafletCircleMarker = CircleMarker as any;
const LeafletMarker = Marker as any;
const LeafletPopup = Popup as any;
const CORES_AREA: Record<string, { stroke: string; fill: string; opacity: number }> = {
  'Area Total': { stroke: '#8fd19e', fill: '#8fd19e', opacity: 0.2 },
  Pasto: { stroke: '#35a853', fill: '#35a853', opacity: 0.28 },
  Piquete: { stroke: '#1f7a3a', fill: '#1f7a3a', opacity: 0.3 },
  Curral: { stroke: '#8b5a2b', fill: '#8b5a2b', opacity: 0.3 },
  Reserva: { stroke: '#14532d', fill: '#14532d', opacity: 0.26 },
  Plantio: { stroke: '#d9a420', fill: '#d9a420', opacity: 0.3 },
  Outro: { stroke: '#7b8794', fill: '#7b8794', opacity: 0.26 },
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MapaPropriedade'>;
};

type Coordenada = [number, number];
type TipoCadastro = 'AREA_TOTAL' | 'AREA_INTERNA';
type PropriedadeArea = {
  id: number;
  propriedadeId: number;
  tipoCadastro?: TipoCadastro;
  areaPaiId?: number | null;
  nome: string;
  tipoArea: string;
  cor?: string | null;
  observacao?: string | null;
  coordenadasGeojson: string;
  areaHectares?: number | null;
  createdAt: string;
};
type TipoPonto = 'NASCENTE' | 'POCO';
type PropriedadePonto = {
  id: number;
  propriedadeId: number;
  tipo: TipoPonto;
  nome: string;
  latitude: number;
  longitude: number;
  observacao?: string | null;
  createdAt: string;
};
type AreaForm = {
  nome: string;
  tipoArea: string;
  cor: string;
  observacao: string;
};
type PontoForm = {
  tipo: TipoPonto;
  nome: string;
  observacao: string;
};

const formInicial: AreaForm = {
  nome: '',
  tipoArea: 'Pasto',
  cor: '#35a853',
  observacao: '',
};
const pontoFormInicial: PontoForm = {
  tipo: 'NASCENTE',
  nome: '',
  observacao: '',
};


function deveUsarAreasLocais(error: unknown) {
  return !(error instanceof ApiError) || error.status === 404;
}

function respostaCriacaoParaArea(area: PropriedadeArea, idRemoto?: number | null): PropriedadeArea {
  return {
    ...area,
    id: idRemoto ?? area.id,
  };
}

export default function MapaPropriedadeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();
  const [pontos, setPontos] = useState<Coordenada[]>([]);
  const [areaFechada, setAreaFechada] = useState(false);
  const [areas, setAreas] = useState<PropriedadeArea[]>([]);
  const [selecionada, setSelecionada] = useState<PropriedadeArea | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [form, setForm] = useState<AreaForm>(formInicial);
  const [modoCadastro, setModoCadastro] = useState<TipoCadastro>('AREA_TOTAL');
  const [pontosMapa, setPontosMapa] = useState<PropriedadePonto[]>([]);
  const [modoAdicionarPonto, setModoAdicionarPonto] = useState(false);
  const [pontoPendente, setPontoPendente] = useState<Coordenada | null>(null);
  const [pontoForm, setPontoForm] = useState<PontoForm>(pontoFormInicial);
  const [pontoModalVisivel, setPontoModalVisivel] = useState(false);
  const [salvandoPonto, setSalvandoPonto] = useState(false);
  const [opcoesArea, setOpcoesArea] = useState<PropriedadeArea | null>(null);
  const [centralizarPropriedadeSignal, setCentralizarPropriedadeSignal] = useState(0);
  const [focoAreaSalvaSignal, setFocoAreaSalvaSignal] = useState(0);
  const [cadastroAreaTotalAtivo, setCadastroAreaTotalAtivo] = useState(false);
  const [apiAreasDisponivel, setApiAreasDisponivel] = useState(false);

  const areaTotal = useMemo(
    () => areas.find(area => area.tipoCadastro === 'AREA_TOTAL') ?? null,
    [areas],
  );
  const areasInternas = useMemo(
    () => areas.filter(area => area.tipoCadastro !== 'AREA_TOTAL'),
    [areas],
  );

  async function carregarAreas() {
    setCarregando(true);
    if (!isOnline) {
      const cached = await getMapaCache<PropriedadeArea>(propriedadeId, 'areas');
      setAreas(cached);
      setApiAreasDisponivel(false);
      if (cached.some(area => area.tipoCadastro === 'AREA_TOTAL')) setFocoAreaSalvaSignal(v => v + 1);
      setCarregando(false);
      return;
    }
    try {
      const dados = await api.get<PropriedadeArea[]>(`/api/propriedade-areas?propriedadeId=${propriedadeId}`);
      setAreas(dados);
      setApiAreasDisponivel(true);
      setFocoAreaSalvaSignal(valor => valor + 1);
      saveMapaCache(propriedadeId, 'areas', dados).catch(() => {});
    } catch (error) {
      if (deveUsarAreasLocais(error)) {
        setApiAreasDisponivel(false);
        const cached = await getMapaCache<PropriedadeArea>(propriedadeId, 'areas');
        setAreas(cached);
        if (cached.some(area => area.tipoCadastro === 'AREA_TOTAL')) setFocoAreaSalvaSignal(v => v + 1);
      } else {
        Alert.alert('Erro', getMensagemErro(error));
      }
    } finally {
      setCarregando(false);
    }
  }

  async function carregarPontos() {
    if (!isOnline) {
      const cached = await getMapaCache<PropriedadePonto>(propriedadeId, 'pontos');
      if (cached.length > 0) setPontosMapa(cached);
      return;
    }
    try {
      const dados = await api.get<PropriedadePonto[]>(`/api/propriedade-pontos?propriedadeId=${propriedadeId}`);
      setPontosMapa(dados);
      saveMapaCache(propriedadeId, 'pontos', dados).catch(() => {});
    } catch {
      const cached = await getMapaCache<PropriedadePonto>(propriedadeId, 'pontos');
      if (cached.length > 0) setPontosMapa(cached);
    }
  }

  useEffect(() => {
    carregarAreas();
    carregarPontos();
  }, [propriedadeId]);

  useEffect(() => {
    if (areaTotal) {
      setCadastroAreaTotalAtivo(false);
    }
  }, [areaTotal]);

  function handleMapaPress(coordenada: Coordenada) {
    if (modoAdicionarPonto) {
      setPontoPendente(coordenada);
      setPontoForm({ ...pontoFormInicial, nome: 'Nascente' });
      setPontoModalVisivel(true);
      setModoAdicionarPonto(false);
      return;
    }
    if (areaFechada) return;
    setSelecionada(null);
    setPontos(prev => [...prev, coordenada]);
  }

  function removerUltimo() {
    setAreaFechada(false);
    setPontos(prev => prev.slice(0, -1));
  }

  function limpar() {
    setPontos([]);
    setAreaFechada(false);
    setSelecionada(null);
    setOpcoesArea(null);
  }

  function iniciarAreaTotal() {
    if (areaTotal) {
      selecionarArea(areaTotal);
      Alert.alert('Area Total ja cadastrada', 'A propriedade pode ter apenas uma Area Total principal.');
      return;
    }
    limpar();
    setModoCadastro('AREA_TOTAL');
    setCadastroAreaTotalAtivo(true);
  }

  function dividirPropriedade() {
    if (!areaTotal) {
      Alert.alert('Cadastre a Area Total', 'Desenhe e salve primeiro a Area Total da Fazenda.');
      return;
    }
    setPontos([]);
    setAreaFechada(false);
    setSelecionada(areaTotal);
    setModoCadastro('AREA_INTERNA');
  }

  function novaAreaInterna() {
    dividirPropriedade();
  }

  function adicionarPonto() {
    setModoAdicionarPonto(true);
    setPontos([]);
    setAreaFechada(false);
    setSelecionada(null);
  }

  function abrirSalvar() {
    if (pontos.length < 3) {
      Alert.alert('Area incompleta', 'Adicione pelo menos 3 pontos antes de salvar.');
      return;
    }
    if (modoCadastro === 'AREA_INTERNA' && !areaTotal) {
      Alert.alert('Cadastre a Area Total', 'Antes de dividir a propriedade, salve a Area Total da Fazenda.');
      return;
    }
    if (modoCadastro === 'AREA_TOTAL' && areaTotal) {
      Alert.alert('Area Total ja cadastrada', 'Use Dividir propriedade para cadastrar areas internas.');
      return;
    }
    setAreaFechada(true);
    setForm({
      nome: modoCadastro === 'AREA_TOTAL' ? 'Area Total da Fazenda' : '',
      tipoArea: modoCadastro === 'AREA_TOTAL' ? 'Area Total' : 'Pasto',
      cor: modoCadastro === 'AREA_TOTAL' ? '#8fd19e' : '#35a853',
      observacao: '',
    });
    setModalVisivel(true);
  }

  async function salvarArea() {
    if (!form.nome.trim()) {
      Alert.alert('Atencao', 'Informe o nome da area.');
      return;
    }
    if (pontos.length < 3) {
      Alert.alert('Area incompleta', 'Adicione pelo menos 3 pontos antes de salvar.');
      return;
    }

    const coordenadas = [...pontos];
    coordenadas.push(coordenadas[0]);
    const areaHectares = calcularAreaHectares(coordenadas);
    const geojson = JSON.stringify({
      type: 'Polygon',
      coordinates: [coordenadas],
    });
    const areaParaSalvar: PropriedadeArea = {
      id: Date.now(),
      propriedadeId,
      tipoCadastro: modoCadastro,
      areaPaiId: modoCadastro === 'AREA_INTERNA' ? areaTotal?.id : null,
      nome: form.nome.trim(),
      tipoArea: modoCadastro === 'AREA_TOTAL' ? 'Area Total' : form.tipoArea,
      cor: form.cor,
      observacao: form.observacao.trim() || null,
      coordenadasGeojson: geojson,
      areaHectares,
      createdAt: new Date().toISOString(),
    };
    const pareceForaDaAreaTotal = modoCadastro === 'AREA_INTERNA'
      && areaTotal
      && areaPareceForaDaAreaTotal(coordenadas, areaTotal.coordenadasGeojson);

    setSalvando(true);
    try {
      if (!isOnline) {
        await addToSyncQueue('propriedade_areas', 'INSERT', {
          propriedadeId: areaParaSalvar.propriedadeId,
          tipoCadastro: areaParaSalvar.tipoCadastro,
          areaPaiId: areaParaSalvar.areaPaiId,
          nome: areaParaSalvar.nome,
          tipoArea: areaParaSalvar.tipoArea,
          cor: areaParaSalvar.cor,
          observacao: areaParaSalvar.observacao,
          coordenadasGeojson: areaParaSalvar.coordenadasGeojson,
          areaHectares: areaParaSalvar.areaHectares,
        });
        const novasAreas = areaParaSalvar.tipoCadastro === 'AREA_TOTAL'
          ? [...areas.filter(a => a.tipoCadastro !== 'AREA_TOTAL'), areaParaSalvar]
          : [...areas, areaParaSalvar];
        setAreas(novasAreas);
        saveMapaCache(propriedadeId, 'areas', novasAreas).catch(() => {});
        setModalVisivel(false);
        if (modoCadastro === 'AREA_TOTAL') {
          limpar();
          setCadastroAreaTotalAtivo(false);
          Alert.alert('Área salva', 'Área salva localmente e será sincronizada ao conectar.', [
            { text: 'OK', onPress: () => navigation.navigate('Home') },
          ]);
          return;
        }
        limpar();
        Alert.alert('Salvo', 'Área salva localmente e será sincronizada ao conectar.');
        return;
      }

      if (pareceForaDaAreaTotal) {
        Alert.alert('Atencao', 'Esta area interna parece ter pontos fora da Area Total. Vou salvar mesmo assim por enquanto.');
      }
      if (apiAreasDisponivel) {
        const resposta = await api.post<{ id?: number }>('/api/propriedade-areas', {
          propriedadeId: areaParaSalvar.propriedadeId,
          tipoCadastro: areaParaSalvar.tipoCadastro,
          areaPaiId: areaParaSalvar.areaPaiId,
          nome: areaParaSalvar.nome,
          tipoArea: areaParaSalvar.tipoArea,
          cor: areaParaSalvar.cor,
          observacao: areaParaSalvar.observacao,
          coordenadasGeojson: areaParaSalvar.coordenadasGeojson,
          areaHectares: areaParaSalvar.areaHectares,
        });
        const novasAreas = [...areas.filter(a => a.tipoCadastro !== 'AREA_TOTAL' || areaParaSalvar.tipoCadastro !== 'AREA_TOTAL'), respostaCriacaoParaArea(areaParaSalvar, resposta.id)];
        setAreas(novasAreas);
        saveMapaCache(propriedadeId, 'areas', novasAreas).catch(() => {});
      } else {
        const novasAreas = areaParaSalvar.tipoCadastro === 'AREA_TOTAL'
          ? [...areas.filter(a => a.tipoCadastro !== 'AREA_TOTAL'), areaParaSalvar]
          : [...areas, areaParaSalvar];
        setAreas(novasAreas);
        saveMapaCache(propriedadeId, 'areas', novasAreas).catch(() => {});
      }
      setModalVisivel(false);
      if (modoCadastro === 'AREA_TOTAL') {
        limpar();
        setCadastroAreaTotalAtivo(false);
        Alert.alert('Area Total salva', 'Agora voce pode voltar ao mapa para dividir a propriedade em areas internas.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
        return;
      }
      limpar();
      await carregarAreas();
    } catch (error) {
      if (deveUsarAreasLocais(error)) {
        setApiAreasDisponivel(false);
        const novasAreas = areaParaSalvar.tipoCadastro === 'AREA_TOTAL'
          ? [...areas.filter(a => a.tipoCadastro !== 'AREA_TOTAL'), areaParaSalvar]
          : [...areas, areaParaSalvar];
        setAreas(novasAreas);
        saveMapaCache(propriedadeId, 'areas', novasAreas).catch(() => {});
        setModalVisivel(false);
        if (modoCadastro === 'AREA_TOTAL') {
          limpar();
          setCadastroAreaTotalAtivo(false);
          Alert.alert('Area Total salva', 'Agora voce pode voltar ao mapa para dividir a propriedade em areas internas.', [
            { text: 'OK', onPress: () => navigation.navigate('Home') },
          ]);
          return;
        }
        limpar();
        setFocoAreaSalvaSignal(valor => valor + 1);
        return;
      }
      Alert.alert('Erro', getMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  function selecionarArea(area: PropriedadeArea) {
    const pontosArea = geojsonParaPontos(area.coordenadasGeojson);
    if (pontosArea.length >= 3) {
      setSelecionada(area);
      setPontos(pontosArea);
      setAreaFechada(true);
      setModoCadastro(area.tipoCadastro === 'AREA_TOTAL' ? 'AREA_TOTAL' : 'AREA_INTERNA');
    }
  }

  function abrirOpcoesArea(area: PropriedadeArea) {
    setOpcoesArea(area);
    selecionarArea(area);
  }

  function acaoArea(acao: string) {
    if (!opcoesArea) return;
    if (acao === 'dividir') {
      setOpcoesArea(null);
      dividirPropriedade();
      return;
    }
    Alert.alert('Em breve', `${acao} da area "${opcoesArea.nome}" sera implementado em uma proxima etapa.`);
    setOpcoesArea(null);
  }

  async function salvarPonto() {
    if (!pontoPendente) return;
    if (!pontoForm.nome.trim()) {
      Alert.alert('Atencao', 'Informe o nome do ponto.');
      return;
    }
    const dadosPonto = {
      propriedadeId,
      tipo: pontoForm.tipo,
      nome: pontoForm.nome.trim(),
      longitude: pontoPendente[0],
      latitude: pontoPendente[1],
      observacao: pontoForm.observacao.trim() || null,
    };

    setSalvandoPonto(true);
    try {
      if (!isOnline) {
        await addToSyncQueue('propriedade_pontos', 'INSERT', dadosPonto);
        const novoPonto: PropriedadePonto = { ...dadosPonto, id: -Date.now(), createdAt: new Date().toISOString() } as unknown as PropriedadePonto;
        const atualizados = [...pontosMapa, novoPonto];
        setPontosMapa(atualizados);
        saveMapaCache(propriedadeId, 'pontos', atualizados).catch(() => {});
        setPontoModalVisivel(false);
        setPontoPendente(null);
        setPontoForm(pontoFormInicial);
        Alert.alert('Salvo', 'Ponto salvo localmente e será sincronizado ao conectar.');
        return;
      }

      const criado = await api.post<PropriedadePonto>('/api/propriedade-pontos', dadosPonto);
      const novoPonto = criado ?? { ...dadosPonto, id: -Date.now(), createdAt: new Date().toISOString() } as unknown as PropriedadePonto;
      const atualizados = [...pontosMapa, novoPonto];
      setPontosMapa(atualizados);
      saveMapaCache(propriedadeId, 'pontos', atualizados).catch(() => {});
      setPontoModalVisivel(false);
      setPontoPendente(null);
      setPontoForm(pontoFormInicial);
    } catch {
      const novoPonto: PropriedadePonto = { ...dadosPonto, id: -Date.now(), createdAt: new Date().toISOString() } as unknown as PropriedadePonto;
      const atualizados = [...pontosMapa, novoPonto];
      setPontosMapa(atualizados);
      saveMapaCache(propriedadeId, 'pontos', atualizados).catch(() => {});
      setPontoModalVisivel(false);
      setPontoPendente(null);
      setPontoForm(pontoFormInicial);
    } finally {
      setSalvandoPonto(false);
    }
  }

  const areaTotalPontos = useMemo(
    () => areaTotal ? geojsonParaPontos(areaTotal.coordenadasGeojson) : [],
    [areaTotal],
  );
  const areaTotalKey = useMemo(() => areaTotalPontos.map(p => p.join(',')).join('|'), [areaTotalPontos]);
  const areaTotalCentro = useMemo(() => centroide(areaTotalPontos), [areaTotalPontos]);
  const propriedadeLabel = areaTotal?.nome || 'Propriedade';
  const tituloModo = areaTotal
    ? (modoAdicionarPonto ? 'Clique no mapa para marcar o ponto' : modoCadastro === 'AREA_INTERNA' ? 'Desenhando area interna' : 'Visualizando Area Total')
    : cadastroAreaTotalAtivo ? 'Desenhando Area Total' : 'Cadastre primeiro a Area Total';
  const mostrarMapa = !!areaTotal || cadastroAreaTotalAtivo;

  return (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 126 + insets.bottom }]}>
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Text style={styles.voltarTexto}>{'\u2190'} Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Mapa da Propriedade</Text>
          <Text style={styles.subtitulo}>{tituloModo}</Text>
        </View>

        {carregando ? (
          <View style={styles.estadoInicialCard}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : !mostrarMapa ? (
          <View style={styles.estadoInicialCard}>
            <Text style={styles.estadoInicialTitulo}>Você ainda não cadastrou a Área da Propriedade</Text>
            <Text style={styles.estadoInicialTexto}>
              Cadastre primeiro o limite total da fazenda. Depois disso, o AgroControl libera a divisao em pastos, piquetes e outras areas internas.
            </Text>
            <TouchableOpacity style={styles.estadoInicialBotao} onPress={iniciarAreaTotal}>
              <Text style={styles.estadoInicialBotaoTexto}>Cadastrar Área da Propriedade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={styles.fluxoCard}>
          <Text style={styles.sectionTitle}>Organizacao da fazenda</Text>
          <Text style={styles.fluxoTexto}>
            {areaTotal
              ? 'Area Total cadastrada. Agora voce pode dividir a propriedade em pastos, piquetes e outras areas internas.'
              : 'Primeiro desenhe e salve a Area Total da Fazenda. Depois sera possivel dividir a propriedade.'}
          </Text>
          <View style={styles.fluxoBotoes}>
            <TouchableOpacity style={styles.fluxoBotao} onPress={iniciarAreaTotal}>
              <Text style={styles.fluxoBotaoTexto}>{areaTotal ? 'Ver Area Total' : 'Cadastrar Area da Propriedade'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fluxoBotao, styles.fluxoBotaoPrimario, !areaTotal && styles.botaoDesabilitado]}
              onPress={dividirPropriedade}
              disabled={!areaTotal}
            >
              <Text style={styles.fluxoBotaoPrimarioTexto}>Dividir propriedade</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fluxoBotao, !areaTotal && styles.botaoDesabilitado]}
              onPress={novaAreaInterna}
              disabled={!areaTotal}
            >
              <Text style={styles.fluxoBotaoTexto}>+ Nova area interna</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapaCard}>
          <View style={styles.mapa}>
            {Platform.OS === 'web' ? (
              <LeafletMapContainer
                center={BRASIL_CENTER}
                zoom={5}
                scrollWheelZoom
                style={{ height: MAP_HEIGHT, width: '100%' }}
              >
                <LeafletTileLayer
                  attribution="Tiles &copy; Esri"
                  url={ESRI_WORLD_IMAGERY}
                />
                <LeafletTileLayer
                  attribution="Labels &copy; Esri"
                  url={ESRI_LABELS}
                />
                <MapaClickHandler onMapClick={handleMapaPress} />
                <FocoMapa
                  areaTotalPontos={areaTotalPontos}
                  areaTotalKey={areaTotalKey}
                  centralizarPropriedadeSignal={centralizarPropriedadeSignal}
                  focoAreaSalvaSignal={focoAreaSalvaSignal}
                />
                {areas.map(area => {
                  const coords = geojsonParaPontos(area.coordenadasGeojson);
                  if (coords.length < 3) return null;
                  const cor = corDaArea(area);
                  return (
                    <Polygon
                      key={`saved-${area.id}`}
                      positions={coords.map(coordenadaParaLatLng)}
                      eventHandlers={{ click: () => abrirOpcoesArea(area) }}
                      pathOptions={{
                        color: cor.stroke,
                        weight: area.tipoCadastro === 'AREA_TOTAL' ? 3 : 2,
                        fillColor: cor.fill,
                        fillOpacity: cor.opacity,
                      }}
                    />
                  );
                })}
                {areaTotalCentro ? (
                  <LeafletMarker
                    position={coordenadaParaLatLng(areaTotalCentro)}
                    icon={labelIcon(propriedadeLabel)}
                    interactive={false}
                  />
                ) : null}
                {pontosMapa.map(ponto => (
                  <LeafletCircleMarker
                    key={`ponto-${ponto.id}`}
                    center={[Number(ponto.latitude), Number(ponto.longitude)]}
                    radius={ponto.tipo === 'NASCENTE' ? 8 : 7}
                    pathOptions={estiloPonto(ponto.tipo)}
                  >
                    <LeafletPopup>
                      <strong>{ponto.nome}</strong><br />
                      {ponto.tipo === 'NASCENTE' ? 'Nascente' : 'Poco'}
                      {ponto.observacao ? <><br />{ponto.observacao}</> : null}
                    </LeafletPopup>
                  </LeafletCircleMarker>
                ))}
                {pontos.length > 1 ? (
                  <Polyline positions={pontos.map(coordenadaParaLatLng)} pathOptions={{ color: '#ffffff', weight: 4 }} />
                ) : null}
                {areaFechada && pontos.length >= 3 ? (
                  <Polygon
                    positions={pontos.map(coordenadaParaLatLng)}
                    pathOptions={{ color: '#ffffff', weight: 3, fillColor: corDaArea({ tipoCadastro: modoCadastro, tipoArea: form.tipoArea, cor: form.cor } as PropriedadeArea).fill, fillOpacity: 0.32 }}
                  />
                ) : null}
                {pontos.map((ponto, index) => (
                  <LeafletCircleMarker
                    key={`${ponto.join(',')}-${index}`}
                    center={coordenadaParaLatLng(ponto)}
                    radius={7}
                    pathOptions={{ color: '#ffffff', fillColor: '#f4d35e', fillOpacity: 1, weight: 2 }}
                  />
                ))}
              </LeafletMapContainer>
            ) : (
              <View style={styles.mapaFallback}>
                <Text style={styles.mapaFallbackTexto}>Mapa disponivel na versao web.</Text>
              </View>
            )}
          </View>
          <Text style={styles.dica}>
            {modoAdicionarPonto ? 'Clique no local da nascente ou poco.' : 'Toque no mapa para adicionar pontos reais. Com 3 ou mais pontos, feche e salve a area.'}
          </Text>
          {areaTotal ? (
            <TouchableOpacity
              style={styles.centralizarBotao}
              onPress={() => setCentralizarPropriedadeSignal(valor => valor + 1)}
            >
              <Text style={styles.centralizarBotaoTexto}>Centralizar propriedade</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          {areaTotal ? (
            <>
              <TouchableOpacity style={styles.toolButton} onPress={novaAreaInterna}>
                <Text style={styles.toolButtonText}>+ Adicionar area interna</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={adicionarPonto}>
                <Text style={styles.toolButtonText}>Adicionar ponto</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity style={styles.toolButton} onPress={removerUltimo} disabled={pontos.length === 0}>
            <Text style={styles.toolButtonText}>Remover ultimo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={limpar}>
            <Text style={styles.toolButtonText}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolButton, styles.toolPrimary]} onPress={abrirSalvar}>
            <Text style={styles.toolPrimaryText}>{areaFechada ? 'Salvar area' : 'Fechar area'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listaCard}>
          <Text style={styles.sectionTitle}>Area Total</Text>
          {carregando ? <ActivityIndicator color={PRIMARY} /> : areas.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma area salva.</Text>
          ) : areaTotal ? (
            <AreaItem area={areaTotal} ativa={selecionada?.id === areaTotal.id} onPress={() => selecionarArea(areaTotal)} onOptions={() => abrirOpcoesArea(areaTotal)} />
          ) : (
            <Text style={styles.vazio}>Cadastre a Area Total para liberar as divisoes internas.</Text>
          )}

          <Text style={[styles.sectionTitle, styles.sectionTitleEspacado]}>Areas internas</Text>
          {!areaTotal ? (
            <Text style={styles.vazio}>As areas internas ficam disponiveis depois da Area Total.</Text>
          ) : areasInternas.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma area interna salva.</Text>
          ) : areasInternas.map(area => (
            <AreaItem key={area.id} area={area} ativa={selecionada?.id === area.id} onPress={() => selecionarArea(area)} onOptions={() => abrirOpcoesArea(area)} />
          ))}
        </View>

        <View style={styles.listaCard}>
          <Text style={styles.sectionTitle}>Nascentes e pocos</Text>
          {pontosMapa.length === 0 ? (
            <Text style={styles.vazio}>Nenhum ponto cadastrado.</Text>
          ) : pontosMapa.map(ponto => (
            <View key={ponto.id} style={styles.pontoItem}>
              <Text style={styles.areaNome}>{ponto.tipo === 'NASCENTE' ? 'Nascente' : 'Poco'} - {ponto.nome}</Text>
              <Text style={styles.areaTipo}>{Number(ponto.latitude).toFixed(6)}, {Number(ponto.longitude).toFixed(6)}</Text>
              {ponto.observacao ? <Text style={styles.areaObs}>{ponto.observacao}</Text> : null}
            </View>
          ))}
        </View>
          </>
        )}
      </ScrollView>

      <SalvarAreaModal
        visible={modalVisivel}
        form={form}
        tipoCadastro={modoCadastro}
        saving={salvando}
        onChange={setForm}
        onClose={() => setModalVisivel(false)}
        onSave={salvarArea}
      />

      <SalvarPontoModal
        visible={pontoModalVisivel}
        form={pontoForm}
        saving={salvandoPonto}
        coordenada={pontoPendente}
        onChange={setPontoForm}
        onClose={() => {
          setPontoModalVisivel(false);
          setPontoPendente(null);
        }}
        onSave={salvarPonto}
      />

      <AreaOptionsModal
        area={opcoesArea}
        onClose={() => setOpcoesArea(null)}
        onEdit={() => acaoArea('Editar')}
        onDivide={() => acaoArea('dividir')}
        onDelete={() => acaoArea('Excluir')}
      />

      <BottomMenu activeItem="Início" navigation={navigation} />
    </View>
  );
}

function SalvarAreaModal({
  visible,
  form,
  tipoCadastro,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: AreaForm;
  tipoCadastro: TipoCadastro;
  saving: boolean;
  onChange: (form: AreaForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitulo}>{tipoCadastro === 'AREA_TOTAL' ? 'Salvar Area Total' : 'Salvar area interna'}</Text>
          <Field
            label={tipoCadastro === 'AREA_TOTAL' ? 'Nome da Area Total' : 'Nome da area'}
            value={form.nome}
            onChangeText={(v) => onChange({ ...form, nome: v })}
            placeholder={tipoCadastro === 'AREA_TOTAL' ? 'Ex: Fazenda Sao Jose' : 'Ex: Piquete 01'}
          />
          {tipoCadastro === 'AREA_INTERNA' ? (
            <>
              <Text style={styles.label}>Tipo da area</Text>
              <View style={styles.chips}>
                {TIPOS_AREA.map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.chip, form.tipoArea === tipo && styles.chipAtivo]}
                    onPress={() => onChange({ ...form, tipoArea: tipo, cor: corPadraoPorTipo(tipo) })}
                  >
                    <Text style={[styles.chipTexto, form.tipoArea === tipo && styles.chipTextoAtivo]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          <Text style={styles.label}>Cor da area</Text>
          <View style={styles.coresGrid}>
            {PALETA_AREA.map(cor => (
              <TouchableOpacity
                key={cor}
                accessibilityLabel={`Cor ${cor}`}
                style={[styles.corBotao, { backgroundColor: cor }, form.cor === cor && styles.corBotaoAtivo]}
                onPress={() => onChange({ ...form, cor })}
              />
            ))}
          </View>
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <View style={styles.modalBotoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={onClose} disabled={saving}>
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoSalvar} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
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
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </>
  );
}

function SalvarPontoModal({
  visible,
  form,
  saving,
  coordenada,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: PontoForm;
  saving: boolean;
  coordenada: Coordenada | null;
  onChange: (form: PontoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalFundo}>
        <ScrollView style={styles.modalCaixa} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitulo}>Adicionar ponto</Text>
          {coordenada ? (
            <Text style={styles.coordenadaTexto}>{coordenada[1].toFixed(6)}, {coordenada[0].toFixed(6)}</Text>
          ) : null}
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {(['NASCENTE', 'POCO'] as TipoPonto[]).map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={[styles.chip, form.tipo === tipo && styles.chipAtivo]}
                onPress={() => onChange({ ...form, tipo, nome: form.nome || (tipo === 'NASCENTE' ? 'Nascente' : 'Poco') })}
              >
                <Text style={[styles.chipTexto, form.tipo === tipo && styles.chipTextoAtivo]}>
                  {tipo === 'NASCENTE' ? 'Nascente' : 'Poco'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Nome" value={form.nome} onChangeText={(v) => onChange({ ...form, nome: v })} placeholder="Ex: Nascente 01" />
          <Field label="Observacao" value={form.observacao} onChangeText={(v) => onChange({ ...form, observacao: v })} multiline />
          <View style={styles.modalBotoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={onClose} disabled={saving}>
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoSalvar} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AreaOptionsModal({
  area,
  onClose,
  onEdit,
  onDivide,
  onDelete,
}: {
  area: PropriedadeArea | null;
  onClose: () => void;
  onEdit: () => void;
  onDivide: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={!!area} transparent animationType="fade">
      <View style={styles.modalFundoCentro}>
        <View style={styles.opcoesCaixa}>
          <Text style={styles.modalTitulo}>{area?.nome}</Text>
          <Text style={styles.areaTipo}>
            {area?.tipoCadastro === 'AREA_TOTAL' ? 'Area Total' : area?.tipoArea}
            {area?.areaHectares ? ` - Area: ${Number(area.areaHectares).toFixed(2)} ha` : ''}
          </Text>
          <TouchableOpacity style={styles.opcaoBotao} onPress={onEdit}>
            <Text style={styles.opcaoBotaoTexto}>Editar area</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opcaoBotao} onPress={onDivide}>
            <Text style={styles.opcaoBotaoTexto}>Dividir area</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.opcaoBotao, styles.opcaoExcluir]} onPress={onDelete}>
            <Text style={styles.opcaoExcluirTexto}>Excluir area</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoCancelar} onPress={onClose}>
            <Text style={styles.botaoCancelarTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AreaItem({
  area,
  ativa,
  onPress,
  onOptions,
}: {
  area: PropriedadeArea;
  ativa: boolean;
  onPress: () => void;
  onOptions: () => void;
}) {
  const isTotal = area.tipoCadastro === 'AREA_TOTAL';
  return (
    <TouchableOpacity
      style={[styles.areaItem, ativa && styles.areaItemAtiva, isTotal && styles.areaTotalItem]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.areaNome}>{area.nome}</Text>
        <View style={styles.areaTipoLinha}>
          <View style={[styles.areaCorMini, { backgroundColor: corDaArea(area).fill }]} />
          <Text style={styles.areaTipo}>
            {isTotal ? 'Area Total da Fazenda' : area.tipoArea}
            {area.areaHectares ? ` - Area: ${Number(area.areaHectares).toFixed(2)} ha` : ''}
          </Text>
        </View>
        {area.observacao ? <Text style={styles.areaObs}>{area.observacao}</Text> : null}
        <TouchableOpacity style={styles.areaAcoes} onPress={onOptions}>
          <Text style={styles.areaAcoesTexto}>Opcoes</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MapaClickHandler({
  onMapClick,
}: {
  onMapClick: (coordenada: Coordenada) => void;
}) {
  useMapEvents({
    click(event: any) {
      onMapClick([
        Number(event.latlng.lng.toFixed(7)),
        Number(event.latlng.lat.toFixed(7)),
      ]);
    },
  });
  return null;
}

function FocoMapa({
  areaTotalPontos,
  areaTotalKey,
  centralizarPropriedadeSignal,
  focoAreaSalvaSignal,
}: {
  areaTotalPontos: Coordenada[];
  areaTotalKey: string;
  centralizarPropriedadeSignal: number;
  focoAreaSalvaSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (focoAreaSalvaSignal === 0) return;
    ajustarMapaAosPontos(map, areaTotalPontos, [28, 28]);
  }, [map, focoAreaSalvaSignal, areaTotalKey]);

  useEffect(() => {
    if (centralizarPropriedadeSignal === 0) return;
    ajustarMapaAosPontos(map, areaTotalPontos, [28, 28]);
  }, [map, centralizarPropriedadeSignal, areaTotalKey]);

  return null;
}

function ajustarMapaAosPontos(map: any, pontos: Coordenada[], padding: [number, number]) {
  if (pontos.length === 0) return;
  if (pontos.length === 1) {
    map.setView(coordenadaParaLatLng(pontos[0]), Math.max(map.getZoom(), 15));
    return;
  }
  map.fitBounds(pontos.map(coordenadaParaLatLng), { padding });
}

function coordenadaParaLatLng(coordenada: Coordenada): [number, number] {
  const [lng, lat] = coordenada;
  return [lat, lng];
}

function corDaArea(area: Pick<PropriedadeArea, 'tipoCadastro' | 'tipoArea' | 'cor'>) {
  const cor = area.cor || (area.tipoCadastro === 'AREA_TOTAL' ? CORES_AREA['Area Total'].fill : corPadraoPorTipo(area.tipoArea));
  return {
    stroke: cor,
    fill: cor,
    opacity: area.tipoCadastro === 'AREA_TOTAL' ? 0.2 : 0.3,
  };
}

function corPadraoPorTipo(tipoArea: string) {
  return (CORES_AREA[tipoArea] ?? CORES_AREA.Outro).fill;
}

function estiloPonto(tipo: TipoPonto) {
  if (tipo === 'NASCENTE') {
    return { color: '#ffffff', fillColor: '#2f80ed', fillOpacity: 0.95, weight: 2 };
  }
  return { color: '#ffffff', fillColor: '#5d4037', fillOpacity: 0.95, weight: 2 };
}

function labelIcon(texto: string) {
  const label = texto.replace(/[<>"']/g, '');
  return divIcon({
    className: '',
    html: `<div style="background:rgba(255,255,255,.88);border:1px solid rgba(26,61,31,.25);border-radius:999px;color:#1a3d1f;font-size:12px;font-weight:800;padding:5px 9px;box-shadow:0 2px 8px rgba(0,0,0,.16);white-space:nowrap;">${label}</div>`,
    iconSize: [120, 28],
    iconAnchor: [60, 14],
  });
}

function geojsonParaPontos(geojson: string) {
  try {
    const parsed = JSON.parse(geojson) as { coordinates?: Coordenada[][] };
    const coords = parsed.coordinates?.[0] ?? [];
    return coords.length > 1 ? coords.slice(0, -1) : coords;
  } catch {
    return [];
  }
}

function centroide(pontos: Coordenada[]) {
  if (pontos.length === 0) return null;
  const soma = pontos.reduce(
    (acc, ponto) => ({ lng: acc.lng + ponto[0], lat: acc.lat + ponto[1] }),
    { lng: 0, lat: 0 },
  );
  return [soma.lng / pontos.length, soma.lat / pontos.length] as Coordenada;
}

function areaPareceForaDaAreaTotal(coordenadasArea: Coordenada[], geojsonAreaTotal: string) {
  const limite = geojsonParaPontos(geojsonAreaTotal);
  if (limite.length < 3) return false;
  const pontosSemFechamento = coordenadasArea.length > 1
    ? coordenadasArea.slice(0, -1)
    : coordenadasArea;
  return pontosSemFechamento.some(ponto => !pontoDentroDoPoligono(ponto, limite));
}

function pontoDentroDoPoligono(ponto: Coordenada, poligono: Coordenada[]) {
  const [x, y] = ponto;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function calcularAreaHectares(coordenadas: Coordenada[]) {
  if (coordenadas.length < 4) return null;
  const raioTerra = 6378137;
  let soma = 0;
  for (let i = 0; i < coordenadas.length - 1; i++) {
    const [lng1, lat1] = coordenadas[i];
    const [lng2, lat2] = coordenadas[i + 1];
    soma += grausParaRad(lng2 - lng1) * (2 + Math.sin(grausParaRad(lat1)) + Math.sin(grausParaRad(lat2)));
  }
  const metrosQuadrados = Math.abs((soma * raioTerra * raioTerra) / 2);
  return Number((metrosQuadrados / 10000).toFixed(4));
}

function grausParaRad(valor: number) {
  return (valor * Math.PI) / 180;
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
  estadoInicialCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    margin: 16,
    padding: 22,
  },
  estadoInicialTitulo: { color: PRIMARY, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  estadoInicialTexto: {
    color: '#66746d',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 10,
    textAlign: 'center',
  },
  estadoInicialBotao: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 13,
    width: '100%',
  },
  estadoInicialBotaoTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  fluxoCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginTop: 16, padding: 16 },
  fluxoTexto: { color: '#66746d', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  fluxoBotoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  fluxoBotao: {
    alignItems: 'center',
    borderColor: '#cbd8cf',
    borderRadius: 10,
    borderWidth: 1.5,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  fluxoBotaoPrimario: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  fluxoBotaoTexto: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  fluxoBotaoPrimarioTexto: { color: '#fff', fontSize: 12, fontWeight: '800' },
  botaoDesabilitado: { opacity: 0.45 },
  mapaCard: { backgroundColor: '#fff', borderRadius: 14, margin: 16, padding: 12 },
  mapa: { borderRadius: 12, height: MAP_HEIGHT, overflow: 'hidden', width: '100%' },
  mapaFallback: { alignItems: 'center', backgroundColor: '#315b35', flex: 1, justifyContent: 'center', padding: 20 },
  mapaFallbackTexto: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  dica: { color: '#66746d', fontSize: 12, fontWeight: '600', marginTop: 10 },
  centralizarBotao: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#cbd8cf',
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  centralizarBotaoTexto: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  toolButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd8cf',
    borderRadius: 10,
    borderWidth: 1.5,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  toolButtonText: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  toolPrimary: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toolPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  listaCard: { backgroundColor: '#fff', borderRadius: 14, margin: 16, padding: 16 },
  sectionTitle: { color: PRIMARY, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  sectionTitleEspacado: { marginTop: 18 },
  vazio: { color: '#8a958e', fontSize: 14, paddingVertical: 8, textAlign: 'center' },
  areaItem: {
    borderColor: '#e2ece5',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  areaItemAtiva: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  areaTotalItem: { borderColor: '#f4d35e', borderWidth: 1.5 },
  areaNome: { color: '#1f2d25', fontSize: 15, fontWeight: '800' },
  areaTipo: { color: PRIMARY, fontSize: 12, fontWeight: '800', marginTop: 3 },
  areaTipoLinha: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 3 },
  areaCorMini: { borderColor: '#fff', borderRadius: 6, borderWidth: 1, height: 12, width: 12 },
  areaObs: { color: '#66746d', fontSize: 12, marginTop: 4 },
  areaAcoes: { alignSelf: 'flex-start', marginTop: 10 },
  areaAcoesTexto: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  pontoItem: {
    borderColor: '#e2ece5',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  modalFundo: { backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'flex-end' },
  modalFundoCentro: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.48)', flex: 1, justifyContent: 'center', padding: 20 },
  modalCaixa: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  opcoesCaixa: { backgroundColor: '#fff', borderRadius: 16, maxWidth: 420, padding: 18, width: '100%' },
  modalContent: { padding: 20, paddingBottom: 34 },
  modalTitulo: { color: PRIMARY, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  coordenadaTexto: { color: '#66746d', fontSize: 12, fontWeight: '700', marginBottom: 4 },
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
  textArea: { minHeight: 90 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: '#ccd6cf', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  chipAtivo: { backgroundColor: '#e8f5ee', borderColor: PRIMARY },
  chipTexto: { color: '#566159', fontSize: 13, fontWeight: '700' },
  chipTextoAtivo: { color: PRIMARY },
  coresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  corBotao: {
    borderColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    width: 36,
  },
  corBotaoAtivo: { borderColor: '#1f2d25', borderWidth: 3 },
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
  botaoSalvar: { alignItems: 'center', backgroundColor: PRIMARY, borderRadius: 12, flex: 1, padding: 14 },
  botaoSalvarTexto: { color: '#fff', fontWeight: '800' },
  opcaoBotao: {
    borderColor: '#d6ded8',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 13,
  },
  opcaoBotaoTexto: { color: PRIMARY, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  opcaoExcluir: { borderColor: '#d9b7b7' },
  opcaoExcluirTexto: { color: '#9b1c1c', fontSize: 14, fontWeight: '800', textAlign: 'center' },
});
