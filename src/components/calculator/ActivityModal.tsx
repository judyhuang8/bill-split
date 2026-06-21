import { useState, useEffect, useRef } from 'react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import type { Activity, FriendName, LineItem } from './types'
import { FRIENDS } from './types'
import { blankLineItem, fmt } from './calc'

export default function ActivityModal({
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!showEmojiPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

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
          <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
            <button
              className="emoji-trigger"
              type="button"
              onClick={() => setShowEmojiPicker(v => !v)}
            >
              {draft.emoji || '🍕'}
            </button>
            {showEmojiPicker && (
              <div className="emoji-popup">
                <EmojiPicker
                  onEmojiClick={(data: EmojiClickData) => {
                    setDraft(d => ({ ...d, emoji: data.emoji }))
                    setShowEmojiPicker(false)
                  }}
                  searchPlaceholder="Search emoji..."
                  width={300}
                  height={380}
                />
              </div>
            )}
          </div>
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
