<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Rationale: MINOR bump — added Backend Architecture section, expanded Technology
& Platform Standards with full stack details (.NET Core + SQL Server LocalDB),
added Project Status section, updated offline-first principle to reference
useNetworkStatus hook, corrected dev-server entry.

Modified principles:
  - I. Offline-First: added useNetworkStatus hook reference
  - (all others unchanged)

Added sections:
  - Technology & Platform Standards: backend stack details
  - Backend Architecture: controllers, API contract, API-integration status
  - Project Status: implemented screens, pending screens

Removed sections: none

Templates updated:
  - .specify/templates/plan-template.md  ✅ no changes required
  - .specify/templates/spec-template.md  ✅ no changes required
  - .specify/templates/tasks-template.md ✅ no changes required

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

The three screens still pending API integration (Financeiro, Relatórios,
MapaPropriedade) MUST be connected to their respective backend controllers
before any new features are added on top of them.

### V. Data Integrity

Agricultural records — animals, health events, financial entries, and property
areas — are operationally critical. Writes MUST be atomic at the SQLite level.
Data MUST never be silently dropped; if a sync operation fails, the record
MUST remain in the queue and retry on the next connectivity event.

Delete operations on livestock or financial records MUST be soft-deletes or
require explicit user confirmation. Destructive operations without user
confirmation are prohibited.

### VI. User-Centric Simplicity

AgroControl serves agricultural field workers who may have limited technical
familiarity with mobile apps. Every screen MUST have one primary action. Forms
MUST use clear Portuguese labels, the primary brand color `#0d2b10`, and
provide inline feedback on errors.

New features MUST NOT increase the number of taps required for the most common
workflows (animal registration, health logging, financial entry). Complexity
added for edge cases MUST be hidden behind progressive disclosure (secondary
menus, detail screens) rather than cluttering primary flows.

## Technology & Platform Standards

### Frontend

| Concern | Technology |
|---------|-----------|
| Framework | React Native 0.81 via Expo SDK ~54 (managed workflow) |
| Language | TypeScript ~5.9 — strict mode MUST be enabled |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| Local storage | expo-sqlite ~16 (business records); AsyncStorage (session/prefs only) |
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
| Areas | Property area / zone management |
| Pontos | Geographic points of interest |

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
| AnimalReportScreen | ✅ Relatorios (animal-scoped) |
| **FinanceiroScreen** | ⚠️ **PENDING — must connect to Financeiro** |
| **RelatoriosScreen** | ⚠️ **PENDING — must connect to Relatorios** |
| **MapaPropriedadeScreen** | ⚠️ **PENDING — must connect to Propriedades/Areas/Pontos** |

Screens marked ⚠️ MUST be API-integrated before new features are layered on
top of them (see Principle IV).

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

**Version**: 1.1.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
