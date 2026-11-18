/**
 * Capa de Transporte HTTP Centralizada (Clean Architecture)
 * Conecta el Frontend React 19 con el Backend Fastify + PostgreSQL + Redis
 */

const TOKEN_STORAGE_KEY = 'rodo_auth_jwt';
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export async function logoutSession(): Promise<void> {
  setAuthToken(null);
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

export class ApiHttpError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, timeoutMs = 10000, headers: customHeaders, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders as Record<string, string>),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        (payload && typeof payload === 'object' && payload.error) ||
        `HTTP Error ${response.status}`;
      throw new ApiHttpError(response.status, errorMsg, payload);
    }

    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sube una imagen en base64 (firma digital, evidencia de entrega, comprobante SPEI o INE de recuperación)
 * al volumen persistente del servidor backend en el VPS (/api/uploads).
 */
export async function uploadImageToBackend(
  dataUrl: string,
  folder: 'signatures' | 'proofs' | 'recovery' | 'transfers' | 'restaurants',
  referenceId: string
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const res = await apiFetch<{ url: string }>('/api/uploads', {
      method: 'POST',
      body: {
        dataUrl,
        folder,
        referenceId,
      },
    });
    return res.url || dataUrl;
  } catch (err) {
    console.warn('[Upload] Fallback to inline DataURL:', err);
    return dataUrl;
  }
}

export async function uploadOrderProofToStorage(
  orderId: string,
  kind: 'signature' | 'photo',
  dataUrl: string
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const mimeMatch = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp));base64,/);
  if (!mimeMatch) {
    throw new Error('Formato de imagen no permitido. Usa JPG, PNG o WEBP.');
  }

  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > 4 * 1024 * 1024) {
    throw new Error('La imagen excede el límite seguro de 4 MB.');
  }

  return await uploadImageToBackend(
    dataUrl,
    kind === 'signature' ? 'signatures' : 'proofs',
    `${orderId}_${kind}`
  );
}

export async function uploadRecoveryDocToStorage(
  requestId: string,
  dataUrl: string
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const mimeMatch = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp));base64,/);
  if (!mimeMatch) {
    throw new Error('Formato de documento no permitido. Usa JPG, PNG o WEBP.');
  }

  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > 4 * 1024 * 1024) {
    throw new Error('La fotografía de documento excede 4 MB.');
  }

  return await uploadImageToBackend(dataUrl, 'recovery', requestId);
}
