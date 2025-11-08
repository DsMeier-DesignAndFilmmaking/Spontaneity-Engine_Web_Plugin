import type { SpontaneousCard, SpontaneousQuery } from "@/lib/fetchSpontaneousData";

export interface FetchSpontaneousClientParams {
  location?: SpontaneousQuery["location"];
  mood?: string;
  radius?: number;
  preferences?: string[];
}

interface SpontaneousResponsePayload {
  cards?: SpontaneousCard[];
  error?: string;
  message?: string;
}

export async function fetchSpontaneousSuggestions(
  params: FetchSpontaneousClientParams,
  requestInit?: RequestInit,
): Promise<SpontaneousCard[]> {
  const response = await fetch("/api/spontaneous/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
    ...requestInit,
  });

  const payload = (await response.json()) as SpontaneousResponsePayload;

  if (!response.ok) {
    const detail = payload.message ?? payload.error ?? response.statusText;
    throw new Error(`Failed to load AI suggestions: ${detail}`);
  }

  const cards = Array.isArray(payload.cards) ? payload.cards : [];
  return cards;
}
