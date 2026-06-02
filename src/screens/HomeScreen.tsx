import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getSession, clearPersistedSession } from '../services/session';
import BottomMenu from '../components/BottomMenu';
import { api } from '../config/api';
import {
  saveDashboardCache, getDashboardCache,
  saveAlertasCache, getAlertasCache,
} from '../database/localDb';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const PRIMARY = '#1a3d1f';
const noTranslateProps =
  Platform.OS === 'web'
    ? ({ translate: 'no', className: 'notranslate' } as any)
    : {};

type ResumoRebanho = {
  machos: number;
  femeas: number;
  bezerros: number;
  matrizes: number;
  reprodutores: number;
};

type DashboardStats = {
  totalAnimais: number;
  saudaveis: number;
  vacinasPendentes: number;
  produzindo: number;
  emEngorda: number;
  alertasNaoLidos: number;
  focoProdutivo: string;
  resumoRebanho: ResumoRebanho;
};

const RESUMO_VAZIO: ResumoRebanho = { machos: 0, femeas: 0, bezerros: 0, matrizes: 0, reprodutores: 0 };

const ITENS_RESUMO = [
  { key: 'femeas' as keyof ResumoRebanho, label: 'Fêmeas', cor: '#E91E8C' },
  { key: 'machos' as keyof ResumoRebanho, label: 'Machos', cor: '#1565C0' },
  { key: 'bezerros' as keyof ResumoRebanho, label: 'Bezerros', cor: '#F9A825' },
  { key: 'matrizes' as keyof ResumoRebanho, label: 'Matrizes', cor: '#2E7D32' },
  { key: 'reprodutores' as keyof ResumoRebanho, label: 'Reprod.', cor: '#6A1B9A' },
];

type AlertaItem = {
  id: number;
  animalId?: number | null;
  animalNome?: string | null;
  animalBrinco?: string | null;
  tipo: string;
  descricao: string;
  dataAlerta: string;
  lido: boolean;
};

function corAlerta(tipo: string): string {
  if (tipo === 'Vacinacao') return '#d32f2f';
  if (tipo === 'Parto') return '#f59e0b';
  if (tipo === 'Afastamento') return '#2d6a4f';
  return '#d32f2f';
}

