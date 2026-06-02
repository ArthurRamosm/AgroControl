const DEV_URL = 'http://192.168.1.2:5249';
const PROD_URL = 'https://unenvied-snowfall-undrafted.ngrok-free.dev';

export const API_URL = __DEV__ ? DEV_URL : PROD_URL;

type ApiOptions = {
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown, options?: ApiOptions): Promise<T> {
  const headers: Record<string, string> = {
    'bypass-tunnel-reminder': 'true',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({})) as { mensagem?: string };
    throw new ApiError(response.status, erro.mensagem ?? 'Erro na requisição.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body: unknown, options?: ApiOptions) =>
    request<T>('POST', path, body, options),

  put: <T>(path: string, body: unknown, options?: ApiOptions) =>
    request<T>('PUT', path, body, options),

  delete: <T>(path: string, options?: ApiOptions) =>
    request<T>('DELETE', path, undefined, options),
};

export function getMensagemErro(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Sem conexão com o servidor. Verifique se a API está rodando.';
}
