type Session = {
  propriedadeId: number;
  nome: string;
};

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
