// Central place for talking to the Django backend.
//
// Two things this fixes that were previously inconsistent across pages:
// 1. Base URL was hardcoded to http://127.0.0.1:8000 in some files and
//    process.env.NEXT_PUBLIC_API_URL in others. Now everything goes through
//    API_BASE_URL.
// 2. No fetch() call anywhere attached the JWT access token, so once the
//    backend required authentication, every admin/principal/teacher screen
//    would break. authFetch() attaches it automatically.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Wraps fetch() and attaches `Authorization: Bearer <access token>` from
 * localStorage, if one is present. Use this for any endpoint that requires
 * a logged-in user (dashboard stats, approve/reject, teacher details,
 * schools, profile, etc). Public endpoints (login, register, teacher
 * self-application) should keep using plain fetch().
 */
export async function authFetch(path: string, options: RequestInit = {}) {
  const access =
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

  const headers = new Headers(options.headers || {});
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });

  // If the access token expired, try refreshing it once before giving up.
  if (res.status === 401 && typeof window !== "undefined") {
    const refresh = localStorage.getItem("refresh");
    if (refresh) {
      const refreshRes = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const { access: newAccess } = await refreshRes.json();
        localStorage.setItem("access", newAccess);
        headers.set("Authorization", `Bearer ${newAccess}`);
        return fetch(url, { ...options, headers });
      }
      // Refresh failed -- session is over, send the user back to login.
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
    }
  }

  return res;
}
