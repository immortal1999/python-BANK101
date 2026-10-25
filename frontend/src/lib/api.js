// Thin fetch wrapper: adds the bearer token, parses JSON, and surfaces the API's
// `detail` message on errors. A 401 clears the token so the layout bounces to /login.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) localStorage.removeItem("token");
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join("; ")
      : detail || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data;
}

// Money arrives as strings ("0.00") to preserve precision; Number() is display-only.
export const usd = (v) =>
  Number(v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

// "2026-10" -> "Oct 2026"
export const fmtMonth = (ym, opts = { month: "short", year: "numeric" }) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", opts);
};

// Mirrors CREDIT_TYPES in backend/app/core/provisioning.py.
export const INCOME_TYPES = ["deposit", "refund", "credit", "payroll", "interest", "transfer_in"];

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