function labelAlerta(alerta: AlertaItem): string {
  const nome = alerta.animalNome?.trim() ?? '';
  const brinco = alerta.animalBrinco?.trim() ?? '';
  if (nome || brinco) {
    return [nome, brinco ? `#${brinco}` : ''].filter(Boolean).join(' ');
  }
  return alerta.descricao;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type CardItem = {
  title: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const session = getSession();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalAnimais: 0,
    saudaveis: 0,
    vacinasPendentes: 0,
    produzindo: 0,
    emEngorda: 0,
    alertasNaoLidos: 0,
    focoProdutivo: 'ambos',
    resumoRebanho: RESUMO_VAZIO,
  });

  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [alertasCarregando, setAlertasCarregando] = useState(false);

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const stats = await api.get<DashboardStats>(
          `/api/dashboard/${session.propriedadeId}`
        );
        const normalized: DashboardStats = {
          totalAnimais: stats.totalAnimais ?? 0,
          saudaveis: stats.saudaveis ?? 0,
          vacinasPendentes: stats.vacinasPendentes ?? 0,
          produzindo: stats.produzindo ?? 0,
          emEngorda: stats.emEngorda ?? 0,
          alertasNaoLidos: stats.alertasNaoLidos ?? 0,
          focoProdutivo: stats.focoProdutivo ?? 'ambos',
          resumoRebanho: stats.resumoRebanho ?? RESUMO_VAZIO,
        };
        setDashboardStats(normalized);
        saveDashboardCache(session.propriedadeId, normalized).catch(() => {});
      } catch {
        const cached = await getDashboardCache<DashboardStats>(session.propriedadeId);
        if (cached) setDashboardStats(cached);
      }

      setAlertasCarregando(true);
      try {
        const lista = await api.get<AlertaItem[]>(
          `/api/alertas/${session.propriedadeId}`
        );
        setAlertas(lista.slice(0, 3));
        saveAlertasCache(session.propriedadeId, lista).catch(() => {});
      } catch {
        const cached = await getAlertasCache<AlertaItem>(session.propriedadeId);
        setAlertas(cached.slice(0, 3));
      } finally {
        setAlertasCarregando(false);
      }
    }

    carregarDashboard();
    const unsubscribe = navigation.addListener('focus', carregarDashboard);
    return unsubscribe;
  }, [navigation, session.propriedadeId]);

  const foco = dashboardStats.focoProdutivo;

  const mainCards: CardItem[] = [
    { title: 'Total de Animais', value: dashboardStats.totalAnimais, icon: 'cow' },
    { title: 'Saudáveis', value: dashboardStats.saudaveis, icon: 'heart-pulse' },
    { title: 'Vacinas Pendentes', value: dashboardStats.vacinasPendentes, icon: 'needle' },
    foco === 'corte'
      ? { title: 'Em Engorda', value: dashboardStats.emEngorda, icon: 'trending-up' }
      : { title: 'Em Lactação', value: dashboardStats.produzindo, icon: 'water' },
  ];

  const resumo = dashboardStats.resumoRebanho;
  const maxResumo = Math.max(...ITENS_RESUMO.map(i => resumo[i.key]), 1);

  function handleSair() {
    clearPersistedSession().catch(() => {});
    navigation.replace('Login');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: PRIMARY }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        {...noTranslateProps}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 134 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandArea}>
              <Image
                source={require('../../assets/Logoimagem.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text {...noTranslateProps} style={styles.brandName}>AgroControl</Text>
                <Text {...noTranslateProps} style={styles.dashboardText}>Dashboard</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.75}>
                <Ionicons name="notifications-outline" size={21} color="#ffffff" />
                {dashboardStats.alertasNaoLidos > 0 && (
                  <View style={styles.badgeSino}>
                    <Text style={styles.badgeSinoTexto}>
                      {dashboardStats.alertasNaoLidos > 9 ? '9+' : dashboardStats.alertasNaoLidos}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('Configuracoes')}
              >
                <Ionicons name="settings-outline" size={21} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text {...noTranslateProps} style={styles.greeting}>Olá, {session.nome}</Text>
        </View>

        {/* ── Cards de métricas ── */}
        <View style={styles.dashboardGrid}>
          {mainCards.map(card => (
            <View key={card.title} style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name={card.icon} size={24} color={PRIMARY} />
              </View>
              <Text {...noTranslateProps} style={styles.cardLabel}>{card.title}</Text>
              <Text {...noTranslateProps} style={styles.cardNumero}>{String(card.value)}</Text>
            </View>
          ))}
          {/* Linha extra "Em Engorda" quando foco = ambos */}
          {foco === 'ambos' && (
            <View style={[styles.card, styles.cardFull]}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="trending-up" size={24} color={PRIMARY} />
              </View>
              <Text {...noTranslateProps} style={styles.cardLabel}>Em Engorda</Text>
              <Text {...noTranslateProps} style={styles.cardNumero}>{String(dashboardStats.emEngorda)}</Text>
            </View>
          )}
        </View>

        {/* ── Resumo do Rebanho ── */}
        <View style={styles.resumoSection}>
          <View style={styles.sectionHeader}>
            <Text {...noTranslateProps} style={styles.sectionTitle}>Resumo do Rebanho</Text>
          </View>
          <View style={styles.resumoCard}>
            {ITENS_RESUMO.map(item => {
              const valor = resumo[item.key];
              const pct = Math.round((valor / maxResumo) * 100);
              return (
                <View key={item.key} style={styles.barraRow}>
                  <Text {...noTranslateProps} style={styles.barraLabel}>{item.label}</Text>
                  <View style={styles.barraTrack}>
                    <View
                      style={[styles.barraFill, { width: `${pct}%`, backgroundColor: item.cor }]}
                    />
                  </View>
                  <Text {...noTranslateProps} style={styles.barraValor}>{valor}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Alertas Recentes ── */}
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <Text {...noTranslateProps} style={styles.sectionTitle}>Alertas Recentes</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate('Saude')}>
              <Text {...noTranslateProps} style={styles.viewAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.alertList}>
            {alertasCarregando ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 12 }} />
            ) : alertas.length === 0 ? (
              <Text style={styles.semAlertas}>Nenhum alerta no momento</Text>
            ) : (
              alertas.map(alerta => (
                <View key={alerta.id} style={styles.alertCard}>
                  <View style={[styles.alertDot, { backgroundColor: corAlerta(alerta.tipo) }]} />
                  <View style={styles.alertInfo}>
                    <Text {...noTranslateProps} style={styles.alertAnimal} numberOfLines={1}>
                      {labelAlerta(alerta)}
                    </Text>
                    <Text {...noTranslateProps} style={styles.alertType}>{alerta.tipo}</Text>
                  </View>
                  <Text {...noTranslateProps} style={styles.alertDate}>
                    {formatarData(alerta.dataAlerta)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Ações Rápidas ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.botaoPrincipal}
            onPress={() => navigation.navigate('CadastroAnimal')}
          >
            <Text {...noTranslateProps} style={styles.botaoPrincipalTexto}>+ Cadastrar Animal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={() => navigation.navigate('AnimalList')}
          >
            <Text {...noTranslateProps} style={styles.botaoSecundarioTexto}>Ver Rebanho</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={() => navigation.navigate('MapaPropriedade')}
          >
            <Text {...noTranslateProps} style={styles.botaoSecundarioTexto}>Mapa da Propriedade</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sair} onPress={handleSair}>
            <Text {...noTranslateProps} style={styles.sairTexto}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomMenu activeItem="Início" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f4f0',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f4f0',
  },
  content: {
    paddingBottom: 134,
  },
  // ── Header
  header: {
    backgroundColor: PRIMARY,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  logo: {
    height: 48,
    marginRight: 12,
    width: 48,
  },
  brandName: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  dashboardText: {
    color: '#cfe8db',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  badgeSino: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeSinoTexto: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  greeting: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
  },
  // ── Cards de métricas
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: -24,
    paddingHorizontal: 20,
    rowGap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    elevation: 4,
    minHeight: 132,
    padding: 16,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: '48%',
  },
  cardFull: {
    width: '100%',
    minHeight: 100,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#e6f2eb',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginBottom: 14,
    width: 42,
  },
  cardLabel: {
    color: '#66746d',
    fontSize: 12,
    fontWeight: '700',
    minHeight: 32,
  },
  cardNumero: {
    color: PRIMARY,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  // ── Resumo do Rebanho
  resumoSection: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  resumoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    elevation: 4,
    padding: 16,
    paddingTop: 18,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  barraRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  barraLabel: {
    color: '#66746d',
    fontSize: 12,
    fontWeight: '700',
    width: 62,
  },
  barraTrack: {
    backgroundColor: '#f0f4f0',
    borderRadius: 6,
    flex: 1,
    height: 12,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barraFill: {
    borderRadius: 6,
    height: 12,
  },
  barraValor: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    width: 36,
  },
  // ── Alertas Recentes
  alertsSection: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: PRIMARY,
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },
  alertList: {
    gap: 12,
  },
  semAlertas: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  alertCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  alertDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 12,
    width: 10,
  },
  alertInfo: {
    flex: 1,
    paddingRight: 10,
  },
  alertAnimal: {
    color: '#1f2d25',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertType: {
    color: '#66746d',
    fontSize: 12,
    fontWeight: '600',
  },
  alertDate: {
    color: '#66746d',
    fontSize: 12,
    fontWeight: '700',
  },
  // ── Ações
  actions: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  botaoPrincipal: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 14,
    width: '100%',
  },
  botaoPrincipalTexto: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  botaoSecundario: {
    alignItems: 'center',
    borderColor: PRIMARY,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
    paddingVertical: 12,
    width: '100%',
  },
  botaoSecundarioTexto: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  sair: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sairTexto: {
    color: '#999999',
    fontSize: 14,
  },
});
