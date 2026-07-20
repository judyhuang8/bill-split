import type { Activity, CreditSection, FriendName, LineItem, SummaryTerm } from './types'
import { FRIENDS } from './types'

export function blankActivity(): Activity {
  return {
    id: crypto.randomUUID(),
    name: '',
    emoji: '',
    paidBy: 'Judy',
    mode: 'flat',
    participants: [...FRIENDS],
    flatCost: 0,
    lineItems: [],
  }
}

export function blankLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', cost: 0, assignedTo: [] }
}

export function calcShares(activity: Activity): Partial<Record<FriendName, number>> {
  const shares: Partial<Record<FriendName, number>> = {}
  if (activity.mode === 'flat') {
    if (activity.participants.length === 0) return shares
    const share = activity.flatCost / activity.participants.length
    for (const p of activity.participants) shares[p] = share
  } else {
    for (const item of activity.lineItems) {
      if (item.assignedTo.length === 0) continue
      const share = item.cost / item.assignedTo.length
      for (const p of item.assignedTo) shares[p] = (shares[p] ?? 0) + share
    }
  }
  return shares
}

export function activityTotal(activity: Activity): number {
  if (activity.mode === 'flat') return activity.flatCost
  return activity.lineItems.reduce((s, item) => s + item.cost, 0)
}

export function fmt(n: number): string {
  return n.toFixed(2)
}

export function activityLabel(activity: Activity): string {
  return activity.emoji
    ? `${activity.emoji} ${activity.name} ${activity.emoji}`
    : activity.name
}

interface ActivityDebt { activityName: string; amount: number }

export function calcSummaryData(activities: Activity[]): CreditSection[] {
  const ledger = new Map<FriendName, Map<FriendName, ActivityDebt[]>>()

  function pushDebt(from: FriendName, to: FriendName, activityName: string, amount: number) {
    if (!ledger.has(from)) ledger.set(from, new Map())
    const toMap = ledger.get(from)!
    if (!toMap.has(to)) toMap.set(to, [])
    toMap.get(to)!.push({ activityName, amount })
  }

  for (const activity of activities) {
    const shares = calcShares(activity)

    if (activity.mode === 'flat') {
      for (const [person, share] of Object.entries(shares) as [FriendName, number][]) {
        if (person === activity.paidBy || share <= 0.005) continue
        pushDebt(person, activity.paidBy, activity.name, share)
      }
    } else {
      for (const item of activity.lineItems) {
        if (item.assignedTo.length === 0) continue
        const perPerson = item.cost / item.assignedTo.length
        if (perPerson <= 0.005) continue
        for (const person of item.assignedTo) {
          if (person === activity.paidBy) continue
          pushDebt(person, activity.paidBy, item.description, perPerson)
        }
      }
    }
  }

  const creditSections: CreditSection[] = []
  for (const creditor of FRIENDS) {
    const rows: CreditSection['rows'] = []
    for (const debtor of FRIENDS) {
      if (debtor === creditor) continue
      const d2c = ledger.get(debtor)?.get(creditor) ?? []
      const c2d = ledger.get(creditor)?.get(debtor) ?? []
      const net =
        d2c.reduce((s, d) => s + d.amount, 0) -
        c2d.reduce((s, d) => s + d.amount, 0)
      if (net > 0.005) {
        rows.push({
          debtor,
          terms: [
            ...d2c.map(d => ({ activityName: d.activityName, amount: d.amount, isNegative: false })),
            ...c2d.map(d => ({ activityName: d.activityName, amount: d.amount, isNegative: true })),
          ],
          net,
        })
      }
    }
    if (rows.length > 0) creditSections.push({ creditor, rows })
  }

  return creditSections
}

// ---- Text export ----

export function summaryTermStr(terms: SummaryTerm[]): string {
  return terms.reduce((str, t, i) => {
    const part = `${fmt(t.amount)}(${t.activityName.toLowerCase()})`
    if (i === 0) return part
    return str + (t.isNegative ? ' - ' : ' + ') + part
  }, '')
}

export function formatTextDump(activities: Activity[], creditSections: CreditSection[]): string {
  const blocks: string[] = []

  for (const activity of activities) {
    const total = activityTotal(activity)
    const shares = calcShares(activity)
    const e = activity.emoji
    const header = e
      ? `**${e} ${activity.name} Total: $${fmt(total)} ${e}**`
      : `**${activity.name} Total: $${fmt(total)}**`

    const lines = [header, `*${activity.paidBy} Paid*`]

    if (activity.mode === 'flat') {
      const n = activity.participants.length
      if (n > 1) {
        lines.push(`${fmt(activity.flatCost)}/${n} = $${fmt(activity.flatCost / n)} per person`)
      }
      for (const p of activity.participants) {
        lines.push(`> ${p}: **$${fmt(shares[p] ?? 0)}**`)
      }
    } else {
      for (const f of FRIENDS.filter(f => (shares[f] ?? 0) > 0)) {
        const terms = activity.lineItems
          .filter(item => item.assignedTo.includes(f) && item.assignedTo.length > 0)
          .map(item => fmt(item.cost / item.assignedTo.length))
        const amount = `**$${fmt(shares[f]!)}**`
        lines.push(
          terms.length > 1
            ? `> ${f}: ${terms.join('+')}=${amount}`
            : `> ${f}: ${amount}`
        )
      }
    }

    blocks.push(lines.join('\n'))
  }

  if (creditSections.length === 0) {
    blocks.push('🔴 Everyone is settled up!')
  } else {
    for (const { creditor, rows } of creditSections) {
      const lines = [`**💵 Total Pay Back ${creditor} 💵**`]
      for (const { debtor, terms, net } of rows) {
        lines.push(`> 🔴 ${debtor}: ${summaryTermStr(terms)} = **$${fmt(net)}**`)
      }
      blocks.push(lines.join('\n'))
    }
  }

  return blocks.join('\n\n')
}
