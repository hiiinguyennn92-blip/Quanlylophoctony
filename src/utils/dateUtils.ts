import { parseISO, isToday, isValid } from 'date-fns';

/**
 * Safely parses a birthdate string in various formats:
 * - YYYY-MM-DD (e.g. 2017-05-15)
 * - DD/MM/YYYY (e.g. 15/05/2017)
 * - DD-MM-YYYY (e.g. 15-05-2017)
 * Returns { month: number, day: number, year: number } or null if invalid.
 */
export function parseDobParts(dob?: string): { month: number; day: number; year: number } | null {
  if (!dob || typeof dob !== 'string') return null;
  const clean = dob.trim();
  if (!clean) return null;

  // Case 1: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[/-]/).map(Number);
    const d = parts[0];
    const m = parts[1];
    const y = parts[2];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  return null;
}

/**
 * Checks if a student's birthday is today without crashing on malformed dates.
 */
export function isBirthdayToday(dob?: string): boolean {
  const parts = parseDobParts(dob);
  if (!parts) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate(); // 1-31

  return parts.month === currentMonth && parts.day === currentDay;
}

/**
 * Formats a birthdate to standard Vietnamese display: DD/MM/YYYY
 */
export function formatDobDisplay(dob?: string): string {
  const parts = parseDobParts(dob);
  if (!parts) return dob || '---';
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}
