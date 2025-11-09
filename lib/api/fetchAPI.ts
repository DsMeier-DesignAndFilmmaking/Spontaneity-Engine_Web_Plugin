import { auth } from "@/lib/firebase";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function resolveUrl(pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  if (typeof window !== "undefined") {
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }

  const baseEnv = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const vercelHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const base = baseEnv ?? vercelHost ?? "http://localhost:3000";
  return new URL(pathname, base).toString();
}

async function getAuthToken(): Promise<string | undefined> {
  try {
    if (typeof window === "undefined") {
      return undefined;
    }

    const user = auth.currentUser;
    if (!user) {
      return undefined;
    }

    return await user.getIdToken();
  } catch (error) {
    console.warn("[fetchAPI] Unable to resolve auth token", error);
    return undefined;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text as unknown as T;
  }

  return (await response.json()) as T;
}

export async function fetchAPI<T>(
  pathname: string,
  method: HttpMethod = "GET",
  body?: unknown,
  includeAuth = true,
): Promise<T> {
  const url = resolveUrl(pathname);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let errorPayload: string | undefined;
    try {
      errorPayload = await response.text();
    } catch (error) {
      console.warn("[fetchAPI] Failed to read error payload", error);
    }
    console.error("API call failed:", url, errorPayload ?? response.statusText);
    throw new Error(`API request failed with status ${response.status}`);
  }

  return parseJson<T>(response);
}

export { getAuthToken };
