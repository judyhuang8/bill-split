import { useState, useEffect } from 'react'

export default function TextExportModal({
  text,
  onClose,
}: {
  text: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Text Export</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <textarea className="export-textarea" readOnly value={text} onFocus={e => e.currentTarget.select()} />

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-save" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>
    </div>
  )
}
