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
 * authFetch performs a fetch request with AuthGate-aware refresh-once behavior.
 *
 * Behavior:
 * - Always includes credentials
 * - If the response is NOT 401 - returns it directly
 * - If the response IS 401:
 *   - Attempts POST /auth/refresh with CSRF
 *   - If refresh succeeds - retries original request ONCE
 *   - Otherwise - returns original 401 response
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(input, withCredentials(init));

  if (res.status !== 401) {
    return res;
  }

  const refreshed = await refreshSession();
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
 * refreshSession attempts to refresh the current AuthGate session.
 *
 * It performs:
 *   POST /auth/refresh
 *   with CSRF protection and credentials
 *
 * The function:
 * - returns true if refresh succeeded
 * - returns false if refresh failed for any reason
 */
export async function refreshSession(): Promise<boolean> {
  const csrf = getCSRFToken();
  if (!csrf) {
    return false;
  }

  let res: Response;

  try {
    res = await fetch("/auth/refresh", {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrf,
      },
      credentials: "include",
    });
  } catch {
    return false;
  }

  return res.ok;
}
