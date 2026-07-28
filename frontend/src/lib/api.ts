import { Hotel, SearchResponse } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_STAYZ_API_URL ?? "https://stayz-api.onrender.com/api";

type ApiEnvelope<T> = { metaData: T };

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as ApiEnvelope<T>;
    return body.metaData;
  } catch {
    return null;
  }
}

export function resolveImage(path?: string) {
  if (!path) return "/hotel-placeholder.svg";
  if (/^https?:\/\//.test(path)) return path;
  const origin = new URL(API_URL).origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getFeaturedHotels() {
  return (await apiGet<Hotel[]>("/properties/featured")) ?? [];
}

export async function searchHotels(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const result = await apiGet<Hotel[] | SearchResponse>(`/properties/search?${query}`);
  if (Array.isArray(result)) return result;
  return result?.items ?? result?.data ?? result?.properties ?? [];
}

export async function getHotel(city: string, slug: string) {
  return apiGet<Hotel>(`/properties/${encodeURIComponent(city)}/${encodeURIComponent(slug)}`);
}
