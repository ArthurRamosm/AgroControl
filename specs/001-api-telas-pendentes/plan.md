# Implementation Plan: Integração das Telas Pendentes com Dados Reais

**Branch**: `001-api-telas-pendentes` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-api-telas-pendentes/spec.md`

## Summary

Conectar as três telas existentes (FinanceiroScreen, RelatoriosScreen,
MapaPropriedadeScreen) ao backend .NET Core seguindo o padrão offline-first
já estabelecido nas demais telas. **FinanceiroScreen e RelatoriosScreen já
possuem a integração implementada e precisam de verificação/correção de
endpoints.** MapaPropriedadeScreen usa AsyncStorage em vez de SQLite e não
usa `useNetworkStatus` — precisa ser migrada para o padrão oficial.

## Technical Context

**Language/Version**: TypeScript ~5.9 / React Native 0.81 / Expo SDK ~54

**Primary Dependencies**: React Navigation v7, expo-sqlite ~16, AsyncStorage,
react-leaflet (web), expo-print, expo-sharing

**Storage**: expo-sqlite (primary local store via `localDb.ts`); AsyncStorage
somente para sessão e dados do mapa (a migrar)

**Testing**: Manual — smoke tests descritos em `quickstart.md`

**Target Platform**: Android + iOS + Web (Expo managed)

**Project Type**: Mobile app (offline-first)

**Performance Goals**:
- FinanceiroScreen: dados visíveis em ≤ 3s com conexão
- MapaPropriedadeScreen: áreas e pontos visíveis em ≤ 5s com conexão

**Constraints**: Offline-capable; sync queue para escrita offline; zero perda
de dados; OfflineBanner global (já implementado em AppNavigator.tsx)

**Scale/Scope**: 3 telas modificadas, 1 tabela SQLite nova (`mapa_cache`),
2 funções novas em `localDb.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|-----------|--------|--------------|
| I. Offline-First | ✅ | SQLite cache + sync queue em todas as 3 telas |
| II. Cross-Platform | ✅ | Financeiro/Relatórios funcionam em todas as plataformas; Mapa web-only para renderização leaflet — limitação pré-existente documentada |
| III. Screen–Component Separation | ✅ | Telas modificadas mantêm o padrão: screen owns data fetching, components are pure UI |
| IV. API-First Data Flow | ✅ | Esta é exatamente a feature de API-First: conectar ao backend real |
| V. Data Integrity | ✅ | addToSyncQueue para offline writes; fallback para cache em erros de rede |
| VI. User-Centric Simplicity | ✅ | UI existente preservada; nenhuma nova tela ou fluxo complexo adicionado |

Sem violações. Não há entradas na Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-api-telas-pendentes/
├── plan.md              # Este arquivo
├── research.md          # Descobertas do estado atual das telas
├── data-model.md        # Esquema SQLite + tipos TypeScript
├── quickstart.md        # Roteiro de validação manual
├── contracts/
│   └── api-contracts.md # Endpoints do backend esperados
└── tasks.md             # Gerado por /speckit-tasks (pendente)
```

### Source Code (repository root)

```text
src/
├── database/
│   └── localDb.ts          ← MODIFICAR: adicionar mapa_cache + saveMapaCache/getMapaCache
├── screens/
│   ├── FinanceiroScreen.tsx ← VERIFICAR: endpoints POST, tratamento de erro, campos de formulário
│   ├── RelatoriosScreen.tsx ← VERIFICAR: saveRelatorioCache no sucesso, fallback offline completo
│   └── MapaPropriedadeScreen.tsx ← MODIFICAR: useNetworkStatus + addToSyncQueue + SQLite cache
└── (nenhum arquivo novo criado)
```

**Structure Decision**: Modificação de arquivos existentes — sem nova estrutura.
Todas as mudanças estão contidas nos 3 arquivos de tela + localDb.ts.

---

## Phase 0: Research (concluído)

Findings documentados em `research.md`. Resumo executivo:

1. **FinanceiroScreen**: Já tem offline-first completo. Necessita verificação
   dos endpoints POST e possíveis ajustes de path.
2. **RelatoriosScreen**: Já tem estrutura de integração. Necessita confirmar
   que `saveRelatorioCache` é chamado após sucesso e que o fallback offline
   está funcional.
3. **MapaPropriedadeScreen**: Usa AsyncStorage em vez de SQLite, não tem
   `useNetworkStatus`, não usa `addToSyncQueue`. É a tela que requer mais
   trabalho.
4. **OfflineBanner**: Global em AppNavigator — nenhuma mudança necessária.
5. **localDb.ts**: Tem `financeiro_cache` e `relatorio_cache`. Falta
   `mapa_cache`.

---

## Phase 1: Design & Contracts

### 1.1 Data Model — nova tabela SQLite para mapa

Adicionar em `localDb.ts` (função `initDatabase`):

```sql
CREATE TABLE IF NOT EXISTS mapa_cache (
  propriedade_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  dados_json TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  PRIMARY KEY(propriedade_id, tipo)
);
```

Exportar as funções:

```typescript
export async function saveMapaCache(
  propriedadeId: number,
  tipo: 'areas' | 'pontos',
  dados: object[],
): Promise<void>

