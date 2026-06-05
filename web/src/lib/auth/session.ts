import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'pm_token'

export function getToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value
}
