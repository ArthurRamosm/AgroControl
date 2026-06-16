<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.2.1
Rationale: PATCH bump — factual status update for FinanceiroScreen,
RelatoriosScreen, and MapaPropriedadeScreen to reflect that API integration
implementation is complete (branch 001-api-telas-pendentes, tasks T005–T018 ✅);
only final manual smoke tests (T009, T013, T019) and overall validation
(T020–T021) remain before these screens are fully cleared.

Modified principles:
  - IV. API-First Data Flow: updated status description for the 3 non-Queijaria
    pending screens from "in progress / needs migration" to "implementation
    complete, smoke test pending"

Added content: none

Removed sections: none

Templates updated:
  - .specify/templates/plan-template.md  ✅ no changes required
  - .specify/templates/spec-template.md  ✅ no changes required
  - .specify/templates/tasks-template.md ✅ no changes required
  - .specify/templates/commands/         ✅ no files exist — nothing to update

Deferred TODOs: none
-->

# AgroControl Constitution

## Core Principles

### I. Offline-First (NON-NEGOTIABLE)

The app MUST function fully without an active internet connection. All reads and
writes go to the local SQLite database (expo-sqlite) as the primary data store.
A sync queue MUST ensure that every mutation made offline is replayed to the
remote backend once connectivity is restored. Network state is managed via the
`useNetworkStatus` hook (wrapping NetInfo) and MUST be reflected in the UI
through the `OfflineBanner` component. Session persistence via AsyncStorage
ensures users are never logged out due to connectivity loss.

No feature may be gated exclusively behind an online check. Features that
require server data MUST degrade gracefully when offline, displaying cached
data and an appropriate indicator rather than an error state.

### II. Cross-Platform Compatibility

The app MUST run on Android, iOS, and Web. All three targets are first-class
citizens. Platform-specific code is permitted only when explicitly scoped and
documented; any such scope MUST have a feature-parity fallback or explicit
exclusion documented in the spec.

Dependencies MUST support all three platforms. Before adding a new library,
compatibility with Expo SDK 54 on Android, iOS, and react-native-web MUST be
verified. Libraries that lack web support require explicit justification and
a documented web-only fallback strategy.

### III. Screen–Component Separation

Screens (in `src/screens/`) own navigation, state management, and data
fetching. Reusable UI elements MUST be extracted to `src/components/` with no
business logic, no direct database access, and no navigation calls inside them.
Components receive data and callbacks via props only.

New features MUST integrate with the existing `AppNavigator` in
`src/navigation/AppNavigator.tsx`. Adding a new top-level navigation target
requires updating both the navigator and the `BottomMenu` component.

### IV. API-First Data Flow with Local Cache

Every screen that displays or mutates data MUST consume the corresponding
backend API endpoint as its source of truth when online. SQLite acts as the
local cache; reads from SQLite are acceptable offline but MUST be invalidated
and refreshed on next sync. New screens MUST NOT use json-server or static
fixtures in production code — only the .NET Core backend.

The screens still pending final validation:

- **FinanceiroScreen** — implementation complete (branch `001-api-telas-pendentes`,
  T005–T008 ✅); final manual smoke test (T009) pending
- **RelatoriosScreen** — implementation complete (branch `001-api-telas-pendentes`,
  T010–T012 ✅); final manual smoke test (T013) pending
- **MapaPropriedadeScreen** — migration to SQLite + useNetworkStatus complete
  (branch `001-api-telas-pendentes`, T014–T018 ✅); final manual smoke test
  (T019) pending
- **Queijaria domain** (10 screens) — backend controllers do not yet exist; screens
  operate in local-only mode (SQLite via `fazendaSchema.ts`) until the Queijaria
  backend is implemented

The first three screens MUST pass their smoke tests before new features are
layered on top of them. The Queijaria screens MUST be connected to backend
controllers once those are implemented.

### V. Data Integrity

Agricultural records — animals, health events, financial entries, property
areas, dairy production logs, and stock items — are operationally critical.
Writes MUST be atomic at the SQLite level. Data MUST never be silently dropped;
if a sync operation fails, the record MUST remain in the queue and retry on the
next connectivity event.

Delete operations on livestock or financial records MUST be soft-deletes or
require explicit user confirmation. Destructive operations without user
confirmation are prohibited.

### VI. User-Centric Simplicity

AgroControl serves agricultural field workers who may have limited technical
familiarity with mobile apps. Every screen MUST have one primary action. Forms
MUST use clear Portuguese labels, the primary brand color `#0d2b10`, and
provide inline feedback on errors.

New features MUST NOT increase the number of taps required for the most common
workflows (animal registration, health logging, financial entry, dairy production
recording). Complexity added for edge cases MUST be hidden behind progressive
disclosure (secondary menus, detail screens) rather than cluttering primary flows.

## Technology & Platform Standards

### Frontend

| Concern | Technology |
|---------|-----------|
| Framework | React Native 0.81 via Expo SDK ~54 (managed workflow) |
| Language | TypeScript ~5.9 — strict mode MUST be enabled |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| Local storage | expo-sqlite ~16 (business records); AsyncStorage (session/prefs only) |
| Schema files | `src/database/localDb.ts` (core schema + sync helpers); `src/database/fazendaSchema.ts` (Queijaria + new domain tables, `FAZENDA_SCHEMA_VERSION`) |
| Connectivity | @react-native-community/netinfo + `useNetworkStatus` hook |
| Media | expo-image-picker (photos), expo-print + expo-sharing (PDFs) |
| Maps | react-leaflet + Leaflet (web target), scoped to MapaPropriedade |
| Charts | react-native-chart-kit + react-native-svg |
| Brand color | `#0d2b10` (primary green — MUST be applied consistently) |

