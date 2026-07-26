"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export type PublicSchoolMatch = {
  emis_code: string;
  school_name: string;
  district: string;
  municipality: string;
  ward_no: string;
};

/**
 * EMIS Code input with autocomplete/soft-validation against the
 * government-registered Public-school list (Kaski district only --
 * backend/schools/migrations/0005_seed_public_school_reference.py).
 *
 * Deliberately non-blocking: Private/Religious schools and schools outside
 * Kaski legitimately have no match here, so an unmatched code is never
 * treated as an error, only unconfirmed. Selecting a suggestion fills in
 * EMIS/district/municipality/ward via onSelectMatch -- but NOT school
 * name, since the reference data is in English (as sourced from the
 * government export) while this app's school-name fields are Nepali-only
 * (NepaliInput + validateNepaliOnly); auto-filling would silently fail
 * that validation and overwrite a field the user is meant to type in
 * Nepali script.
 *
 * Plain `fetch` (not authFetch) -- teacher registration is itself an
 * unauthenticated public sign-up flow, and the backend endpoint is
 * AllowAny for exactly that reason, so this works unauthenticated too.
 */
export default function EmisAutocomplete({
  value,
  onChange,
  onSelectMatch,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectMatch?: (match: PublicSchoolMatch) => void;
  placeholder?: string;
  className?: string;
}) {
  const [results, setResults] = useState<PublicSchoolMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/schools/public-reference/?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // Silent -- this is a convenience lookup, not a required call.
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close the suggestions dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const exactMatch = results.find(
    (r) => r.emis_code === value.trim() && value.trim().length > 0
  );

  return (
    <div className="relative" ref={containerRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {open && value.trim().length >= 2 && (loading || results.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                type="button"
                key={r.emis_code}
                onClick={() => {
                  onChange(r.emis_code);
                  onSelectMatch?.(r);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-b-0"
              >
                <div className="font-medium text-[#0f2044]">{r.school_name}</div>
                <div className="text-xs text-gray-400">
                  EMIS {r.emis_code} · {r.municipality}
                  {r.ward_no ? `-${r.ward_no}` : ""}, {r.district}
                </div>
              </button>
            ))}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              No Public school match found (Kaski govt. list).
            </div>
          )}
        </div>
      )}

      {exactMatch && (
        <p className="text-xs text-green-600 mt-1">
          ✓ Matches a registered Public school (Kaski)
        </p>
      )}
    </div>
  );
}