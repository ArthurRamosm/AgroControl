import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimalParams } from '../types/navigation';

type Props = {
  animal: AnimalParams;
  onEdit: (animal: AnimalParams) => void;
  onDelete: (animal: AnimalParams) => void;
};

export default function AnimalCard({ animal, onEdit, onDelete }: Props) {
  const icone = animal.sexo === 'F' ? '🐄' : '🐂';
  const statusCor = animal.ativo ? '#2d6a4f' : '#999';

  return (
    <View style={styles.card}>
      <Text style={styles.icone}>{icone}</Text>

      <View style={styles.info}>
        <View style={styles.topo}>
          <Text style={styles.nome}>{animal.nome || 'Sem nome'}</Text>
          <View style={[styles.badge, { backgroundColor: animal.ativo ? '#d4edda' : '#e2e3e5' }]}>
            <Text style={[styles.badgeTexto, { color: statusCor }]}>
              {animal.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
        <Text style={styles.brinco}>Brinco: {animal.brinco}</Text>
        <Text style={styles.detalhe}>{animal.raca} · {animal.tipo}</Text>
        {animal.sexo === 'F' && (
          <Text style={styles.leite}>Leite: {animal.statusLeite}</Text>
        )}
      </View>

      <View style={styles.acoes}>
        <TouchableOpacity style={styles.botaoEditar} onPress={() => onEdit(animal)}>
          <Text style={styles.botaoIcone}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoExcluir} onPress={() => onDelete(animal)}>
          <Text style={styles.botaoIcone}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    gap: 12,
  },
  icone: { fontSize: 32 },
  info: { flex: 1 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nome: { fontSize: 15, fontWeight: '700', color: '#1a3c2e', flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  brinco: { fontSize: 12, color: '#888', marginBottom: 2 },
  detalhe: { fontSize: 13, color: '#555' },
  leite: { fontSize: 12, color: '#2d6a4f', marginTop: 2, fontWeight: '600' },
  acoes: { flexDirection: 'column', gap: 6 },
  botaoEditar: {
    backgroundColor: '#e8f5ee',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoExcluir: {
    backgroundColor: '#fdecea',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoIcone: { fontSize: 16 },
});
