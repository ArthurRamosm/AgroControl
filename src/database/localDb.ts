import { Platform } from 'react-native';
import { AnimalParams } from '../types/navigation';
import { createFazendaTables, migrateDespesaLocal } from './fazendaSchema';

// expo-sqlite has no web support; metro.config.js resolves it to an empty
// module on web, and initDatabase() returns early so db stays null.
const SQLite = Platform.OS !== 'web' ? require('expo-sqlite') : null;

// Module-level instance set by initDatabase().
// All exported functions check for null and return safe defaults — never crash.
let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const database = await SQLite.openDatabaseAsync('agrocontrol.db');

    // PRAGMA separately to avoid result-row issues in execAsync
    await database.runAsync('PRAGMA journal_mode = WAL');

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabela TEXT NOT NULL,
        operacao TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        criado_em TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS animal_local (
        id INTEGER PRIMARY KEY,
        propriedade_id INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vacina_local (
        id INTEGER PRIMARY KEY,
        animal_id INTEGER,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evento_local (
        id INTEGER PRIMARY KEY,
        animal_id INTEGER,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS afastamento_local (
        id INTEGER PRIMARY KEY,
        animal_id INTEGER,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS despesa_local (
        id INTEGER PRIMARY KEY,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS receita_local (
        id INTEGER PRIMARY KEY,
        sync_status TEXT DEFAULT 'synced',
        dados_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_cache (
        propriedade_id INTEGER PRIMARY KEY,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alertas_cache (
        propriedade_id INTEGER PRIMARY KEY,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS afastamentos_cache (
        propriedade_id INTEGER PRIMARY KEY,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS animais_saude_cache (
        propriedade_id INTEGER PRIMARY KEY,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS financeiro_cache (
        propriedade_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        PRIMARY KEY(propriedade_id, tipo)
      );

      CREATE TABLE IF NOT EXISTS relatorio_cache (
        propriedade_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        PRIMARY KEY(propriedade_id, tipo)
      );

      CREATE TABLE IF NOT EXISTS mapa_cache (
        propriedade_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        PRIMARY KEY(propriedade_id, tipo)
      );

      CREATE TABLE IF NOT EXISTS animal_ficha_cache (
        animal_id INTEGER PRIMARY KEY,
        dados_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
    `);

    await database.execAsync(createFazendaTables);
    try { await database.execAsync(migrateDespesaLocal); } catch (_) {}

    db = database;
  } catch (error) {
    console.error('Erro ao inicializar banco local:', error);
    // db stays null — all operations will return safe empty defaults
  }
}

// ── Animais ───────────────────────────────────────────────────────────────────

export async function saveAnimaisLocal(animais: AnimalParams[], propriedadeId: number): Promise<void> {
  if (!db) return;
  try {
    const agora = new Date().toISOString();
    await db.runAsync(
      "DELETE FROM animal_local WHERE propriedade_id = ? AND sync_status = 'synced'",
      [propriedadeId],
    );
    for (const a of animais) {
      await db.runAsync(
        `INSERT OR REPLACE INTO animal_local (id, propriedade_id, sync_status, dados_json, atualizado_em)
         VALUES (?, ?, 'synced', ?, ?)`,
        [a.id, propriedadeId, JSON.stringify(a), agora],
      );
    }
  } catch (error) {
    console.error('saveAnimaisLocal error:', error);
  }
}

export async function getAnimaisLocal(propriedadeId: number): Promise<AnimalParams[]> {
  if (!db) return [];
  try {
    const rows = await db.getAllAsync<{ dados_json: string }>(
      'SELECT dados_json FROM animal_local WHERE propriedade_id = ? ORDER BY id ASC',
      [propriedadeId],
    );
    return rows.map(r => JSON.parse(r.dados_json) as AnimalParams);
  } catch {
    return [];
  }
}

export async function saveAnimalLocalPending(animal: AnimalParams, propriedadeId: number): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO animal_local (id, propriedade_id, sync_status, dados_json, atualizado_em)
       VALUES (?, ?, 'pending', ?, ?)`,
      [animal.id, propriedadeId, JSON.stringify(animal), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveAnimalLocalPending error:', error);
  }
}

export async function deleteAnimalLocal(id: number): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync('DELETE FROM animal_local WHERE id = ?', [id]);
  } catch (error) {
    console.error('deleteAnimalLocal error:', error);
  }
}

// ── Sync queue ────────────────────────────────────────────────────────────────

export type SyncQueueItem = {
  id: number;
  tabela: string;
  operacao: string;
  dados_json: string;
  criado_em: string;
};

export async function addToSyncQueue(tabela: string, operacao: string, dados: object): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT INTO sync_queue (tabela, operacao, dados_json, criado_em) VALUES (?, ?, ?, ?)',
      [tabela, operacao, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('addToSyncQueue error:', error);
  }
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  if (!db) return [];
  try {
    return await db.getAllAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue WHERE sincronizado = 0 ORDER BY criado_em ASC',
    );
  } catch {
    return [];
  }
}

export async function markSyncItemDone(id: number): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync('UPDATE sync_queue SET sincronizado = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error('markSyncItemDone error:', error);
  }
}

// ── Dashboard cache ───────────────────────────────────────────────────────────

export async function saveDashboardCache(propriedadeId: number, dados: object): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO dashboard_cache (propriedade_id, dados_json, atualizado_em) VALUES (?, ?, ?)',
      [propriedadeId, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveDashboardCache error:', error);
  }
}

export async function getDashboardCache<T>(propriedadeId: number): Promise<T | null> {
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM dashboard_cache WHERE propriedade_id = ?',
      [propriedadeId],
    );
    return row ? (JSON.parse(row.dados_json) as T) : null;
  } catch {
    return null;
  }
}

// ── Alertas cache ─────────────────────────────────────────────────────────────

export async function saveAlertasCache(propriedadeId: number, dados: object[]): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO alertas_cache (propriedade_id, dados_json, atualizado_em) VALUES (?, ?, ?)',
      [propriedadeId, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveAlertasCache error:', error);
  }
}

export async function getAlertasCache<T>(propriedadeId: number): Promise<T[]> {
  if (!db) return [];
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM alertas_cache WHERE propriedade_id = ?',
      [propriedadeId],
    );
    return row ? (JSON.parse(row.dados_json) as T[]) : [];
  } catch {
    return [];
  }
}

