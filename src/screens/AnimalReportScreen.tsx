import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalParams, RootStackParamList } from '../types/navigation';
import { api, getMensagemErro } from '../config/api';
import { getSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { saveAnimalFichaCache, getAnimalFichaCache } from '../database/localDb';
import { idadeAnimal } from '../utils/animalHealth';

const PRIMARY = '#1a3d1f';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AnimalReport'>;
  route: RouteProp<RootStackParamList, 'AnimalReport'>;
};

type AnimalEvento = {
  id: number;
  tipoEvento: string;
  dataEvento: string;
  pesoKg?: number | null;
  racaoKgDia?: number | null;
  leiteLitrosDia?: number | null;
  observacao?: string | null;
};

type AnimalLactacao = {
  id: number;
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
  tipoEvento: string;
  dataEvento: string;
  reprodutor?: string | null;
  inseminador?: string | null;
  previsaoParto?: string | null;
  resultado?: string | null;
  observacao?: string | null;
};

type SaudeRegistro = {
  id: number;
  tipoRegistro: string;
  dataRegistro: string;
  descricao?: string | null;
  produtoUtilizado?: string | null;
  dose?: string | null;
  veterinario?: string | null;
  proximaAplicacao?: string | null;
  observacao?: string | null;
};

function texto(valor?: string | number | boolean | null) {
  if (valor === null || valor === undefined || valor === '') return 'Nao informado';
  if (typeof valor === 'boolean') return valor ? 'Ativo' : 'Inativo';
  return String(valor);
}

function data(valor?: string | null) {
  if (!valor) return 'Nao informado';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
  const partes = valor.slice(0, 10).split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return valor.slice(0, 10);
}

