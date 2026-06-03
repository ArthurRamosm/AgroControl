---

description: "Task list for API integration of pending screens"
---

# Tasks: Integração das Telas Pendentes com Dados Reais

**Input**: Design documents from `specs/001-api-telas-pendentes/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api-contracts.md ✅ quickstart.md ✅

**Tests**: Not requested in spec — only manual smoke tests via quickstart.md.

**Organization**: Tasks grouped by user story to enable independent delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1 = Financeiro, US2 = Relatórios, US3 = Mapa)
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Confirm environment and gather baseline information before making changes.

- [ ] T001 Verify the backend .NET Core API is reachable — open `src/config/api.ts`, confirm the base URL, then run the app and call `GET /api/financeiro/{propriedadeId}/resumo` via the Financeiro screen; confirm a real JSON response arrives (not a network error)

**Checkpoint**: Backend is confirmed reachable from the app.

---

## Phase 2: Foundational (Blocking Prerequisite for US3)

**Purpose**: Adicionar a tabela `mapa_cache` ao SQLite local e exportar as funções de cache — obrigatório antes de qualquer tarefa da US3.

**⚠️ CRÍTICO**: As tarefas de US3 (Fase 5) não podem começar até que esta fase esteja completa.

- [x] T002 Add `mapa_cache` table DDL to `initDatabase()` in `src/database/localDb.ts` — insert `CREATE TABLE IF NOT EXISTS mapa_cache (propriedade_id INTEGER NOT NULL, tipo TEXT NOT NULL, dados_json TEXT NOT NULL, atualizado_em TEXT NOT NULL, PRIMARY KEY(propriedade_id, tipo));` after the `relatorio_cache` DDL block
- [x] T003 Export `saveMapaCache(propriedadeId: number, tipo: 'areas' | 'pontos', dados: object[]): Promise<void>` in `src/database/localDb.ts` — follow the same pattern as `saveRelatorioCache` (INSERT OR REPLACE, JSON.stringify)
- [x] T004 Export `getMapaCache<T>(propriedadeId: number, tipo: 'areas' | 'pontos'): Promise<T[]>` in `src/database/localDb.ts` — follow the same pattern as `getRelatorioCache` (returns empty array if no cache)

**Checkpoint**: `localDb.ts` compila sem erros; funções exportadas prontas para uso em MapaPropriedadeScreen.

---

## Phase 3: User Story 1 — Gestão Financeira (Priority: P1) 🎯 MVP

**Goal**: Garantir que FinanceiroScreen exibe dados reais do backend e que escritas offline funcionam corretamente.

**Independent Test**: Abrir FinanceiroScreen online → ver dados reais nos cards de resumo; desconectar → ver dados em cache; registrar despesa offline → reconectar → despesa aparece no servidor.

### Implementation for User Story 1

- [x] T005 [US1] Audit `carregarTudo()` in `src/screens/FinanceiroScreen.tsx` — compare each of the 5 GET endpoint paths (`/resumo`, `/evolucao`, `/despesas-categoria`, `/custo-por-animal`, `/alertas`) against the running backend responses; fix any path mismatches; verify all 5 responses set their corresponding state variables
- [x] T006 [P] [US1] Verify and fix `postComOffline` calls for despesa form in `src/screens/FinanceiroScreen.tsx` — confirm `POST /api/financeiro/{propriedadeId}/despesas` path and payload match the backend; fix if divergent; confirm `addToSyncQueue('financeiro_despesas', 'INSERT', dados)` is called when offline
- [x] T007 [P] [US1] Verify and fix `postComOffline` calls for receita form in `src/screens/FinanceiroScreen.tsx` — confirm `POST /api/financeiro/{propriedadeId}/receitas` path and payload; fix if divergent; confirm offline sync queue entry uses `'financeiro_receitas'` table name
- [x] T008 [US1] Verify remaining POST forms in `src/screens/FinanceiroScreen.tsx` — test venda de animal (`/vendas-animal`), compra de animal (`/compras-animal`), insumos (`/insumos`), funcionário (`/funcionarios`); fix endpoint paths and payloads that diverge; confirm each uses `addToSyncQueue` with the correct table name when offline
- [ ] T009 [US1] Manual smoke test FinanceiroScreen per `specs/001-api-telas-pendentes/quickstart.md` — run the online validation, offline validation, and empty-state scenarios; confirm all acceptance criteria from spec pass

**Checkpoint**: FinanceiroScreen exibe dados reais online, persiste cache offline, salva escritas offline na fila de sync. US1 totalmente funcional e testável independentemente.

---

## Phase 4: User Story 2 — Relatórios Consolidados (Priority: P2)

**Goal**: Garantir que RelatoriosScreen busca relatórios reais do backend, salva cache offline, e exporta PDF corretamente.

**Independent Test**: Buscar relatório online → dados reais aparecem; desconectar → mesmo tipo de relatório abre com dados em cache; exportar PDF → arquivo gerado com dados reais e share sheet abre.

### Implementation for User Story 2

- [x] T010 [US2] Audit `buscarRelatorio()` in `src/screens/RelatoriosScreen.tsx` — verify `GET /api/relatorios/{propriedadeId}/{tipo}?dataInicio=&dataFim=` is called correctly; test each of the 4 tipos (`produtividade`, `sanitario`, `financeiro`, `reprodutivo`) against the running backend; fix any path or param mismatches
- [x] T011 [US2] Verify `saveRelatorioCache` is called after a successful `buscarRelatorio()` in `src/screens/RelatoriosScreen.tsx` — if missing, add `saveRelatorioCache(propriedadeId, tipo, dados).catch(() => {})` after `setDadosAbertos()`; key must be the report type string (e.g., `'produtividade'`)
- [x] T012 [US2] Verify offline fallback in `buscarRelatorio()` in `src/screens/RelatoriosScreen.tsx` — confirm `getRelatorioCache` is called in the catch block or when `!isOnline`; if missing, add fallback that reads cache and sets `dadosAbertos` with a `[cache]` indicator label
- [ ] T013 [US2] Manual smoke test RelatoriosScreen per `specs/001-api-telas-pendentes/quickstart.md` — run online validation (all 4 tipos), offline validation (cached data visible), and PDF export; confirm all acceptance criteria from spec pass

**Checkpoint**: RelatoriosScreen exibe relatórios reais, persiste cache offline, exporta PDF. US2 funcional e testável independentemente.

---

## Phase 5: User Story 3 — Mapa Interativo (Priority: P3)

**Goal**: Migrar MapaPropriedadeScreen de AsyncStorage para SQLite, adicionar `useNetworkStatus`, e usar `addToSyncQueue` para escritas offline.

**Independent Test**: Abrir mapa online → áreas e pontos reais aparecem sobrepostos; desconectar → mapa e dados permanecem visíveis com OfflineBanner; adicionar ponto offline → Alert de "será sincronizado"; reconectar → ponto sincronizado ao servidor.

**Prerequisites**: Phase 2 (T002–T004) must be complete.

### Implementation for User Story 3

- [x] T014 [US3] Add imports to `src/screens/MapaPropriedadeScreen.tsx` — add `useNetworkStatus` from `'../hooks/useNetworkStatus'`, `saveMapaCache` and `getMapaCache` from `'../database/localDb'`, and `addToSyncQueue` from `'../database/localDb'`; add `const { isOnline } = useNetworkStatus();` inside the main component function
- [x] T015 [US3] Refactor `carregarAreas()` in `src/screens/MapaPropriedadeScreen.tsx` — replace `carregarAreasLocais` (AsyncStorage) with `getMapaCache`; add online branch: `api.get` success → `saveMapaCache(propriedadeId, 'areas', dados)`; add offline branch and network-error fallback: `getMapaCache<PropriedadeArea>(propriedadeId, 'areas')`; remove `carregarAreasLocais` and `gravarAreasLocais` private functions (no longer needed)
- [x] T016 [US3] Refactor `carregarPontos()` in `src/screens/MapaPropriedadeScreen.tsx` — replace `carregarPontosLocais` (AsyncStorage) with `getMapaCache`; add online branch: `api.get` success → `saveMapaCache(propriedadeId, 'pontos', dados)`; add offline/error fallback: `getMapaCache<PropriedadePonto>(propriedadeId, 'pontos')`; remove `carregarPontosLocais` and `gravarPontosLocais` private functions
- [x] T017 [US3] Add offline branch to `salvarArea()` in `src/screens/MapaPropriedadeScreen.tsx` — before the existing `api.post` call, add: `if (!isOnline) { await addToSyncQueue('propriedade_areas', 'INSERT', { propriedadeId, ...dadosArea }); salvarAreaLocal(propriedadeId, areaComId); fecharModal(); Alert.alert('Salvo', 'Área salva localmente e será sincronizada ao conectar.'); return; }`
- [x] T018 [US3] Add offline branch to `salvarPonto()` in `src/screens/MapaPropriedadeScreen.tsx` — before the existing `api.post` call, add: `if (!isOnline) { await addToSyncQueue('propriedade_pontos', 'INSERT', { propriedadeId, ...dadosPonto }); setPontos(prev => [...prev, pontoLocal]); fecharModalPonto(); Alert.alert('Salvo', 'Ponto salvo localmente e será sincronizado ao conectar.'); return; }`
- [ ] T019 [US3] Manual smoke test MapaPropriedadeScreen per `specs/001-api-telas-pendentes/quickstart.md` — run online validation (áreas e pontos reais visíveis), offline validation (mapa persiste), add ponto offline (Alert + no crash), reconect sync; confirm all acceptance criteria from spec pass

**Checkpoint**: MapaPropriedadeScreen segue o mesmo padrão offline-first das demais telas; usa SQLite para cache; usa syncQueue para escritas offline. US3 funcional e testável independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final de ponta a ponta e consistência entre telas.

- [ ] T020 [P] Run full smoke test suite per `specs/001-api-telas-pendentes/quickstart.md` for all 3 screens in sequence — mark each checklist item in the quickstart; all 11 items must pass
- [ ] T021 [P] Verify sync queue processes correctly — with pending items in the queue, restore connectivity and check that `getPendingSyncItems()` returns the items and the sync service processes them; check `console.log` / debug output for sync success; confirm no items remain with `sincronizado = 0` after a successful sync cycle

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS Phase 5 (US3)**
- **US1 (Phase 3)**: Depends on Setup — independent of Phases 2, 4, 5
- **US2 (Phase 4)**: Depends on Setup — independent of Phases 2, 3, 5
- **US3 (Phase 5)**: Depends on Foundational (Phase 2) completion
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after T001 — no dependency on US2 or US3
- **US2 (P2)**: Can start after T001 — no dependency on US1 or US3
- **US3 (P3)**: Can start after T002–T004 — no dependency on US1 or US2

### Within Each User Story

- US1: T005 → T006 [P] / T007 [P] → T008 → T009
- US2: T010 → T011 → T012 → T013
- US3: T014 → T015 → T016 → T017 → T018 → T019

### Parallel Opportunities

```bash
# After T001 — US1 and US2 can start simultaneously with different devs:
Task: T005 (FinanceiroScreen audit)
Task: T010 (RelatoriosScreen audit)

