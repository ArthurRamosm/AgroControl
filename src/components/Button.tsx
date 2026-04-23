import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

const BG: Record<Variant, string> = {
  primary: '#2d6a4f',
  secondary: 'transparent',
  danger: '#c0392b',
};

const BG_DISABLED: Record<Variant, string> = {
  primary: '#7aab95',
  secondary: 'transparent',
  danger: '#e07b7b',
};

export default function Button({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const isDisabled = loading || disabled;
  const bg = isDisabled ? BG_DISABLED[variant] : BG[variant];
  const border = variant === 'secondary' ? { borderWidth: 2, borderColor: '#2d6a4f' } : {};

  return (
    <TouchableOpacity
      style={[styles.base, { backgroundColor: bg }, border, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'secondary' ? '#2d6a4f' : '#fff'} />
        : (
          <Text style={[styles.texto, variant === 'secondary' && styles.textoSecundario]}>
            {title}
          </Text>
        )
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  texto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  textoSecundario: { color: '#2d6a4f' },
});
