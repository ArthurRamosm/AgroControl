# Data Model: Integração das Telas Pendentes

## Entidades existentes (sem alteração)

### Lançamento Financeiro

Já representado em `localDb.ts` via cache + sync queue.

| Campo | Tipo | Observação |
|-------|------|-----------|
| `id` | number | PK no servidor |
| `propriedadeId` | number | FK obrigatória |
| `categoria` | string | Ex: 'Racao', 'Medicamentos', ... |
| `descricao` | string | Texto livre |
| `valor` | number | Positivo (receita) ou positivo (despesa, categorizado) |
| `dataDespesa` / `dataReceita` | string (ISO) | Data do lançamento |

Tabelas SQLite já existentes:
- `despesa_local(id, sync_status, dados_json)` — para despesas offline
- `receita_local(id, sync_status, dados_json)` — para receitas offline
- `financeiro_cache(propriedade_id, tipo, dados_json, atualizado_em)` — cache dos dashboards
- `sync_queue` — fila de sincronização global

### Relatório

| Campo | Tipo | Observação |
|-------|------|-----------|
| `tipo` | 'produtividade' \| 'sanitario' \| 'financeiro' \| 'reprodutivo' | Tipo do relatório |
| `dados` | object | Estrutura varia por tipo (ver contratos) |
| `periodoLabel` | string | Descrição humana do período |

Tabela SQLite já existente:
- `relatorio_cache(propriedade_id, tipo, dados_json, atualizado_em)` — cache por tipo

---

## Entidades que precisam de nova tabela SQLite

### MapaCache (a adicionar em `localDb.ts`)

Tabela `mapa_cache` para substituir AsyncStorage nas funções de mapa:

```sql
CREATE TABLE IF NOT EXISTS mapa_cache (
  propriedade_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,          -- 'areas' | 'pontos'
  dados_json TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  PRIMARY KEY(propriedade_id, tipo)
);
```

Funções a exportar de `localDb.ts`:

```typescript
saveMapaCache(propriedadeId: number, tipo: 'areas' | 'pontos', dados: object[]): Promise<void>
getMapaCache<T>(propriedadeId: number, tipo: 'areas' | 'pontos'): Promise<T[]>
```

---

## Tipos TypeScript (já existentes em MapaPropriedadeScreen.tsx)

### PropriedadeArea

```typescript
type PropriedadeArea = {
  id: number;
  propriedadeId: number;
  nome: string;
  tipoCadastro: 'AREA_TOTAL' | 'AREA_INTERNA';
  tipo: string;           // Ex: 'Pasto', 'Piquete', 'Curral', ...
  coordenadas: Coordenada[]; // [[lat, lng], ...]
  areaTotalHectares?: number | null;
  // ... demais campos opcionais
}
```

### PropriedadePonto

```typescript
type PropriedadePonto = {
  id: number;
  propriedadeId: number;
  nome: string;
  tipo: string;           // Ex: 'Bebedouro', 'Porteira', ...
  latitude: number;
  longitude: number;
  descricao?: string | null;
}
```

---

## Fila de sincronização — entradas relevantes para o Mapa

Quando offline e o usuário salva uma área ou ponto, entra na `sync_queue`:

| Campo | Valor |
|-------|-------|
| `tabela` | `'propriedade_areas'` ou `'propriedade_pontos'` |
| `operacao` | `'INSERT'` |
| `dados_json` | JSON com todos os campos do formulário + `propriedadeId` |

---

## Diagrama de fluxo de dados (leitura)

```
Online:
  API Backend → setEstado() → saveCache(localDb) → UI

Offline:
  getCache(localDb) → setEstado() → UI

Falha de rede:
  API call falha → getCache(localDb) → setEstado() → UI
  (fallback idêntico ao modo offline intencional)
```

## Diagrama de fluxo de dados (escrita)

```
Online:
  Formulário → api.post() → recarregarDados()

Offline:
  Formulário → addToSyncQueue(tabela, 'INSERT', dados) → feedback ao usuário
  → quando isOnline = true → syncService processa a fila
```
