import type { Activity } from './types'

// Activity names/emoji are non-ASCII, so we round-trip through UTF-8 bytes
// before base64 (plain btoa throws on characters > U+00FF). The result is
// also made URL-safe so it can live in the link's hash fragment.

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeActivities(activities: Activity[]): string {
  const json = JSON.stringify(activities)
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeActivities(encoded: string): Activity[] | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded))
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as Activity[]) : null
  } catch {
    return null
  }
}
