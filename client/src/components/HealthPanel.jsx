import { useRef, useState } from "react";
import { useRemoteData } from "../hooks/useRemoteData";
import { api, jsonBody } from "../utils/api";
import { categories, formatMoney, today } from "../utils/transactions";
export default function HealthPanel({
  version,
  onDataChanged,
  onSessionExpired,
}) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [category, setCategory] = useState("Overall");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const result = useRemoteData(
    `/budgets?month=${encodeURIComponent(month)}`,
    version,
    onSessionExpired,
  );
  const data = result.data;
  function fail(e) {
    if (e.status === 401) onSessionExpired();
    else setError(e.message);
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/budgets", jsonBody("PUT", { month, category, amount }));
      setNotice("Budget saved for this month.");
      setAmount("");
      onDataChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove(budget) {
    if (
      !window.confirm(
        `Remove the ${budget.category} budget for ${month}? Your transactions will stay saved.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/budgets/${budget._id}`, { method: "DELETE" });
      setNotice("Budget removed.");
      onDataChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="health-panel">
      <div className="section-toolbar">
        <p className="muted">
          A monthly view of what comes in, what goes out and the limits you set.
        </p>
        <label>
          Month
          <input
            aria-label="Financial health month"
            type="month"
            value={month}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setNotice("");
                setAmount("");
              }
            }}
          />
        </label>
      </div>
      {result.loading && <p role="status">Loading your monthly picture...</p>}
      {(error || result.error) && (
        <div role="alert" className="form-notice">
          {error || result.error}
          {result.error && (
            <button
              type="button"
              className="text-button"
              onClick={onDataChanged}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <p role="status">{notice}</p>
      {data && (
        <>
          <div className="month-metrics">
            <article className="preview-card">
              <span>Monthly income</span>
              <strong>{formatMoney(data.summary.incomeCents)}</strong>
            </article>
            <article className="preview-card">
              <span>Monthly expenses</span>
              <strong>{formatMoney(data.summary.expenseCents)}</strong>
            </article>
            <article className="preview-card">
              <span>Monthly net</span>
              <strong>{formatMoney(data.summary.balanceCents)}</strong>
            </article>
          </div>
          <section
            className={`health-message ${data.summary.balanceCents < 0 ? "attention" : ""}`}
          >
            <h2>
              {data.summary.incomeCents === 0 && data.summary.expenseCents === 0
                ? "No records for this month yet."
                : data.summary.balanceCents < 0
                  ? "Expenses exceed recorded income."
                  : "Your recorded income covers this month’s expenses."}
            </h2>
            <p>
              {data.summary.incomeCents > 0
                ? `${((data.summary.expenseCents / data.summary.incomeCents) * 100).toFixed(1)}% of your recorded income has been spent.`
                : "Record your income to calculate the spending-to-income ratio."}
            </p>
          </section>
          <div className="health-layout">
            <section className="preview-card" ref={formRef}>
              <h2>Set a spending limit</h2>
              <p className="muted">
                Choose Overall for a monthly limit, or set a limit for a
                category. Saving the same category updates its limit.
              </p>
              <form onSubmit={save}>
                <fieldset
                  className="transaction-fields"
                  disabled={busy || result.loading}
                >
                  <label htmlFor="budget-category">Budget category</label>
                  <select
                    id="budget-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Overall">Overall monthly spending</option>
                    {categories.expense.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <label htmlFor="budget-amount">Limit (LKR)</label>
                  <input
                    id="budget-amount"
                    type="number"
                    min="0.01"
                    max="999999999.99"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000.00"
                  />
                  <button className="button button-primary" type="submit">
                    {busy ? "Saving..." : `Save budget for ${month}`}
                  </button>
                </fieldset>
              </form>
            </section>
            <section>
              <div className="panel-heading">
                <h2>Your budgets</h2>
                <span className="pill">{data.budgets.length} limits</span>
              </div>
              {!data.budgets.length && (
                <div className="empty-card">
                  <h3>Give your month a plan.</h3>
                  <p>
                    Create an overall spending limit to track how much is left.
                  </p>
                </div>
              )}
              <div className="budget-grid">
                {data.budgets.map((budget) => {
                  const percentage =
                    (budget.spentCents / budget.limitCents) * 100;
                  const left = budget.limitCents - budget.spentCents;
                  return (
                    <article
                      className={`preview-card budget-card ${left < 0 ? "over-budget" : ""}`}
                      key={budget._id}
                    >
                      <div className="panel-heading">
                        <h3>
                          {budget.category === "Overall"
                            ? "Overall spending"
                            : budget.category}
                        </h3>
                        <span className="pill">
                          {left < 0
                            ? "Over limit"
                            : percentage >= 80
                              ? "Near limit"
                              : "Within limit"}
                        </span>
                      </div>
                      <strong>{formatMoney(budget.spentCents)}</strong>
                      <span className="muted">
                        {" "}
                        of {formatMoney(budget.limitCents)}
                      </span>
                      <progress
                        max="100"
                        value={Math.min(100, percentage)}
                        aria-label={`${budget.category}: ${percentage.toFixed(1)} percent used`}
                      />
                      <p>
                        {formatMoney(Math.abs(left))}{" "}
                        {left < 0 ? "over budget" : "remaining"} ·{" "}
                        {percentage.toFixed(1)}% used
                      </p>
                      <div className="record-buttons">
                        <button
                          className="text-button"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setCategory(budget.category);
                            setAmount((budget.limitCents / 100).toFixed(2));
                            formRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                        >
                          Adjust
                        </button>
                        <button
                          className="delete-button"
                          type="button"
                          disabled={busy}
                          onClick={() => remove(budget)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
          <p className="muted small-note">
            Overall and category budgets overlap; their limits are not added
            together. This view describes your saved records and chosen limits.
          </p>
        </>
      )}
    </div>
  );
}
