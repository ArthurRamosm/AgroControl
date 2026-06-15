import React from 'react';
import {
  GestureResponderEvent,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimalParams } from '../types/navigation';
import { idadeAnimal } from '../utils/animalHealth';

type Props = {
  animal: AnimalParams;
  onPress?: (animal: AnimalParams) => void;
  onEdit: (animal: AnimalParams) => void;
  onDelete: (animal: AnimalParams) => void;
  afastado?: boolean;
};

const IMG_FEMEA = require('../../assets/Femea.png');
const IMG_MACHO = require('../../assets/Macho.png');

function getBadgeInativo(animal: AnimalParams) {
  const motivo = (animal.motivoSaida ?? '').toLowerCase();
  return motivo.includes('venda') ? 'Vendido' : 'Baixa';
}

export default function AnimalCard({ animal, onPress, onEdit, onDelete, afastado = false }: Props) {
  const imgSexo = animal.sexo === 'F' ? IMG_FEMEA : IMG_MACHO;

  function handleAction(event: GestureResponderEvent, action: (a: AnimalParams) => void) {
    event.stopPropagation();
    action(animal);
  }

  function renderFoto() {
    if (animal.fotos && animal.fotos.length > 0) {
      return (
        <Image
          source={{ uri: `data:image/jpeg;base64,${animal.fotos[0].fotoBase64}` }}
          style={styles.fotoMiniatura}
        />
      );
    }
    return (
      <Image source={imgSexo} style={styles.fotoMiniatura} resizeMode="contain" />
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, !animal.ativo && styles.cardInativo]}
      activeOpacity={0.82}
      accessibilityRole="button"
      testID={`animal-card-${animal.id}`}
      onPress={() => onPress?.(animal)}
    >
      {/* Foto / imagem padrão 56×56 */}
      <View style={styles.fotoBox}>{renderFoto()}</View>

      {/* Informações */}
      <View style={styles.info}>
        <View style={styles.topo}>
          {afastado && (
            <MaterialCommunityIcons name="alert" size={15} color="#c0392b" style={{ marginRight: 3 }} />
          )}
          <Text style={styles.nome} numberOfLines={1}>{animal.nome || 'Sem nome'}</Text>
          <Image source={imgSexo} style={styles.iconeSexa} resizeMode="contain" />

          {animal.ativo ? (
            <View style={[styles.badge, styles.badgeAtivo]}>
              <Text style={[styles.badgeTexto, { color: '#2d6a4f' }]}>Ativo</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeInativo]}>
              <Text style={[styles.badgeTexto, { color: '#666' }]}>{getBadgeInativo(animal)}</Text>
            </View>
          )}

          {afastado && (
            <View style={[styles.badge, styles.badgeAfastado]}>
              <Text style={[styles.badgeTexto, { color: '#c0392b' }]}>Afastado</Text>
            </View>
          )}
        </View>

        <Text style={styles.brinco}>Brinco: {animal.brinco || 'Nao informado'}</Text>
        <Text style={styles.detalhe}>{animal.raca2 ? `${animal.raca} / ${animal.raca2}` : (animal.raca || 'Nao informado')} · {animal.tipo || 'Nao informado'}</Text>
        <Text style={styles.idade}>Idade: {idadeAnimal(animal)}</Text>
        {animal.sexo === 'F' && (
          <Text style={styles.leite}>Leite: {animal.statusLeite || 'Nao informado'}</Text>
        )}
      </View>

      {/* Ações — apenas para animais ativos */}
      {animal.ativo && (
        <View style={styles.acoes}>
          <TouchableOpacity testID="btn-editar-animal" style={styles.botaoEditar} onPress={e => handleAction(e, onEdit)}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#1a3d1f" />
          </TouchableOpacity>
          <TouchableOpacity testID="btn-excluir-animal" style={styles.botaoExcluir} onPress={e => handleAction(e, onDelete)}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#c0392b" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    shadowColor: '#153d2e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardInativo: {
    opacity: 0.6,
  },
  fotoBox: { width: 56, height: 56 },
  fotoMiniatura: { width: 56, height: 56, borderRadius: 8 },
  info: { flex: 1, minWidth: 0 },
  topo: { alignItems: 'center', flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap', gap: 3 },
  nome: { color: '#1a3c2e', flex: 1, fontSize: 15, fontWeight: '700' },
  iconeSexa: { width: 20, height: 20, marginLeft: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  badgeAtivo: { backgroundColor: '#d4edda', marginLeft: 4 },
  badgeInativo: { backgroundColor: '#e2e3e5', marginLeft: 4 },
  badgeAfastado: { backgroundColor: '#fdecea', marginLeft: 2 },
  brinco: { color: '#888', fontSize: 12, marginBottom: 2 },
  detalhe: { color: '#555', fontSize: 13 },
  idade: { color: '#1a3d1f', fontSize: 12, fontWeight: '700', marginTop: 2 },
  leite: { color: '#2d6a4f', fontSize: 12, fontWeight: '600', marginTop: 2 },
  acoes: { flexDirection: 'column', gap: 6 },
  botaoEditar: {
    alignItems: 'center',
    backgroundColor: '#e8f5ee',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  botaoExcluir: {
    alignItems: 'center',
    backgroundColor: '#fdecea',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
