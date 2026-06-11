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

export default function NepaliNumberInput({
  value,
  onChange,
  placeholder,
  className,
  allowSlash = false,   // true for dates like २०४०/०५/१५
  allowDash = false,    // true for tokenNo
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  allowSlash?: boolean;
  allowDash?: boolean;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Strip anything that isn't a digit (ASCII or Nepali), slash, or dash
    const filtered = raw.replace(/[^\d०-९\-\/]/g, (ch) => {
      if (allowSlash && ch === "/") return ch;
      if (allowDash && ch === "-") return ch;
      return "";
    });
    onChange(toNepaliDigits(filtered));
  }

  return (
    <input
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      inputMode="numeric"
    />
  );
}