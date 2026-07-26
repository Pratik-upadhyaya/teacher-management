"use client";
import { useState, useEffect } from "react";
import NepaliInput from "@/components/NepaliInput";
import NepaliNumberInput, { nepaliToAscii, toNepaliDigits } from "@/components/NepaliNumberInput";
import EmisAutocomplete, { PublicSchoolMatch } from "@/components/EmisAutocomplete";
import { authFetch } from "@/lib/api";
import { DISTRICTS } from "@/lib/districts";

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

// ── BS date validator (format + range check) ──────────────────────
// Mirrors validateNepaliDate in app/register/page.tsx so the masked
// single-field date entry (NepaliNumberInput mode="date") gets the same
// required + format + range validation as Date of Birth there.
function validateNepaliDate(
  value: string,
  errs: Record<string, string>,
  field: string,
  label: string
) {
  const ascii = nepaliToAscii(value.trim());
  const match = ascii.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);

  if (!value.trim()) {
    errs[field] = `${label} आवश्यक छ`;
  } else if (!match) {
    errs[field] = "ढाँचा: YYYY/MM/DD (जस्तै २०८०/०३/१५)";
  } else {
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12) {
      errs[field] = "महिना १ देखि १२ भित्र हुनुपर्छ";
    } else if (day < 1 || day > 32) {
      errs[field] = `दिन १ देखि ${toNepaliDigits("32")} भित्र हुनुपर्छ`;
    }
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

  const districtData = data.district ? DISTRICTS[data.district] : null;
  const municipalities = districtData ? districtData.municipalities : [];

  function handleDistrictChange(value: string) {
    onChange("district", value);
    onChange("municipality", "");
    onChange("ward_no", "");
  }

  function handleMunicipalityChange(value: string) {
    onChange("municipality", value);
    onChange("ward_no", "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.emis_code.trim()) errs.emis_code = "EMIS कोड आवश्यक छ";
    validateNepaliOnly(data.school_name, errs, "school_name", "विद्यालयको नाम");

    if (!data.district) errs.district = "जिल्ला छान्नुहोस्";
    if (!data.municipality) errs.municipality = "नगरपालिका छान्नुहोस्";
    if (data.municipality) validateWardNo(data.ward_no, errs, "ward_no");

    if (!data.contact.trim()) errs.contact = "सम्पर्क नं आवश्यक छ";

    validateNepaliDate(data.established_date, errs, "established_date", "स्थापना मिति");
    validateNepaliDate(data.permission_date, errs, "permission_date", "अनुमति मिति");

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
            <EmisAutocomplete
              value={data.emis_code}
              onChange={(val) => { onChange("emis_code", val); setErrors((p) => ({ ...p, emis_code: "" })); }}
              onSelectMatch={(m) => {
                // Autofill district/municipality/ward from the matched
                // Public school -- but NOT school name, which is
                // Nepali-only here (see EmisAutocomplete's docstring).
                onChange("district", m.district);
                onChange("municipality", m.municipality);
                onChange("ward_no", toNepaliDigits(m.ward_no));
                setErrors((p) => ({ ...p, district: "", municipality: "", ward_no: "" }));
              }}
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

      {/* District + Municipality + Ward No. — same structured picker as
          teacher registration (lib/districts.tsx), instead of freeform
          address text. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-gray-400 font-normal">/ जिल्ला</span>
          </label>
          <select
            title="District"
            value={data.district}
            onChange={(e) => { handleDistrictChange(e.target.value); setErrors((p) => ({ ...p, district: "" })); }}
            className={icErr(errors, "district")}
          >
            <option value="">जिल्ला छान्नुहोस्</option>
            {Object.entries(DISTRICTS).map(([key, d]) => (
              <option key={key} value={key}>
                {d.en} / {d.np}
              </option>
            ))}
          </select>
          <FieldError msg={errors.district} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipality <span className="text-gray-400 font-normal">/ नगरपालिका</span>
          </label>
          <select
            title="Municipality"
            value={data.municipality}
            onChange={(e) => { handleMunicipalityChange(e.target.value); setErrors((p) => ({ ...p, municipality: "", ward_no: "" })); }}
            disabled={!data.district}
            className={icErr(errors, "municipality") + (!data.district ? " opacity-50 cursor-not-allowed" : "")}
          >
            <option value="">{data.district ? "नगरपालिका छान्नुहोस्" : "पहिले जिल्ला छान्नुहोस्"}</option>
            {municipalities.map((m) => (
              <option key={m.en} value={m.en}>
                {m.en} / {m.np}
              </option>
            ))}
          </select>
          <FieldError msg={errors.municipality} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-start-2">
          <Field label="Ward No." sub="वडा नं">
            <NepaliNumberInput
              value={data.ward_no}
              onChange={(val: string) => { onChange("ward_no", val); setErrors((p) => ({ ...p, ward_no: "" })); }}
              placeholder="१"
              className={icErr(errors, "ward_no") + (!data.municipality ? " opacity-50 cursor-not-allowed" : "")}
            />
          </Field>
          <FieldError msg={errors.ward_no} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Field label="Contact No." sub="सम्पर्क नं">
            <NepaliNumberInput
              value={data.contact}
              onChange={(val: string) => { onChange("contact", val); setErrors((p) => ({ ...p, contact: "" })); }}
              placeholder="०६१-XXXXXX"
              className={icErr(errors, "contact")}
            />
          </Field>
          <FieldError msg={errors.contact} />
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

        {/* Established Date — single masked field (mode="date"), same
            entry pattern as Date of Birth on the teacher registration
            form, instead of three separate YYYY/MM/DD boxes. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Establishment Date (BS){" "}
            <span className="text-gray-400 font-normal">/ स्थापना मिति</span>
          </label>
          <NepaliNumberInput
            value={data.established_date}
            onChange={(val: string) => { onChange("established_date", val); setErrors((p) => ({ ...p, established_date: "" })); }}
            placeholder="२०४०/०५/१५"
            className={icErr(errors, "established_date")}
            mode="date"
          />
          <FieldError msg={errors.established_date} />
        </div>

        {/* Permission Date — now required (formal government permission
            date), same single masked field pattern. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permission Date (BS){" "}
            <span className="text-gray-400 font-normal">/ अनुमति मिति</span>
          </label>
          <NepaliNumberInput
            value={data.permission_date}
            onChange={(val: string) => { onChange("permission_date", val); setErrors((p) => ({ ...p, permission_date: "" })); }}
            placeholder="२०४०/०५/१५"
            className={icErr(errors, "permission_date")}
            mode="date"
          />
          <FieldError msg={errors.permission_date} />
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
            <NepaliNumberInput
              value={data[s.key]}
              onChange={(val: string) => onChange(s.key, val)}
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

// Nepal's three land measurement systems -- a Ropani isn't a fixed
// multiple of a Bigha, so rather than one field + a unit dropdown, the
// principal (or teacher filling this in) picks which system applies and
// fills in that system's own component units.
const LAND_SYSTEMS: { key: string; label: string; sub: string }[] = [
  { key: "metric", label: "Square Meter", sub: "वर्ग मिटर" },
  { key: "ropani", label: "Ropani-Aana-Paisa-Daan", sub: "रोपनी-आना-पैसा-दाम" },
  { key: "bigha", label: "Bigha-Kattha-Dhur", sub: "बिघा-कट्ठा-धुर" },
];

function hasValue(v: string | undefined): boolean {
  return !!v && Number(nepaliToAscii(v)) > 0;
}

// Mirrors School.land_area_display() on the backend, for showing a single
// formatted line in the review step / status view without waiting on a
// server round-trip.
function landAreaDisplay(data: any): string {
  if (data.land_unit_system === "metric") {
    return hasValue(data.land_sqm) ? `${data.land_sqm} वर्ग मिटर (Sq. Meter)` : "";
  }
  if (data.land_unit_system === "ropani") {
    if (hasValue(data.land_ropani) || hasValue(data.land_aana) || hasValue(data.land_paisa) || hasValue(data.land_daan)) {
      return `${data.land_ropani || 0}-${data.land_aana || 0}-${data.land_paisa || 0}-${data.land_daan || 0} (Ropani-Aana-Paisa-Daan)`;
    }
    return "";
  }
  if (data.land_unit_system === "bigha") {
    if (hasValue(data.land_bigha) || hasValue(data.land_kattha) || hasValue(data.land_dhur)) {
      return `${data.land_bigha || 0}-${data.land_kattha || 0}-${data.land_dhur || 0} (Bigha-Kattha-Dhur)`;
    }
    return "";
  }
  return "";
}

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const smallInputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]";

  function selectLandSystem(system: string) {
    onChange("land_unit_system", system);
    setErrors((p) => ({ ...p, land_area: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.land_unit_system) {
      errs.land_area = "जग्गाको नाप प्रणाली छान्नुहोस्";
    } else if (data.land_unit_system === "metric" && !hasValue(data.land_sqm)) {
      errs.land_area = "वर्ग मिटरमा क्षेत्रफल भर्नुहोस्";
    } else if (
      data.land_unit_system === "ropani" &&
      !(hasValue(data.land_ropani) || hasValue(data.land_aana) || hasValue(data.land_paisa) || hasValue(data.land_daan))
    ) {
      errs.land_area = "रोपनी, आना, पैसा वा दाम मध्ये कुनै एक भर्नुहोस्";
    } else if (
      data.land_unit_system === "bigha" &&
      !(hasValue(data.land_bigha) || hasValue(data.land_kattha) || hasValue(data.land_dhur))
    ) {
      errs.land_area = "बिघा, कट्ठा वा धुर मध्ये कुनै एक भर्नुहोस्";
    }

    if (!data.num_buildings.trim()) errs.num_buildings = "भवन संख्या आवश्यक छ";
    if (!data.num_classrooms.trim()) errs.num_classrooms = "कक्षाकोठा संख्या आवश्यक छ";
    if (!data.toilet_female.trim()) errs.toilet_female = "आवश्यक छ";
    if (!data.toilet_male.trim()) errs.toilet_male = "आवश्यक छ";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      {/* Land Area — three Nepal-specific measurement systems. Pick one,
          then fill in that system's own component units. */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Land Area <span className="text-gray-400 font-normal">/ जग्गाको क्षेत्रफल</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {LAND_SYSTEMS.map((sys) => (
            <button
              key={sys.key}
              type="button"
              onClick={() => selectLandSystem(sys.key)}
              className={`text-left border rounded-lg px-3 py-2.5 transition ${
                data.land_unit_system === sys.key
                  ? "bg-[#0f2044] border-[#0f2044] text-white"
                  : "border-gray-200 text-gray-600 hover:border-[#0f2044]"
              }`}
            >
              <p className="text-sm font-medium">{sys.label}</p>
              <p className={`text-xs ${data.land_unit_system === sys.key ? "text-white/60" : "text-gray-400"}`}>
                {sys.sub}
              </p>
            </button>
          ))}
        </div>

        {data.land_unit_system === "metric" && (
          <div className="max-w-xs">
            <Field label="Square Meter" sub="वर्ग मिटर">
              <NepaliNumberInput
                value={data.land_sqm}
                onChange={(val: string) => onChange("land_sqm", val)}
                placeholder="e.g. 500"
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {data.land_unit_system === "ropani" && (
          <div className="grid grid-cols-4 gap-2">
            <Field label="Ropani" sub="रोपनी">
              <NepaliNumberInput value={data.land_ropani} onChange={(v: string) => onChange("land_ropani", v)} placeholder="0" className={smallInputClass} />
            </Field>
            <Field label="Aana" sub="आना">
              <NepaliNumberInput value={data.land_aana} onChange={(v: string) => onChange("land_aana", v)} placeholder="0" className={smallInputClass} />
            </Field>
            <Field label="Paisa" sub="पैसा">
              <NepaliNumberInput value={data.land_paisa} onChange={(v: string) => onChange("land_paisa", v)} placeholder="0" className={smallInputClass} />
            </Field>
            <Field label="Daan" sub="दाम">
              <NepaliNumberInput value={data.land_daan} onChange={(v: string) => onChange("land_daan", v)} placeholder="0" className={smallInputClass} />
            </Field>
          </div>
        )}

        {data.land_unit_system === "bigha" && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Bigha" sub="बिघा">
              <NepaliNumberInput value={data.land_bigha} onChange={(v: string) => onChange("land_bigha", v)} placeholder="0" className={smallInputClass} />
            </Field>
            <Field label="Kattha" sub="कट्ठा">
              <NepaliNumberInput value={data.land_kattha} onChange={(v: string) => onChange("land_kattha", v)} placeholder="0" className={smallInputClass} />
            </Field>
            <Field label="Dhur" sub="धुर">
              <NepaliNumberInput value={data.land_dhur} onChange={(v: string) => onChange("land_dhur", v)} placeholder="0" className={smallInputClass} />
            </Field>
          </div>
        )}

        <FieldError msg={errors.land_area} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Field label="Number of Buildings" sub="भवन संख्या">
            <NepaliNumberInput
              value={data.num_buildings}
              onChange={(val: string) => { onChange("num_buildings", val); setErrors((p) => ({ ...p, num_buildings: "" })); }}
              placeholder="e.g. 3"
              className={icErr(errors, "num_buildings")}
            />
          </Field>
          <FieldError msg={errors.num_buildings} />
        </div>
        <div>
          <Field label="Number of Classrooms" sub="कक्षाकोठा संख्या">
            <NepaliNumberInput
              value={data.num_classrooms}
              onChange={(val: string) => { onChange("num_classrooms", val); setErrors((p) => ({ ...p, num_classrooms: "" })); }}
              placeholder="e.g. 12"
              className={icErr(errors, "num_classrooms")}
            />
          </Field>
          <FieldError msg={errors.num_classrooms} />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Toilets <span className="text-gray-400 font-normal">/ शौचालय संख्या</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Field label="Female" sub="महिला">
              <NepaliNumberInput
                value={data.toilet_female}
                onChange={(val: string) => { onChange("toilet_female", val); setErrors((p) => ({ ...p, toilet_female: "" })); }}
                placeholder="e.g. 4"
                className={icErr(errors, "toilet_female")}
              />
            </Field>
            <FieldError msg={errors.toilet_female} />
          </div>
          <div>
            <Field label="Male" sub="पुरुष">
              <NepaliNumberInput
                value={data.toilet_male}
                onChange={(val: string) => { onChange("toilet_male", val); setErrors((p) => ({ ...p, toilet_male: "" })); }}
                placeholder="e.g. 4"
                className={icErr(errors, "toilet_male")}
              />
            </Field>
            <FieldError msg={errors.toilet_male} />
          </div>
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
  const smallInputClass =
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
              // Values are stored as Devanagari-digit strings; convert to ascii before summing.
              const p  = Number(nepaliToAscii(data[`${level.key}_permanent`])  || 0);
              const c  = Number(nepaliToAscii(data[`${level.key}_contract`])   || 0);
              const g  = Number(nepaliToAscii(data[`${level.key}_grant`])      || 0);
              const s  = Number(nepaliToAscii(data[`${level.key}_shi_anudan`]) || 0);
              const pr = Number(nepaliToAscii(data[`${level.key}_private`])    || 0);
              const r  = Number(nepaliToAscii(data[`${level.key}_relief`])     || 0);
              const total = p + c + g + s + pr + r;

              return (
                <tr key={level.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2.5 font-medium text-gray-700">
                    {level.label}
                    <p className="text-xs text-gray-400">{level.sub}</p>
                  </td>
                  {["permanent", "contract", "grant", "shi_anudan", "private", "relief"].map((type) => (
                    <td key={type} className="px-2 py-2">
                      <NepaliNumberInput
                        value={data[`${level.key}_${type}`] || ""}
                        onChange={(val: string) => onChange(`${level.key}_${type}`, val)}
                        className={smallInputClass}
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
  const districtLabel = data.district
    ? `${DISTRICTS[data.district]?.en} / ${DISTRICTS[data.district]?.np}`
    : "—";
  const municipalityLabel =
    data.district && data.municipality
      ? (() => {
          const m = DISTRICTS[data.district]?.municipalities.find((m) => m.en === data.municipality);
          return m ? `${m.en} / ${m.np}` : data.municipality;
        })()
      : "—";

  const basicRows = [
    ["EMIS Code", data.emis_code],
    ["School Name / विद्यालयको नाम", data.school_name],
    ["District / जिल्ला", districtLabel],
    ["Municipality / नगरपालिका", municipalityLabel],
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
    ["Land Area", landAreaDisplay(data) || "—"],
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

  const missingRequired =
    !data.emis_code || !data.school_name || !data.district || !data.municipality ||
    !data.ward_no || !data.contact || !data.established_date || !data.permission_date ||
    !data.land_unit_system || !data.num_buildings || !data.num_classrooms ||
    !data.toilet_female || !data.toilet_male;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 5: Review & Submit</h2>
        <p className="text-sm text-gray-400">जानकारी जाँच गरी पेश गर्नुहोस्</p>
      </div>

      {missingRequired && (
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
// ── Status badge + read-only school status view ────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    pending: "Pending Review / समीक्षामा",
    approved: "Approved / स्वीकृत",
    rejected: "Rejected / अस्वीकृत",
  };
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

function SchoolStatusView({
  school,
  onEdit,
}: {
  school: any;
  onEdit: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">School Information</h1>
        <p className="text-gray-400 text-sm mt-0.5">विद्यालयको विवरण</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f2044]">{school.school_name}</h2>
            <p className="text-sm text-gray-400">EMIS: {school.emis_code}</p>
          </div>
          <StatusBadge status={school.status} />
        </div>

        {school.status === "rejected" && school.remarks && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            <span className="font-semibold">Reviewer note / समीक्षकको टिप्पणी: </span>
            {school.remarks}
          </div>
        )}

        {school.status === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3">
            Your submission is awaiting admin review. You can still edit it while it's pending.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-4">
          <div><span className="text-gray-400">Address / ठेगाना:</span> <span className="text-gray-700">{school.address}</span></div>
          <div><span className="text-gray-400">Contact / सम्पर्क:</span> <span className="text-gray-700">{school.contact}</span></div>
          <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{school.email || "—"}</span></div>
          <div><span className="text-gray-400">Established (BS):</span> <span className="text-gray-700">{school.established_bs}</span></div>
          <div><span className="text-gray-400">Permission Date (BS):</span> <span className="text-gray-700">{school.permission_date_bs || "—"}</span></div>
          <div><span className="text-gray-400">Land Area:</span> <span className="text-gray-700">{landAreaDisplay(schoolToFormData(school)) || "—"}</span></div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onEdit}
            className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
          >
            Edit Details / सम्पादन गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reverse-map School model fields back to wizard field names, for
// pre-filling the form when editing an existing submission.
function schoolToFormData(school: any) {
  const boolStr = (v: any) => (v ? "true" : "false");
  return {
    emis_code: school.emis_code || "",
    school_name: school.school_name || "",
    district: school.district || "",
    municipality: school.municipality || "",
    ward_no: school.ward_no || "",
    contact: school.contact || "",
    email: school.email || "",
    established_date: school.established_bs || "",
    permission_date: school.permission_date_bs || "",

    bal_kaksha_year: school.bal_kaksha || "",
    primary_1_5_year: school.primary_1_5 || "",
    lower_sec_6_8_year: school.lower_secondary_6_8 || "",
    secondary_9_10_year: school.secondary_9_10 || "",
    secondary_11_12_year: school.secondary_11_12 || "",

    computer_lab: boolStr(school.computer_lab),
    science_lab: boolStr(school.science_lab),
    library: boolStr(school.library),
    book_corner: boolStr(school.book_corner),
    playground: boolStr(school.playground),

    land_unit_system: school.land_unit_system || "",
    land_sqm: school.land_sqm ? String(school.land_sqm) : "",
    land_ropani: school.land_ropani ? String(school.land_ropani) : "",
    land_aana: school.land_aana ? String(school.land_aana) : "",
    land_paisa: school.land_paisa ? String(school.land_paisa) : "",
    land_daan: school.land_daan ? String(school.land_daan) : "",
    land_bigha: school.land_bigha ? String(school.land_bigha) : "",
    land_kattha: school.land_kattha ? String(school.land_kattha) : "",
    land_dhur: school.land_dhur ? String(school.land_dhur) : "",

    num_buildings: school.building_count ? String(school.building_count) : "",
    num_classrooms: school.classroom_count ? String(school.classroom_count) : "",
    toilet_female: school.female_toilets ? String(school.female_toilets) : "",
    toilet_male: school.male_toilets ? String(school.male_toilets) : "",
  };
}

const EMPTY_TEACHER_QUOTA_FIELDS = {
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
};

export default function PrincipalPage() {
  // "loading": checking whether this principal already has a school on file
  // "status": read-only view of their existing submission
  // "form": the wizard, either for a first-time submission or an edit
  const [view, setView] = useState<"loading" | "status" | "form">("loading");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [existingSchool, setExistingSchool] = useState<any>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [formData, setFormData] = useState({
    // Step 1
    emis_code: "",
    school_name: "",
    district: "",
    municipality: "",
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
    land_unit_system: "",
    land_sqm: "",
    land_ropani: "",
    land_aana: "",
    land_paisa: "",
    land_daan: "",
    land_bigha: "",
    land_kattha: "",
    land_dhur: "",
    num_buildings: "",
    num_classrooms: "",
    toilet_female: "",
    toilet_male: "",
    // Step 4 — all 5 levels × 6 types
    ...EMPTY_TEACHER_QUOTA_FIELDS,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadMySchool() {
      try {
        const res = await authFetch("/api/schools/me/");
        if (res.status === 404) {
          if (!cancelled) { setMode("create"); setView("form"); }
          return;
        }
        if (!res.ok) throw new Error("Could not load your school information.");
        const data = await res.json();
        if (!cancelled) { setExistingSchool(data); setView("status"); }
      } catch (err: any) {
        if (!cancelled) { setLoadError(err.message || "Could not load your school information."); setView("form"); setMode("create"); }
      }
    }
    loadMySchool();
    return () => { cancelled = true; };
  }, []);

  function startEdit() {
    if (existingSchool) setFormData((prev) => ({ ...prev, ...schoolToFormData(existingSchool) }));
    setMode("edit");
    setStep(1);
    setSuccess(false);
    setView("form");
  }

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(
        "/api/schools/me/",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed. Please try again.");
      }
      const data = await res.json();
      setExistingSchool(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "loading") {
    return <div className="max-w-lg mx-auto mt-16 text-center text-gray-400 text-sm">Loading…</div>;
  }

  if (view === "status" && existingSchool) {
    return <SchoolStatusView school={existingSchool} onEdit={startEdit} />;
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="text-5xl">🏫</div>
        <h2 className="text-2xl font-bold text-[#0f2044]">
          {mode === "edit" ? "Updated Successfully" : "Submitted Successfully"}
        </h2>
        <p className="text-gray-500 text-sm">
          {mode === "edit"
            ? "Your updated school information has been resubmitted and is pending admin review."
            : "Your school information has been submitted and is pending admin verification."}
          {" "}You will be notified once it is approved.
        </p>
        <button
          onClick={() => setView("status")}
          className="inline-block bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition mt-4"
        >
          View Status
        </button>
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

      {(error || loadError) && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error || loadError}
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