"use client";
import NepaliInput from "@/components/NepaliInput";
import NepaliNumberInput, { nepaliToAscii, toNepaliDigits } from "@/components/NepaliNumberInput";
import EmisAutocomplete, { PublicSchoolMatch } from "@/components/EmisAutocomplete";
import { useState } from "react";
import { Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { DISTRICTS } from "@/lib/districts";
import {
  QUALIFICATION_LABELS,
  TEACHER_TYPE_LABELS,
  LEVEL_LABELS,
  GENDER_LABELS,
  SUBJECT_LABELS, // still exported from teacherLabels for use elsewhere in the app; unused directly here since Subject is now free text
  GRADE_LABELS,
} from "@/lib/teacherLabels";

// ── Shared helpers ────────────────────────────────────────────────
function ic(errors: Record<string, string>, field: string) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 bg-white ${
    errors[field]
      ? "border-red-400 focus:border-red-400 focus:ring-red-400"
      : "border-gray-200 focus:border-[#0f2044] focus:ring-[#0f2044]"
  }`;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
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

// ── Step indicator ────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Personal", sub: "व्यक्तिगत" },
    { n: 2, label: "Account", sub: "खाता" },
    { n: 3, label: "School", sub: "विद्यालय" },
    { n: 4, label: "Service", sub: "सेवा" },
    { n: 5, label: "Documents", sub: "कागजात" },
    { n: 6, label: "Review", sub: "समीक्षा" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
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

// ── Shared date validator ─────────────────────────────────────────
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

// ── Auto-calc "Year Turning 60" from DOB: +60 to year, month/day unchanged ──
// No BS calendar rollback — BS calendar tables only cover up to ~2090, and a
// DOB + 60 years will almost always exceed that, so day-of-month is copied
// through as-is rather than attempting a real calendar adjustment.
function computeAgeSixty(dobValue: string): string | null {
  const ascii = nepaliToAscii(dobValue.trim());
  const match = ascii.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const sixtyYear = Number(y) + 60;
  const mm = m.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return toNepaliDigits(`${sixtyYear}/${mm}/${dd}`);
}

// ── Inline OTP verification widget ─────────────────────────────────
// Used beside both the email and phone fields in Step 1. Sends a code via
// /api/accounts/otp/send/, then swaps to a code-entry UI; on a correct
// code it calls onVerified() and collapses to a "Verified" badge. See
// backend/accounts/otp.py for how codes are generated/checked/expired.
function OtpVerify({
  type,
  value,
  verified,
  onVerified,
  disabled,
  name,
  nameEnglish,
  gender,
}: {
  type: "email" | "phone";
  value: string;
  verified: boolean;
  onVerified: () => void;
  disabled?: boolean;
  // Optional -- only meaningful for type="email". Forwarded to the send
  // endpoint so the OTP email can open with a bilingual greeting: Nepali
  // using `name`, English using `nameEnglish` (a dedicated plain-text
  // field -- NepaliInput only ever commits Devanagari, so `name` alone
  // can't drive the English paragraph). See accounts/otp.py. Both are
  // collected in Step 1 (Personal), which now runs before this
  // Account-step component, so all three are already known.
  name?: string;
  nameEnglish?: string;
  gender?: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts/otp/send/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "email" ? { type, value, name, nameEnglish, gender } : { type, value }
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not send code.");
      setSent(true);
      setCode("");
    } catch (err: any) {
      setError(err.message || "Could not send code.");
    } finally {
      setSending(false);
    }
  }

  async function confirmCode() {
    if (!code.trim()) {
      setError("Enter the code you received.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts/otp/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value, code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Incorrect code.");
      onVerified();
      setSent(false);
      setCode("");
    } catch (err: any) {
      setError(err.message || "Incorrect code.");
    } finally {
      setVerifying(false);
    }
  }

  if (verified) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold shrink-0 h-[42px]">
        <Check size={14} />
        Verified
      </span>
    );
  }

  if (!sent) {
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={sendCode}
          disabled={disabled || sending}
          className="text-xs font-semibold text-[#0f2044] border border-[#0f2044] px-3 h-[42px] rounded-lg hover:bg-[#0f2044] hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#0f2044]"
        >
          {sending ? "Sending…" : "Verify"}
        </button>
        {error && <p className="text-red-500 text-xs mt-1 w-32">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5"> 
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Code"
          inputMode="numeric"
          maxLength={6}
          className="border border-gray-200 rounded-lg px-2 h-[42px] text-sm w-20 focus:outline-none focus:border-[#0f2044]"
        />
        <button
          type="button"
          onClick={confirmCode}
          disabled={verifying}
          className="text-xs font-semibold bg-[#0f2044] text-white px-3 h-[42px] rounded-lg hover:bg-[#1a3260] disabled:opacity-60 shrink-0"
        >
          {verifying ? "…" : "Confirm"}
        </button>
      </div>
      <button
        type="button"
        onClick={sendCode}
        disabled={sending}
        className="text-xs text-gray-400 hover:text-gray-600 underline text-left"
      >
        {sending ? "Resending…" : "Resend code"}
      </button>
      {error && <p className="text-red-500 text-xs w-40">{error}</p>}
    </div>
  );
}

// ── Step 1: Personal Info ─────────────────────────────────────────
function Step1({
  data,
  onChange,
  onNext,
}: {
  data: any;
  onChange: (f: string, v: string | boolean) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    validateNepaliOnly(data.name, errs, "name", "शिक्षकको नाम");
    validateNepaliOnly(data.fatherName, errs, "fatherName", "बुवाको नाम");

    if (!data.nameEnglish.trim())
      errs.nameEnglish = "अंग्रेजीमा नाम आवश्यक छ (Name in English is required)";
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(data.nameEnglish.trim()))
      errs.nameEnglish = "अंग्रेजी अक्षरमा मात्र लेख्नुहोस् (English letters only)";

    if (!data.gender) errs.gender = "लिङ्ग छान्नुहोस्";
    validateNepaliOnly(data.permanentAddress, errs, "permanentAddress", "स्थायी ठेगाना");
    validateWardNo(data.permanentWardNo, errs, "permanentWardNo");
    validateNepaliDate(data.dob, errs, "dob", "जन्म मिति");

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 1: Personal Information</h2>
        <p className="text-sm text-gray-400">व्यक्तिगत विवरण भर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teacher's Name <span className="text-gray-400 font-normal">/ शिक्षकको नाम</span>
          </label>
          <NepaliInput
            value={data.name}
            onChange={(val: string) => { onChange("name", val); setErrors((p) => ({ ...p, name: "" })); }}
            onEnglishChange={(val: string) => { onChange("nameEnglish", val); setErrors((p) => ({ ...p, nameEnglish: "" })); }}
            placeholder="राम श्रेष्ठ"
            className={ic(errors, "name")}
            error={errors.name}
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Name <span className="text-gray-400 font-normal">/ बुवाको नाम</span>
          </label>
          <NepaliInput
            value={data.fatherName}
            onChange={(val: string) => { onChange("fatherName", val); setErrors((p) => ({ ...p, fatherName: "" })); }}
            placeholder="हरि श्रेष्ठ"
            className={ic(errors, "fatherName")}
          />
          <FieldError msg={errors.fatherName} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name (English) <span className="text-gray-400 font-normal">/ अंग्रेजीमा नाम</span>
          <span className="text-gray-400 font-normal text-xs ml-2">
            (auto-filled as you type your name above — edit here if it needs a fix)
          </span>
        </label>
        <input
          type="text"
          value={data.nameEnglish}
          onChange={(e) => { onChange("nameEnglish", e.target.value); setErrors((p) => ({ ...p, nameEnglish: "" })); }}
          placeholder="Ram Shrestha"
          className={ic(errors, "nameEnglish")}
        />
        <FieldError msg={errors.nameEnglish} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permanent Address <span className="text-gray-400 font-normal">/ स्थायी ठेगाना</span>
          </label>
          <NepaliInput
            value={data.permanentAddress}
            onChange={(val: string) => { onChange("permanentAddress", val); setErrors((p) => ({ ...p, permanentAddress: "" })); }}
            placeholder="पोखरा, कास्की"
            className={ic(errors, "permanentAddress")}
          />
          <FieldError msg={errors.permanentAddress} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ward No. <span className="text-gray-400 font-normal">/ वडा नं</span>
          </label>
          <NepaliNumberInput
            value={data.permanentWardNo}
            onChange={(val: string) => { onChange("permanentWardNo", val); setErrors((p) => ({ ...p, permanentWardNo: "" })); }}
            placeholder="१"
            className={ic(errors, "permanentWardNo")}
          />
          <FieldError msg={errors.permanentWardNo} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth (BS) <span className="text-gray-400 font-normal">/ जन्म मिति</span>
          </label>
          <NepaliNumberInput
            value={data.dob}
            onChange={(val: string) => {
              onChange("dob", val);
              setErrors((p) => ({ ...p, dob: "" }));

              // Auto-fill "Year Turning 60" whenever DOB resolves to a full date.
              const sixty = computeAgeSixty(val);
              if (sixty !== null) {
                onChange("ageSixtyYear", sixty);
              }
            }}
            placeholder="२०४०/०५/१५"
            className={ic(errors, "dob")}
            mode="date"
          />
          <FieldError msg={errors.dob} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender <span className="text-gray-400 font-normal">/ लिङ्ग</span>
          </label>
          <select
            title="Gender"
            value={data.gender}
            onChange={(e) => { onChange("gender", e.target.value); setErrors((p) => ({ ...p, gender: "" })); }}
            className={ic(errors, "gender")}
          >
            <option value="">लिङ्ग छान्नुहोस्</option>
            <option value="male">Male / पुरुष</option>
            <option value="female">Female / महिला</option>
            <option value="other">Other / अन्य</option>
          </select>
          <FieldError msg={errors.gender} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Account →
        </button>
      </div>
    </form>
  );
}

// ── Step 2: Account (phone/email verification + password) ─────────
function AccountStep({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (f: string, v: string | boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    const asciiPhone = nepaliToAscii(data.phone.trim());
    if (!data.phone.trim())
      errs.phone = "फोन नम्बर आवश्यक छ";
    else if (!/^(98|97)\d{8}$/.test(asciiPhone))
      errs.phone = "मान्य नेपाली नम्बर (९८/९७XXXXXXXX)";

    if (!data.email.trim()) {
      errs.email = "इमेल आवश्यक छ";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    ) {
    errs.email = "मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्";
    }

    // Only one of email/phone needs to be verified, not both -- an
    // applicant may not have reliable access to whichever channel isn't
    // theirs (shared/unused phone, no personal email). Only flag this if
    // neither is verified yet, and only once both fields are otherwise
    // valid (no point demanding verification of a malformed number).
    if (!errs.phone && !errs.email && !data.phoneVerified && !data.emailVerified) {
      errs.phone = "कृपया फोन वा इमेल मध्ये कम्तीमा एउटा प्रमाणित गर्नुहोस् (Please verify at least one of phone or email)";
      errs.email = "कृपया फोन वा इमेल मध्ये कम्तीमा एउटा प्रमाणित गर्नुहोस् (Please verify at least one of phone or email)";
    }

    if (!data.password)
      errs.password = "पासवर्ड आवश्यक छ";
    else if (!/^(?=.*[A-Za-z])(?=.*\d)\S{8,}$/.test(data.password))
      errs.password = "कम्तीमा ८ अक्षर, १ letter, १ number र space नहुने पासवर्ड प्रयोग गर्नुहोस्";

    if (!data.confirmPassword)
      errs.confirmPassword = "पासवर्ड पुन: लेख्नुहोस्";
    else if (data.password !== data.confirmPassword)
      errs.confirmPassword = "पासवर्ड मेल खाएन";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 2: Account</h2>
        <p className="text-sm text-gray-400">खाता सम्बन्धी विवरण भर्नुहोस्</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
        </label>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <NepaliNumberInput
              value={data.phone}
              onChange={(val: string) => {
                onChange("phone", val);
                setErrors((p) => ({ ...p, phone: "" }));
                // Editing the number after verifying invalidates that
                // verification -- it was for the old value.
                if (data.phoneVerified) onChange("phoneVerified", false);
              }}
              placeholder="९८XXXXXXXX"
              className={ic(errors, "phone")}
            />
            <FieldError msg={errors.phone} />
          </div>
          <OtpVerify
            type="phone"
            value={nepaliToAscii(data.phone.trim())}
            verified={!!data.phoneVerified}
            onVerified={() => onChange("phoneVerified", true)}
            disabled={!/^(98|97)\d{8}$/.test(nepaliToAscii(data.phone.trim()))}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-gray-400 font-normal">/ इमेल ठेगाना</span>
          <span className="text-gray-400 font-normal text-xs ml-2">
            (verifying phone <em>or</em> email is enough / फोन वा इमेल मध्ये एउटा प्रमाणित गरे पुग्छ)
          </span>
        </label>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <input
              type="email"
              value={data.email}
              onChange={(e) => {
                onChange("email", e.target.value);
                setErrors((p) => ({ ...p, email: "" }));
                if (data.emailVerified) onChange("emailVerified", false);
              }}
              placeholder="ram@school.edu.np"
              className={ic(errors, "email")}
            />
            <FieldError msg={errors.email} />
          </div>
          <OtpVerify
            type="email"
            value={data.email.trim()}
            verified={!!data.emailVerified}
            onVerified={() => onChange("emailVerified", true)}
            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())}
            name={data.name}
            nameEnglish={data.nameEnglish}
            gender={data.gender}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-gray-400 font-normal">/ पासवर्ड</span>
          </label>
          <input
            type="password"
            value={data.password}
            onChange={(e) => { onChange("password", e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
            placeholder="••••••••"
            className={ic(errors, "password")}
          />
          <FieldError msg={errors.password} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password <span className="text-gray-400 font-normal">/ पुन: पासवर्ड</span>
          </label>
          <input
            type="password"
            value={data.confirmPassword}
            onChange={(e) => { onChange("confirmPassword", e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
            placeholder="••••••••"
            className={ic(errors, "confirmPassword")}
          />
          <FieldError msg={errors.confirmPassword} />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button type="submit" className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: School Info →
        </button>
      </div>
    </form>
  );
}

// ── Step 3: School & Position ─────────────────────────────────────
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const districtData = data.district ? DISTRICTS[data.district] : null;
  const municipalities = districtData ? districtData.municipalities : [];
  const isPermanent = data.teacherType === "permanent";

  function handleDistrictChange(value: string) {
    onChange("district", value);
    onChange("municipality", "");
    onChange("wardNo", "");
  }

  function handleMunicipalityChange(value: string) {
    onChange("municipality", value);
    onChange("wardNo", "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.district) errs.district = "जिल्ला छान्नुहोस्";
    if (!data.municipality) errs.municipality = "नगरपालिका छान्नुहोस्";
    if (data.municipality) validateWardNo(data.wardNo, errs, "wardNo");

    validateNepaliOnly(data.schoolName, errs, "schoolName", "विद्यालयको नाम");

    if (!data.schoolEmisCode.trim())
      errs.schoolEmisCode = "ईमिस कोड आवश्यक छ";
    else if (!/^[a-zA-Z0-9\-]+$/.test(data.schoolEmisCode))
      errs.schoolEmisCode = "अक्षर, अंक र हाइफन मात्र";

    if (!data.teacherType) errs.teacherType = "प्रकार छान्नुहोस्";

    if (isPermanent) {
      if (!data.tokenNo.trim())
        errs.tokenNo = "संकेत नं आवश्यक छ";
      else if (!/^[a-zA-Z0-9\-]+$/.test(data.tokenNo))
        errs.tokenNo = "अक्षर, अंक र हाइफन मात्र";

      if (!data.grade) errs.grade = "श्रेणी छान्नुहोस्";
    }

    validateNepaliOnly(data.subject, errs, "subject", "विषय");

    if (!data.subjectEnglish.trim())
      errs.subjectEnglish = "अंग्रेजीमा विषय आवश्यक छ (Subject in English is required)";
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(data.subjectEnglish.trim()))
      errs.subjectEnglish = "अंग्रेजी अक्षरमा मात्र लेख्नुहोस् (English letters only)";

    if (!data.level) errs.level = "तह छान्नुहोस्";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 3: School & Position</h2>
        <p className="text-sm text-gray-400">विद्यालय तथा पद सम्बन्धी विवरण</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-gray-400 font-normal">/ जिल्ला</span>
          </label>
          <select
            title="District"
            value={data.district}
            onChange={(e) => { handleDistrictChange(e.target.value); setErrors((p) => ({ ...p, district: "" })); }}
            className={ic(errors, "district")}
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
            onChange={(e) => { handleMunicipalityChange(e.target.value); setErrors((p) => ({ ...p, municipality: "", wardNo: "" })); }}
            disabled={!data.district}
            className={ic(errors, "municipality") + (!data.district ? " opacity-50 cursor-not-allowed" : "")}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ward No. <span className="text-gray-400 font-normal">/ वडा नं</span>
          </label>
          <NepaliNumberInput
            value={data.wardNo}
            onChange={(val: string) => { onChange("wardNo", val); setErrors((p) => ({ ...p, wardNo: "" })); }}
            placeholder="१"
            className={ic(errors, "wardNo") + (!data.municipality ? " opacity-50 cursor-not-allowed" : "")}
          />
          <FieldError msg={errors.wardNo} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          School Name <span className="text-gray-400 font-normal">/ विद्यालयको नाम</span>
        </label>
        <NepaliInput
          value={data.schoolName}
          onChange={(val: string) => { onChange("schoolName", val); setErrors((p) => ({ ...p, schoolName: "" })); }}
          placeholder="श्री बाल कल्याण माध्यमिक विद्यालय"
          className={ic(errors, "schoolName")}
        />
        <FieldError msg={errors.schoolName} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          School EMIS Code <span className="text-gray-400 font-normal">/ विद्यालय ईमिस कोड</span>
        </label>
        <EmisAutocomplete
          value={data.schoolEmisCode}
          onChange={(val) => { onChange("schoolEmisCode", val); setErrors((p) => ({ ...p, schoolEmisCode: "" })); }}
          onSelectMatch={(m) => {
            // Autofill district/municipality/ward from the matched Public
            // school -- but NOT school name, which is Nepali-only here
            // (see EmisAutocomplete's docstring for why).
            onChange("district", m.district);
            onChange("municipality", m.municipality);
            onChange("wardNo", toNepaliDigits(m.ward_no));
            setErrors((p) => ({ ...p, district: "", municipality: "", wardNo: "" }));
          }}
          placeholder="e.g. 27401001"
          className={ic(errors, "schoolEmisCode")}
        />
        <FieldError msg={errors.schoolEmisCode} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type <span className="text-gray-400 font-normal">/ प्रकार</span>
        </label>
        <select
          title="Teacher Type"
          value={data.teacherType}
          onChange={(e) => { onChange("teacherType", e.target.value); setErrors((p) => ({ ...p, teacherType: "" })); }}
          className={ic(errors, "teacherType")}
        >
          <option value="">प्रकार छान्नुहोस्</option>
          <option value="permanent">Permanent / स्थायी</option>
          <option value="temporary">Temporary / अस्थायी</option>
          <option value="grant">Grant / अनुदान</option>
          <option value="shi_anudan">Shi Anudan / शि अनुदान</option>
          <option value="relief">Rahat / राहत</option>
          <option value="private">Private / निजी</option>
        </select>
        <FieldError msg={errors.teacherType} />
      </div>

      {isPermanent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code / Token No. <span className="text-gray-400 font-normal">/ संकेत नं</span>
            </label>
            <input
              value={data.tokenNo}
              onChange={(e) => { onChange("tokenNo", e.target.value); setErrors((p) => ({ ...p, tokenNo: "" })); }}
              placeholder="TSC-2080-04521"
              className={ic(errors, "tokenNo")}
            />
            <FieldError msg={errors.tokenNo} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade <span className="text-gray-400 font-normal">/ श्रेणी</span>
            </label>
            <select
              title="Grade"
              value={data.grade}
              onChange={(e) => { onChange("grade", e.target.value); setErrors((p) => ({ ...p, grade: "" })); }}
              className={ic(errors, "grade")}
            >
              <option value="">श्रेणी छान्नुहोस्</option>
              <option value="third">Third / तृतीय</option>
              <option value="second">Second / द्वितीय</option>
              <option value="first">First / प्रथम</option>
            </select>
            <FieldError msg={errors.grade} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-gray-400 font-normal">/ विषय</span>
          </label>
          <NepaliInput
            value={data.subject}
            onChange={(val: string) => { onChange("subject", val); setErrors((p) => ({ ...p, subject: "" })); }}
            onEnglishChange={(val: string) => { onChange("subjectEnglish", val); setErrors((p) => ({ ...p, subjectEnglish: "" })); }}
            placeholder="विज्ञान"
            className={ic(errors, "subject")}
            error={errors.subject}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level <span className="text-gray-400 font-normal">/ तह</span>
          </label>
          <select
            title="Level"
            value={data.level}
            onChange={(e) => { onChange("level", e.target.value); setErrors((p) => ({ ...p, level: "" })); }}
            className={ic(errors, "level")}
          >
            <option value="">तह छान्नुहोस्</option>
            <option value="pre_primary">Pre-Primary / पूर्व-प्राथमिक</option>
            <option value="primary">Primary / आधारभूत (१–५)</option>
            <option value="lower_secondary">Lower Secondary / निम्न माध्यमिक (६–८)</option>
            <option value="secondary">Secondary / माध्यमिक (९–१०)</option>
            <option value="higher_secondary">Higher Secondary / उच्च माध्यमिक (११–१२)</option>
          </select>
          <FieldError msg={errors.level} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject (English) <span className="text-gray-400 font-normal">/ अंग्रेजीमा विषय</span>
          <span className="text-gray-400 font-normal text-xs ml-2">
            (auto-filled as you type the subject above — edit here if it needs a fix)
          </span>
        </label>
        <input
          type="text"
          value={data.subjectEnglish}
          onChange={(e) => { onChange("subjectEnglish", e.target.value); setErrors((p) => ({ ...p, subjectEnglish: "" })); }}
          placeholder="Science"
          className={ic(errors, "subjectEnglish")}
        />
        <FieldError msg={errors.subjectEnglish} />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button type="submit" className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Service Details →
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Service Details ───────────────────────────────────────
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
  const [sameAsMin, setSameAsMin] = useState(
    !!data.minQualification && data.minQualification === data.highestQualification
  );

  const isPermanent = data.teacherType === "permanent";
  const wasDifferent = data.wasDifferentTypeBeforePermanent === "true";
  const needsPromotion1 = isPermanent && (data.grade === "second" || data.grade === "first");
  const needsPromotion2 = isPermanent && data.grade === "first";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    validateNepaliDate(data.appointmentDate, errs, "appointmentDate", "नियुक्ती मिति");

    if (isPermanent) {
      if (!data.wasDifferentTypeBeforePermanent) {
        errs.wasDifferentTypeBeforePermanent = "यो प्रश्नको जवाफ दिनुहोस्";
      } else if (wasDifferent) {
        validateNepaliDate(data.permanentAppointmentDate, errs, "permanentAppointmentDate", "स्थायी नियुक्ती मिति");
      }

      if (needsPromotion1) {
        validateNepaliDate(data.promotionDate, errs, "promotionDate", "बढुवा मिति (तृतीय → द्वितीय)");
      }
      if (needsPromotion2) {
        validateNepaliDate(data.promotionDate2, errs, "promotionDate2", "बढुवा मिति (द्वितीय → प्रथम)");
      }

      if (!data.extraordinaryLeave.trim()) {
        errs.extraordinaryLeave = "लिइसकेको असाधारण बिदा उल्लेख गर्नुहोस्";
      }
    }
    // Promotion Date only applies to Permanent teachers -- non-Permanent
    // applicants never see the field, so there is nothing to validate here.

    if (data.ageSixtyYear.trim()) {
      validateNepaliDate(data.ageSixtyYear, errs, "ageSixtyYear", "६० वर्ष पुग्ने मिति");
    }

    if (!data.minQualification)
      errs.minQualification = "न्यूनतम शैक्षिक योग्यता छान्नुहोस्";
    if (!data.highestQualification)
      errs.highestQualification = "उच्चतम शैक्षिक योग्यता छान्नुहोस्";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 4: Service Details</h2>
        <p className="text-sm text-gray-400">सेवा सम्बन्धी विवरण</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Date {isPermanent && wasDifferent ? "(Original Category)" : ""}
            <span className="text-gray-400 font-normal">
              {" "}/ नियुक्ती मिति {isPermanent && wasDifferent ? "(पहिलेको प्रकार)" : ""}
            </span>
          </label>
          <NepaliNumberInput
            value={data.appointmentDate}
            onChange={(val: string) => { onChange("appointmentDate", val); setErrors((p) => ({ ...p, appointmentDate: "" })); }}
            placeholder="२०८०/०३/१५"
            className={ic(errors, "appointmentDate")}
            mode="date"
          />
          <FieldError msg={errors.appointmentDate} />
        </div>

      </div>

      {isPermanent && (
        <div className="space-y-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Were you appointed under a different type before becoming Permanent?
              <span className="text-gray-400 font-normal block text-xs mt-0.5">
                स्थायी हुनुअघि फरक प्रकारमा नियुक्त हुनुभएको थियो?
              </span>
            </label>
            <select
              title="Was Different Type Before Permanent"
              value={data.wasDifferentTypeBeforePermanent}
              onChange={(e) => {
                onChange("wasDifferentTypeBeforePermanent", e.target.value);
                setErrors((p) => ({ ...p, wasDifferentTypeBeforePermanent: "", permanentAppointmentDate: "" }));
              }}
              className={ic(errors, "wasDifferentTypeBeforePermanent")}
            >
              <option value="">छान्नुहोस्</option>
              <option value="true">Yes / हो</option>
              <option value="false">No, directly appointed Permanent / होइन, सिधै स्थायी</option>
            </select>
            <FieldError msg={errors.wasDifferentTypeBeforePermanent} />
          </div>

          {wasDifferent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Date (as Permanent) <span className="text-gray-400 font-normal">/ स्थायी नियुक्ती मिति</span>
              </label>
              <NepaliNumberInput
                value={data.permanentAppointmentDate}
                onChange={(val: string) => { onChange("permanentAppointmentDate", val); setErrors((p) => ({ ...p, permanentAppointmentDate: "" })); }}
                placeholder="२०८२/०१/०१"
                className={ic(errors, "permanentAppointmentDate")}
                mode="date"
              />
              <FieldError msg={errors.permanentAppointmentDate} />
            </div>
          )}

          {(needsPromotion1 || needsPromotion2) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {needsPromotion1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Date (Third → Second) <span className="text-gray-400 font-normal">/ बढुवा मिति (तृतीय → द्वितीय)</span>
                  </label>
                  <NepaliNumberInput
                    value={data.promotionDate}
                    onChange={(val: string) => { onChange("promotionDate", val); setErrors((p) => ({ ...p, promotionDate: "" })); }}
                    placeholder="२०८२/०१/०१"
                    className={ic(errors, "promotionDate")}
                    mode="date"
                  />
                  <FieldError msg={errors.promotionDate} />
                </div>
              )}

              {needsPromotion2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Date (Second → First) <span className="text-gray-400 font-normal">/ बढुवा मिति (द्वितीय → प्रथम)</span>
                  </label>
                  <NepaliNumberInput
                    value={data.promotionDate2}
                    onChange={(val: string) => { onChange("promotionDate2", val); setErrors((p) => ({ ...p, promotionDate2: "" })); }}
                    placeholder="२०८४/०१/०१"
                    className={ic(errors, "promotionDate2")}
                    mode="date"
                  />
                  <FieldError msg={errors.promotionDate2} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Qualification <span className="text-gray-400 font-normal">/ न्यूनतम योग्यता</span>
          </label>
          <select
            title="Minimum Qualification"
            value={data.minQualification}
            onChange={(e) => {
              const val = e.target.value;
              onChange("minQualification", val);
              setErrors((p) => ({ ...p, minQualification: "" }));
              if (sameAsMin) {
                onChange("highestQualification", val);
                setErrors((p) => ({ ...p, highestQualification: "" }));
              }
            }}
            className={ic(errors, "minQualification")}
          >
            <option value="">योग्यता छान्नुहोस्</option>
            <option value="slc">SLC / SEE</option>
            <option value="plus2">+2 / Intermediate / उच्च माध्यमिक</option>
            <option value="bachelor">Bachelor / स्नातक</option>
            <option value="master">Master / स्नातकोत्तर</option>
            <option value="mphil_phd">M.Phil / PhD / विध्याबारिधी</option>
          </select>
          <FieldError msg={errors.minQualification} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Highest Qualification <span className="text-gray-400 font-normal">/ उच्चतम योग्यता</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsMin}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSameAsMin(checked);
                  if (checked) {
                    onChange("highestQualification", data.minQualification);
                    setErrors((p) => ({ ...p, highestQualification: "" }));
                  }
                }}
                className="accent-[#0f2044]"
              />
              same as minimum
            </label>
          </div>
          <select
            title="Highest Qualification"
            value={data.highestQualification}
            disabled={sameAsMin}
            onChange={(e) => { onChange("highestQualification", e.target.value); setErrors((p) => ({ ...p, highestQualification: "" })); }}
            className={ic(errors, "highestQualification") + (sameAsMin ? " opacity-50 cursor-not-allowed" : "")}
          >
            <option value="">योग्यता छान्नुहोस्</option>
            <option value="slc">SLC / SEE</option>
            <option value="plus2">+2 / Intermediate / उच्च माध्यमिक</option>
            <option value="bachelor">Bachelor / स्नातक</option>
            <option value="master">Master / स्नातकोत्तर</option>
            <option value="mphil_phd">M.Phil / PhD / विध्याबारिधी</option>
          </select>
          <FieldError msg={errors.highestQualification} />
        </div>
      </div>

      {isPermanent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extraordinary Leave Taken <span className="text-gray-400 font-normal">/ लिइसकेको असाधारण बिदा</span>
              <span className="text-gray-400 font-normal text-xs ml-1">(days before this year)</span>
            </label>
            <NepaliNumberInput
              value={data.extraordinaryLeave}
              onChange={(val: string) => { onChange("extraordinaryLeave", val); setErrors((p) => ({ ...p, extraordinaryLeave: "" })); }}
              placeholder="०"
              className={ic(errors, "extraordinaryLeave")}
            />
            <FieldError msg={errors.extraordinaryLeave} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extraordinary Leave Remaining <span className="text-gray-400 font-normal">/ बाँकी असाधारण बिदा</span>
              <span className="text-gray-400 font-normal text-xs ml-1">(auto-calculated, out of 3 years)</span>
            </label>
            <input
              value={toNepaliDigits(
                String(Math.max(1095 - (parseInt(nepaliToAscii(data.extraordinaryLeave || "0"), 10) || 0), 0))
              )}
              readOnly
              disabled
              className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year Turning 60 (BS) <span className="text-gray-400 font-normal">/ ६० वर्ष पुग्ने उमेर</span>
          <span className="text-gray-400 font-normal text-xs ml-1">(auto-filled from Date of Birth, editable)</span>
        </label>
        <NepaliNumberInput
          value={data.ageSixtyYear}
          onChange={(val: string) => { onChange("ageSixtyYear", val); setErrors((p) => ({ ...p, ageSixtyYear: "" })); }}
          placeholder="२१००/०५/१५"
          className={ic(errors, "ageSixtyYear")}
          mode="date"
        />
        <FieldError msg={errors.ageSixtyYear} />
      </div>

      <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Remarks <span className="text-gray-400 font-normal">/ कैफियत</span>
    <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
  </label>

        <textarea
          value={data.remarks}
          onChange={(e) => onChange("remarks", e.target.value)}
          placeholder="थप विवरण... / Additional remarks..."
          rows={3}
          className={`w-full rounded-md border px-3 py-2 ${ic(errors, "remarks")}`}
        />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button type="submit" className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Documents →
        </button>
      </div>
    </form>
  );
}

// ── Step 4: Documents ─────────────────────────────────────────────
const DOC_FIELDS = [
  { key: "citizenship", label: "Citizenship", sub: "नागरिकता", accept: "image/*,.pdf" },
  { key: "degree", label: "Degree Certificate", sub: "प्रमाणपत्र", accept: "image/*,.pdf" },
  // Compulsory for every teacher regardless of minQualification/
  // highestQualification -- even a teacher whose minimum qualification is
  // Bachelor's or higher must still submit this. Unlike
  // highestQualificationDocument (further down, conditional), this is a
  // plain unconditional entry in DOC_FIELDS, so the existing required-
  // fields loop in handleNext() below enforces it for everyone with no
  // extra logic needed.
  { key: "seeSlcCertificate", label: "SEE/SLC Certificate", sub: "एसईई/एसएलसी प्रमाणपत्र", accept: "image/*,.pdf" },
  { key: "photo", label: "Passport Size Photo", sub: "पासपोर्ट साइजको फोटो", accept: "image/*" },
  { key: "teachingLicense", label: "Teaching License", sub: "शिक्षण अनुमतिपत्र", accept: "image/*,.pdf" },
  { key: "appointmentLetter", label: "Appointment Letter", sub: "नियुक्तिपत्र", accept: "image/*,.pdf" },
];

const MAX_TRANSFER_DOCUMENTS = 10;

function Step4({
  data,
  onChange,
  onTransferDocsChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (f: string, v: string) => void;
  onTransferDocsChange: (files: File[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isPermanent = data.teacherType === "permanent";
  const transferDocuments: File[] = data.transferDocuments || [];
  const needsHighestQualificationDoc =
    !!data.highestQualification && data.highestQualification !== data.minQualification;
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addTransferDocs(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const combined = [...transferDocuments, ...incoming].slice(0, MAX_TRANSFER_DOCUMENTS);
    onTransferDocsChange(combined);
  }

  function removeTransferDoc(index: number) {
    onTransferDocsChange(transferDocuments.filter((_, i) => i !== index));
  }

  function handleNext() {
    const errs: Record<string, string> = {};
    for (const doc of DOC_FIELDS) {
      if (!data[doc.key]) errs[doc.key] = `${doc.label} अपलोड गर्नुहोस्`;
    }
    if (needsHighestQualificationDoc && !data.highestQualificationDocument) {
      errs.highestQualificationDocument = "उच्चतम योग्यताको प्रमाणपत्र अपलोड गर्नुहोस्";
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 5: Upload Documents</h2>
        <p className="text-sm text-gray-400">कागजातहरू अपलोड गर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOC_FIELDS.map((doc) => (
          <div key={doc.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {doc.label} <span className="text-gray-400 font-normal">/ {doc.sub}</span>
            </label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-[#0f2044] transition ${errors[doc.key] ? "border-red-300" : "border-gray-200"}`}>
              <input
                type="file"
                accept={doc.accept}
                className="hidden"
                onChange={(e) => { onChange(doc.key, e.target.files?.[0] as any); setErrors((p) => ({ ...p, [doc.key]: "" })); }}
              />
              {data[doc.key] ? (
                <p className="text-sm text-[#0f2044] font-medium text-center">
    ✓ {typeof data[doc.key] === "object"
        ? data[doc.key].name
        : data[doc.key]}
  </p>
) : (
                <>
                  <div className="text-xl mb-1 text-gray-400">↑</div>
                  <p className="text-xs text-gray-400">Click to upload</p>
                </>
              )}
            </label>
            <FieldError msg={errors[doc.key]} />
          </div>
        ))}

        {needsHighestQualificationDoc && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highest Qualification Document <span className="text-gray-400 font-normal">/ उच्चतम योग्यताको प्रमाणपत्र</span>
            </label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-[#0f2044] transition ${errors.highestQualificationDocument ? "border-red-300" : "border-gray-200"}`}>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => { onChange("highestQualificationDocument", e.target.files?.[0] as any); setErrors((p) => ({ ...p, highestQualificationDocument: "" })); }}
              />
              {data.highestQualificationDocument ? (
                <p className="text-sm text-[#0f2044] font-medium text-center">
                  ✓ {typeof data.highestQualificationDocument === "object"
                    ? data.highestQualificationDocument.name
                    : data.highestQualificationDocument}
                </p>
              ) : (
                <>
                  <div className="text-xl mb-1 text-gray-400">↑</div>
                  <p className="text-xs text-gray-400">Click to upload</p>
                </>
              )}
            </label>
            <FieldError msg={errors.highestQualificationDocument} />
          </div>
        )}
      </div>

      {isPermanent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Old School Transfer Documents <span className="text-gray-400 font-normal">/ पुरानो विद्यालय सरुवा कागजातहरू</span>
            <span className="text-gray-400 font-normal text-xs ml-1">
              (up to {MAX_TRANSFER_DOCUMENTS}, optional — Permanent teachers only)
            </span>
          </label>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#0f2044] transition">
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              disabled={transferDocuments.length >= MAX_TRANSFER_DOCUMENTS}
              onChange={(e) => { addTransferDocs(e.target.files); e.target.value = ""; }}
            />
            <div className="text-xl mb-1 text-gray-400">↑</div>
            <p className="text-xs text-gray-400">
              {transferDocuments.length >= MAX_TRANSFER_DOCUMENTS
                ? `Maximum ${MAX_TRANSFER_DOCUMENTS} files reached`
                : `Click to add files (${transferDocuments.length}/${MAX_TRANSFER_DOCUMENTS})`}
            </p>
          </label>

          {transferDocuments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {transferDocuments.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  <span className="text-[#0f2044] truncate">✓ {file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeTransferDoc(i)}
                    className="text-red-500 hover:text-red-600 text-xs font-medium ml-2 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button type="button" onClick={handleNext} className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: Review →
        </button>
      </div>
    </div>
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

  const sections = [
    {
      title: "Personal Info / व्यक्तिगत",
      rows: [
        ["Teacher's Name / शिक्षकको नाम", data.name],
        ["Name (English)", data.nameEnglish],
        ["Father's Name / बुवाको नाम", data.fatherName],
        ["Gender / लिङ्ग", GENDER_LABELS[data.gender] || data.gender],
        ["Permanent Address / स्थायी ठेगाना", data.permanentAddress],
        ["Ward No. / वडा नं (स्थायी)", data.permanentWardNo],
        ["Date of Birth / जन्म मिति", data.dob],
        ["Phone / फोन", data.phone],
        ["Email / इमेल", data.email],
      ],
    },
    {
      title: "School & Position / विद्यालय तथा पद",
      rows: [
        ["District / जिल्ला", districtLabel],
        ["Municipality / नगरपालिका", municipalityLabel],
        ["Ward No. / वडा नं (विद्यालय)", data.wardNo],
        ["School / विद्यालय", data.schoolName],
        ["School EMIS Code / ईमिस कोड", data.schoolEmisCode],
        ["Type / प्रकार", TEACHER_TYPE_LABELS[data.teacherType] || data.teacherType],
        ...(data.teacherType === "permanent"
          ? ([
              ["Code No. / संकेत नं", data.tokenNo],
              ["Grade / श्रेणी", GRADE_LABELS[data.grade] || data.grade],
            ] as [string, string][])
          : []),
        ["Subject / विषय", data.subject],
        ["Subject (English)", data.subjectEnglish],
        ["Level / तह", LEVEL_LABELS[data.level] || data.level],
      ],
    },
    {
      title: "Service Details / सेवा विवरण",
      rows: [
        [
          data.teacherType === "permanent" && data.wasDifferentTypeBeforePermanent === "true"
            ? "Appointment Date (Original Category) / नियुक्ती मिति (पहिलेको प्रकार)"
            : "Appointment Date / नियुक्ती मिति",
          data.appointmentDate,
        ],
        ...(data.teacherType === "permanent"
          ? ([
              [
                "Different type before Permanent? / स्थायी हुनुअघि फरक प्रकार?",
                data.wasDifferentTypeBeforePermanent === "true" ? "Yes / हो" : data.wasDifferentTypeBeforePermanent === "false" ? "No / होइन" : "—",
              ],
              ...(data.wasDifferentTypeBeforePermanent === "true"
                ? ([["Appointment Date (as Permanent) / स्थायी नियुक्ती मिति", data.permanentAppointmentDate || "—"]] as [string, string][])
                : []),
              ...((data.grade === "second" || data.grade === "first")
                ? ([["Promotion Date (Third → Second) / बढुवा मिति (तृतीय → द्वितीय)", data.promotionDate || "—"]] as [string, string][])
                : []),
              ...(data.grade === "first"
                ? ([["Promotion Date (Second → First) / बढुवा मिति (द्वितीय → प्रथम)", data.promotionDate2 || "—"]] as [string, string][])
                : []),
            ] as [string, string][])
          : []),
        ["Minimum Qualification / न्यूनतम योग्यता", QUALIFICATION_LABELS[data.minQualification] || data.minQualification],
        ["Highest Qualification / उच्चतम योग्यता", QUALIFICATION_LABELS[data.highestQualification] || data.highestQualification],
        ...(data.highestQualification && data.highestQualification !== data.minQualification
          ? ([["Highest Qualification Document / उच्चतम योग्यताको प्रमाणपत्र", data.highestQualificationDocument ? "✓ Uploaded" : "—"]] as [string, string][])
          : []),
        ...(data.teacherType === "permanent"
          ? ([
              ["Extraordinary Leave Taken / लिइसकेको असाधारण बिदा", data.extraordinaryLeave || "—"],
              [
                "Extraordinary Leave Remaining / बाँकी असाधारण बिदा",
                toNepaliDigits(
                  String(Math.max(1095 - (parseInt(nepaliToAscii(data.extraordinaryLeave || "0"), 10) || 0), 0))
                ),
              ],
              ["Transfer Documents / सरुवा कागजातहरू", `${(data.transferDocuments || []).length} file(s)`],
            ] as [string, string][])
          : []),
        ["Age 60 Year / ६० वर्ष", data.ageSixtyYear || "—"],
        ["Remarks / कैफियत", data.remarks || "—"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 6: Review & Submit</h2>
        <p className="text-sm text-gray-400">जानकारी जाँच गर्नुहोस् र पेश गर्नुहोस्</p>
      </div>

      {[
        data.name, data.nameEnglish, data.fatherName, data.gender, data.permanentAddress, data.permanentWardNo,
        data.dob, data.phone, data.email,
        data.district, data.municipality, data.wardNo, data.schoolName,
        data.subject, data.subjectEnglish, data.level, data.teacherType, data.appointmentDate,
        data.minQualification, data.highestQualification,
        data.citizenship, data.degree, data.seeSlcCertificate, data.photo, data.teachingLicense, data.appointmentLetter,
        ...(data.teacherType === "permanent"
          ? [
              data.tokenNo, data.grade, data.wasDifferentTypeBeforePermanent, data.extraordinaryLeave,
              ...(data.wasDifferentTypeBeforePermanent === "true" ? [data.permanentAppointmentDate] : []),
              ...((data.grade === "second" || data.grade === "first") ? [data.promotionDate] : []),
              ...(data.grade === "first" ? [data.promotionDate2] : []),
            ]
          : []),
        ...(data.highestQualification && data.highestQualification !== data.minQualification
          ? [data.highestQualificationDocument]
          : []),
      ].some((v) => !v) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3">
          ⚠️ केही आवश्यक जानकारी भरिएको छैन। कृपया पछाडि फर्केर जाँच गर्नुहोस्।
          (Some required fields are missing. Please go back and review.)
        </div>
      )}

      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-[#0f2044] uppercase tracking-wide mb-1 px-1">
            {section.title}
          </p>
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {section.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 text-right max-w-[55%]">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Registration →"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    // Step 1: Personal
    name: "", nameEnglish: "", fatherName: "", gender: "", permanentAddress: "", permanentWardNo: "",
    dob: "",
    // Step 2: Account
    phone: "", email: "", password: "", confirmPassword: "",
    emailVerified: false, phoneVerified: false,
    // Step 3: School
    district: "", municipality: "", wardNo: "", schoolName: "", schoolEmisCode: "", tokenNo: "",
    subject: "", subjectEnglish: "", level: "", grade: "", teacherType: "",
    // Step 4: Service
    appointmentDate: "", promotionDate: "", minQualification: "", highestQualification: "",
    extraordinaryLeave: "", ageSixtyYear: "", remarks: "",
    // Only relevant when teacherType === "permanent"
    wasDifferentTypeBeforePermanent: "", permanentAppointmentDate: "", promotionDate2: "",
    // Step 5: Documents
    citizenship: "", degree: "", seeSlcCertificate: "", photo: "", teachingLicense: "", appointmentLetter: "",
    // Only required when highestQualification differs from minQualification
    highestQualificationDocument: "",
    transferDocuments: [] as File[],
  });

  function handleChange(field: string, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleTransferDocsChange(files: File[]) {
    setFormData((prev) => ({ ...prev, transferDocuments: files }));
  }

  // ── Single handleSubmit: POSTs full wizard data to /api/ ────────────
  // Teacher model stores everything (name, school, service, docs, email,
  // password) in one record. No separate User creation needed for teachers.
  async function handleSubmit() {
  setSubmitting(true);
  setError("");

  try {
    const payload = new FormData();

    // Step 1: Personal
    payload.append("name", formData.name);
    payload.append("nameEnglish", formData.nameEnglish);
    payload.append("fatherName", formData.fatherName);
    payload.append("gender", formData.gender);
    payload.append("permanentAddress", formData.permanentAddress);
    payload.append("permanentWardNo", nepaliToAscii(formData.permanentWardNo));
    payload.append("dob", nepaliToAscii(formData.dob));

    // Step 2: Account
    payload.append("phone", nepaliToAscii(formData.phone));
    payload.append("email", formData.email);
    payload.append("password", formData.password);

    // Step 3: School
    payload.append("district", formData.district);
    payload.append("municipality", formData.municipality);
    payload.append("wardNo", nepaliToAscii(formData.wardNo));
    payload.append("schoolName", formData.schoolName);
    payload.append("schoolEmisCode", formData.schoolEmisCode);
    payload.append("tokenNo", formData.tokenNo);
    payload.append("subject", formData.subject);
    payload.append("subjectEnglish", formData.subjectEnglish);
    payload.append("level", formData.level);
    payload.append("grade", formData.grade);
    payload.append("teacherType", formData.teacherType);

    // Step 4: Service
    payload.append("appointmentDate", nepaliToAscii(formData.appointmentDate));
    payload.append("promotionDate", nepaliToAscii(formData.promotionDate));
    payload.append("minQualification", formData.minQualification);
    payload.append("highestQualification", formData.highestQualification);
    payload.append("extraordinaryLeave", nepaliToAscii(formData.extraordinaryLeave));
    payload.append("ageSixtyYear", nepaliToAscii(formData.ageSixtyYear));
    payload.append("remarks", formData.remarks);

    // Only meaningful for Permanent teachers -- omitted entirely otherwise
    // so the backend's tri-state (unanswered vs. explicit No) isn't
    // muddied by an empty string from a non-Permanent applicant.
    if (formData.teacherType === "permanent") {
      payload.append("wasDifferentTypeBeforePermanent", formData.wasDifferentTypeBeforePermanent);
      if (formData.wasDifferentTypeBeforePermanent === "true") {
        payload.append("permanentAppointmentDate", nepaliToAscii(formData.permanentAppointmentDate));
      }
      if (formData.grade === "first") {
        payload.append("promotionDate2", nepaliToAscii(formData.promotionDate2));
      }
    }

    // Step 5: Documents (FILES)
    if (formData.citizenship)
      payload.append("citizenship", formData.citizenship as any);

    if (formData.degree)
      payload.append("degree", formData.degree as any);

    if (formData.seeSlcCertificate)
      payload.append("seeSlcCertificate", formData.seeSlcCertificate as any);

    if (formData.photo)
      payload.append("photo", formData.photo as any);

    if (formData.teachingLicense)
      payload.append("teachingLicense", formData.teachingLicense as any);

    if (formData.appointmentLetter)
      payload.append("appointmentLetter", formData.appointmentLetter as any);

    if (formData.highestQualification !== formData.minQualification && formData.highestQualificationDocument)
      payload.append("highestQualificationDocument", formData.highestQualificationDocument as any);

    if (formData.teacherType === "permanent") {
      formData.transferDocuments.forEach((file) => {
        payload.append("transferDocuments", file);
      });
    }

    const res = await fetch(`${API_BASE_URL}/api/`, {
      method: "POST",
      body: payload,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        Object.values(data).flat().join(" ") || "दर्ता गर्न सकिएन।";
      throw new Error(msg);
    }

    window.location.href = "/login";
  } catch (err: any) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
}

  return (
    <div className="min-h-screen bg-[#eaf0fb] flex flex-col">
      <nav className="bg-[#0f2044] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Teacher Registration</p>
            <p className="text-white/60 text-xs">शिक्षक दर्ता फारम</p>
          </div>
        </div>
        <button className="text-white/80 text-sm border border-white/20 px-3 py-1 rounded-lg hover:bg-white/10 transition">
          English / नेपाली
        </button>
      </nav>

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center gap-2 text-sm text-blue-700">
        <span>After submitting, your account will be reviewed and approved by the District Education Head.</span>
        <span className="text-blue-400 mx-2">|</span>
        <span className="text-blue-500">दर्ता पछि विभाग प्रमुखबाट स्वीकृत हुनेछ।</span>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 sm:p-8">
        <div className="w-full max-w-2xl">
          <StepBar current={step} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
            {step === 1 && <Step1 data={formData} onChange={handleChange} onNext={() => setStep(2)} />}
            {step === 2 && <AccountStep data={formData} onChange={handleChange} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step2 data={formData} onChange={handleChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && <Step3 data={formData} onChange={handleChange} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
            {step === 5 && <Step4 data={formData} onChange={handleChange} onTransferDocsChange={handleTransferDocsChange} onNext={() => setStep(6)} onBack={() => setStep(4)} />}
            {step === 6 && <Step5 data={formData} onBack={() => setStep(5)} onSubmit={handleSubmit} submitting={submitting} />}
          </div>
        </div>
      </div>
    </div>
  );
}