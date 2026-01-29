# @authgate/browser

Minimal browser-side helpers for applications using **AuthGate**.

This package provides small, explicit utilities to integrate browser-based UIs
with an AuthGate-backed authentication flow. It intentionally avoids framework
coupling and hidden behavior.

---

## Features

- Read AuthGate CSRF token from cookies
- Perform a safe logout request with CSRF protection
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

---

### Logout

```ts
import { logout } from "@authgate/browser";

await logout();
```

This will:

- Send a `POST /auth/logout` request
- Attach the CSRF token via `X-CSRF-Token`
- Include credentials (`cookies`)

---

### Logout with redirect

```ts
await logout({ redirectTo: "/" });
```

After a successful logout request, the browser is redirected to the given path.

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
- No redirects except when explicitly requested
- No framework-specific helpers

This package exists solely to reduce boilerplate and prevent integration mistakes.

---

## Compatibility

- Works with any backend protected by AuthGate
- Compatible with SSR and SPA architectures
- Safe to use in multi-app or monorepo setups

---

## License

MIT

