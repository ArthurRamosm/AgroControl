import React, { ComponentProps } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#1a3d1f';
const noTranslateProps =
  Platform.OS === 'web'
    ? ({ translate: 'no', className: 'notranslate' } as any)
    : {};

type MenuLabel = 'Início' | 'Animais' | 'Saúde' | 'Finanças' | 'Relatórios';
type MenuRoute = 'Home' | 'AnimalList' | 'Saude' | 'Financeiro' | 'Relatorios';
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  activeItem: MenuLabel;
  navigation: {
    navigate: (route: MenuRoute) => void;
  };
};

const bottomMenuItems: {
  label: MenuLabel;
  icon: IconName;
  route?: MenuRoute;
}[] = [
  {
    label: 'Início',
    icon: 'home-variant',
    route: 'Home',
  },
  {
    label: 'Animais',
    icon: 'cow',
    route: 'AnimalList',
  },
  {
    label: 'Saúde',
    icon: 'medical-bag',
    route: 'Saude',
  },
  {
    label: 'Finanças',
    icon: 'cash-multiple',
    route: 'Financeiro',
  },
  {
    label: 'Relatórios',
    icon: 'file-chart-outline',
    route: 'Relatorios',
  },
];

export default function BottomMenu({ activeItem, navigation }: Props) {
  const insets = useSafeAreaInsets();

  function handlePress(route?: MenuRoute) {
    if (!route) return;
    navigation.navigate(route);
  }

  return (
    <View style={[styles.bottomMenu, {
      height: 80 + insets.bottom,
      paddingBottom: 12 + insets.bottom,
    }]}>
      {bottomMenuItems.map(item => {
        const active = item.label === activeItem;

        return (
          <TouchableOpacity
            key={item.label}
            style={styles.bottomMenuItem}
            activeOpacity={0.75}
            onPress={() => handlePress(item.route)}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={23}
              color={active ? PRIMARY : '#8f9892'}
            />
            <Text
              {...noTranslateProps}
              style={[
                styles.bottomMenuText,
                active && styles.bottomMenuTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomMenu: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    bottom: 0,
    elevation: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
  },
  bottomMenuItem: {
    alignItems: 'center',
    flex: 1,
    height: 64,
    justifyContent: 'center',
  },
  bottomMenuText: {
    color: '#8f9892',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  bottomMenuTextActive: {
    color: PRIMARY,
  },
});
