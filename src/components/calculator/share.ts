import type { Activity, FriendName, LineItem } from './types'
import { FRIENDS } from './types'

// Share links live in the URL hash, so the payload has to stay small. Instead
// of base64-ing the raw JSON (repeated keys, full friend-name strings, and
// random ids on every record), we first compact each activity into a
// positional tuple: friend names become their FRIENDS index and `id`s are
// dropped entirely (they're regenerated on decode). The compact array is then
// JSON-stringified and base64url-encoded so it stays safe in the hash fragment.

// Compact shapes (kept intentionally terse — order matters):
//   activity: [name, emoji, paidByIdx, modeFlag, partIdxs, flatCost, items]
//   lineItem: [description, cost, assignedToIdxs]
// modeFlag: 0 = flat, 1 = detailed.
type CompactLineItem = [string, number, number[]]
type CompactActivity = [string, string, number, 0 | 1, number[], number, CompactLineItem[]]

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

const friendIdx = (name: FriendName): number => FRIENDS.indexOf(name)
// Round-trip back to a name, ignoring out-of-range indices from bad payloads.
const friendAt = (idx: unknown): FriendName | null =>
  typeof idx === 'number' && idx >= 0 && idx < FRIENDS.length ? FRIENDS[idx] : null

function friendsAt(idxs: unknown): FriendName[] | null {
  if (!Array.isArray(idxs)) return null
  const names: FriendName[] = []
  for (const i of idxs) {
    const name = friendAt(i)
    if (name === null) return null
    names.push(name)
  }
  return names
}

function compactItem(item: LineItem): CompactLineItem {
  return [item.description, item.cost, item.assignedTo.map(friendIdx)]
}

function compactActivity(a: Activity): CompactActivity {
  return [
    a.name,
    a.emoji,
    friendIdx(a.paidBy),
    a.mode === 'detailed' ? 1 : 0,
    a.participants.map(friendIdx),
    a.flatCost,
    a.lineItems.map(compactItem),
  ]
}

function expandItem(raw: unknown): LineItem | null {
  if (!Array.isArray(raw)) return null
  const [description, cost, assignedRaw] = raw
  const assignedTo = friendsAt(assignedRaw)
  if (typeof description !== 'string' || typeof cost !== 'number' || assignedTo === null) return null
  return { id: crypto.randomUUID(), description, cost, assignedTo }
}

function expandActivity(raw: unknown): Activity | null {
  if (!Array.isArray(raw)) return null
  const [name, emoji, paidByRaw, modeFlag, partRaw, flatCost, itemsRaw] = raw
  const paidBy = friendAt(paidByRaw)
  const participants = friendsAt(partRaw)
  if (
    typeof name !== 'string' ||
    typeof emoji !== 'string' ||
    paidBy === null ||
    participants === null ||
    typeof flatCost !== 'number' ||
    !Array.isArray(itemsRaw)
  ) {
    return null
  }
  const lineItems: LineItem[] = []
  for (const itemRaw of itemsRaw) {
    const item = expandItem(itemRaw)
    if (item === null) return null
    lineItems.push(item)
  }
  return {
    id: crypto.randomUUID(),
    name,
    emoji,
    paidBy,
    mode: modeFlag === 1 ? 'detailed' : 'flat',
    participants,
    flatCost,
    lineItems,
  }
}

export function encodeActivities(activities: Activity[]): string {
  const json = JSON.stringify(activities.map(compactActivity))
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeActivities(encoded: string): Activity[] | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded))
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    const activities: Activity[] = []
    for (const raw of parsed) {
      const activity = expandActivity(raw)
      if (activity === null) return null
      activities.push(activity)
    }
    return activities
  } catch {
    return null
  }
}
