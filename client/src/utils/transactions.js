import { api } from "./api";

export const defaultFilters = {
  q: "",
  type: "",
  category: "",
  from: "",
  to: "",
  sort: "date-desc",
  limit: "10",
};

export const categories = {
  income: ["Salary", "Freelance", "Gift", "Other"],
  expense: [
      "Food",
      "Transport",
      "Housing",
      "Bills",
      "Education",
      "Health",
      "Entertainment",
      "Other",
  ],
};

export function formatMoney(cents) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(cents / 100);
}

export function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function transactionRequest(options = {}, id = "", query = null) {
  const suffix = id ? `/${encodeURIComponent(id)}` : "";

  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== "" && value != null) params.set(key, String(value));
    }
  }
  const search = params.size ? `?${params}` : "";
  return api(`/transactions${suffix}${search}`, options);
}
