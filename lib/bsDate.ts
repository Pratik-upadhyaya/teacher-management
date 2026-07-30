// @ts-ignore -- bikram-sambat ships no TypeScript types
import * as bs from "bikram-sambat";
import { toNepaliDigits, nepaliToAscii } from "@/components/NepaliNumberInput";

/**
 * BS (Bikram Sambat) date helpers, built on the `bikram-sambat` library
 * (medic org, table-driven -- Nepali month lengths vary per year in a way
 * that can't be computed from a simple offset, so this isn't hand-rolled).
 *
 * Why this exists: the backend's leave-date logic (day counting, min/max
 * range validation) genuinely works in Gregorian dates -- correct, tested,
 * and left unchanged. This file is the one place BS<->AD conversion
 * happens, so the leave application UI can work entirely in BS while
 * still sending/receiving AD under the hood.
 *
 * Two layers:
 *  - Object API (adToBsObj/bsObjToAdIso/...): typed {year,month,day}.
 *  - String API (adToBs/bsToAd/todayBs/isCompleteBsDate): Nepali-digit
 *    "YYYY/MM/DD" strings, matching the free-text entry pattern already
 *    used everywhere else in the app (NepaliNumberInput mode="date", as
 *    used for Date of Birth etc.) -- this is what the Leaves page uses.
 */

export const BS_MONTH_NAMES: { ne: string; en: string }[] = [
  { ne: "बैशाख", en: "Baisakh" },
  { ne: "जेठ", en: "Jestha" },
  { ne: "असार", en: "Ashar" },
  { ne: "साउन", en: "Shrawan" },
  { ne: "भदौ", en: "Bhadau" },
  { ne: "असोज", en: "Ashoj" },
  { ne: "कार्तिक", en: "Kartik" },
  { ne: "मंसिर", en: "Mangsir" },
  { ne: "पौष", en: "Poush" },
  { ne: "माघ", en: "Magh" },
  { ne: "फाल्गुन", en: "Falgun" },
  { ne: "चैत", en: "Chaitra" },
];

export interface BsDate {
  year: number;
  month: number;
  day: number;
}

/** Converts a Gregorian ISO date string ("2026-07-21") to a BS date object. */
export function adToBsObj(adIso: string): BsDate {
  return bs.toBik(adIso);
}

/** Converts a BS date to a Gregorian ISO date string ("2026-07-21"). */
export function bsObjToAdIso(year: number, month: number, day: number): string {
  const g = bs.toGreg(year, month, day);
  return `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}

/** Number of days in a given BS month (varies by year -- never assume 30). */
export function daysInBsMonth(year: number, month: number): number {
  return bs.daysInMonth(year, month);
}

/** "२०८३/०४/०५" style formatted BS date. */
export function formatBsDate(d: BsDate | null | undefined): string {
  if (!d) return "—";
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return toNepaliDigits(`${d.year}/${mm}/${dd}`);
}

/** "५ साउन २०८३" style long-form BS date with the Nepali month name. */
export function formatBsDateLong(d: BsDate | null | undefined): string {
  if (!d) return "—";
  const month = BS_MONTH_NAMES[d.month - 1]?.ne ?? "";
  return toNepaliDigits(`${d.day} ${month} ${d.year}`);
}

// ── String API (Nepali-digit "YYYY/MM/DD"), matching NepaliNumberInput ──

/**
 * AD ISO date string ("YYYY-MM-DD") -> BS date string in Nepali digits
 * ("YYYY/MM/DD"). Returns null if the input can't be parsed or falls
 * outside the library's supported range.
 */
export function bsToAd(bsValue: string): string | null {
  const ascii = nepaliToAscii(bsValue.trim());
  const parts = ascii.split("/").map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  const [y, m, d] = parts;
  if (m < 1 || m > 12) return null;
  try {
    if (d < 1 || d > daysInBsMonth(y, m)) return null;
    return bsObjToAdIso(y, m, d);
  } catch {
    return null;
  }
}

/**
 * BS date string ("YYYY/MM/DD", Nepali or ASCII digits) -> AD ISO date
 * string ("YYYY-MM-DD"). Returns null if the input is incomplete/invalid
 * or falls outside the library's supported range.
 */
export function adToBs(adIso: string): string | null {
  try {
    return formatBsDate(adToBsObj(adIso));
  } catch {
    return null;
  }
}

/** Today's date in BS, Nepali digits, "YYYY/MM/DD". */
export function todayBs(): string {
  const iso = new Date().toISOString().slice(0, 10);
  return adToBs(iso) ?? "";
}

/** True if a BS date string ("YYYY/MM/DD") is a complete, valid date. */
export function isCompleteBsDate(bsValue: string): boolean {
  return bsToAd(bsValue) !== null;
}