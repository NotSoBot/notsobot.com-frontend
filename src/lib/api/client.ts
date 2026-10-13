import { tokenStorage } from '@/auth/tokenStorage';
import { config } from '@/config';

import type { ApiErrorBody } from './types';


export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: number | null;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message || `Request failed with status ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body?.code ?? null;
    this.body = body;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}


export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  // attach the stored user token (default: true when a token exists)
  auth?: boolean,
  body?: unknown,
  // abort after this many ms so a hung request can't stall polling queries (0 disables)
  timeout?: number,
  query?: Record<string, QueryValue | Array<QueryValue>>,
}


const DEFAULT_TIMEOUT = 15 * 1000;


export function apiUrl(path: string, query?: ApiRequestOptions['query']): string {
  let url = config.apiBase + path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item !== undefined && item !== null) {
          params.append(key, String(item));
        }
      }
    }
    const search = params.toString();
    if (search) {
      url += `?${search}`;
    }
  }
  return url;
}


/**
 * Fetch wrapper for notsobot.api.
 * - Injects the user token as the raw `Authorization` header (the API treats a prefix-less token as a user token).
 * - Throws `ApiRequestError` with the API's `{code, message, status}` body on non-2xx responses.
 * - Aborts after `timeout` ms (default 15s).
 * - Clears the stored token when an authenticated request comes back 401 (except Discord-grant errors), so the UI falls back to logged-out.
 */
export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, query, timeout = DEFAULT_TIMEOUT, headers: rawHeaders, signal, ...init } = options;

  const headers = new Headers(rawHeaders);
  headers.set('accept', 'application/json');

  const token = (auth) ? tokenStorage.get() : null;
  if (token && !headers.has('authorization')) {
    headers.set('authorization', token);
  }

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
    requestBody = body;
  } else if (body !== undefined) {
    headers.set('content-type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path, query), {
    ...init,
    headers,
    body: requestBody,
    signal: (timeout) ? AbortSignal.any([signal, AbortSignal.timeout(timeout)].filter((x): x is AbortSignal => !!x)) : signal,
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // non-json error (proxy/html), keep null
    }

    // 401 + DISCORD_OAUTH_ERROR (60001) means the Discord grant behind the session expired, not the session itself
    if (response.status === 401 && errorBody?.code !== 60001 && token && tokenStorage.get() === token) {
      tokenStorage.clear();
    }
    throw new ApiRequestError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json() as T;
  }
  return await response.text() as T;
}
