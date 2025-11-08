import { auth } from "@/lib/firebase";

const TOKEN_STORAGE_KEYS = ["access_token", "id_token", "token"] as const;

export class FetchWithAuthError extends Error {
  status?: number;
  payload?: unknown;
  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = "FetchWithAuthError";
    this.status = status;
    this.payload = payload;
  }
}

function readTokenFromStorage(storage: Storage | undefined): string | null {
  if (!storage) return null;
  try {
    for (const key of TOKEN_STORAGE_KEYS) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  } catch (error) {
    console.warn("[fetchWithAuth] Unable to access storage", error);
  }
  return null;
}

function readTokenFromCookies(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie?.split(";") ?? [];
    for (const cookie of cookies) {
      const [rawKey, rawValue] = cookie.split("=");
      if (!rawKey || !rawValue) continue;
      const key = rawKey.trim();
      if (TOKEN_STORAGE_KEYS.includes(key as (typeof TOKEN_STORAGE_KEYS)[number])) {
        return decodeURIComponent(rawValue.trim());
      }
    }
  } catch (error) {
    console.warn("[fetchWithAuth] Unable to read cookies", error);
  }
  return null;
}

async function resolveToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const fromLocal = readTokenFromStorage(window.localStorage);
  if (fromLocal) return fromLocal;

  const fromSession = readTokenFromStorage(window.sessionStorage);
  if (fromSession) return fromSession;

  const fromCookies = readTokenFromCookies();
  if (fromCookies) return fromCookies;

  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.warn("[fetchWithAuth] Unable to obtain Firebase ID token", error);
    return null;
  }
}

function ensureJsonHeaders(headers: Headers) {
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  if (!isJson) {
    const text = await response.text();
    return text as unknown as T;
  }
  return (await response.json()) as T;
}

export default async function fetchWithAuth<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  ensureJsonHeaders(headers);

  const token = await resolveToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(input, requestInit);
    const payload = await parseResponse<T>(response);

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && "error" in payload
          ? (payload as Record<string, unknown>).error
          : undefined) || response.statusText || "Request failed";
      throw new FetchWithAuthError(String(message), response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error instanceof FetchWithAuthError) {
      throw error;
    }
    console.error("[fetchWithAuth] Unexpected error", error);
    throw new FetchWithAuthError("Unexpected request error", undefined, error);
  }
}
