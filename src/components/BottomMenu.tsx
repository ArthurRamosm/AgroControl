import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const PRIMARY = '#0d2b10';
const ACTIVE_COLOR = '#0d2b10';
const INACTIVE_COLOR = '#999';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const TABS: TabItem[] = [
  {
    key: 'home',
    label: 'Início',
    icon: 'home-outline',
    activeIcon: 'home',
    route: 'Home',
  },
  {
    key: 'animais',
    label: 'Animais',
    icon: 'paw-outline',
    activeIcon: 'paw',
    route: 'AnimalList',
  },
  {
    key: 'saude',
    label: 'Saúde',
    icon: 'medkit-outline',
    activeIcon: 'medkit',
    route: 'Saude',
  },
  {
    key: 'financeiro',
    label: 'Finanças',
    icon: 'cash-outline',
    activeIcon: 'cash',
    route: 'Financeiro',
  },
  {
    key: 'fazenda',
    label: 'Fazenda',
    icon: 'leaf-outline',
    activeIcon: 'leaf',
    route: 'FazendaScreen',
  },
];

// Rotas que pertencem a cada aba (para destacar o tab correto em sub-telas)
const ROUTE_MAP: Record<string, string> = {
  Home: 'home',
  AnimalList: 'animais',
  CadastroAnimal: 'animais',
  AnimalDetails: 'animais',
  AnimalReport: 'animais',
  Saude: 'saude',
  Afastamento: 'saude',
  MastiteClinica: 'saude',
  MastiteSubclinica: 'saude',
  Parasitas: 'saude',
  Financeiro: 'financeiro',
  FazendaScreen: 'fazenda',
  ProducaoDiaria: 'fazenda',
  ControleLeiteiro: 'fazenda',
  VendaQueijo: 'fazenda',
  Potabilidade: 'fazenda',
  HigieneCaixa: 'fazenda',
  AnaliseLabScreen: 'fazenda',
  Rastreabilidade: 'fazenda',
  HigienizacaoEquip: 'fazenda',
  CondicoesVestiario: 'fazenda',
  DepositoLimpeza: 'fazenda',
  Relatorios: 'fazenda',
};

export default function BottomMenu() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const activeKey = ROUTE_MAP[route.name] ?? '';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    color: INACTIVE_COLOR,
    fontWeight: '500',
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
});