# Within US1 — these are independent write-path fixes:
Task: T006 (fix despesa POST)
Task: T007 (fix receita POST)

# Within Phase 6 — both polish tasks are independent:
Task: T020 (full smoke test)
Task: T021 (sync queue verification)
```

---

## Dependencies & Execution Order Summary

| Task | Depends on | Can parallelize with |
|------|-----------|---------------------|
| T001 | — | — |
| T002 | T001 | — |
| T003 | T002 | T004 |
| T004 | T002 | T003 |
| T005 | T001 | T010 |
| T006 | T005 | T007 |
| T007 | T005 | T006 |
| T008 | T006, T007 | — |
| T009 | T008 | T013 |
| T010 | T001 | T005 |
| T011 | T010 | — |
| T012 | T011 | — |
| T013 | T012 | T009 |
| T014 | T003, T004 | — |
| T015 | T014 | — |
| T016 | T015 | — |
| T017 | T016 | — |
| T018 | T017 | — |
| T019 | T018 | — |
| T020 | T009, T013, T019 | T021 |
| T021 | T009, T013, T019 | T020 |

---

## Implementation Strategy

### MVP First (US1 — FinanceiroScreen Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 3: US1 — Financeiro (T005–T009)
3. **STOP and VALIDATE**: FinanceiroScreen funciona 100% online + offline
4. Demo / release se necessário

### Incremental Delivery

1. T001 → Foundation ready
2. T002–T004 + T005–T009 (paralelo) → Financeiro + localDb prontos
3. T010–T013 → Relatórios integrado
4. T014–T019 → Mapa integrado
5. T020–T021 → Tudo validado e pronto para merge

### Single Developer Sequential

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 →
T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 →
T019 → T020 → T021
```

---

## Notes

- `[P]` tasks = arquivos diferentes, sem dependências entre si
- `[Story]` mapeia a tarefa para a história de usuário correspondente
- Testes são apenas manuais (smoke tests via quickstart.md)
- Cada fase é independentemente testável sem completar as demais
- FinanceiroScreen e RelatoriosScreen já têm a estrutura offline-first — as tarefas são de verificação e correção, não reescrita
- MapaPropriedadeScreen é a única que requer refatoração significativa
- Commit após cada fase concluída
