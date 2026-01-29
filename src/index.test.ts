import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCSRFToken, logout } from "./index";

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
      headers: {
        "X-CSRF-Token": "abc",
      },
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
