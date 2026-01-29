function getCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function getCSRFToken(): string | null {
  return getCookie("authgate_csrf");
}

export async function logout(opts?: { redirectTo?: string }) {
  const csrf = getCSRFToken();

  await fetch("/auth/logout", {
    method: "POST",
    headers: {
      "X-CSRF-Token": csrf ?? "",
    },
    credentials: "include",
  });

  if (opts?.redirectTo !== undefined) {
    window.location.href = opts.redirectTo;
  }
}
