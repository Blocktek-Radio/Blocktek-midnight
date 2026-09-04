export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") || null

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL || ""}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(process.env.NODE_ENV !== "production" ? { "x-blocktek-actor": "browser-demo-contributor", "x-blocktek-role": "CONTRIBUTOR" } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new Error(body?.message || `API request failed (${response.status})`) }
  return response.json() as Promise<T>
}
