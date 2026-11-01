import { useState } from "react";
import { categories, defaultFilters } from "../utils/transactions";

export default function TransactionFilters({ onApply, disabled }) {
  const [draft, setDraft] = useState(defaultFilters);
  const [error, setError] = useState("");
  const availableCategories = draft.type
    ? categories[draft.type]
    : [...new Set([...categories.income, ...categories.expense])];

  function change(event) {
    const { name, value } = event.target;
    setDraft((current) => {
      const updatedFilters = { ...current, [name]: value };
      if (name === "type") {
        updatedFilters.category = "";
      }
      return updatedFilters;
    });
    setError("");
  }

  function apply(event) {
    event.preventDefault();
    if (disabled) return;
    if (draft.from && draft.to && draft.from > draft.to) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError("");
    onApply({ ...draft, q: draft.q.trim() });
  }

  return (
    <section
      className="preview-card filter-panel"
      aria-labelledby="filter-heading"
    >
      <h2 id="filter-heading">Find transactions</h2>
      <p className="muted">
        Choose your filters, then select Apply. Matching totals reflect these
        results. All-time totals and Overview charts remain unchanged.
      </p>
      <form onSubmit={apply}>
        <fieldset className="filter-fields" disabled={disabled}>
          <div className="filter-grid">
            <label className="filter-search">
              Search category or description
              <input
                name="q"
                type="search"
                maxLength={100}
                value={draft.q}
                onChange={change}
                placeholder="For example, lunch"
              />
            </label>
            <label>
              Type
              <select name="type" value={draft.type} onChange={change}>
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label>
              Category
              <select name="category" value={draft.category} onChange={change}>
                <option value="">All categories</option>
                {availableCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              From date
              <input
                type="date"
                name="from"
                value={draft.from}
                onChange={change}
                max={draft.to || undefined}
              />
            </label>
            <label>
              To date
              <input
                type="date"
                name="to"
                value={draft.to}
                onChange={change}
                min={draft.from || undefined}
              />
            </label>
            <label>
              Sort by
              <select name="sort" value={draft.sort} onChange={change}>
                <option value="date-desc">Newest date first</option>
                <option value="date-asc">Oldest date first</option>
                <option value="amount-desc">Highest amount first</option>
                <option value="amount-asc">Lowest amount first</option>
              </select>
            </label>
            <label>
              Records per page
              <select name="limit" value={draft.limit} onChange={change}>
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-buttons">
            <button className="button button-primary" type="submit">
              Apply
            </button>
            <button
              className="button button-outline"
              type="button"
              onClick={() => {
                setDraft(defaultFilters);
                setError("");
                onApply({ ...defaultFilters });
              }}
            >
              Clear filters
            </button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="form-notice">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
