const ASCII_TO_NEPALI: Record<string, string> = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
};

// For validation — convert Nepali digits back to ASCII
export function nepaliToAscii(val: string) {
  return val.replace(/[०-९]/g, (ch) =>
    String(Object.entries(ASCII_TO_NEPALI).find(([, np]) => np === ch)?.[0] ?? ch)
  );
}

export function toNepaliDigits(val: string) {
  return val.replace(/[0-9]/g, (ch) => ASCII_TO_NEPALI[ch]);
}

// ── Date masking helpers ──────────────────────────────────────────
// Source of truth while typing is always the raw ASCII digit string
// (max 8 digits: YYYYMMDD). Slashes are inserted purely for display.
function digitsOnly(val: string): string {
  return nepaliToAscii(val).replace(/\D/g, "").slice(0, 8);
}

function formatDateDigits(digits: string): string {
  let out = digits;
  if (digits.length > 6) {
    out = `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  } else if (digits.length > 4) {
    out = `${digits.slice(0, 4)}/${digits.slice(4, 6)}`;
  }
  return toNepaliDigits(out);
}

export default function NepaliNumberInput({
  value,
  onChange,
  placeholder,
  className,
  allowSlash = false,   // true for dates like २०४०/०५/१५
  allowDash = false,    // true for tokenNo
  mode,                 // "date" enables auto-slash masking (YYYY/MM/DD) + smart backspace
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  allowSlash?: boolean;
  allowDash?: boolean;
  mode?: "date";
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    if (mode === "date") {
      // Typing or pasting digits (e.g. "20300307" or partial) just rebuilds
      // the masked display from the digit count — slashes are never typed,
      // only inserted here. Stripping non-digits also makes paste-with-
      // slashes ("2030/03/07") behave the same as a bare paste.
      const digits = digitsOnly(raw);
      onChange(formatDateDigits(digits));
      return;
    }

    // Strip anything that isn't a digit (ASCII or Nepali), slash, or dash
    const filtered = raw.replace(/[^\d०-९\-\/]/g, (ch) => {
      if (allowSlash && ch === "/") return ch;
      if (allowDash && ch === "-") return ch;
      return "";
    });
    onChange(toNepaliDigits(filtered));
  }

  // Backspacing onto an auto-inserted "/" deletes the digit before it too,
  // so the slash never has to be deleted as its own step.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mode !== "date" || e.key !== "Backspace") return;

    const input = e.currentTarget;
    const pos = input.selectionStart ?? 0;
    const hasSelection = pos !== input.selectionEnd;
    if (hasSelection || pos === 0) return; // let normal/range deletion happen

    const charBefore = value[pos - 1];
    if (charBefore !== "/") return;

    e.preventDefault();
    // Remove both the slash and the digit immediately before it from the
    // underlying digit string, then re-mask.
    const digits = digitsOnly(value);
    // Figure out how many digits precede this slash in the unmasked string:
    // slash 1 sits after 4 digits, slash 2 sits after 6 digits.
    const digitsBeforeSlash = pos - 1 === 4 ? 4 : 6;
    const newDigits = digits.slice(0, digitsBeforeSlash - 1) + digits.slice(digitsBeforeSlash);
    onChange(formatDateDigits(newDigits));
  }

  return (
    <input
      value={value}
      onChange={handleChange}
      onKeyDown={mode === "date" ? handleKeyDown : undefined}
      placeholder={placeholder}
      className={className}
      inputMode="numeric"
    />
  );
}