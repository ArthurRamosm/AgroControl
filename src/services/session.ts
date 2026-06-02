import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SESSION_KEY = '@agrocontrol:session';
const PASSWORD_KEY = '@agrocontrol:senha';

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

/** Persists session to AsyncStorage and memory. Use after login. */
export async function saveSession(s: Session): Promise<void> {
  _session = s;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

/** Loads session from AsyncStorage into memory. Returns null if none saved. */
export async function loadSavedSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
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

/** Updates session fields in memory and AsyncStorage. */
export async function updateSession(updates: Partial<Session>): Promise<void> {
  if (!_session) return;
  _session = { ..._session, ...updates };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(_session));
}

/** Clears session from both memory and AsyncStorage. Use on logout. */
export async function clearPersistedSession(): Promise<void> {
  _session = null;
  await AsyncStorage.multiRemove([SESSION_KEY, PASSWORD_KEY]);
}

/** Saves plain password for offline logout validation. */
export async function savePasswordForOffline(senha: string): Promise<void> {
  await AsyncStorage.setItem(PASSWORD_KEY, senha);
}

/** Compares given password against the offline-stored one. */
export async function verifyPasswordOffline(senha: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(PASSWORD_KEY);
  return stored === senha;
}
