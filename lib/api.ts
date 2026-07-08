import Cookies from "js-cookie";

// Central place for talking to the Django backend.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Retrieve the access token from secure cookies.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("access_token") || null;
}

/**
 * Retrieve the refresh token from secure cookies.
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("refresh_token") || null;
}

/**
 * Store access and refresh tokens in secure cookies.
 */
export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  // secure: true ensures tokens are only transmitted over HTTPS
  // sameSite: "strict" protects against CSRF attacks
  Cookies.set("access_token", access, { secure: true, sameSite: "strict" });
  Cookies.set("refresh_token", refresh, { secure: true, sameSite: "strict" });
}

/**
 * Clear tokens from secure cookies.
 */
export function clearTokens() {
  if (typeof window === "undefined") return;
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

/**
 * Wraps fetch() and attaches `Authorization: Bearer <access token>` from
 * secure cookies, if one is present. Use this for any endpoint that requires
 * a logged-in user (dashboard stats, approve/reject, teacher details,
 * schools, profile, etc). Public endpoints (login, register, teacher
 * self-application) should keep using plain fetch().
 */
export async function authFetch(path: string, options: RequestInit = {}) {
  const access = getAccessToken();

  const headers = new Headers(options.headers || {});
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });

  // If the access token expired, try refreshing it once before giving up.
  if (res.status === 401 && typeof window !== "undefined") {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshRes = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const { access: newAccess } = await refreshRes.json();
        // Since we refresh, update the access token cookie
        Cookies.set("access_token", newAccess, { secure: true, sameSite: "strict" });
        headers.set("Authorization", `Bearer ${newAccess}`);
        return fetch(url, { ...options, headers });
      }
      // Refresh failed -- session is over, send the user back to login.
      clearTokens();
      localStorage.removeItem("teacher_name");
      window.location.href = "/login";
    }
  }

  return res;
}
