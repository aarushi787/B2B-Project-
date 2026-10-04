const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function formatINR(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? '—' : inr.format(value);
}

export function budgetLabel(min: number | null | undefined, max: number | null | undefined): string {
  if (min && max) return min === max ? formatINR(max) : `${formatINR(min)} – ${formatINR(max)}`;
  if (max) return `Up to ${formatINR(max)}`;
  if (min) return `From ${formatINR(min)}`;
  return 'Open budget';
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MULTIPLIERS: Record<string, number> = { k: 1e3, l: 1e5, lac: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7 };

/** "₹ 10,000", "50k", "1.5L", "2 lakh", "1cr" become a number of rupees. Returns undefined for empty or invalid input. */
export function parseAmount(input: string): number | undefined {
  const text = input.toLowerCase().replace(/[₹,\s]/g, '');
  const m = /^(\d+(?:\.\d+)?)(k|l|lac|lakh|lakhs|cr|crore)?$/.exec(text);
  if (!m) return undefined;
  return Math.round(parseFloat(m[1]) * (m[2] ? MULTIPLIERS[m[2]] : 1));
}
