/**
 * Reads a cookie value by name from `document.cookie`.
 *
 * This is a small internal helper used by the AuthGate browser SDK.
 * It returns `null` if the cookie is not present.
 */
function getCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * Returns the AuthGate CSRF token from the browser cookies.
 *
 * The CSRF token is issued by AuthGate and stored in the `authgate_csrf`
 * cookie. This helper does not validate the token; it only reads it.
 *
 * @returns The CSRF token string, or `null` if the cookie is missing.
 */
export function getCSRFToken(): string | null {
  return getCookie("authgate_csrf");
}

/**
 * The result of a logout attempt.
 *
 * - `{ ok: true }` indicates that logout succeeded.
 * - `{ ok: false, reason }` indicates that logout failed for a known reason.
 */
type LogoutResult =
  | { ok: true }
  | { ok: false; reason: "missing_csrf" | "request_failed" | "unauthorized" };

/**
 * Logs the user out by calling the AuthGate logout endpoint.
 *
 * This function:
 * - Reads the CSRF token from the browser cookies
 * - Sends a POST request to `/auth/logout`
 * - Optionally redirects the browser on success
 *
 * Redirecting is a side-effect and does not define success. Applications
 * that need to react to logout programmatically (e.g. SPA state updates)
 * should inspect the returned result instead.
 *
 * @param opts.redirectTo Optional URL to redirect to after successful logout.
 * @returns A `LogoutResult` indicating whether logout succeeded or failed.
 */
export async function logout(opts?: {
  redirectTo?: string;
}): Promise<LogoutResult> {
  const csrf = getCSRFToken();

  if (!csrf) {
    return { ok: false, reason: "missing_csrf" };
  }

  let res: Response;

  try {
    res = await fetch("/auth/logout", {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrf,
      },
      credentials: "include",
    });
  } catch {
    return { ok: false, reason: "request_failed" };
  }

  if (!res.ok) {
    return {
      ok: false,
      reason:
        res.status === 401 || res.status === 403
          ? "unauthorized"
          : "request_failed",
    };
  }

  if (opts?.redirectTo) {
    window.location.href = opts.redirectTo;
  }

  return { ok: true };
}

/**
 * authFetch performs a fetch request with AuthGate-aware, refresh-once behavior
 * for a specific audience.
 *
 * Behavior:
 * - Always includes credentials
 * - Performs the initial request as-is
 * - If the response is NOT 401, returns it directly
 * - If the response IS 401:
 *   - Attempts POST /auth/refresh with CSRF and the same requested audience
 *   - If refresh succeeds, retries the original request ONCE
 *   - If refresh fails, returns the original 401 response
 *
 * authFetch never redirects or mutates application state. Callers are expected
 * to handle authentication failures explicitly.
 *
 * @param input The resource to fetch (same as `fetch`).
 * @param init Optional fetch options. Credentials are always included.
 * @param opts Optional AuthGate options.
 * @param opts.audience The audience for which the request is made (e.g. "app", "admin").
 *        Defaults to "app".
 * @returns The final `Response` from the original request or the retried request.
 */

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts?: { audience?: string },
): Promise<Response> {
  const audience = opts?.audience ?? "app";

  const res = await fetch(input, withCredentials(init));
  if (res.status !== 401) {
    return res;
  }

  const refreshed = await refreshSession(audience);
  if (!refreshed) {
    return res;
  }

  return fetch(input, withCredentials(init));
}

function withCredentials(init: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
  };
}

/**
 * refreshSession attempts to refresh the current AuthGate session for a
 * specific audience.
 *
 * It performs:
 *   POST /auth/refresh
 *   with CSRF protection, credentials, and an explicit audience declaration.
 *
 * The server validates the requested audience against the user's roles and
 * rejects the request if the audience is not permitted.
 *
 * @param audience The audience for which a new access token should be minted.
 *        Defaults to "app".
 * @returns `true` if the refresh succeeded, or `false` if refresh failed for
 *          any reason (unauthorized, expired session, or error).
 */
export async function refreshSession(
  audience: string = "app",
): Promise<boolean> {
  const csrf = getCSRFToken();
  if (!csrf) {
    return false;
  }

  let res: Response;

  try {
    res = await fetch(
      `/auth/refresh?audience=${encodeURIComponent(audience)}`,
      {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrf,
        },
        credentials: "include",
      },
    );
  } catch {
    return false;
  }

  return res.ok;
}

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
};

/**
 * Fetches the currently authenticated user's identity.
 *
 * Behavior:
 * - Calls GET /auth/user using credentials (cookies)
 * - If the access token is expired, authFetch attempts a single refresh
 * - If refresh succeeds, the request is retried once
 * - If the user is not authenticated, returns null
 *
 * This function never throws for authentication failures.
 *
 * @param opts Optional options.
 * @param opts.audience The audience for which authentication should be ensured
 *        (e.g. "app", "admin"). Defaults to "app".
 *
 * @returns The current user object if authenticated, or `null` otherwise.
 */
export async function getCurrentUser(opts?: {
  audience?: string;
}): Promise<CurrentUser | null> {
  let res: Response;

  try {
    res = await authFetch(
      "/auth/user",
      { method: "GET" },
      { audience: opts?.audience ?? "app" },
    );
  } catch {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  try {
    return (await res.json()) as CurrentUser;
  } catch {
    return null;
  }
}
