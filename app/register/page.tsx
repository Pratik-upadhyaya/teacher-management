"use client";
import { useState } from "react";

// Step indicator at the top
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Personal Info", sub: "व्यक्तिगत" },
    { n: 2, label: "School Info", sub: "विद्यालय" },
    { n: 3, label: "Documents", sub: "कागजात" },
    { n: 4, label: "Review", sub: "समीक्षा" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          {/* Circle */}
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
            <p
              className={`text-xs mt-1 font-medium ${
                current >= step.n ? "text-[#0f2044]" : "text-gray-400"
              }`}
            >
              {step.label}
            </p>
            <p className="text-xs text-gray-400">{step.sub}</p>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-6 mx-1 ${
                current > step.n ? "bg-[#0f2044]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
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
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">
          Step 1: Personal Information
        </h2>
        <p className="text-sm text-gray-400">व्यक्तिगत विवरण भर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full name <span className="text-gray-400 font-normal">/ पूरा नाम</span>
          </label>
          <input
            required
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Ram Shrestha"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
          </label>
          <input
            required
            value={data.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="98XXXXXXXX"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email address <span className="text-gray-400 font-normal">/ इमेल ठेगाना</span>
        </label>
        <input
          type="email"
          required
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="ram@school.edu.np"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-gray-400 font-normal">/ पासवर्ड</span>
          </label>
          <input
            type="password"
            required
            value={data.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm password <span className="text-gray-400 font-normal">/ पुन: पासवर्ड</span>
          </label>
          <input
            type="password"
            required
            value={data.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
        >
          Next: School Info →
        </button>
      </div>
    </form>
  );
}

// ── Step 2: School Info ───────────────────────────────────────────
function Step2({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">
          Step 2: School Information
        </h2>
        <p className="text-sm text-gray-400">विद्यालय सम्बन्धी विवरण भर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-gray-400 font-normal">/ जिल्ला</span>
          </label>
          <select
            required
            value={data.district}
            onChange={(e) => onChange("district", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] bg-white"
          >
            <option value="">Select district</option>
            <option>Kaski</option>
            <option>Syangja</option>
            <option>Tanahun</option>
            <option>Baglung</option>
            <option>Parbat</option>
            <option>Myagdi</option>
            <option>Mustang</option>
            <option>Manang</option>
            <option>Nawalpur</option>
            <option>Gorkha</option>
            <option>Lamjung</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipality <span className="text-gray-400 font-normal">/ नगरपालिका</span>
          </label>
          <input
            required
            value={data.municipality}
            onChange={(e) => onChange("municipality", e.target.value)}
            placeholder="Pokhara Metropolitan"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          School name <span className="text-gray-400 font-normal">/ विद्यालयको नाम</span>
        </label>
        <input
          required
          value={data.schoolName}
          onChange={(e) => onChange("schoolName", e.target.value)}
          placeholder="Shree Bal Kalyan Madhyamik Vidhyalaya"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TSC Registration No.{" "}
            <span className="text-gray-400 font-normal">/ सेवा नं.</span>
          </label>
          <input
            required
            value={data.tscNo}
            onChange={(e) => onChange("tscNo", e.target.value)}
            placeholder="TSC-2080-04521"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment date{" "}
            <span className="text-gray-400 font-normal">/ नियुक्ति मिति</span>
          </label>
          <input
            required
            value={data.appointmentDate}
            onChange={(e) => onChange("appointmentDate", e.target.value)}
            placeholder="2080 / 03 / 15 BS"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-gray-400 font-normal">/ विषय</span>
          </label>
          <select
            required
            value={data.subject}
            onChange={(e) => onChange("subject", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] bg-white"
          >
            <option value="">Select subject</option>
            <option>Science / विज्ञान</option>
            <option>Mathematics / गणित</option>
            <option>Nepali / नेपाली</option>
            <option>English / अंग्रेजी</option>
            <option>Social Studies / सामाजिक</option>
            <option>Health / स्वास्थ्य</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Classes taught{" "}
            <span className="text-gray-400 font-normal">/ कक्षा</span>
          </label>
          <select
            required
            value={data.classes}
            onChange={(e) => onChange("classes", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] bg-white"
          >
            <option value="">Select classes</option>
            <option>Class 1 - 5</option>
            <option>Class 6 - 8</option>
            <option>Class 8, 9, 10</option>
            <option>Class 11, 12</option>
          </select>
        </div>
      </div>

      {/* Appointment letter upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload appointment letter{" "}
          <span className="text-gray-400 font-normal">/ नियुक्तिपत्र अपलोड गर्नुहोस्</span>
        </label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-[#0f2044] transition">
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) =>
              onChange("appointmentLetter", e.target.files?.[0]?.name ?? "")
            }
          />
          <div className="text-2xl mb-2">↑</div>
          <p className="text-sm text-gray-500">
            {data.appointmentLetter
              ? data.appointmentLetter
              : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF or Image · Max 5MB &nbsp;|&nbsp; PDF वा तस्बिर · अधिकतम ५ MB
          </p>
        </label>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          ← Back / पछाडि
        </button>
        <button
          type="submit"
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
        >
          Next: Upload Documents →
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Documents ─────────────────────────────────────────────
const DOC_FIELDS = [
  { key: "citizenship", label: "Citizenship", sub: "नागरिकता" },
  { key: "degree", label: "Degree Certificate", sub: "प्रमाणपत्र" },
  { key: "transcript", label: "Transcript", sub: "अंकतालिका" },
  { key: "teachingLicense", label: "Teaching License", sub: "शिक्षण अनुमतिपत्र" },
];

function Step3({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">
          Step 3: Upload Documents
        </h2>
        <p className="text-sm text-gray-400">कागजातहरू अपलोड गर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {DOC_FIELDS.map((doc) => (
          <div key={doc.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {doc.label}{" "}
              <span className="text-gray-400 font-normal">/ {doc.sub}</span>
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#0f2044] transition">
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) =>
                  onChange(doc.key, e.target.files?.[0]?.name ?? "")
                }
              />
              {data[doc.key] ? (
                <p className="text-sm text-[#0f2044] font-medium text-center">
                  ✓ {data[doc.key]}
                </p>
              ) : (
                <>
                  <div className="text-xl mb-1 text-gray-400">↑</div>
                  <p className="text-xs text-gray-400">Click to upload</p>
                </>
              )}
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          ← Back / पछाडि
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────────
function Step4({
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
  const rows = [
    ["Full Name", data.name],
    ["Phone", data.phone],
    ["Email", data.email],
    ["District", data.district],
    ["Municipality", data.municipality],
    ["School", data.schoolName],
    ["TSC No.", data.tscNo],
    ["Appointment Date", data.appointmentDate],
    ["Subject", data.subject],
    ["Classes", data.classes],
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">
          Step 4: Review & Submit
        </h2>
        <p className="text-sm text-gray-400">जानकारी जाँच गर्नुहोस् र पेश गर्नुहोस्</p>
      </div>

      <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value || "—"}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
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
    // Step 1
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Step 2
    district: "",
    municipality: "",
    schoolName: "",
    tscNo: "",
    appointmentDate: "",
    subject: "",
    classes: "",
    appointmentLetter: "",
    // Step 3
    citizenship: "",
    degree: "",
    transcript: "",
    teachingLicense: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/register/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) throw new Error("Registration failed. Please try again.");
      window.location.href = "/login";
    } catch (err: any) {
      setError(err.message);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eaf0fb] flex flex-col">

      {/* Navbar */}
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
          NP / EN
        </button>
      </nav>

      {/* Info banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center gap-2 text-sm text-blue-700">
        <span>ℹ️</span>
        <span>
          After submitting, your account will be reviewed and approved by the
          District Education Head. You will be notified by email.
        </span>
        <span className="text-blue-400 mx-2">|</span>
        <span className="text-blue-500">
          दर्ता पछि विभाग प्रमुखबाट स्वीकृत हुनेछ।
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-2xl">
          <StepBar current={step} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-8">
            {step === 1 && (
              <Step1
                data={formData}
                onChange={handleChange}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2
                data={formData}
                onChange={handleChange}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3
                data={formData}
                onChange={handleChange}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <Step4
                data={formData}
                onBack={() => setStep(3)}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}