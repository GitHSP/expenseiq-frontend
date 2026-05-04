export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function exportToCSV(expenses) {
  const header = "Title,Amount,Category,Date,Tags,Notes";
  const rows   = expenses.map(
    e => `"${e.title}","${e.amount}","${e.category}","${e.date}","${e.tags.join(";")}","${e.notes || ""}"`
  );
  const csv  = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "expenses.csv";
  a.click();
}

export function isSameMonth(dateStr, month, year) {
  if (!dateStr) return false;
  const [y, m] = dateStr.split("-").map(Number);
  return m - 1 === month && y === year;
}