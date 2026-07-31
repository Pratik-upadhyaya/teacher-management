import { nepaliToAscii } from "@/components/NepaliNumberInput";

export const QUOTA_LEVELS = [
  { key: "pre_primary", label: "Pre-Primary", sub: "पूर्व प्राथमिक" },
  { key: "primary", label: "Primary", sub: "प्राथमिक" },
  { key: "lower_sec", label: "Lower Secondary", sub: "निम्न माध्यमिक" },
  { key: "secondary_9_10", label: "Secondary 9–10", sub: "माध्यमिक ९-१०" },
  { key: "secondary_11_12", label: "Secondary 11–12", sub: "माध्यमिक ११-१२" },
];

export const QUOTA_TYPES = [
  { key: "permanent", label: "Permanent", sub: "स्थायी" },
  { key: "temporary", label: "Temporary", sub: "अस्थायी" },
  { key: "contract", label: "Contract", sub: "करार" },
  { key: "grant", label: "Grant", sub: "अनुदान" },
  { key: "shi_anudan", label: "Shi Anudan", sub: "शि अनुदान" },
  { key: "private", label: "Private", sub: "निजी" },
  { key: "relief", label: "Rahat", sub: "राहत" },
];

// Values may arrive as ASCII strings, Devanagari-digit strings (raw form
// data), or plain numbers (backend JSON) -- normalize all three.
function qty(data: any, key: string): number {
  const raw = data?.[key];
  if (raw === undefined || raw === null || raw === "") return 0;
  const ascii = typeof raw === "string" ? nepaliToAscii(raw) : String(raw);
  return Number(ascii) || 0;
}

export default function TeacherQuotaSummary({
  data,
  title = "Teacher Quota / दरबन्दी विवरण",
}: {
  data: any;
  title?: string;
}) {
  const grandTotal = QUOTA_LEVELS.reduce(
    (sum, level) =>
      sum + QUOTA_TYPES.reduce((s, t) => s + qty(data, `${level.key}_${t.key}`), 0),
    0
  );

  return (
    <div>
      <p className="text-sm font-semibold text-[#0f2044] mb-2">{title}</p>
      <div className="overflow-x-auto bg-gray-50 rounded-xl">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-200">
              <th className="px-3 py-2 text-left">Level</th>
              {QUOTA_TYPES.map((t) => (
                <th key={t.key} className="px-2 py-2 text-center whitespace-nowrap">
                  {t.label}
                  <br />
                  <span className="text-gray-400 text-xs">{t.sub}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-center whitespace-nowrap">
                Total
                <br />
                <span className="text-gray-400 text-xs">जम्मा</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {QUOTA_LEVELS.map((level) => {
              const rowTotal = QUOTA_TYPES.reduce(
                (s, t) => s + qty(data, `${level.key}_${t.key}`),
                0
              );
              return (
                <tr key={level.key}>
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {level.label}
                    <p className="text-xs text-gray-400">{level.sub}</p>
                  </td>
                  {QUOTA_TYPES.map((t) => (
                    <td key={t.key} className="px-2 py-2 text-center text-gray-800">
                      {qty(data, `${level.key}_${t.key}`)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-[#0f2044]">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">
                Grand Total
                <br />
                <span className="text-gray-400 text-xs font-normal">जम्मा</span>
              </td>
              {QUOTA_TYPES.map((t) => {
                const colTotal = QUOTA_LEVELS.reduce(
                  (s, level) => s + qty(data, `${level.key}_${t.key}`),
                  0
                );
                return (
                  <td key={t.key} className="px-2 py-2 text-center font-semibold text-gray-700">
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold text-[#0f2044]">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}