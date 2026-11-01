import { useEffect, useRef, useState } from "react";
import { formatMoney, transactionRequest } from "../utils/transactions";

function timestamp(value) {
  return value ? new Date(value).toLocaleString("en-LK") : "Unavailable";
}

export default function TransactionDetails({ id, onClose, onSessionExpired }) {
  const dialogRef = useRef(null);
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const controller = new AbortController();
    transactionRequest({ signal: controller.signal }, id)
      .then((result) => {
        if (!controller.signal.aborted) setTransaction(result.transaction);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (requestError.status === 401) onSessionExpired();
        else setError(requestError.message);
      });
    return () => {
      controller.abort();
      dialog.close();
    };
  }, [id, onSessionExpired]);

  return (
    <dialog
      className="transaction-detail-dialog"
      ref={dialogRef}
      aria-labelledby="detail-title"
      onCancel={onClose}
    >
      <h2 id="detail-title">Transaction details</h2>
      {error ? (
        <p role="alert">{error}</p>
      ) : transaction ? (
        <dl className="transaction-detail-list">
          <dt>Type</dt>
          <dd>{transaction.type === "income" ? "Income" : "Expense"}</dd>
          <dt>Amount</dt>
          <dd>{formatMoney(transaction.amountCents)}</dd>
          <dt>Category</dt>
          <dd>{transaction.category}</dd>
          <dt>Transaction date</dt>
          <dd>{transaction.date}</dd>
          <dt>Description</dt>
          <dd>{transaction.description || "No description provided."}</dd>
          <dt>Created</dt>
          <dd>{timestamp(transaction.createdAt)}</dd>
          <dt>Last updated</dt>
          <dd>{timestamp(transaction.updatedAt)}</dd>
          {transaction.receipt && (
            <>
              <dt>Attached document</dt>
              <dd>{transaction.receipt.name} · Download from Documents.</dd>
            </>
          )}
          <dt>Record ID</dt>
          <dd>{transaction._id}</dd>
        </dl>
      ) : (
        <p role="status">Loading transaction details...</p>
      )}
      <button className="button button-primary" type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
