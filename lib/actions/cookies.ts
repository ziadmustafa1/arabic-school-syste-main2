'use server'

import { cookies } from 'next/headers'

export async function setCookie(name: string, value: string, options?: {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}) {
  cookies().set(name, value, options)
}

export async function deleteCookie(name: string) {
  cookies().delete(name)
}

export async function clearCookies() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  allCookies.forEach(cookie => {
    cookieStore.delete(cookie.name)
  })
} 