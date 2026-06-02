import { api } from '../config/api';
import { Session } from './session';
import {
  getPendingSyncItems,
  markSyncItemDone,
  saveAnimaisLocal,
  SyncQueueItem,
} from '../database/localDb';
import { AnimalParams } from '../types/navigation';

// Ordem de envio ao backend (dependências primeiro)
const TABLE_ORDER = ['animais', 'eventos', 'vacinas', 'afastamentos', 'despesas', 'receitas'];

async function processSyncItem(item: SyncQueueItem, session: Session): Promise<boolean> {
  try {
    const dados = JSON.parse(item.dados_json);

    switch (item.tabela) {
      case 'animais': {
        if (item.operacao === 'INSERT') {
          const { id: _tempId, ...semId } = dados;
          await api.post<AnimalParams>('/api/animais', { ...semId, propriedadeId: session.propriedadeId });
        } else if (item.operacao === 'UPDATE') {
          await api.put<AnimalParams>(`/api/animais/${dados.id}`, dados);
        } else if (item.operacao === 'DELETE') {
          await api.delete(`/api/animais/${dados.id}?propriedadeId=${session.propriedadeId}`);
        }
        break;
      }
      case 'eventos': {
        if (item.operacao === 'INSERT') {
          const { animalId, propriedadeId: pid, id: _id, ...body } = dados;
          await api.post(`/api/animais/${animalId}/eventos?propriedadeId=${pid ?? session.propriedadeId}`, body);
        }
        break;
      }
      case 'lactacoes': {
        if (item.operacao === 'INSERT') {
          const { animalId, propriedadeId: pid, id: _id, ...body } = dados;
          await api.post(`/api/animais/${animalId}/lactacoes?propriedadeId=${pid ?? session.propriedadeId}`, body);
        }
        break;
      }
      case 'reproducoes': {
        if (item.operacao === 'INSERT') {
          const { animalId, propriedadeId: pid, id: _id, ...body } = dados;
          await api.post(`/api/animais/${animalId}/reproducoes?propriedadeId=${pid ?? session.propriedadeId}`, body);
        }
        break;
      }
      case 'vacinas': {
        if (item.operacao === 'INSERT') {
          const { propriedadeId: pid, ...body } = dados;
          await api.post(`/api/saude/vacinas?propriedadeId=${pid ?? session.propriedadeId}`, body);
        }
        break;
      }
      case 'saude_registros': {
        if (item.operacao === 'INSERT') {
          const { propriedadeId: pid, ...body } = dados;
          await api.post(`/api/saude/registros?propriedadeId=${pid ?? session.propriedadeId}`, body);
        }
        break;
      }
      case 'afastamentos': {
        if (item.operacao === 'INSERT') {
          await api.post('/api/afastamentos', dados);
        } else if (item.operacao === 'UPDATE') {
          const { id, ...body } = dados;
          await api.put(`/api/afastamentos/${id}`, body);
        } else if (item.operacao === 'DELETE') {
          await api.delete(`/api/afastamentos/${dados.id}`);
        }
        break;
      }
      case 'despesas': {
        if (item.operacao === 'INSERT') {
          await api.post('/api/financeiro/despesa', dados);
        }
        break;
      }
      case 'receitas': {
        if (item.operacao === 'INSERT') {
          await api.post('/api/financeiro/receita', dados);
        }
        break;
      }
      default:
        // Tabela sem handler — marca como feito para não bloquear a fila
        break;
    }

    return true;
  } catch {
    return false;
  }
}

export async function processSyncQueue(session: Session): Promise<number> {
  const pendentes = await getPendingSyncItems();
  if (pendentes.length === 0) return 0;

  // Sort: by table priority first, then chronologically
  const ordenados = [...pendentes].sort((a, b) => {
    const ia = TABLE_ORDER.indexOf(a.tabela);
    const ib = TABLE_ORDER.indexOf(b.tabela);
    if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.criado_em.localeCompare(b.criado_em);
  });

  let sincronizados = 0;
  for (const item of ordenados) {
    const ok = await processSyncItem(item, session);
    if (ok) {
      await markSyncItemDone(item.id);
      sincronizados++;
    }
  }

  // Refresh local animal cache after any successful sync
  if (sincronizados > 0) {
    try {
      const animais = await api.get<AnimalParams[]>(`/api/animais?propriedadeId=${session.propriedadeId}`);
      await saveAnimaisLocal(animais, session.propriedadeId);
    } catch {
      // Non-critical — stale cache is acceptable
    }
  }

  return sincronizados;
}