export async function getMapaCache<T>(
  propriedadeId: number,
  tipo: 'areas' | 'pontos',
): Promise<T[]>
```

Detalhes completos em `data-model.md`.

### 1.2 Contratos de API

Documentados em `contracts/api-contracts.md`. Endpoints-chave:

| Tela | Endpoints GET | Endpoints POST |
|------|--------------|---------------|
| Financeiro | 5 endpoints de dashboard | 6 endpoints de lançamento |
| Relatórios | 1 endpoint polimórfico (`/{tipo}`) | — (somente leitura) |
| Mapa | 2 endpoints (áreas + pontos) | 2 endpoints (criar área + criar ponto) |

### 1.3 Atualização do contexto do agente

```text
<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/001-api-telas-pendentes/plan.md
<!-- SPECKIT END -->
```

---

## Phase 2: Implementation Tasks

Gerado pelo comando `/speckit-tasks` — ver `tasks.md` (pendente).

Resumo de alto nível das tarefas esperadas:

### T1 — localDb.ts: adicionar mapa_cache
- Adicionar DDL `mapa_cache` em `initDatabase()`
- Exportar `saveMapaCache` e `getMapaCache`
- Remover funções `gravarAreasLocais` / `gravarPontosLocais` /
  `carregarAreasLocais` / `carregarPontosLocais` de MapaPropriedadeScreen
  (eram baseadas em AsyncStorage)

### T2 — MapaPropriedadeScreen: offline-first completo
- Importar `useNetworkStatus`, `saveMapaCache`, `getMapaCache`, `addToSyncQueue`
- Refatorar `carregarAreas()`: branch online/offline com SQLite cache
- Refatorar `carregarPontos()`: branch online/offline com SQLite cache
- Refatorar `salvarArea()`: `addToSyncQueue` quando offline
- Refatorar `salvarPonto()`: `addToSyncQueue` quando offline

### T3 — FinanceiroScreen: verificação e correção
- Testar cada endpoint POST contra o backend
- Corrigir paths que divergirem do backend
- Garantir que `postComOffline` usa o nome de tabela correto no sync_queue
- Verificar estado vazio (propriedade sem lançamentos)

### T4 — RelatoriosScreen: verificação e correção
- Confirmar que `saveRelatorioCache` é chamado após sucesso da busca
- Confirmar que `getRelatorioCache` é chamado no fallback offline
- Testar exportação PDF com dados reais

### T5 — Smoke tests manuais
- Executar roteiro completo de `quickstart.md` nas 3 telas
- Validar online → offline → online em cada tela

---

## Complexity Tracking

> Nenhuma violação constitucional. Tabela vazia.
