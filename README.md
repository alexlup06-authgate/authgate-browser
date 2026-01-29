# @authgate/browser

Minimal browser-side helpers for applications using **AuthGate**.

This package provides small, explicit utilities to integrate browser-based UIs
with an AuthGate-backed authentication flow. It intentionally avoids framework
coupling and hidden behavior.

---

## Features

- Read AuthGate CSRF token from cookies
- Perform a safe logout request with CSRF protection
- Explicit success/failure signaling
- Optional redirect after logout
- Zero dependencies
- Framework-agnostic (works with React, Vue, vanilla JS, etc.)

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

This function only **reads** the CSRF token. It does not generate or validate it.

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

The function returns a result indicating whether logout succeeded:

```ts
type LogoutResult =
  | { ok: true }
  | { ok: false; reason: "missing_csrf" | "request_failed" | "unauthorized" };
```

Applications that do not need to react programmatically to logout may safely
ignore the return value.

---

### Logout with redirect

```ts
await logout({ redirectTo: "/" });
```

If the logout request succeeds, the browser is redirected to the given path.

Redirecting is an optional side-effect and does **not** define success.
Applications may choose to handle navigation themselves instead.

---

### Example (React / SPA)

```ts
const result = await logout();

if (result.ok) {
  setUser(null);
} else {
  console.error("Logout failed:", result.reason);
}
```

---

## Security Model

- CSRF tokens are **not generated** by this package
- CSRF validation is **enforced by AuthGate**
- This package only forwards existing CSRF state

No cookies are set, modified, or cleared by this library.

---

## What This Package Does NOT Do

- No authentication logic
- No token refresh
- No session management
- No implicit redirects
- No framework-specific helpers

This package exists solely to reduce boilerplate and prevent integration mistakes.

---

## Compatibility

- Works with any backend protected by AuthGate
- Compatible with SSR and SPA architectures

---

## License

MIT

