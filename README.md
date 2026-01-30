# @authgate/browser

Minimal browser-side helpers for applications using **AuthGate**.

This package provides **explicit, framework-agnostic primitives** for integrating
browser-based UIs (SSR or SPA) with an AuthGate-backed authentication system.

It intentionally avoids hidden behavior, background state mutation, or
framework-specific abstractions.

---

## Design goals

- Explicit behavior (no magic, no background auth)
- Browser-only responsibility (cookies, CSRF, refresh)
- Framework-agnostic (React, Vue, Svelte, vanilla JS)
- Composable primitives + optional convenience helpers
- Zero dependencies

---

## Features

- Read AuthGate CSRF token from browser cookies
- Perform a CSRF-protected logout request
- Explicit browser-side session refresh
- Optional `fetch` wrapper with **single-retry refresh semantics**
- Clear success / failure signaling
- Optional redirect on logout
- No runtime dependencies

---

## Installation

```bash
npm install @authgate/browser
```

---

## Usage

### Read CSRF token

```ts
import { getCSRFToken } from "@authgate/browser";

const csrf = getCSRFToken();
```

Returns the value of the `authgate_csrf` cookie, or `null` if not present.

This function only **reads** the CSRF token.  
It does not generate or validate it.

---

### Logout

```ts
import { logout } from "@authgate/browser";

const result = await logout();
```

This will:

- Send a `POST /auth/logout` request
- Attach the CSRF token via `X-CSRF-Token`
- Include credentials (`cookies`)

The function returns an explicit result:

```ts
type LogoutResult =
  | { ok: true }
  | { ok: false; reason: "missing_csrf" | "request_failed" | "unauthorized" };
```

Applications that do not need to react programmatically may safely ignore the
return value.

---

### Logout with redirect

```ts
await logout({ redirectTo: "/" });
```

If the logout request succeeds, the browser is redirected to the given path.

Redirecting is an optional side-effect and does **not** define success.

---

## Session refresh (explicit)

### `refreshSession`

```ts
import { refreshSession } from "@authgate/browser";

const refreshed = await refreshSession();
```

Attempts to refresh the current AuthGate session by calling:

```
POST /auth/refresh
```

Behavior:

- Returns `true` if refresh succeeded
- Returns `false` if refresh failed for any reason

This function:

- does **not** retry
- does **not** redirect
- does **not** throw
- does **not** modify application state

It is intended for applications that want **manual control** over refresh logic.

---

## Fetch wrapper (optional convenience)

### `authFetch`

```ts
import { authFetch } from "@authgate/browser";

const res = await authFetch("/api/data");
```

`authFetch` is an **optional convenience wrapper** around `fetch` with
AuthGate-aware refresh behavior.

Behavior:

1. Performs the request with credentials
2. If the response is **not `401`**, returns it directly
3. If the response **is `401`**:
   - Attempts `refreshSession()`
   - If refresh succeeds, retries the original request **once**
   - Otherwise, returns the original `401` response

Important properties:

- At most **one retry**
- No redirects
- No background refresh
- No swallowed failures

Applications remain fully in control of UX decisions.

---

## Example (React / SPA)

```ts
const res = await authFetch("/api/me");

if (res.status === 401) {
  setUser(null);
}
```

---

## Security model

- CSRF tokens are **not generated** by this package
- CSRF validation is **enforced by AuthGate**
- Refresh tokens are **never exposed to JavaScript**
- All authentication state is owned by AuthGate

This package only forwards existing browser state explicitly.

---

## What this package does NOT do

- No authentication logic
- No credential storage
- No background token refresh
- No session management
- No authorization or role handling
- No implicit redirects
- No framework-specific helpers

This package exists solely to reduce boilerplate and prevent integration mistakes
while preserving full application control.

---

## Compatibility

- Works with any backend protected by AuthGate

---

## License
