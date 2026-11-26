const RAW_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
export const API_BASE_URL = String(RAW_BASE_URL).replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiFetchJson<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const { timeoutMs, headers, ...rest } = options;
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer =
    timeoutMs && controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('truthlens_auth_token') ||
        sessionStorage.getItem('truthlens_auth_token')
      : null;

  try {
    const response = await fetch(buildApiUrl(path), {
      ...rest,
      signal: options.signal || controller?.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });

    const data = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, data };
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}
