export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const decimal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 4,
});
export const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});
export const shortDate = new Intl.DateTimeFormat("pt-BR");
export function civilDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? `${match[3]}/${match[2]}/${match[1]}`
    : shortDate.format(new Date(value));
}
export function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
export function parseDecimal(
  value: FormDataEntryValue | string | number | null | undefined,
) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value ?? "")
      .trim()
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
