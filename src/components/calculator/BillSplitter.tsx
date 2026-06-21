import { useState, useMemo, useEffect, useRef } from 'react'
import './bill-splitter.css'

type FriendName = 'Judy' | 'Cheng' | 'Jeffrey' | 'Vicky' | 'Mike' | 'Will'

const FRIENDS: FriendName[] = ['Judy', 'Cheng', 'Jeffrey', 'Vicky', 'Mike', 'Will']

interface LineItem {
  id: string
  description: string
  cost: number
  assignedTo: FriendName[]
}

interface Activity {
  id: string
  name: string
  emoji: string
  paidBy: FriendName
  mode: 'flat' | 'detailed'
  participants: FriendName[]
  flatCost: number
  lineItems: LineItem[]
}

function blankActivity(): Activity {
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

function blankLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', cost: 0, assignedTo: [] }
}

function calcShares(activity: Activity): Partial<Record<FriendName, number>> {
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

function activityTotal(activity: Activity): number {
  if (activity.mode === 'flat') return activity.flatCost
  return activity.lineItems.reduce((s, item) => s + item.cost, 0)
}

function fmt(n: number): string {
  return n.toFixed(2)
}

// ---- Summary data types ----

interface ActivityDebt { activityName: string; amount: number }
interface SummaryTerm  { activityName: string; amount: number; isNegative: boolean }
interface DebtRow      { debtor: FriendName; terms: SummaryTerm[]; net: number }
interface CreditSection { creditor: FriendName; rows: DebtRow[] }
interface ActivityDisplay {
  activity: Activity
  shares: Partial<Record<FriendName, number>>
  total: number
}

function calcSummaryData(activities: Activity[]): {
  activityDisplays: ActivityDisplay[]
  creditSections: CreditSection[]
} {
  const ledger = new Map<FriendName, Map<FriendName, ActivityDebt[]>>()

  function pushDebt(from: FriendName, to: FriendName, activityName: string, amount: number) {
    if (!ledger.has(from)) ledger.set(from, new Map())
    const toMap = ledger.get(from)!
    if (!toMap.has(to)) toMap.set(to, [])
    toMap.get(to)!.push({ activityName, amount })
  }

  const activityDisplays: ActivityDisplay[] = []
  for (const activity of activities) {
    const shares = calcShares(activity)
    const total = activityTotal(activity)
    activityDisplays.push({ activity, shares, total })

    for (const [person, share] of Object.entries(shares) as [FriendName, number][]) {
      if (person === activity.paidBy || share <= 0.005) continue
      pushDebt(person, activity.paidBy, activity.name, share)
    }
  }

  const creditSections: CreditSection[] = []
  for (const creditor of FRIENDS) {
    const rows: DebtRow[] = []
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

  return { activityDisplays, creditSections }
}

// ---- Main component ----

export default function BillSplitter() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [editing, setEditing] = useState<Activity | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { activityDisplays, creditSections } = useMemo(
    () => calcSummaryData(activities),
    [activities]
  )

  function openAdd() {
    setEditing(blankActivity())
  }

  function openEdit(a: Activity) {
    setEditing({
      ...a,
      participants: [...a.participants],
      lineItems: a.lineItems.map(li => ({ ...li, assignedTo: [...li.assignedTo] })),
    })
  }

  function closeModal() {
    setEditing(null)
  }

  function saveActivity(draft: Activity) {
    setActivities(prev => {
      const idx = prev.findIndex(a => a.id === draft.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = draft
        return next
      }
      return [...prev, draft]
    })
    closeModal()
  }

  function deleteActivity(id: string) {
    setActivities(prev => prev.filter(a => a.id !== id))
    setExpandedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="split-page">
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="logo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="white" strokeWidth="1.3"/>
              <path d="M5.5 5.5H10.5M5.5 8H10.5M5.5 10.5H8" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name">Bill Splitter</span>
        </div>
      </nav>

      <div className="container">
        <div className="section-header">
          <span className="section-title">Activities</span>
          <button className="add-btn" onClick={openAdd}>+ Add Activity</button>
        </div>

        {activities.length === 0 ? (
          <div className="empty-state">No activities yet — add one to get started.</div>
        ) : (
          activities.map(a => {
            const shares = calcShares(a)
            const total = activityTotal(a)
            const expanded = expandedIds.has(a.id)
            const label = a.emoji ? `${a.emoji} ${a.name} ${a.emoji}` : a.name

            return (
              <div key={a.id} className="split-card">
                <div className="split-card-header" onClick={() => toggleExpand(a.id)}>
                  <div className="split-card-info">
                    <span className="split-card-name">{label}</span>
                    <span className="split-card-meta">
                      Paid by {a.paidBy} · ${fmt(total)}
                      <span className={`mode-badge ${a.mode}`}>{a.mode}</span>
                    </span>
                  </div>
                  <div className="split-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => openEdit(a)} title="Edit">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="icon-btn danger" onClick={() => deleteActivity(a.id)} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4H13M6 4V2H10V4M5 4V13H11V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="expand-arrow">{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded && (
                  <div className="split-card-body">
                    {a.mode === 'flat' ? (
                      <>
                        {a.participants.length > 0 && (
                          <div className="card-formula">
                            ${fmt(a.flatCost)} ÷ {a.participants.length} = ${fmt(a.flatCost / a.participants.length)} per person
                          </div>
                        )}
                        {a.participants.map(p => (
                          <div key={p} className="person-row">
                            <span className="pr-name">{p}</span>
                            <span className="pr-amount">${fmt(shares[p] ?? 0)}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th className="right">Cost</th>
                              <th>Split Among</th>
                              <th className="right">Each Pays</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.lineItems.map(item => (
                              <tr key={item.id}>
                                <td>{item.description}</td>
                                <td className="right">${fmt(item.cost)}</td>
                                <td>{item.assignedTo.join(', ')}</td>
                                <td className="right">
                                  {item.assignedTo.length > 0
                                    ? `$${fmt(item.cost / item.assignedTo.length)}`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="person-totals-label">Per person totals</div>
                        {FRIENDS.filter(f => (shares[f] ?? 0) > 0).map(f => (
                          <div key={f} className="person-row">
                            <span className="pr-name">{f}</span>
                            <span className="pr-amount">${fmt(shares[f]!)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* ---- Summary ---- */}
        {activities.length > 0 && (
          <div className="summary-section">
            <div className="section-title summary-title">Summary</div>

            {activityDisplays.map(({ activity, shares, total }) => {
              const header = activity.emoji
                ? `${activity.emoji} ${activity.name} ${activity.emoji}`
                : activity.name
              return (
                <div key={activity.id} className="card">
                  <div className="as-header">{header} · ${fmt(total)}</div>
                  <div className="as-payer">{activity.paidBy} Paid</div>
                  {activity.mode === 'flat' && activity.participants.length > 0 && (
                    <div className="as-formula">
                      ${fmt(activity.flatCost)} ÷ {activity.participants.length} = ${fmt(activity.flatCost / activity.participants.length)} per person
                    </div>
                  )}
                  <div className="as-persons">
                    {FRIENDS.filter(f => (shares[f] ?? 0) > 0).map(f => (
                      <span key={f} className="as-person">{f}: ${fmt(shares[f]!)}</span>
                    ))}
                  </div>
                </div>
              )
            })}

            {creditSections.length === 0 ? (
              <div className="card settled-state">✅ Everyone is settled up!</div>
            ) : (
              creditSections.map(({ creditor, rows }) => (
                <div key={creditor} className="card pay-back-block">
                  <div className="pay-back-title">💵 Total Pay Back {creditor} 💵</div>
                  {rows.map(({ debtor, terms, net }) => {
                    const termStr = terms.reduce((str, t, i) => {
                      const part = `${fmt(t.amount)}(${t.activityName.toLowerCase()})`
                      if (i === 0) return part
                      return str + (t.isNegative ? ' - ' : ' + ') + part
                    }, '')
                    return (
                      <div key={debtor} className="debt-row">
                        <span className="debt-checkmark">✅</span>
                        <span className="debt-debtor">{debtor}:</span>
                        <span className="debt-terms">{termStr}</span>
                        <span className="debt-eq">=</span>
                        <span className="debt-amount">${fmt(net)}</span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {editing && (
        <ActivityModal
          initial={editing}
          onSave={saveActivity}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// ---- Modal sub-component ----

function ActivityModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Activity
  onSave: (a: Activity) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Activity>(initial)
  const [newItem, setNewItem] = useState<LineItem>(blankLineItem())
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isEditing = initial.name !== ''

  const isValid =
    draft.name.trim() !== '' &&
    (draft.mode === 'flat'
      ? draft.flatCost > 0 && draft.participants.length > 0
      : draft.lineItems.length > 0)

  function toggleParticipant(name: FriendName) {
    setDraft(d => ({
      ...d,
      participants: d.participants.includes(name)
        ? d.participants.filter(p => p !== name)
        : [...d.participants, name],
    }))
  }

  function toggleNewItemAssignee(name: FriendName) {
    setNewItem(ni => ({
      ...ni,
      assignedTo: ni.assignedTo.includes(name)
        ? ni.assignedTo.filter(p => p !== name)
        : [...ni.assignedTo, name],
    }))
  }

  function addLineItem() {
    if (!newItem.description.trim() || newItem.cost <= 0 || newItem.assignedTo.length === 0) return
    setDraft(d => ({ ...d, lineItems: [...d.lineItems, { ...newItem, id: crypto.randomUUID() }] }))
    setNewItem(blankLineItem())
  }

  function removeLineItem(id: string) {
    setDraft(d => ({ ...d, lineItems: d.lineItems.filter(li => li.id !== id) }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEditing ? 'Edit Activity' : 'Add Activity'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-row">
          <label className="form-label">Emoji</label>
          <input
            className="form-input emoji-input"
            type="text"
            placeholder="🍕"
            value={draft.emoji}
            onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <label className="form-label">Name</label>
          <input
            ref={nameRef}
            className="form-input"
            type="text"
            placeholder="Activity name"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <label className="form-label">Paid By</label>
          <select
            className="form-input form-select"
            value={draft.paidBy}
            onChange={e => setDraft(d => ({ ...d, paidBy: e.target.value as FriendName }))}
          >
            {FRIENDS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Type</label>
          <div className="mode-toggle">
            <button
              className={`mode-btn${draft.mode === 'flat' ? ' active' : ''}`}
              onClick={() => setDraft(d => ({ ...d, mode: 'flat' }))}
              type="button"
            >
              Flat Cost
            </button>
            <button
              className={`mode-btn${draft.mode === 'detailed' ? ' active' : ''}`}
              onClick={() => setDraft(d => ({ ...d, mode: 'detailed' }))}
              type="button"
            >
              Detailed
            </button>
          </div>
        </div>

        {draft.mode === 'flat' ? (
          <>
            <div className="form-row">
              <label className="form-label">Total Cost</label>
              <input
                className="form-input cost-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={draft.flatCost || ''}
                onChange={e => setDraft(d => ({ ...d, flatCost: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="form-row align-start">
              <label className="form-label">Participants</label>
              <div className="friend-chips">
                {FRIENDS.map(f => (
                  <button
                    key={f}
                    className={`friend-chip${draft.participants.includes(f) ? ' active' : ''}`}
                    onClick={() => toggleParticipant(f)}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="line-items-section">
            <div className="line-items-label">Line Items</div>

            {draft.lineItems.length > 0 && (
              <table className="modal-items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Cost</th>
                    <th>Split Among</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lineItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>${fmt(item.cost)}</td>
                      <td>{item.assignedTo.join(', ')}</td>
                      <td>
                        <button className="remove-item-btn" onClick={() => removeLineItem(item.id)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="add-item-section">
              <div className="add-item-label">Add Item</div>
              <div className="add-item-inputs">
                <input
                  className="form-input item-desc-input"
                  type="text"
                  placeholder="Description"
                  value={newItem.description}
                  onChange={e => setNewItem(ni => ({ ...ni, description: e.target.value }))}
                />
                <input
                  className="form-input cost-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.cost || ''}
                  onChange={e => setNewItem(ni => ({ ...ni, cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-row align-start" style={{ marginBottom: 0 }}>
                <label className="form-label">Assigned To</label>
                <div className="friend-chips">
                  {FRIENDS.map(f => (
                    <button
                      key={f}
                      className={`friend-chip${newItem.assignedTo.includes(f) ? ' active' : ''}`}
                      onClick={() => toggleNewItemAssignee(f)}
                      type="button"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="add-item-btn"
                onClick={addLineItem}
                disabled={!newItem.description.trim() || newItem.cost <= 0 || newItem.assignedTo.length === 0}
                type="button"
              >
                + Add Item
              </button>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} type="button">Cancel</button>
          <button
            className="btn-save"
            onClick={() => onSave(draft)}
            disabled={!isValid}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
