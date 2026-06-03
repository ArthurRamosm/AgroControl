# Research: Integração das Telas Pendentes

## Estado atual de cada tela (descoberto via análise do código)

---

### Decision: FinanceiroScreen — estado de integração

**What was found:**
`src/screens/FinanceiroScreen.tsx` já tem a integração offline-first completa
implementada:
- `useNetworkStatus` importado e usado via `isOnline`
- `saveFinanceiroCache` / `getFinanceiroCache` com múltiplas chaves de tipo
- Helper `postComOffline` que chama `addToSyncQueue` quando offline
- `carregarTudo()` com branch online/offline

Endpoints GET já integrados:
```
GET /api/financeiro/{propriedadeId}/resumo
GET /api/financeiro/{propriedadeId}/evolucao?meses={n}
GET /api/financeiro/{propriedadeId}/despesas-categoria
GET /api/financeiro/{propriedadeId}/custo-por-animal
GET /api/financeiro/{propriedadeId}/alertas
```

**Rationale:**
A tela foi desenvolvida seguindo o mesmo padrão das telas já funcionando
(SaudeScreen). O trabalho pendente é verificar se os endpoints POST para
escrita (despesas, receitas, vendas, compras, insumos, funcionários) estão
corretos e se os dados aparecem corretamente na UI.

**Alternatives considered:**
Reescrever a tela do zero — rejeitado, pois o código existente já segue o
padrão correto.

---

### Decision: RelatoriosScreen — estado de integração

**What was found:**
`src/screens/RelatoriosScreen.tsx` já tem integração implementada:
- `useNetworkStatus` importado
- `saveRelatorioCache` / `getRelatorioCache` importados de `localDb`
- Geração de PDF via `expo-print` + `expo-sharing`
- Endpoint: `GET /api/relatorios/{propriedadeId}/{tipo}?dataInicio=&dataFim=`
- 4 tipos de relatório: `produtividade`, `sanitario`, `financeiro`, `reprodutivo`

**Rationale:**
Tela também já integrada. Trabalho pendente: verificar se `saveRelatorioCache`
é chamado após sucesso e se `getRelatorioCache` é usado no fallback offline.

**Alternatives considered:** N/A

---

### Decision: MapaPropriedadeScreen — estado de integração

**What was found:**
`src/screens/MapaPropriedadeScreen.tsx` tem integração PARCIAL:
- ✅ Usa `api.get` para `carregarAreas()` e `carregarPontos()`
  - `GET /api/propriedade-pontos?propriedadeId={id}` (confirmado)
  - Areas: `GET /api/areas?propriedadeId={id}` ou similar (precisa confirmação)
- ✅ Salva localmente usando `AsyncStorage` (função `gravarAreasLocais`,
  `gravarPontosLocais`) como fallback
- ❌ NÃO usa `useNetworkStatus` — não tem branch online/offline explícito
- ❌ NÃO usa `addToSyncQueue` para salvarArea/salvarPonto quando offline
- ❌ Usa AsyncStorage (não SQLite) para cache local — inconsistente com as
  outras telas

**Rationale:**
A tela tem cache offline via AsyncStorage mas não segue o padrão oficial do
projeto. Precisa adicionar `useNetworkStatus`, adaptar `salvarArea` e
`salvarPonto` para usar `addToSyncQueue` quando offline, e migrar cache de
AsyncStorage para SQLite (localDb) para consistência.

**Alternatives considered:**
Manter AsyncStorage para mapa — rejeitado, pois viola o padrão de consistência
definido no Princípio III (padrão uniforme entre telas) e cria dois mecanismos
de cache distintos.

---

### Decision: OfflineBanner — escopo de mudança

**What was found:**
`OfflineBanner` é renderizado globalmente em `AppNavigator.tsx` (linha 53) —
aparece automaticamente em TODAS as telas. Nenhuma tela precisa renderizá-lo
individualmente.

**Rationale:**
Zero mudanças necessárias no OfflineBanner.

---

### Decision: localDb.ts — tabelas existentes vs. necessárias

**What was found:**
Tabelas já existentes relevantes para as 3 telas:
- `financeiro_cache(propriedade_id, tipo, dados_json, atualizado_em)` ✅
- `relatorio_cache(propriedade_id, tipo, dados_json, atualizado_em)` ✅
- `sync_queue(id, tabela, operacao, dados_json, criado_em, sincronizado)` ✅

Tabelas ausentes:
- Não existe tabela `mapa_cache` ou equivalente para áreas e pontos via SQLite.
  O mapa usa AsyncStorage com chaves `mapa_areas_{id}` e `mapa_pontos_{id}`.

**Rationale:**
Precisa adicionar `mapa_cache(propriedade_id, tipo, dados_json, atualizado_em)`
com a mesma estrutura das outras caches, e exportar `saveMapaCache`/
`getMapaCache` de `localDb.ts`.

**Alternatives considered:**
Manter AsyncStorage para mapa — rejeitado (ver Decision acima).

---

### Decision: Verificação de endpoints do backend

**What was found:**
O backend está descrito na constituição como tendo todos os controllers
implementados. Os endpoints já consumidos pelas telas são:

| Tela | Endpoints já integrados | Pendente de verificação |
|------|------------------------|------------------------|
| Financeiro | 5 GET + múltiplos POST | Paths corretos no controller? |
| Relatorios | 1 GET (`/{tipo}`) | Precisa confirmar nomes de tipo |
| Mapa | GET areas, GET pontos | Confirmar path de areas |

**Rationale:**
Como o backend não está disponível para análise direta (não há acesso ao
.NET Core source neste repositório), a verificação de endpoints será feita via
testes manuais na etapa de implementação. Os paths foram inferidos do código
frontend existente.

**Alternatives considered:** N/A — não há outro caminho sem acesso ao backend source.
