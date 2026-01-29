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
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
	});

	it("calls logout endpoint with CSRF header", async () => {
		document.cookie = "authgate_csrf=abc";

		await logout();

		expect(fetch).toHaveBeenCalledWith("/auth/logout", {
			method: "POST",
			headers: {
				"X-CSRF-Token": "abc"
			},
			credentials: "include"
		});
	});

	it("redirects if redirectTo is provided", async () => {
		Object.defineProperty(window, "location", {
			value: { href: "" },
			writable: true
		});

		await logout({ redirectTo: "/after" });

		expect(window.location.href).toBe("/after");
	});
});
