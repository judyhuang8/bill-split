import { useState, useMemo } from 'react'
import './bill-splitter.css'
import type { Activity } from './types'
import { blankActivity, calcSummaryData } from './calc'
import ActivityCard from './ActivityCard'
import SummarySection from './SummarySection'
import ActivityModal from './ActivityModal'

export default function BillSplitter() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [editing, setEditing] = useState<Activity | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const creditSections = useMemo(() => calcSummaryData(activities), [activities])

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
          activities.map(a => (
            <ActivityCard
              key={a.id}
              activity={a}
              expanded={expandedIds.has(a.id)}
              onToggle={() => toggleExpand(a.id)}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteActivity(a.id)}
            />
          ))
        )}

        {activities.length > 0 && <SummarySection creditSections={creditSections} />}
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
