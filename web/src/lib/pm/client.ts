function getPmUrl() {
  // Inside Docker: PM_INTERNAL_URL=http://pm:8000
  // Local dev / browser fallback: NEXT_PUBLIC_PM_URL=http://localhost:8001
  return process.env.PM_INTERNAL_URL ?? process.env.NEXT_PUBLIC_PM_URL ?? 'http://localhost:8001'
}

export async function pmFetch<T = unknown>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${getPmUrl()}/api/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PM API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}
