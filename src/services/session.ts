import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export type Session = {
  id: number;
  nome: string;
  usuario: string;
  email: string;
  propriedadeId: number;
  propriedade: {
    nome: string;
    cidade: string;
    estado: string;
    focoProdutivo?: string;
  };
};

// Migrado de AsyncStorage para SecureStore: dados de sessão e senha
// passam a ser persistidos de forma criptografada pelo SO
// (Keychain no iOS, Keystore/EncryptedSharedPreferences no Android).
// [OWASP M1-02] Ver docs/security/owasp-m1-relatorio.json
const SESSION_KEY = 'agrocontrol_session';
const PASSWORD_HASH_KEY = 'agrocontrol_senha_hash';
// [OWASP M10-01] Sal aleatório de 32 bytes por-dispositivo, gerado na primeira execução.
// Substitui o sal fixo anterior que era visível no bundle do APK.
const LOCAL_SALT_KEY = 'agrocontrol_local_salt';
// Sal legado mantido apenas para migração transparente de hashes já gravados.
const LEGACY_SALT = 'agrocontrol-offline-salt-v1';

async function getOrCreateSalt(): Promise<string> {
  const stored = await SecureStore.getItemAsync(LOCAL_SALT_KEY);
  if (stored) return stored;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(LOCAL_SALT_KEY, hex);
  return hex;
}

async function hashSenha(senha: string): Promise<string> {
  const salt = await getOrCreateSalt();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${senha}`);
}

// Usado exclusivamente no caminho de migração de hashes gerados com o sal fixo legado.
async function hashSenhaLegacy(senha: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${LEGACY_SALT}:${senha}`
  );
}

let _session: Session | null = null;

export function setSession(s: Session): void {
  _session = s;
}

export function getSession(): Session {
  if (!_session) throw new Error('Sessão não iniciada. Faça login primeiro.');
  return _session;
}

export function clearSession(): void {
  _session = null;
}

/** Persists session to SecureStore and memory. Use after login. */
export async function saveSession(s: Session): Promise<void> {
  _session = s;
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
}

/** Loads session from SecureStore into memory. Returns null if none saved. */
export async function loadSavedSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    // ensure email exists for sessions saved before this field was added
    if (!s.email) s.email = '';
    _session = s;
    return s;
  } catch {
    return null;
  }
}

/** Updates session fields in memory and SecureStore. */
export async function updateSession(updates: Partial<Session>): Promise<void> {
  if (!_session) return;
  _session = { ..._session, ...updates };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(_session));
}

/** Clears session from both memory and SecureStore. Use on logout. */
export async function clearPersistedSession(): Promise<void> {
  _session = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_HASH_KEY);
}

/**
 * Saves a salted SHA-256 hash of the password for offline logout
 * confirmation. The plaintext password is never persisted on the device.
 * [OWASP M1-01]
 */
export async function savePasswordForOffline(senha: string): Promise<void> {
  const hash = await hashSenha(senha);
  await SecureStore.setItemAsync(PASSWORD_HASH_KEY, hash);
}

/** Compares given password's hash against the offline-stored hash. */
export async function verifyPasswordOffline(senha: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PASSWORD_HASH_KEY);
  if (!stored) return false;
  const hash = await hashSenha(senha);
  if (stored === hash) return true;
  // Migração transparente: se o hash foi gravado com o sal fixo legado,
  // verifica contra ele e re-salva com o sal por-dispositivo (M10-01).
  const legacyHash = await hashSenhaLegacy(senha);
  if (stored === legacyHash) {
    await savePasswordForOffline(senha);
    return true;
  }
  return false;
}
