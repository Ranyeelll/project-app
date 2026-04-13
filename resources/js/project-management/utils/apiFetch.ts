/**
 * Shared API fetch wrapper with automatic credentials and 401 handling.
 *
 * - Always sends `credentials: 'include'` for session cookies
 * - Always sends `Accept: application/json`
 * - Auto-attaches CSRF token for mutating requests (POST/PUT/PATCH/DELETE)
 * - On 401 response, clears auth state and redirects to login
 */

let onSessionExpired: (() => void) | null = null;

/** Register a callback that fires when a 401 is received (set by AppContext). */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

/**
 * Wrapper around fetch() that ensures credentials, CSRF, and 401 handling.
 * Use exactly like fetch() — same signature.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  // Always accept JSON
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Auto-attach CSRF for mutating methods (skip for FormData — browser sets boundary)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers.has('X-CSRF-TOKEN')) {
      headers.set('X-CSRF-TOKEN', getCsrfToken());
    }
    // Only set Content-Type if not FormData (FormData sets multipart boundary automatically)
    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  // Handle session expiry globally
  if (response.status === 401 && onSessionExpired) {
    onSessionExpired();
  }

  return response;
}
