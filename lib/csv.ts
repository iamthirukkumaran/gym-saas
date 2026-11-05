/**
 * CSV parsing and serialisation.
 *
 * Hand-rolled rather than a dependency because the shapes involved are small
 * and the failure modes are specific: gym owners export from Excel, Google
 * Sheets and Tally, which means BOMs, CRLF line endings, quoted fields with
 * embedded commas, and the occasional semicolon delimiter. A generic parser
 * handles some of that; this handles all of it.
 */

/** Parses a CSV/TSV string into rows of cells. Returns [] for empty input. */
export function parseCsv(input: string): string[][] {
  // Strip a UTF-8 BOM — Excel adds one and it corrupts the first header.
  let text = input.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) return [];

  // Sniff the delimiter from the header line.
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let inQuote = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && ch in counts) counts[ch as keyof typeof counts]++;
  }
  const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuote = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      // Skip rows that are entirely empty — trailing newlines are normal.
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

/** Normalises a header cell so "Phone No.", "phone_no" and "PHONE NO" all match. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Maps a sheet's headers onto Astryx fields using a synonym table, so the
 * owner usually doesn't have to rename a single column.
 */
export const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ["name", "membername", "fullname", "member", "customername"],
  phone: ["phone", "phoneno", "phonenumber", "mobile", "mobileno", "mobilenumber", "contact", "contactno", "whatsapp", "whatsappno"],
  email: ["email", "emailid", "emailaddress", "mail"],
  gender: ["gender", "sex"],
  dob: ["dob", "dateofbirth", "birthday", "birthdate"],
  joinDate: ["joindate", "joiningdate", "startdate", "dateofjoining", "doj", "admissiondate", "registrationdate"],
  expiryDate: ["expirydate", "enddate", "expiry", "validtill", "validupto", "duedate", "renewaldate", "packageenddate"],
  planName: ["plan", "planname", "package", "packagename", "membershiptype", "scheme"],
  amount: ["amount", "fee", "fees", "amountpaid", "paid", "totalpaid", "price"],
  balance: ["balance", "due", "duesamount", "pending", "balanceamount", "outstanding"],
  address: ["address", "addressline", "location"],
  city: ["city", "town"],
  notes: ["notes", "remarks", "comment", "comments"],
};

export function autoMapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    const idx = normalized.findIndex((h) => synonyms.includes(h));
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

/** Accepts dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd and a few Excel variants. */
export function parseLooseDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;

  // yyyy-mm-dd (ISO) — unambiguous, try first.
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(v);
  if (m) return mk(Number(m[1]), Number(m[2]), Number(m[3]));

  // dd/mm/yyyy — the Indian convention, so day-first is the right assumption.
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(v);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const a = Number(m[1]);
    const b = Number(m[2]);
    // If the first number can't be a day, it must be a month (US-style sheet).
    if (a > 12 && b <= 12) return mk(year, b, a);
    return mk(year, b, a);
  }

  // "12 Mar 2026" / "12 March 2026"
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return mk(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;

  function mk(y: number, mo: number, d: number): Date | null {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

/** Parses "₹1,500.00" / "1500" / "1,500 /-" / "Rs 1500" into integer paise. */
export function parseLooseMoney(value: string): number {
  // Grab the first numeric token rather than stripping non-digits: Indian
  // sheets suffix amounts with "/-", which would otherwise leave a stray
  // dash and make Number() return NaN.
  const m = /\d[\d,]*(?:\.\d+)?/.exec(value ?? "");
  if (!m) return 0;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) : 0;
}

/** Serialises rows to a CSV string, quoting only where necessary. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  // Leading BOM so Excel opens UTF-8 (member names) correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}
