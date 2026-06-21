import type { CreditSection } from './types'
import { fmt, summaryTermStr } from './calc'

export default function SummarySection({
  creditSections,
  onCopyText,
}: {
  creditSections: CreditSection[]
  onCopyText: () => void
}) {
  return (
    <div className="summary-section">
      <div className="section-header summary-title">
        <span className="section-title">Summary</span>
        <button className="secondary-btn" onClick={onCopyText}>Copy Activity & Summary To Text</button>
      </div>

      {creditSections.length === 0 ? (
        <div className="card settled-state">✅ Everyone is settled up!</div>
      ) : (
        creditSections.map(({ creditor, rows }) => (
          <div key={creditor} className="card pay-back-block">
            <div className="pay-back-title">💵 Total Pay Back {creditor} 💵</div>
            {rows.map(({ debtor, terms, net }) => {
              const termStr = summaryTermStr(terms)
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
  )
}
