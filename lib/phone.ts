/**
 * Phone handling for an India-first product.
 *
 * Owners type numbers every way imaginable: "98765 43210", "+91-9876543210",
 * "09876543210", "919876543210". WhatsApp needs one canonical E.164 string,
 * and duplicate detection needs the same number to normalise identically.
 */

const DEFAULT_CC = "91";

export function normalizePhone(raw: string, countryCode = DEFAULT_CC): string {
  let digits = (raw ?? "").replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else {
    // Strip a domestic trunk prefix before assuming the default country.
    if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
    if (digits.length === 10) digits = countryCode + digits;
  }

  return digits ? `+${digits}` : "";
}

/** Accepts anything that normalises to a plausible 10-digit Indian mobile. */
export function isValidPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  if (!/^\+\d{8,15}$/.test(n)) return false;
  if (n.startsWith("+91")) {
    const local = n.slice(3);
    // Indian mobiles are 10 digits starting 6–9.
    return /^[6-9]\d{9}$/.test(local);
  }
  return true;
}

/** +91 98765 43210 — grouped for readability in tables. */
export function displayPhone(raw: string): string {
  const n = normalizePhone(raw);
  if (n.startsWith("+91") && n.length === 13) {
    return `+91 ${n.slice(3, 8)} ${n.slice(8)}`;
  }
  return n || raw;
}

/** Bare digits, no "+" — what the WhatsApp Cloud API expects. */
export function waRecipient(raw: string): string {
  return normalizePhone(raw).replace(/^\+/, "");
}

/** Deep link that opens a chat with this number, text pre-filled. */
export function waDeepLink(raw: string, text?: string): string {
  const to = waRecipient(raw);
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${to}${q}`;
}
