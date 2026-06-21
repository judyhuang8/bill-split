import type { CreditSection } from './types'
import { fmt } from './calc'

export default function SummarySection({
  creditSections,
}: {
  creditSections: CreditSection[]
}) {
  return (
    <div className="summary-section">
      <div className="section-title summary-title">Summary</div>

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
  )
}
