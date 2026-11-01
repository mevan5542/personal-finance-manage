import TransactionCharts from "./TransactionCharts";
import { formatMoney } from "../utils/transactions";
export default function OverviewPanel({ data, onTransactions }) {
  const { incomeCents, expenseCents, balanceCents } = data.summary;
  const rate =
    incomeCents > 0 ? ((balanceCents / incomeCents) * 100).toFixed(1) : null;
  const largest = data.breakdown.expense[0];
  return (
    <div className="overview-content">
      <section className="insight-banner">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h2>
            {balanceCents >= 0
              ? "A clearer view of your money."
              : "Your spending is ahead of your income."}
          </h2>
          <p>
            {incomeCents === 0 && expenseCents === 0
              ? "Start with your first transaction. Your overview will grow with your records."
              : `You have recorded ${formatMoney(incomeCents)} in income and ${formatMoney(expenseCents)} in expenses.`}
          </p>
        </div>
        <div className="insight-metric">
          <span>Recorded surplus rate</span>
          <strong>{rate === null ? "—" : `${rate}%`}</strong>
          <small>(Income − expenses) ÷ income</small>
        </div>
      </section>
      <TransactionCharts
        breakdown={data.breakdown}
        scopeLabel="All-time • independent of transaction filters"
      />
      <div className="overview-bottom">
        <section className="preview-card">
          <div className="panel-heading">
            <h2>Latest activity</h2>
            <button
              type="button"
              className="text-button"
              onClick={onTransactions}
            >
              All transactions →
            </button>
          </div>
          {data.transactions.length ? (
            <ul className="activity-list">
              {data.transactions.map((entry) => (
                <li key={entry._id}>
                  <span className={`activity-mark ${entry.type}`}>
                    {entry.type === "income" ? "↙" : "↗"}
                  </span>
                  <div>
                    <strong>{entry.category}</strong>
                    <small>
                      {entry.date} · {entry.description || entry.type}
                    </small>
                  </div>
                  <strong
                    className={
                      entry.type === "income"
                        ? "income-amount"
                        : "expense-amount"
                    }
                  >
                    {entry.type === "income" ? "+" : "−"}
                    {formatMoney(entry.amountCents)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activity yet.</p>
          )}
        </section>
        <section className="preview-card overview-note">
          <span className="eyebrow">SPENDING FOCUS</span>
          <h2>{largest?.category || "Your categories, organised."}</h2>
          <p>
            {largest
              ? `${formatMoney(largest.amountCents)} recorded in your largest expense category.`
              : "Categorise expenses to see where your money goes."}
          </p>
          <p className="muted">
            Use Financial Health to compare a specific month with spending
            limits you set.
          </p>
          <small>
            Figures reflect saved records. Net balance does not include
            unrecorded cash, assets or debts.
          </small>
        </section>
      </div>
    </div>
  );
}
