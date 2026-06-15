import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import BottomMenu from '../components/BottomMenu';

const PRIMARY = '#0d2b10';
const CARD_BG = '#fff';
const BG = '#f4f6f4';

interface ModuleCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  items: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[];
  accentColor: string;
}

function ModuleCard({ icon, title, subtitle, items, accentColor }: ModuleCardProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.moduleCard, { borderLeftColor: accentColor, borderLeftWidth: 4 }]}>
      <View style={styles.moduleHeader}>
        <View style={[styles.moduleIconWrap, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={icon} size={28} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.moduleTitle}>{title}</Text>
          <Text style={styles.moduleSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.itemsGrid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.itemButton}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.75}
          >
            <View style={[styles.itemIconWrap, { backgroundColor: accentColor + '14' }]}>
              <Ionicons name={item.icon} size={20} color={accentColor} />
            </View>
            <Text style={styles.itemLabel} numberOfLines={2}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#aaa" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function FazendaScreen() {
  const navigation = useNavigation<any>();
  return (
    <View testID="fazenda-hub" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fazenda</Text>
        <Text style={styles.headerSubtitle}>Controles e registros da propriedade</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QUEIJARIA */}
        <ModuleCard
          icon="cube-outline"
          title="Queijaria"
          subtitle="Planilhas IMA — Controles de produção e qualidade"
          accentColor="#e67e22"
          items={[
            {
              label: 'Produção Diária',
              icon: 'beaker-outline',
              route: 'ProducaoDiaria',
            },
            {
              label: 'Controle Leiteiro',
              icon: 'water-outline',
              route: 'ControleLeiteiro',
            },
            {
              label: 'Vendas de Queijo',
              icon: 'cart-outline',
              route: 'VendaQueijo',
            },
            {
              label: 'Potabilidade da Água',
              icon: 'flask-outline',
              route: 'Potabilidade',
            },
            {
              label: "Higiene Caixas D'água",
              icon: 'water-outline',
              route: 'HigieneCaixa',
            },
            {
              label: 'Análises Laboratoriais',
              icon: 'eyedrop-outline',
              route: 'AnaliseLabScreen',
            },
            {
              label: 'Rastreabilidade',
              icon: 'barcode-outline',
              route: 'Rastreabilidade',
            },
            {
              label: 'Higienização Equipamentos',
              icon: 'brush-outline',
              route: 'HigienizacaoEquip',
            },
            {
              label: 'Condições Vestiário',
              icon: 'shirt-outline',
              route: 'CondicoesVestiario',
            },
            {
              label: 'Depósito de Limpeza',
              icon: 'file-tray-stacked-outline',
              route: 'DepositoLimpeza',
            },
          ]}
        />

        {/* CURRAL */}
        <ModuleCard
          icon="paw-outline"
          title="Curral"
          subtitle="Relatórios do rebanho e controles sanitários"
          accentColor="#2e7d32"
          items={[
            {
              label: 'Relatório de Produtividade',
              icon: 'bar-chart-outline',
              route: 'Relatorios',
            },
            {
              label: 'Relatório Sanitário',
              icon: 'medkit-outline',
              route: 'Relatorios',
            },
            {
              label: 'Relatório Financeiro',
              icon: 'cash-outline',
              route: 'Relatorios',
            },
            {
              label: 'Relatório Reprodutivo',
              icon: 'heart-outline',
              route: 'Relatorios',
            },
            {
              label: 'Mastite Clínica',
              icon: 'medical-outline',
              route: 'MastiteClinica',
            },
            {
              label: 'Mastite Subclínica (CMT)',
              icon: 'analytics-outline',
              route: 'MastiteSubclinica',
            },
            {
              label: 'Endo/Ectoparasitas',
              icon: 'bug-outline',
              route: 'Parasitas',
            },
            {
              label: 'Afastamentos',
              icon: 'bandage-outline',
              route: 'Afastamento',
            },
          ]}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
      <BottomMenu activeItem="Fazenda" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  moduleCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  moduleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  moduleSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  itemsGrid: {
    paddingVertical: 4,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2a2a2a',
    fontWeight: '500',
  },
});
