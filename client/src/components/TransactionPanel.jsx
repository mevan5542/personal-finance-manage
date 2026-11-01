import { useEffect, useRef, useState } from "react";
import TransactionFilters from "./TransactionFilters";
import TransactionDetails from "./TransactionDetails";
import {
  categories,
  defaultFilters,
  formatMoney,
  today,
  transactionRequest,
} from "../utils/transactions";

function filterDescription(query) {
  const parts = [];
  if (query.q) parts.push(`Search: ${query.q}`);
  if (query.type)
    parts.push(query.type === "income" ? "Income only" : "Expenses only");
  if (query.category) parts.push(query.category);
  if (query.from || query.to)
    parts.push(`${query.from || "Earliest"} to ${query.to || "Latest"}`);
  return parts.length ? parts.join(" · ") : "All recorded transactions";
}

export default function TransactionPanel({
  onSessionExpired,
  onDataChanged,
  externalVersion = 0,
}) {
  const [query, setQuery] = useState({ ...defaultFilters, page: 1 });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [type, setType] = useState("expense");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Pair a response with its query so an older response cannot label a newer view.
  const requestKey = JSON.stringify({ query, refreshVersion, externalVersion });
  const data = result?.key === requestKey ? result.data : null;
  const loadFailed = loadError?.key === requestKey;
  const loading = !data && !loadFailed;
  const mutating = saving || deletingId !== null;
  const busy = mutating || loading || loadFailed;
  const scopeLabel = filterDescription(query);
  const isFiltered = Boolean(
    query.q || query.type || query.category || query.from || query.to,
  );

  useEffect(() => {
    const controller = new AbortController();
    const requestedQuery = JSON.parse(requestKey).query;
    transactionRequest({ signal: controller.signal }, "", requestedQuery)
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, data: response });
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (requestError.status === 401) onSessionExpired();
        else setLoadError({ key: requestKey, message: requestError.message });
      });
    return () => controller.abort();
  }, [requestKey, onSessionExpired]);

  function resetEditor() {
    setEditing(null);
    setType("expense");
    setFormVersion((version) => version + 1);
  }

  function startEdit(transaction) {
    if (busy) return;
    setEditing(transaction);
    setType(transaction.type);
    setFormVersion((version) => version + 1);
    setError("");
    setMessage(
      "Editing the selected transaction. Save or cancel before changing filters or pages.",
    );
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector("select")?.focus({ preventScroll: true });
  }

  function reportError(requestError) {
    if (requestError.status === 401) onSessionExpired();
    else setError(requestError.message);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await transactionRequest(
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            amount: fields.get("amount"),
            category: fields.get("category"),
            description: fields.get("description"),
            date: fields.get("date"),
          }),
        },
        editing?._id || "",
      );
      resetEditor();
      setMessage(
        (editing ? "Transaction updated." : "Transaction saved.") +
          " The current filters and page determine where it appears in the list.",
      );
      setRefreshVersion((version) => version + 1);
      onDataChanged?.();
    } catch (requestError) {
      reportError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction) {
    if (busy) return;
    if (
      !window.confirm(
        `Delete this ${transaction.type} of ${formatMoney(transaction.amountCents)} ` +
          `for ${transaction.category} on ${transaction.date}?\n\nThis permanently removes the record and any attached bill or slip.`,
      )
    )
      return;
    setDeletingId(transaction._id);
    setMessage("");
    setError("");
    try {
      await transactionRequest({ method: "DELETE" }, transaction._id);
      if (editing?._id === transaction._id) resetEditor();
      setMessage("Transaction deleted.");
      setRefreshVersion((version) => version + 1);
      onDataChanged?.();
    } catch (requestError) {
      reportError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  function applyFilters(filters) {
    setQuery({ ...filters, page: 1 });
    setRefreshVersion((version) => version + 1);
    setError("");
    setMessage("");
  }

  function goToPage(page) {
    setQuery((current) => ({ ...current, page }));
    setError("");
    setMessage("");
  }

  return (
    <section className="section transaction-section">
      <TransactionFilters
        onApply={applyFilters}
        disabled={mutating || loading || Boolean(editing)}
      />
      <p role="status">{message}</p>
      {error && (
        <p className="form-notice" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading transactions...</p>}
      {loadFailed && (
        <div role="alert" className="form-notice">
          <p>Could not refresh the view: {loadError.message}</p>
          <p>
            Any save or delete already confirmed above remains completed. Retry
            loading the view.
          </p>
          <button
            className="button button-outline"
            type="button"
            onClick={() => setRefreshVersion((v) => v + 1)}
          >
            Retry loading
          </button>
        </div>
      )}
      {data && (
        <div className="matching-summary">
          <div>
            <strong>
              {isFiltered ? "Filtered results" : "All transactions"}
            </strong>
            <span>{scopeLabel}</span>
          </div>
          <span>
            {data.pagination.total} records · Income{" "}
            {formatMoney(data.summary.incomeCents)} · Expenses{" "}
            {formatMoney(data.summary.expenseCents)}
          </span>
        </div>
      )}
      <div className="transaction-layout">
        <section className="preview-card">
          <h2>{editing ? "Edit transaction" : "Add a transaction"}</h2>

          <form ref={formRef} onSubmit={handleSubmit}>
            <fieldset
              key={formVersion}
              className="transaction-fields"
              disabled={busy}
            >
              <label htmlFor="transaction-type">Type</label>
              <select
                id="transaction-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <label htmlFor="transaction-amount">Amount (LKR)</label>
              <input
                id="transaction-amount"
                name="amount"
                type="number"
                min="0.01"
                max="999999999.99"
                step="0.01"
                placeholder="1250.00"
                defaultValue={
                  editing ? (editing.amountCents / 100).toFixed(2) : ""
                }
                required
              />

              <label htmlFor="transaction-category">Category</label>
              <select
                id="transaction-category"
                name="category"
                key={type}
                defaultValue={
                  editing && editing.type === type ? editing.category : ""
                }
                required
              >
                <option value="" disabled>
                  Choose a category
                </option>

                {categories[type].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label htmlFor="transaction-date">Date</label>
              <input
                id="transaction-date"
                name="date"
                type="date"
                defaultValue={editing?.date || today()}
                required
              />

              <label htmlFor="transaction-description">
                Description (optional)
              </label>
              <input
                id="transaction-description"
                name="description"
                type="text"
                maxLength={200}
                placeholder="For example, lunch"
                defaultValue={editing?.description || ""}
              />

              <button className="button button-primary" type="submit">
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Save transaction"}
              </button>
              {editing && (
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => {
                    resetEditor();
                    setError("");
                    setMessage("Editing cancelled. No changes saved.");
                  }}
                >
                  Cancel editing
                </button>
              )}
            </fieldset>
          </form>
        </section>

        <section
          className="preview-card"
          aria-labelledby="transaction-list-heading"
          aria-busy={loading}
        >
          <h2 id="transaction-list-heading">Transactions</h2>
          {data ? (
            <>
              <p className="muted">
                {data.pagination.total === 0
                  ? "0 matching records"
                  : `Showing ${(data.pagination.page - 1) * data.pagination.limit + 1}–${Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of ${data.pagination.total} matching records`}
              </p>
              {data.transactions.length === 0 ? (
                <p>
                  {isFiltered
                    ? "No transactions match these filters. Try Clear filters or a wider date range."
                    : "No transactions yet. Add your first income or expense."}
                </p>
              ) : (
                <ul className="transaction-list">
                  {data.transactions.map((transaction) => (
                    <li key={transaction._id}>
                      <div>
                        <strong>{transaction.category}</strong>
                        <p>{transaction.description}</p>
                        <small>
                          {transaction.date} · {transaction.type}
                        </small>
                      </div>
                      <div className="transaction-actions">
                        <strong
                          className={
                            transaction.type === "income"
                              ? "income-amount"
                              : "expense-amount"
                          }
                        >
                          {transaction.type === "income" ? "+" : "−"}
                          {formatMoney(transaction.amountCents)}
                        </strong>
                        <div className="record-buttons">
                          <button
                            className="button button-outline"
                            type="button"
                            disabled={busy}
                            onClick={() => setDetailsId(transaction._id)}
                            aria-label={`View ${transaction.category} transaction on ${transaction.date}`}
                          >
                            Details
                          </button>
                          <button
                            className="button button-outline"
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(transaction)}
                            aria-label={`Edit ${transaction.category} transaction on ${transaction.date}`}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(transaction)}
                            aria-label={`Delete ${transaction.category} transaction on ${transaction.date}`}
                          >
                            {deletingId === transaction._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <nav
                className="pagination-controls"
                aria-label="Transaction pages"
              >
                <button
                  className="button button-outline"
                  type="button"
                  disabled={
                    busy || Boolean(editing) || data.pagination.page <= 1
                  }
                  onClick={() => goToPage(data.pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button
                  className="button button-outline"
                  type="button"
                  disabled={
                    busy ||
                    Boolean(editing) ||
                    data.pagination.page >= data.pagination.totalPages
                  }
                  onClick={() => goToPage(data.pagination.page + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          ) : (
            <p>
              {loading
                ? "Loading records..."
                : "Retry loading to see your records."}
            </p>
          )}
        </section>
      </div>
      {detailsId && (
        <TransactionDetails
          key={detailsId}
          id={detailsId}
          onClose={() => setDetailsId(null)}
          onSessionExpired={onSessionExpired}
        />
      )}
    </section>
  );
}