function moeda(valor?: number | null) {
  if (valor === null || valor === undefined) return 'Nao informado';
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

export default function AnimalReportScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { animal } = route.params;
  const { propriedadeId } = getSession();
  const { isOnline } = useNetworkStatus();
  const [eventos, setEventos] = useState<AnimalEvento[]>([]);
  const [lactacoes, setLactacoes] = useState<AnimalLactacao[]>([]);
  const [reproducoes, setReproducoes] = useState<AnimalReproducao[]>([]);
  const [saude, setSaude] = useState<SaudeRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);

  type FichaCache = {
    eventos: AnimalEvento[];
    lactacoes: AnimalLactacao[];
    reproducoes: AnimalReproducao[];
    saudeRegistros: SaudeRegistro[];
  };

  useEffect(() => {
    async function carregarRelatorio() {
      setCarregando(true);

      if (!isOnline) {
        const cache = await getAnimalFichaCache<FichaCache>(animal.id);
        if (cache) {
          setEventos(cache.eventos);
          setLactacoes(cache.lactacoes);
          setReproducoes(cache.reproducoes);
          setSaude(cache.saudeRegistros);
        }
        setCarregando(false);
        return;
      }

      try {
        const [eventosDados, lactacoesDados, reproducoesDados, saudeDados] = await Promise.all([
          api.get<AnimalEvento[]>(`/api/animais/${animal.id}/eventos?propriedadeId=${propriedadeId}`),
          api.get<AnimalLactacao[]>(`/api/animais/${animal.id}/lactacoes?propriedadeId=${propriedadeId}`),
          api.get<AnimalReproducao[]>(`/api/animais/${animal.id}/reproducoes?propriedadeId=${propriedadeId}`),
          api.get<SaudeRegistro[]>(`/api/saude/registros?propriedadeId=${propriedadeId}&animalId=${animal.id}`),
        ]);
        setEventos(eventosDados);
        setLactacoes(lactacoesDados);
        setReproducoes(reproducoesDados);
        setSaude(saudeDados);
        saveAnimalFichaCache(animal.id, {
          eventos: eventosDados,
          lactacoes: lactacoesDados,
          reproducoes: reproducoesDados,
          saudeRegistros: saudeDados,
        }).catch(() => {});
      } catch (error) {
        const cache = await getAnimalFichaCache<FichaCache>(animal.id);
        if (cache) {
          setEventos(cache.eventos);
          setLactacoes(cache.lactacoes);
          setReproducoes(cache.reproducoes);
          setSaude(cache.saudeRegistros);
        } else {
          Alert.alert('Erro', getMensagemErro(error));
        }
      } finally {
        setCarregando(false);
      }
    }

    carregarRelatorio();
  }, [animal.id, propriedadeId, isOnline]);

  return (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 126 + insets.bottom }]}>
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Text style={styles.voltarTexto}>{'\u2190'} Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Relatorio do Animal</Text>
          <Text style={styles.subtitulo}>{animal.nome || animal.brinco}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.botaoPrincipal}>
            <Text style={styles.botaoPrincipalTexto}>Visualizar Ficha</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={() => Alert.alert('Exportar PDF', 'Estrutura preparada para exportacao futura.')}
          >
            <Text style={styles.botaoSecundarioTexto}>Exportar PDF</Text>
          </TouchableOpacity>
        </View>

        <Section title="Fotos">
          {animal.fotos?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fotosLinha}>
              {animal.fotos.map(foto => (
                <Image
                  key={foto.id}
                  source={{ uri: `data:image/jpeg;base64,${foto.fotoBase64}` }}
                  style={styles.foto}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.vazio}>Nenhuma foto cadastrada.</Text>
          )}
        </Section>

        <Section title="Dados cadastrais">
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
          <Info label="Procedencia" value={animal.procedencia} />
          <Info label="Data de entrada" value={animal.dataEntradaInformada || data(animal.dataEntrada)} />
          <Info label="Data de saida" value={animal.dataSaidaInformada || data(animal.dataSaida)} />
          <Info label="Valor" value={moeda(animal.valor)} />
          <Info label="Motivo da saida" value={animal.motivoSaida} />
          <Info label="Observacao" value={animal.observacao} />
        </Section>

        <Section title="Filiacao">
          <Info label="Nome do pai" value={animal.nomePai} />
          <Info label="Raca do pai" value={animal.racaPai} />
          <Info label="Nome da mae" value={animal.nomeMae} />
          <Info label="Raca da mae" value={animal.racaMae} />
        </Section>

        {carregando ? (
          <View style={styles.loading}><ActivityIndicator color={PRIMARY} /></View>
        ) : (
          <>
            <ListaEventos title="Eventos zootecnicos" vazio="Nenhum evento zootecnico cadastrado.">
              {eventos.map(evento => (
                <Item key={evento.id} title={evento.tipoEvento}>
                  <Info label="Data" value={data(evento.dataEvento)} compact />
                  <Info label="Peso" value={evento.pesoKg != null ? `${evento.pesoKg} kg` : null} compact />
                  <Info label="Racao" value={evento.racaoKgDia != null ? `${evento.racaoKgDia} kg/dia` : null} compact />
                  <Info label="Leite" value={evento.leiteLitrosDia != null ? `${evento.leiteLitrosDia} L/dia` : null} compact />
                  <Info label="Observacao" value={evento.observacao} compact />
                </Item>
              ))}
            </ListaEventos>

            <ListaEventos title="Saude" vazio="Nenhum registro de saude cadastrado.">
              {saude.map(registro => (
                <Item key={registro.id} title={registro.tipoRegistro}>
                  <Info label="Data" value={data(registro.dataRegistro)} compact />
                  <Info label="Descricao" value={registro.descricao} compact />
                  <Info label="Produto" value={registro.produtoUtilizado} compact />
                  <Info label="Dose" value={registro.dose} compact />
                  <Info label="Veterinario" value={registro.veterinario} compact />
                  <Info label="Proxima aplicacao" value={data(registro.proximaAplicacao)} compact />
                  <Info label="Observacao" value={registro.observacao} compact />
                </Item>
              ))}
            </ListaEventos>

            <ListaEventos title="Reproducao" vazio="Nenhum evento reprodutivo cadastrado.">
              {reproducoes.map(registro => (
                <Item key={registro.id} title={registro.tipoEvento}>
                  <Info label="Data" value={data(registro.dataEvento)} compact />
                  <Info label="Reprodutor" value={registro.reprodutor} compact />
                  <Info label="Inseminador" value={registro.inseminador} compact />
                  <Info label="Previsao de parto" value={data(registro.previsaoParto)} compact />
                  <Info label="Resultado" value={registro.resultado} compact />
                  <Info label="Observacao" value={registro.observacao} compact />
                </Item>
              ))}
            </ListaEventos>

            <ListaEventos title="Lactacao" vazio="Nenhuma lactacao cadastrada.">
              {lactacoes.map(lactacao => (
                <Item key={lactacao.id} title={`Lactacao ${lactacao.numeroLactacao}`}>
                  <Info label="Data do parto" value={data(lactacao.dataParto)} compact />
                  <Info label="Inicio do controle" value={data(lactacao.inicioControle)} compact />
                  <Info label="Data de secagem" value={data(lactacao.dataSecagem)} compact />
                  <Info label="Dias de lactacao" value={lactacao.diasLactacao} compact />
                  <Info label="Producao total" value={lactacao.producaoTotal != null ? `${lactacao.producaoTotal} L` : null} compact />
                  <Info label="Media diaria" value={lactacao.mediaDiaria != null ? `${lactacao.mediaDiaria} L/dia` : null} compact />
                </Item>
              ))}
            </ListaEventos>
          </>
        )}
      </ScrollView>

      <BottomMenu activeItem="Animais" navigation={navigation} />
    </View>
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

function ListaEventos({ title, vazio, children }: { title: string; vazio: string; children: React.ReactNode[] }) {
  return (
    <Section title={title}>
      {children.length ? children : <Text style={styles.vazio}>{vazio}</Text>}
    </Section>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{title}</Text>
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
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
  botaoPrincipal: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    flex: 1,
    padding: 13,
  },
  botaoPrincipalTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  botaoSecundario: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    padding: 13,
  },
  botaoSecundarioTexto: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
  },
  sectionTitle: { color: PRIMARY, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  fotosLinha: { gap: 10 },
  foto: { backgroundColor: '#dfe9e1', borderRadius: 12, height: 120, width: 120 },
  infoRow: { borderBottomColor: '#eef2ee', borderBottomWidth: 1, paddingVertical: 8 },
  infoRowCompact: { paddingVertical: 4 },
  infoLabel: { color: '#66746d', fontSize: 12, fontWeight: '700' },
  infoValue: { color: '#213228', fontSize: 14, marginTop: 2 },
  item: {
    backgroundColor: '#f8fbf8',
    borderColor: '#e1ebe3',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  itemTitle: { color: PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vazio: { color: '#8a958e', fontSize: 14, paddingVertical: 8, textAlign: 'center' },
  loading: { padding: 24 },
});
