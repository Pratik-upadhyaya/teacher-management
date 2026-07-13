import Cookies from "js-cookie";

// Central place for talking to the Django backend.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * `secure: true` cookies are silently NOT set at all on plain HTTP (only
 * localhost gets a browser exception). If the deployed demo environment
 * isn't on HTTPS yet, hardcoding `secure: true` would make login look like
 * it succeeds but never actually persist a token. This adapts instead of
 * assuming.
 */
function cookieOptions() {
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return { secure: isHttps, sameSite: "strict" as const };
}

/**
 * Retrieve the access token from cookies.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("access_token") || null;
}

/**
 * Retrieve the refresh token from cookies.
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("refresh_token") || null;
}

/**
 * Store access and refresh tokens in cookies.
 */
export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  Cookies.set("access_token", access, cookieOptions());
  Cookies.set("refresh_token", refresh, cookieOptions());
}

/**
 * Clear tokens from cookies.
 */
export function clearTokens() {
  if (typeof window === "undefined") return;
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

/**
 * Wraps fetch() and attaches `Authorization: Bearer <access token>` from
 * cookies, if one is present. Use this for any endpoint that requires
 * a logged-in user (dashboard stats, approve/reject, teacher details,
 * schools, profile, etc). Public endpoints (login, register, teacher
 * self-application) should keep using plain fetch().
 */
/**
 * Fetches a protected /media/ file (citizenship, degree, etc.) through
 * authFetch and returns a local blob: URL suitable for an <img>/<iframe>
 * src or a download link. Plain <img src="..."> can't attach the
 * Authorization header the backend's serve_document view now requires, so
 * every document preview/download must go through this instead of using
 * the API path directly. Caller is responsible for calling
 * URL.revokeObjectURL() on the result once it's no longer displayed.
 */
export async function fetchDocumentBlobUrl(path: string): Promise<string> {
  const res = await authFetch(path);
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? "You don't have permission to view this document."
        : "Could not load this document."
    );
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

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
        Cookies.set("access_token", newAccess, cookieOptions());
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