// ── Afastamentos cache ────────────────────────────────────────────────────────

export async function saveAfastamentosCache(propriedadeId: number, dados: object[]): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO afastamentos_cache (propriedade_id, dados_json, atualizado_em) VALUES (?, ?, ?)',
      [propriedadeId, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveAfastamentosCache error:', error);
  }
}

export async function getAfastamentosCache<T>(propriedadeId: number): Promise<T[]> {
  if (!db) return [];
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM afastamentos_cache WHERE propriedade_id = ?',
      [propriedadeId],
    );
    return row ? (JSON.parse(row.dados_json) as T[]) : [];
  } catch {
    return [];
  }
}

// ── Animais saúde cache ───────────────────────────────────────────────────────

export async function saveAnimaisSaudeCache(propriedadeId: number, dados: object[]): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO animais_saude_cache (propriedade_id, dados_json, atualizado_em) VALUES (?, ?, ?)',
      [propriedadeId, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveAnimaisSaudeCache error:', error);
  }
}

export async function getAnimaisSaudeCache<T>(propriedadeId: number): Promise<T[]> {
  if (!db) return [];
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM animais_saude_cache WHERE propriedade_id = ?',
      [propriedadeId],
    );
    return row ? (JSON.parse(row.dados_json) as T[]) : [];
  } catch {
    return [];
  }
}

// ── Financeiro cache ──────────────────────────────────────────────────────────

export async function saveFinanceiroCache(propriedadeId: number, tipo: string, dados: object): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO financeiro_cache (propriedade_id, tipo, dados_json, atualizado_em) VALUES (?, ?, ?, ?)',
      [propriedadeId, tipo, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveFinanceiroCache error:', error);
  }
}

export async function getFinanceiroCache<T>(propriedadeId: number, tipo: string): Promise<T | null> {
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM financeiro_cache WHERE propriedade_id = ? AND tipo = ?',
      [propriedadeId, tipo],
    );
    return row ? (JSON.parse(row.dados_json) as T) : null;
  } catch {
    return null;
  }
}

// ── Relatório cache ───────────────────────────────────────────────────────────

export async function saveRelatorioCache(propriedadeId: number, tipo: string, dados: object): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO relatorio_cache (propriedade_id, tipo, dados_json, atualizado_em) VALUES (?, ?, ?, ?)',
      [propriedadeId, tipo, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveRelatorioCache error:', error);
  }
}

export async function getRelatorioCache<T>(propriedadeId: number, tipo: string): Promise<{ dados: T; periodoLabel: string } | null> {
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM relatorio_cache WHERE propriedade_id = ? AND tipo = ?',
      [propriedadeId, tipo],
    );
    return row ? (JSON.parse(row.dados_json) as { dados: T; periodoLabel: string }) : null;
  } catch {
    return null;
  }
}

// ── Mapa cache ────────────────────────────────────────────────────────────────

export async function saveMapaCache(propriedadeId: number, tipo: 'areas' | 'pontos', dados: object[]): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO mapa_cache (propriedade_id, tipo, dados_json, atualizado_em) VALUES (?, ?, ?, ?)',
      [propriedadeId, tipo, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveMapaCache error:', error);
  }
}

export async function getMapaCache<T>(propriedadeId: number, tipo: 'areas' | 'pontos'): Promise<T[]> {
  if (!db) return [];
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM mapa_cache WHERE propriedade_id = ? AND tipo = ?',
      [propriedadeId, tipo],
    );
    return row ? (JSON.parse(row.dados_json) as T[]) : [];
  } catch {
    return [];
  }
}

// ── Animal ficha cache ────────────────────────────────────────────────────────

export async function saveAnimalFichaCache(animalId: number, dados: object): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO animal_ficha_cache (animal_id, dados_json, atualizado_em) VALUES (?, ?, ?)',
      [animalId, JSON.stringify(dados), new Date().toISOString()],
    );
  } catch (error) {
    console.error('saveAnimalFichaCache error:', error);
  }
}

export async function getAnimalFichaCache<T>(animalId: number): Promise<T | null> {
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<{ dados_json: string }>(
      'SELECT dados_json FROM animal_ficha_cache WHERE animal_id = ?',
      [animalId],
    );
    return row ? (JSON.parse(row.dados_json) as T) : null;
  } catch {
    return null;
  }
}
