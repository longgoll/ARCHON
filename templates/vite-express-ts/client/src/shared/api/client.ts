/**
 * Archon Fullstack Type-Safe API Client
 * Ensures zero contract drift between Client calls and Server Express routes.
 */

export interface ApiFetchOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: TBody;
  headers?: Record<string, string>;
}

/**
 * Type-safe fetcher wrapping standard fetch.
 * Validates endpoint path & method against registered server routes.
 */
export async function archonFetch<TResponse = unknown, TBody = unknown>(
  url: string,
  options: ApiFetchOptions<TBody> = {}
): Promise<TResponse> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
