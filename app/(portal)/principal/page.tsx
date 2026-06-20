"use client";
import { useState } from "react";
import NepaliInput from "@/components/NepaliInput";
import NepaliNumberInput, { nepaliToAscii } from "@/components/NepaliNumberInput";

// ── Step indicator ────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Basic Info", sub: "आधारभूत" },
    { n: 2, label: "Sections", sub: "कक्षा" },
    { n: 3, label: "Infrastructure", sub: "भौतिक" },
    { n: 4, label: "Teachers", sub: "दरबन्दी" },
    { n: 5, label: "Review", sub: "समीक्षा" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                current > step.n
                  ? "bg-[#0f2044] border-[#0f2044] text-white"
                  : current === step.n
                  ? "bg-[#0f2044] border-[#0f2044] text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {current > step.n ? "✓" : step.n}
            </div>
            <p className={`text-xs mt-1 font-medium ${current >= step.n ? "text-[#0f2044]" : "text-gray-400"}`}>
              {step.label}
            </p>
            <p className="text-xs text-gray-400">{step.sub}</p>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-0.5 mb-6 mx-1 ${current > step.n ? "bg-[#0f2044]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Reusable field wrapper ────────────────────────────────────────
function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{" "}
        {sub && <span className="text-gray-400 font-normal">/ {sub}</span>}
      </label>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]";

function icErr(errors: Record<string, string>, field: string) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 bg-white ${
    errors[field]
      ? "border-red-400 focus:border-red-400 focus:ring-red-400"
      : "border-gray-200 focus:border-[#0f2044] focus:ring-[#0f2044]"
  }`;
}

// ── Nepali-only validator ─────────────────────────────────────────
function isNepaliOnly(value: string): boolean {
  return /^[\u0900-\u097F\s\-,\.]+$/.test(value.trim());
}

function validateNepaliOnly(
  value: string,
  errs: Record<string, string>,
  field: string,
  label: string
) {
  if (!value.trim()) {
    errs[field] = `${label} आवश्यक छ`;
  } else if (!isNepaliOnly(value)) {
    errs[field] = `${label} नेपालीमा मात्र भर्नुहोस्`;
  }
}

// ── Ward No. validator ────────────────────────────────────────────
function validateWardNo(
  value: string,
  errs: Record<string, string>,
  field: string
) {
  const ascii = nepaliToAscii(value.trim());
  if (!value.trim()) {
    errs[field] = "वडा नं आवश्यक छ";
  } else if (!/^\d+$/.test(ascii)) {
    errs[field] = "वडा नं अंकमा मात्र";
  } else if (Number(ascii) < 1 || Number(ascii) > 33) {
    errs[field] = "वडा नं १ देखि ३३ भित्र हुनुपर्छ";
  }
}

// ── Step 1: Basic Info ────────────────────────────────────────────
function Step1({
  data,
  onChange,
  onNext,
}: {
  data: any;
  onChange: (f: string, v: string) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.emis_code.trim()) errs.emis_code = "EMIS कोड आवश्यक छ";
    validateNepaliOnly(data.school_name, errs, "school_name", "विद्यालयको नाम");
    validateNepaliOnly(data.address, errs, "address", "ठेगाना");
    validateWardNo(data.ward_no, errs, "ward_no");
    if (!data.established_date.trim()) errs.established_date = "स्थापना मिति आवश्यक छ";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 1: Basic School Information</h2>
        <p className="text-sm text-gray-400">विद्यालयको आधारभूत विवरण</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Field label="EMIS Code" sub="ईमिस कोड">
            <input
              value={data.emis_code}
              onChange={(e) => { onChange("emis_code", e.target.value); setErrors((p) => ({ ...p, emis_code: "" })); }}
              placeholder="e.g. 27401001"
              className={icErr(errors, "emis_code")}
            />
          </Field>
          <FieldError msg={errors.emis_code} />
        </div>
        <div>
          <Field label="School Name" sub="विद्यालयको नाम">
            <NepaliInput
              value={data.school_name}
              onChange={(val: string) => { onChange("school_name", val); setErrors((p) => ({ ...p, school_name: "" })); }}
              placeholder="श्री बाल कल्याण माध्यमिक विद्यालय"
              className={icErr(errors, "school_name")}
            />
          </Field>
          <FieldError msg={errors.school_name} />
        </div>
      </div>

      {/* Address + Ward No. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Field label="Address" sub="ठेगाना">
            <NepaliInput
              value={data.address}
              onChange={(val: string) => { onChange("address", val); setErrors((p) => ({ ...p, address: "" })); }}
              placeholder="नगरपालिका, जिल्ला"
              className={icErr(errors, "address")}
            />
          </Field>
          <FieldError msg={errors.address} />
        </div>
        <div>
          <Field label="Ward No." sub="वडा नं">
            <NepaliNumberInput
              value={data.ward_no}
              onChange={(val: string) => { onChange("ward_no", val); setErrors((p) => ({ ...p, ward_no: "" })); }}
              placeholder="१"
              className={icErr(errors, "ward_no")}
            />
          </Field>
          <FieldError msg={errors.ward_no} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Field label="Contact No." sub="सम्पर्क नं">
            <input
              value={data.contact}
              onChange={(e) => onChange("contact", e.target.value)}
              placeholder="061-XXXXXX"
              className={inputClass}
            />
          </Field>
        </div>
        <div>
          <Field label="Email" sub="इमेल">
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="school@edu.np"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Established Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Establishment Date (BS){" "}
            <span className="text-gray-400 font-normal">/ स्थापना मिति</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1900" max="2090"
              value={data.established_year ?? ""}
              onChange={(e) => {
                onChange("established_year", e.target.value);
                onChange("established_date", `${e.target.value}/${data.established_month ?? ""}/${data.established_day ?? ""}`);
                setErrors((p) => ({ ...p, established_date: "" }));
              }}
              placeholder="YYYY"
              className={`${icErr(errors, "established_date")} flex-[2]`}
            />
            <input
              type="number"
              min="1" max="12"
              value={data.established_month ?? ""}
              onChange={(e) => {
                const val = Math.min(12, Math.max(1, Number(e.target.value)));
                onChange("established_month", String(val));
                onChange("established_date", `${data.established_year ?? ""}/${val}/${data.established_day ?? ""}`);
                setErrors((p) => ({ ...p, established_date: "" }));
              }}
              placeholder="MM"
              className={`${icErr(errors, "established_date")} flex-1`}
            />
            <input
              type="number"
              min="1" max="32"
              value={data.established_day ?? ""}
              onChange={(e) => {
                const val = Math.min(32, Math.max(1, Number(e.target.value)));
                onChange("established_day", String(val));
                onChange("established_date", `${data.established_year ?? ""}/${data.established_month ?? ""}/${val}`);
                setErrors((p) => ({ ...p, established_date: "" }));
              }}
              placeholder="DD"
              className={`${icErr(errors, "established_date")} flex-1`}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Year / Month (1–12) / Day (1–32)</p>
          <FieldError msg={errors.established_date} />
        </div>

        {/* Permission Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permission Date (BS){" "}
            <span className="text-gray-400 font-normal">/ अनुमति मिति</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1900" max="2090"
              value={data.permission_year ?? ""}
              onChange={(e) => {
                onChange("permission_year", e.target.value);
                onChange("permission_date", `${e.target.value}/${data.permission_month ?? ""}/${data.permission_day ?? ""}`);
              }}
              placeholder="YYYY"
              className={`${inputClass} flex-[2]`}
            />
            <input
              type="number"
              min="1" max="12"
              value={data.permission_month ?? ""}
              onChange={(e) => {
                const val = Math.min(12, Math.max(1, Number(e.target.value)));
                onChange("permission_month", String(val));
                onChange("permission_date", `${data.permission_year ?? ""}/${val}/${data.permission_day ?? ""}`);
              }}
              placeholder="MM"
              className={`${inputClass} flex-1`}
            />
            <input
              type="number"
              min="1" max="32"
              value={data.permission_day ?? ""}
              onChange={(e) => {
                const val = Math.min(32, Math.max(1, Number(e.target.value)));
                onChange("permission_day", String(val));
                onChange("permission_date", `${data.permission_year ?? ""}/${data.permission_month ?? ""}/${val}`);
              }}
              placeholder="DD"
              className={`${inputClass} flex-1`}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Year / Month (1–12) / Day (1–32) — optional</p>
        </div>

        </div>

      <div className="flex justify-end pt-2">
        <button type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Class Sections →
        </button>
      </div>
    </form>
  );
}

// ── Step 2: Class Sections ────────────────────────────────────────
const SECTIONS = [
  { key: "bal_kaksha_year", label: "Bal Kaksha", sub: "बालकक्षा", placeholder: "e.g. 2055" },
  { key: "primary_1_5_year", label: "Primary 1–5", sub: "आधारभूत १-५", placeholder: "e.g. 2016" },
  { key: "lower_sec_6_8_year", label: "Lower Secondary 6–8", sub: "आधारभूत ६-८", placeholder: "e.g. 2045" },
  { key: "secondary_9_10_year", label: "Secondary 9–10", sub: "माध्यमिक ९-१०", placeholder: "e.g. 2060" },
  { key: "secondary_11_12_year", label: "Secondary 11–12", sub: "माध्यमिक ११-१२", placeholder: "e.g. 2070" },
];

function Step2({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (f: string, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 2: Class Sections</h2>
        <p className="text-sm text-gray-400">
          कुन कक्षा कहिले स्थापना भयो — Enter the BS year each section was established
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        Leave blank if the section does not exist in your school.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Field key={s.key} label={s.label} sub={s.sub}>
            <input
              value={data[s.key]}
              onChange={(e) => onChange(s.key, e.target.value)}
              placeholder={s.placeholder}
              className={inputClass}
            />
          </Field>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back
        </button>
        <button type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Infrastructure →
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Infrastructure ────────────────────────────────────────
const FACILITIES = [
  { key: "computer_lab", label: "Computer Lab", sub: "कम्प्युटर प्रयोगशाला" },
  { key: "science_lab", label: "Science Lab", sub: "विज्ञान प्रयोगशाला" },
  { key: "library", label: "Library", sub: "पुस्तकालय" },
  { key: "book_corner", label: "Book Corner", sub: "बुक कर्नर" },
  { key: "playground", label: "Playground", sub: "खेलमैदान" },
];

function Step3({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (f: string, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 3: Physical Infrastructure</h2>
        <p className="text-sm text-gray-400">भौतिक विवरण</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Available Facilities</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FACILITIES.map((f) => (
            <label key={f.key}
              className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-[#0f2044] transition">
              <input
                type="checkbox"
                checked={data[f.key] === "true"}
                onChange={(e) => onChange(f.key, e.target.checked ? "true" : "false")}
                className="accent-[#0f2044] w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">{f.label}</p>
                <p className="text-xs text-gray-400">{f.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Land Area <span className="text-gray-400 font-normal">/ जग्गाको क्षेत्रफल</span>
        </p>
        <div className="flex gap-3">
          <input
            value={data.land_area}
            onChange={(e) => onChange("land_area", e.target.value)}
            placeholder="e.g. 25"
            className={`${inputClass} flex-1`}
          />
          <select
            aria-label="Land unit"
            value={data.land_unit}
            onChange={(e) => onChange("land_unit", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] bg-white"
          >
            <option value="ropani">Ropani / रोपनी</option>
            <option value="aana">Aana / आना</option>
            <option value="sqft">Sq. Ft.</option>
            <option value="sqm">Sq. Meter</option>
            <option value="bigha">Bigha / बिघा</option>
            <option value="kattha">Kattha / कट्ठा</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Number of Buildings" sub="भवन संख्या">
          <input type="number" min="0" value={data.num_buildings}
            onChange={(e) => onChange("num_buildings", e.target.value)}
            placeholder="e.g. 3" className={inputClass} />
        </Field>
        <Field label="Number of Classrooms" sub="कक्षाकोठा संख्या">
          <input type="number" min="0" value={data.num_classrooms}
            onChange={(e) => onChange("num_classrooms", e.target.value)}
            placeholder="e.g. 12" className={inputClass} />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Toilets <span className="text-gray-400 font-normal">/ शौचालय संख्या</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Female" sub="महिला">
            <input type="number" min="0" value={data.toilet_female}
              onChange={(e) => onChange("toilet_female", e.target.value)}
              placeholder="e.g. 4" className={inputClass} />
          </Field>
          <Field label="Male" sub="पुरुष">
            <input type="number" min="0" value={data.toilet_male}
              onChange={(e) => onChange("toilet_male", e.target.value)}
              placeholder="e.g. 4" className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back
        </button>
        <button type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Teacher Count →
        </button>
      </div>
    </form>
  );
}

// ── Step 4: Teacher Count ─────────────────────────────────────────
const TEACHER_LEVELS = [
  { key: "pre_primary", label: "Pre-Primary", sub: "पूर्व प्राथमिक" },
  { key: "primary", label: "Primary", sub: "प्राथमिक" },
  { key: "lower_sec", label: "Lower Secondary", sub: "निम्न माध्यमिक" },
  { key: "secondary_9_10", label: "Secondary 9–10", sub: "माध्यमिक ९-१०" },
  { key: "secondary_11_12", label: "Secondary 11–12", sub: "माध्यमिक ११-१२" },
];

function Step4({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (f: string, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const smallInput =
    "w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#0f2044]";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 4: Teacher Count</h2>
        <p className="text-sm text-gray-400">दरबन्दी विवरण — Number of teachers by level and type</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#0f2044] text-white">
              <th className="px-3 py-2.5 text-left rounded-tl-lg">Level</th>
              <th className="px-3 py-2.5 text-center">Permanent<br/><span className="text-white/60 text-xs">स्थायी</span></th>
              <th className="px-3 py-2.5 text-center">Contract<br/><span className="text-white/60 text-xs">करार</span></th>
              <th className="px-3 py-2.5 text-center">Grant<br/><span className="text-white/60 text-xs">अनुदान</span></th>
              <th className="px-3 py-2.5 text-center">Shi Anudan<br/><span className="text-white/60 text-xs">शि अनुदान</span></th>
              <th className="px-3 py-2.5 text-center">Private<br/><span className="text-white/60 text-xs">निजी</span></th>
              <th className="px-3 py-2.5 text-center">Rahat<br/><span className="text-white/60 text-xs">राहत</span></th>
              <th className="px-3 py-2.5 text-center rounded-tr-lg">Total<br/><span className="text-white/60 text-xs">जम्मा</span></th>
            </tr>
          </thead>
          <tbody>
            {TEACHER_LEVELS.map((level, i) => {
              const p  = Number(data[`${level.key}_permanent`]  || 0);
              const c  = Number(data[`${level.key}_contract`]   || 0);
              const g  = Number(data[`${level.key}_grant`]      || 0);
              const s  = Number(data[`${level.key}_shi_anudan`] || 0);
              const pr = Number(data[`${level.key}_private`]    || 0);
              const r  = Number(data[`${level.key}_relief`]     || 0);
              const total = p + c + g + s + pr + r;

              return (
                <tr key={level.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2.5 font-medium text-gray-700">
                    {level.label}
                    <p className="text-xs text-gray-400">{level.sub}</p>
                  </td>
                  {["permanent", "contract", "grant", "shi_anudan", "private", "relief"].map((type) => (
                    <td key={type} className="px-2 py-2">
                      <input
                        type="number" min="0"
                        value={data[`${level.key}_${type}`] || ""}
                        onChange={(e) => onChange(`${level.key}_${type}`, e.target.value)}
                        className={smallInput}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center font-semibold text-[#0f2044]">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back
        </button>
        <button type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Review →
        </button>
      </div>
    </form>
  );
}

// ── Step 5: Review ────────────────────────────────────────────────
function Step5({
  data,
  onBack,
  onSubmit,
  submitting,
}: {
  data: any;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const basicRows = [
    ["EMIS Code", data.emis_code],
    ["School Name / विद्यालयको नाम", data.school_name],
    ["Address / ठेगाना", data.address],
    ["Ward No. / वडा नं", data.ward_no],
    ["Contact", data.contact],
    ["Email", data.email],
    ["Established (BS)", data.established_date],
    ["Permission Date (BS)", data.permission_date],
  ];

  const sectionRows = SECTIONS.map((s) => [s.label, data[s.key] || "—"]);

  const facilityRows = FACILITIES.map((f) => [
    f.label,
    data[f.key] === "true" ? "✓ छ" : "✗ छैन",
  ]);

  const infraRows = [
    ["Land Area", data.land_area ? `${data.land_area} ${data.land_unit}` : "—"],
    ["Buildings", data.num_buildings || "—"],
    ["Classrooms", data.num_classrooms || "—"],
    ["Toilets (Female)", data.toilet_female || "—"],
    ["Toilets (Male)", data.toilet_male || "—"],
  ];

  function ReviewTable({ title, rows }: { title: string; rows: string[][] }) {
    return (
      <div>
        <p className="text-sm font-semibold text-[#0f2044] mb-2">{title}</p>
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 5: Review & Submit</h2>
        <p className="text-sm text-gray-400">जानकारी जाँच गरी पेश गर्नुहोस्</p>
      </div>

      {(!data.emis_code || !data.school_name || !data.address || !data.ward_no || !data.established_date) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3">
          ⚠️ केही आवश्यक जानकारी भरिएको छैन। कृपया पछाडि फर्केर जाँच गर्नुहोस्।
          (Some required fields are missing. Please go back and review.)
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
        ⚠️ After submitting, changes will require admin verification before taking effect.
           पेश गरेपछि, परिवर्तनहरूलाई प्रभाव लिनु अघि प्रशासक प्रमाणिकरण आवश्यक पर्दछ।
      </div>

      <ReviewTable title="Basic Information" rows={basicRows} />
      <ReviewTable title="Class Sections (Established Year)" rows={sectionRows} />
      <ReviewTable title="Facilities" rows={facilityRows} />
      <ReviewTable title="Infrastructure" rows={infraRows} />

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back
        </button>
        <button type="button" onClick={onSubmit} disabled={submitting}
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit School Information →"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function PrincipalPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1
    emis_code: "",
    school_name: "",
    address: "",
    ward_no: "",
    contact: "",
    email: "",
    established_date: "",
    permission_date: "",
    // Step 2
    bal_kaksha_year: "",
    primary_1_5_year: "",
    lower_sec_6_8_year: "",
    secondary_9_10_year: "",
    secondary_11_12_year: "",
    // Step 3
    computer_lab: "false",
    science_lab: "false",
    library: "false",
    book_corner: "false",
    playground: "false",
    land_area: "",
    land_unit: "ropani",
    num_buildings: "",
    num_classrooms: "",
    toilet_female: "",
    toilet_male: "",
    // Step 4 — all 5 levels × 6 types
    pre_primary_permanent: "",   pre_primary_contract: "",   pre_primary_grant: "",
    pre_primary_shi_anudan: "",  pre_primary_private: "",    pre_primary_relief: "",
    primary_permanent: "",       primary_contract: "",       primary_grant: "",
    primary_shi_anudan: "",      primary_private: "",        primary_relief: "",
    lower_sec_permanent: "",     lower_sec_contract: "",     lower_sec_grant: "",
    lower_sec_shi_anudan: "",    lower_sec_private: "",      lower_sec_relief: "",
    secondary_9_10_permanent: "", secondary_9_10_contract: "", secondary_9_10_grant: "",
    secondary_9_10_shi_anudan: "", secondary_9_10_private: "", secondary_9_10_relief: "",
    secondary_11_12_permanent: "", secondary_11_12_contract: "", secondary_11_12_grant: "",
    secondary_11_12_shi_anudan: "", secondary_11_12_private: "", secondary_11_12_relief: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(
        //`${process.env.NEXT_PUBLIC_API_URL}/api/school-info/`,
        "http://127.0.0.1:8000/api/schools/", //new api calling 
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) throw new Error("Submission failed. Please try again.");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="text-5xl">🏫</div>
        <h2 className="text-2xl font-bold text-[#0f2044]">Submitted Successfully</h2>
        <p className="text-gray-500 text-sm">
          Your school information has been submitted and is pending admin verification.
          You will be notified once it is approved.
        </p>
        <a href="/dashboard"
          className="inline-block bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition mt-4">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">School Information</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          विद्यालयको सम्पूर्ण विवरण भर्नुहोस्
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <StepBar current={step} />

      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        {step === 1 && <Step1 data={formData} onChange={handleChange} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 data={formData} onChange={handleChange} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3 data={formData} onChange={handleChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4 data={formData} onChange={handleChange} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <Step5 data={formData} onBack={() => setStep(4)} onSubmit={handleSubmit} submitting={submitting} />}
      </div>
    </div>
  );
}