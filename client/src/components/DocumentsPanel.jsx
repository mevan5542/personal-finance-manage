import { useRef, useState } from "react";
import { useRemoteData } from "../hooks/useRemoteData";
import { api, API_URL, jsonBody } from "../utils/api";
import { categories, formatMoney, today } from "../utils/transactions";
function fileBase64(file) {
  return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.onload = () => resolve(String(reader.result).split(",")[1]);
     reader.onerror = () => reject(new Error("Unable to read this file."));
     reader.readAsDataURL(file);
  });
}
export default function DocumentsPanel({
  version,
  onDataChanged,
  onSessionExpired,
}) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [page, setPage] = useState(1);
  const [type, setType] = useState("expense");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const uploadId = useRef(null);
  const result = useRemoteData(
    `/documents?month=${encodeURIComponent(month)}&page=${page}`,
    version,
    onSessionExpired,
  );
  function fail(e) {
    if (e.status === 401) onSessionExpired();
    else setError(e.message);
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const file = fields.get("receipt");
    if (!file?.size || file.size > 2 * 1024 * 1024) {
      setError("Choose a PDF, PNG or JPEG file of up to 2 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    if (!uploadId.current) uploadId.current = crypto.randomUUID();
    try {
      const response = await api(
        "/documents",
        jsonBody("POST", {
          type,
           amount: fields.get("amount"),
           category: fields.get("category"),
           description: fields.get("description"),
           date: fields.get("date"),
           uploadId: uploadId.current,
           file: { name: file.name, base64: await fileBase64(file) },
        }),
      );
      setNotice(
        `${response.message} It is included in Overview and Transactions. The document list uses the transaction's month.`,
      );
      setType("expense");
      setFileName("");
      setFormVersion((v) => v + 1);
      uploadId.current = null;
      onDataChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function download(entry) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/documents/${entry._id}/file`, {
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json();
        const e = new Error(body.message);
        e.status = response.status;
        throw e;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = entry.receipt.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove(entry) {
    if (
      !window.confirm(
        `Remove the attachment ${entry.receipt.name}? Its income or expense transaction will remain.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api(`/documents/${entry._id}`, {
        method: "DELETE",
      });
      setNotice(response.message);
      onDataChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="documents-panel">
      <div className="document-intro">
        <span className="eyebrow">EVERY RECORD HAS A STORY</span>
        <h2>Your paperwork, connected.</h2>
        <p>
          Upload a bill or income slip, enter its details and save it as one
          transaction with an attachment.
        </p>
      </div>
      {(error || result.error) && (
        <div role="alert" className="form-notice">
          {error || result.error}
          {result.error && (
            <button
              className="text-button"
              type="button"
              onClick={onDataChanged}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <p role="status">{notice}</p>
      <div className="documents-layout">
        <section className="preview-card">
          <h2>Upload & record</h2>
          <p className="muted">
            Enter the amount manually. No text or amount is extracted
            automatically.
          </p>
          <form
            key={formVersion}
            onSubmit={save}
            onChange={() => {
              uploadId.current = crypto.randomUUID();
            }}
          >
            <fieldset className="transaction-fields" disabled={busy}>
              <label className="upload-zone" htmlFor="receipt-file">
                <span className="upload-symbol">↑</span>
                <strong>{fileName || "Choose a bill or slip"}</strong>
                <small>PDF, PNG or JPEG · maximum 2 MB</small>
              </label>
              <input
                id="receipt-file"
                name="receipt"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                required
                onChange={(e) => setFileName(e.target.files[0]?.name || "")}
              />
              <div className="form-two-columns">
                <label>
                  Type
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="expense">Expense / bill</option>
                    <option value="income">Income / slip</option>
                  </select>
                </label>
                <label>
                  Amount (LKR)
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0.01"
                    max="999999999.99"
                    step="0.01"
                    placeholder="1250.00"
                  />
                </label>
                <label>
                  Category
                  <select name="category" key={type} defaultValue="" required>
                    <option value="" disabled>
                      Choose category
                    </option>
                    {categories[type].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Transaction date
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={today()}
                  />
                </label>
              </div>
              <label htmlFor="document-description">
                Description / merchant / source
              </label>
              <input
                id="document-description"
                name="description"
                maxLength={200}
                placeholder="For example, grocery bill"
              />
              <button className="button button-primary" type="submit">
                {busy ? "Please wait..." : "Save document & transaction"}
              </button>
            </fieldset>
          </form>
          <p className="small-note muted">
            Use this for a new transaction. If a transaction already exists,
            entering it again here would count it twice.
          </p>
        </section>
        <section className="preview-card">
          <div className="panel-heading">
            <h2>Document library</h2>
            <span className="pill">
              {result.data?.pagination.total ?? "—"} files
            </span>
          </div>
          <div className="section-toolbar">
            <label>
              Transaction month
              <input
                 aria-label="Document month"
                 type="month"
                 value={month}
                 disabled={busy}
                 onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setMonth("");
                setPage(1);
              }}
            >
              All months
            </button>
          </div>
          {result.loading && <p role="status">Loading documents...</p>}
          {result.data && (
            <>
              {!result.data.documents.length && (
                <div className="empty-card">
                  <h3>No documents in this view.</h3>
                  <p>Upload a document or choose another month.</p>
                </div>
              )}
              <ul className="document-list">
                {result.data.documents.map((entry) => (
                  <li key={entry._id}>
                    <div className="document-file-mark">
                      {entry.receipt.mimeType === "application/pdf"
                        ? "PDF"
                        : "IMG"}
                    </div>
                    <div className="document-info">
                      <strong>{entry.receipt.name}</strong>
                      <small>
                        {entry.date} · {entry.category} ·{" "}
                        {(entry.receipt.size / 1024).toFixed(0)} KB
                      </small>
                      <p
                        className={
                          entry.type === "income"
                            ? "income-amount"
                            : "expense-amount"
                        }
                      >
                        {entry.type === "income" ? "+" : "−"}
                        {formatMoney(entry.amountCents)}
                      </p>
                      <div className="record-buttons">
                        <button
                          className="text-button"
                          type="button"
                          disabled={busy}
                          onClick={() => download(entry)}
                        >
                          Download
                        </button>
                        <button
                          className="delete-button"
                          type="button"
                          disabled={busy}
                          onClick={() => remove(entry)}
                        >
                          Remove attachment
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <nav className="pagination-controls" aria-label="Document pages">
                <button
                  className="button button-outline"
                  type="button"
                  disabled={busy || result.data.pagination.page <= 1}
                  onClick={() => setPage(result.data.pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  {result.data.pagination.page} /{" "}
                  {result.data.pagination.totalPages}
                </span>
                <button
                  className="button button-outline"
                  type="button"
                  disabled={
                    busy ||
                    result.data.pagination.page >=
                      result.data.pagination.totalPages
                  }
                  onClick={() => setPage(result.data.pagination.page + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )}
          <p className="small-note muted">
            Removing an attachment keeps its transaction. Deleting a transaction
            in Transactions removes its attachment too.
          </p>
        </section>
      </div>
    </div>
  );
}