### Backend

| Concern | Technology |
|---------|-----------|
| Runtime | .NET Core (ASP.NET Core Web API) |
| Database | SQL Server LocalDB |
| Auth | JWT-based authentication (Auth controller) |
| Dev base URL | configured per environment; frontend reads from env/config |

All new frontend dependencies MUST be Expo-compatible and verified for Android,
iOS, and Web. All new backend dependencies MUST target .NET Core LTS.

## Backend Architecture

### API Controllers (all implemented)

| Controller | Domain |
|-----------|--------|
| Auth | Login, register, token refresh |
| Animais | CRUD for livestock records |
| AnimalFicha | Animal profile / detailed record |
| Dashboard | Summary stats for HomeScreen |
| Saude | Health events and treatments |
| Financeiro | Income, expenses, financial reports |
| Alertas | Notifications and alert rules |
| Afastamentos | Animal withdrawal / quarantine records |
| Relatorios | Report generation endpoints |
| Propriedades | Farm property management |
| PropriedadeAreas | Property area / zone management |
| PropriedadePontos | Geographic points of interest |
| Estoque | Veterinary stock / medication inventory |

### Frontend API Integration Status

| Screen | API Connected |
|--------|--------------|
| LoginScreen | ✅ Auth |
| RegisterScreen | ✅ Auth |
| HomeScreen | ✅ Dashboard |
| AnimalListScreen | ✅ Animais |
| CadastroAnimalScreen | ✅ Animais |
| AnimalDetailsScreen | ✅ AnimalFicha |
| SaudeScreen | ✅ Saude |
| MastiteClinicaScreen | ✅ Saude |
| MastiteSubclinicaScreen | ✅ Saude |
| ParasitasScreen | ✅ Saude |
| AnimalReportScreen | ✅ Relatorios (animal-scoped) |
| AfastamentoScreen | ✅ Afastamentos |
| EstoqueScreen | ✅ Estoque |
| FazendaScreen | ✅ (hub/navigation — no direct API calls) |
| DespesaDetalheScreen | ✅ Financeiro |
| ReceitaDetalheScreen | ✅ Financeiro |
| **FinanceiroScreen** | 🔄 **IMPL DONE — smoke test pending (T009)** |
| **RelatoriosScreen** | 🔄 **IMPL DONE — smoke test pending (T013)** |
| **MapaPropriedadeScreen** | 🔄 **IMPL DONE — smoke test pending (T019)** |
| **ProducaoDiariaScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **PotabilidadeScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **HigieneCaixaScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **AnaliseLabScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **RastreabilidadeScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **HigienizacaoEquipScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **CondicoesVestiarioScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **DepositoLimpezaScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **ControleLeiteiroScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |
| **VendaQueijoScreen** | ⚠️ **PENDING — no Queijaria backend controller yet** |

Screens marked 🔄 have implementation complete and are awaiting final manual
smoke test validation. Screens marked ⚠️ have no backend controller yet.
Both categories MUST be fully cleared before new features are layered on top
of them (see Principle IV).

### Queijaria Domain (Local-Only, Pending Backend)

The 10 Queijaria screens implement dairy processing checklists (PL 01/01
through PL series: water hygiene, potability, lab analyses, traceability,
equipment sanitation, vestiaire conditions, storage cleaning, milk control,
and cheese sales). Their SQLite schema is defined in `fazendaSchema.ts`
(version-managed via `FAZENDA_SCHEMA_VERSION`).

These screens currently operate in **local-only mode** — data is persisted to
SQLite but never synced to a backend, because the corresponding .NET Core
Queijaria controllers do not yet exist. When Queijaria backend controllers are
implemented, the sync queue pattern used by other screens MUST be applied here.
Until then, this represents a known, intentional deviation from Principle IV
and MUST be tracked in the `Complexity Tracking` table of any plan that extends
the Queijaria domain.

## Development Workflow

- **Feature branches**: named `###-feature-name` (e.g., `001-financeiro-api`)
- **Specs**: stored under `specs/###-feature-name/` using the Spec Kit workflow
  (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`)
- **Commits**: one logical change per commit; message MUST describe *why*,
  not *what*
- **Testing**: manual smoke test on at least one platform (Android emulator or
  physical device) before marking a task done; automated tests are optional
  unless explicitly requested in the feature spec
- **PR review**: constitution compliance check MUST be the first gate; PRs
  that violate Offline-First, Data Integrity, or API-First principles are blocked
  regardless of other quality criteria
- **Breaking changes**: any change to existing SQLite schema MUST include a
  migration script; any change to backend API contracts MUST be coordinated with
  frontend consumers

## Governance

This constitution supersedes all other project practices. Amendments require:

1. A written rationale explaining why the change is necessary.
2. An updated version number following semantic versioning:
   - **MAJOR** — principle removal, redefinition, or backward-incompatible
     governance change.
   - **MINOR** — new principle, new section, or materially expanded guidance.
   - **PATCH** — clarifications, wording fixes, non-semantic refinements.
3. Propagation of the change to affected templates and this document on the
   same commit.

All pull requests MUST include a "Constitution Check" confirming compliance
with the six core principles. Violations MUST be justified in the
`Complexity Tracking` table of the feature's `plan.md`.

Runtime development guidance lives in `CLAUDE.md` (project root) and the
`.specify/` directory.

**Version**: 1.2.1 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-15
