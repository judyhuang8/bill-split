import type { Activity } from './types'
import { FRIENDS } from './types'
import { activityLabel, activityTotal, calcShares, fmt } from './calc'

export default function ActivityCard({
  activity,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  activity: Activity
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const shares = calcShares(activity)
  const total = activityTotal(activity)
  const label = activityLabel(activity)

  return (
    <div className="split-card">
      <div className="split-card-header" onClick={onToggle}>
        <div className="split-card-info">
          <span className="split-card-name">{label}</span>
          <span className="split-card-meta">
            Paid by {activity.paidBy} · ${fmt(total)}
            <span className={`mode-badge ${activity.mode}`}>{activity.mode}</span>
          </span>
        </div>
        <div className="split-card-actions" onClick={e => e.stopPropagation()}>
          <button className="icon-btn" onClick={onEdit} title="Edit">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn danger" onClick={onDelete} title="Delete">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4H13M6 4V2H10V4M5 4V13H11V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="expand-arrow">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="split-card-body">
          {activity.mode === 'flat' ? (
            <>
              {activity.participants.length > 0 && (
                <div className="card-formula">
                  ${fmt(activity.flatCost)} ÷ {activity.participants.length} = ${fmt(activity.flatCost / activity.participants.length)} per person
                </div>
              )}
              {activity.participants.map(p => (
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
                  {activity.lineItems.map(item => (
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
}
