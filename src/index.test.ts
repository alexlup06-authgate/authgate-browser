import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCSRFToken, logout, refreshSession, authFetch } from "./index";

/* -------------------- getCSRFToken -------------------- */

describe("getCSRFToken", () => {
  beforeEach(() => {
    document.cookie = "authgate_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("returns csrf token if present", () => {
    document.cookie = "authgate_csrf=token123";
    expect(getCSRFToken()).toBe("token123");
  });

  it("returns null if csrf token is missing", () => {
    expect(getCSRFToken()).toBeNull();
  });
});

/* -------------------- logout -------------------- */

describe("logout", () => {
  beforeEach(() => {
    document.cookie = "authgate_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response),
    );
  });

  it("returns failure if CSRF token is missing", async () => {
    const result = await logout();
    expect(result).toEqual({ ok: false, reason: "missing_csrf" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls logout endpoint with CSRF header", async () => {
    document.cookie = "authgate_csrf=abc";

    const result = await logout();

    expect(fetch).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": "abc" },
      credentials: "include",
    });

    expect(result).toEqual({ ok: true });
  });

  it("redirects if redirectTo is provided and logout succeeds", async () => {
    document.cookie = "authgate_csrf=abc";

    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    const result = await logout({ redirectTo: "/after" });

    expect(result).toEqual({ ok: true });
    expect(window.location.href).toBe("/after");
  });

  it("returns unauthorized on 401 response", async () => {
    document.cookie = "authgate_csrf=abc";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response),
    );

    const result = await logout();

    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });
});

/* -------------------- refreshSession -------------------- */

describe("refreshSession", () => {
  beforeEach(() => {
    document.cookie = "authgate_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns false if CSRF token is missing", async () => {
    const ok = await refreshSession("app");
    expect(ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns true on successful refresh (default audience)", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const ok = await refreshSession("app");

    expect(fetch).toHaveBeenCalledWith("/auth/refresh?audience=app", {
      method: "POST",
      headers: { "X-CSRF-Token": "abc" },
      credentials: "include",
    });

    expect(ok).toBe(true);
  });

  it("returns true on successful refresh (admin audience)", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const ok = await refreshSession("admin");

    expect(fetch).toHaveBeenCalledWith("/auth/refresh?audience=admin", {
      method: "POST",
      headers: { "X-CSRF-Token": "abc" },
      credentials: "include",
    });

    expect(ok).toBe(true);
  });

  it("returns false on failed refresh", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const ok = await refreshSession("app");
    expect(ok).toBe(false);
  });
});

/* -------------------- authFetch -------------------- */

describe("authFetch", () => {
  beforeEach(() => {
    document.cookie = "authgate_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns response if request succeeds", async () => {
    (fetch as any).mockResolvedValue({
      status: 200,
    } as Response);

    const res = await authFetch("/api/data");

    expect(fetch).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("returns 401 if refresh fails (default audience)", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any)
      // initial request
      .mockResolvedValueOnce({ status: 401 } as Response)
      // refresh
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const res = await authFetch("/api/data");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh?audience=app",
      expect.any(Object),
    );
    expect(res.status).toBe(401);
  });

  it("retries request once if refresh succeeds (default audience)", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any)
      // initial request
      .mockResolvedValueOnce({ status: 401 } as Response)
      // refresh
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      // retry
      .mockResolvedValueOnce({ status: 200 } as Response);

    const res = await authFetch("/api/data");

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
  });

  it("refreshes with explicit admin audience", async () => {
    document.cookie = "authgate_csrf=abc";

    (fetch as any)
      .mockResolvedValueOnce({ status: 401 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ status: 200 } as Response);

    const res = await authFetch("/admin/api/users", {}, { audience: "admin" });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh?audience=admin",
      expect.any(Object),
    );
    expect(res.status).toBe(200);
  });
});
