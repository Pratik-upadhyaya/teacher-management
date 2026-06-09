"use client";
import { useState, useEffect, useRef } from "react";

// ── Nepalify hook ─────────────────────────────────────────────────
function useNepaliInput() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    // nepalify is a UMD/CJS module — import dynamically to avoid SSR issues
    import("nepalify").then((mod) => {
      const nepalify = mod.default ?? mod;
      nepalify.handleEvent(el);
    });
    return () => {
      // remove listeners on unmount
      import("nepalify").then((mod) => {
        const nepalify = mod.default ?? mod;
        nepalify.disableEvent(el);
      });
    };
  }, []);

  return ref;
}

// ── Districts & Municipalities ────────────────────────────────────
const DISTRICTS: Record<string, string[]> = {
  Kaski: [
    "Pokhara Metropolitan City",
    "Annapurna Rural Municipality",
    "Madi Rural Municipality",
    "Machhapuchchhre Rural Municipality",
    "Rupa Rural Municipality",
  ],
  Syangja: [
    "Putalibazar Municipality",
    "Galyang Municipality",
    "Chapakot Municipality",
    "Biruwa Municipality",
    "Arjunchaupari Rural Municipality",
    "Harinas Rural Municipality",
    "Kaligandaki Rural Municipality",
    "Phedikhola Rural Municipality",
    "Waling Municipality",
  ],
  Tanahun: [
    "Byas Municipality",
    "Bhimad Municipality",
    "Shuklagandaki Municipality",
    "Bandipur Rural Municipality",
    "Devghat Rural Municipality",
    "Ghiring Rural Municipality",
    "Myagde Rural Municipality",
    "Rhishing Rural Municipality",
    "Anbukhaireni Rural Municipality",
  ],
  Baglung: [
    "Baglung Municipality",
    "Galkot Municipality",
    "Dhorpatan Municipality",
    "Bareng Rural Municipality",
    "Badigad Rural Municipality",
    "Taman Rural Municipality",
    "Nisikhola Rural Municipality",
    "Jaimini Municipality",
    "Kanthekhola Rural Municipality",
  ],
  Parbat: [
    "Kushma Municipality",
    "Phalebas Municipality",
    "Modi Rural Municipality",
    "Mahashila Rural Municipality",
    "Painyu Rural Municipality",
    "Bihadi Rural Municipality",
    "Jaljala Rural Municipality",
  ],
  Myagdi: [
    "Beni Municipality",
    "Mangala Rural Municipality",
    "Malika Rural Municipality",
    "Annapurna Rural Municipality",
    "Dhaulagiri Rural Municipality",
    "Raghuganga Rural Municipality",
  ],
  Mustang: [
    "Mustang Rural Municipality",
    "Gharapjhong Rural Municipality",
    "Lomanthang Rural Municipality",
    "Thasang Rural Municipality",
    "Waragung Muktikhsetra Rural Municipality",
  ],
  Manang: [
    "Chame Rural Municipality",
    "Narpa Bhumi Rural Municipality",
    "Narphu Rural Municipality",
    "Manang Disyang Rural Municipality",
  ],
  Nawalpur: [
    "Kawasoti Municipality",
    "Gaindakot Municipality",
    "Madhyabindu Municipality",
    "Bulingtar Rural Municipality",
    "Devchuli Municipality",
    "Hupsekot Municipality",
    "Binayi Tribeni Rural Municipality",
    "Baudimai Rural Municipality",
  ],
  Gorkha: [
    "Gorkha Municipality",
    "Palungtar Municipality",
    "Sulikot Rural Municipality",
    "Siranchok Rural Municipality",
    "Arpak Dudhapokhara Rural Municipality",
    "Bhimsenthapa Rural Municipality",
    "Tsum Nubri Rural Municipality",
    "Dharche Rural Municipality",
    "Gandaki Rural Municipality",
    "Ajirkot Rural Municipality",
  ],
  Lamjung: [
    "Besisahar Municipality",
    "Madhya Nepal Municipality",
    "Rainas Municipality",
    "Sundarbazar Municipality",
    "Dordi Rural Municipality",
    "Dudhpokhari Rural Municipality",
    "Kwholasothar Rural Municipality",
    "Marsyangdi Rural Municipality",
  ],
};

// ── Shared input class helper ─────────────────────────────────────
function inputClass(errors: Record<string, string>, field: string) {
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

// ── Step indicator ────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Personal", sub: "व्यक्तिगत" },
    { n: 2, label: "School", sub: "विद्यालय" },
    { n: 3, label: "Service", sub: "सेवा" },
    { n: 4, label: "Documents", sub: "कागजात" },
    { n: 5, label: "Review", sub: "समीक्षा" },
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Nepalify refs
  const nameRef = useNepaliInput();
  const fatherNameRef = useNepaliInput();
  const addressRef = useNepaliInput();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.name.trim())
      errs.name = "शिक्षकको नाम आवश्यक छ";

    if (!data.fatherName.trim())
      errs.fatherName = "बाबुको नाम आवश्यक छ";

    if (!data.permanentAddress.trim())
      errs.permanentAddress = "स्थायी ठेगाना आवश्यक छ";

    if (!data.dob.trim())
      errs.dob = "जन्म मिति आवश्यक छ";
    else if (!/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(data.dob))
      errs.dob = "ढाँचा: २०८०/०३/१५";

    if (!data.phone.trim())
      errs.phone = "फोन नम्बर आवश्यक छ";
    else if (!/^(98|97)\d{8}$/.test(data.phone))
      errs.phone = "मान्य नेपाली नम्बर चाहिन्छ (98/97XXXXXXXX)";

    if (!data.password)
      errs.password = "पासवर्ड आवश्यक छ";
    else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(data.password))
      errs.password = "कम्तीमा ८ अक्षर, १ अक्षर र १ अंक";

    if (!data.confirmPassword)
      errs.confirmPassword = "पासवर्ड पुन: लेख्नुहोस्";
    else if (data.password !== data.confirmPassword)
      errs.confirmPassword = "पासवर्ड मेल खाएन";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 1: Personal Information</h2>
        <p className="text-sm text-gray-400">व्यक्तिगत विवरण भर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Teacher name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teacher's Name <span className="text-gray-400 font-normal">/ शिक्षकको नाम</span>
          </label>
          <input
            ref={nameRef}
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="राम श्रेष्ठ"
            className={inputClass(errors, "name")}
          />
          <p className="text-gray-400 text-xs mt-0.5">Type in English — converts to Nepali</p>
          <FieldError msg={errors.name} />
        </div>

        {/* Father's name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Name <span className="text-gray-400 font-normal">/ बाबुको नाम</span>
          </label>
          <input
            ref={fatherNameRef}
            value={data.fatherName}
            onChange={(e) => onChange("fatherName", e.target.value)}
            placeholder="हरि श्रेष्ठ"
            className={inputClass(errors, "fatherName")}
          />
          <FieldError msg={errors.fatherName} />
        </div>
      </div>

      {/* Permanent address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permanent Address <span className="text-gray-400 font-normal">/ स्थायी ठेगाना</span>
        </label>
        <input
          ref={addressRef}
          value={data.permanentAddress}
          onChange={(e) => onChange("permanentAddress", e.target.value)}
          placeholder="पोखरा-१०, कास्की"
          className={inputClass(errors, "permanentAddress")}
        />
        <FieldError msg={errors.permanentAddress} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date of birth BS */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth (BS) <span className="text-gray-400 font-normal">/ जन्म मिति</span>
          </label>
          <input
            value={data.dob}
            onChange={(e) => onChange("dob", e.target.value)}
            placeholder="२०४०/०५/१५"
            className={inputClass(errors, "dob")}
          />
          <FieldError msg={errors.dob} />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
          </label>
          <input
            value={data.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="98XXXXXXXX"
            className={inputClass(errors, "phone")}
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-gray-400 font-normal">/ इमेल</span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="ram@school.edu.np"
          className={inputClass(errors, "email")}
        />
        <FieldError msg={errors.email} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-gray-400 font-normal">/ पासवर्ड</span>
          </label>
          <input
            type="password"
            value={data.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="••••••••"
            className={inputClass(errors, "password")}
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
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            placeholder="••••••••"
            className={inputClass(errors, "confirmPassword")}
          />
          <FieldError msg={errors.confirmPassword} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
          Next: School Info →
        </button>
      </div>
    </form>
  );
}

// ── Step 2: School & Position ─────────────────────────────────────
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const schoolNameRef = useNepaliInput();

  const municipalities = data.district ? DISTRICTS[data.district] ?? [] : [];

  // Reset municipality when district changes
  function handleDistrictChange(value: string) {
    onChange("district", value);
    onChange("municipality", "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.district) errs.district = "जिल्ला छान्नुहोस्";
    if (!data.municipality) errs.municipality = "नगरपालिका छान्नुहोस्";
    if (!data.schoolName.trim()) errs.schoolName = "विद्यालयको नाम आवश्यक छ";

    if (!data.tokenNo.trim())
      errs.tokenNo = "संकेत नं आवश्यक छ";
    else if (!/^[a-zA-Z0-9\-]+$/.test(data.tokenNo))
      errs.tokenNo = "अक्षर, अंक र हाइफन मात्र";

    if (!data.subject) errs.subject = "विषय छान्नुहोस्";
    if (!data.level) errs.level = "तह छान्नुहोस्";
    if (!data.grade) errs.grade = "श्रेणी छान्नुहोस्";
    if (!data.teacherType) errs.teacherType = "प्रकार छान्नुहोस्";

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 2: School & Position</h2>
        <p className="text-sm text-gray-400">विद्यालय तथा पद सम्बन्धी विवरण</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-gray-400 font-normal">/ जिल्ला</span>
          </label>
          <select
            value={data.district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className={inputClass(errors, "district")}
          >
            <option value="">जिल्ला छान्नुहोस्</option>
            {Object.keys(DISTRICTS).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <FieldError msg={errors.district} />
        </div>

        {/* Municipality — filtered by district */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipality <span className="text-gray-400 font-normal">/ नगरपालिका</span>
          </label>
          <select
            value={data.municipality}
            onChange={(e) => onChange("municipality", e.target.value)}
            disabled={!data.district}
            className={inputClass(errors, "municipality") + (!data.district ? " opacity-50 cursor-not-allowed" : "")}
          >
            <option value="">{data.district ? "नगरपालिका छान्नुहोस्" : "पहिले जिल्ला छान्नुहोस्"}</option>
            {municipalities.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <FieldError msg={errors.municipality} />
        </div>
      </div>

      {/* School name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          School Name <span className="text-gray-400 font-normal">/ विद्यालयको नाम</span>
        </label>
        <input
          ref={schoolNameRef}
          value={data.schoolName}
          onChange={(e) => onChange("schoolName", e.target.value)}
          placeholder="श्री बाल कल्याण माध्यमिक विद्यालय"
          className={inputClass(errors, "schoolName")}
        />
        <p className="text-gray-400 text-xs mt-0.5">Type in English — converts to Nepali</p>
        <FieldError msg={errors.schoolName} />
      </div>

      {/* Token / Code no */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Code/Token No. <span className="text-gray-400 font-normal">/ संकेत नं</span>
        </label>
        <input
          value={data.tokenNo}
          onChange={(e) => onChange("tokenNo", e.target.value)}
          placeholder="TSC-2080-04521"
          className={inputClass(errors, "tokenNo")}
        />
        <FieldError msg={errors.tokenNo} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-gray-400 font-normal">/ विषय</span>
          </label>
          <select
            value={data.subject}
            onChange={(e) => onChange("subject", e.target.value)}
            className={inputClass(errors, "subject")}
          >
            <option value="">विषय छान्नुहोस्</option>
            <option value="science">Science / विज्ञान</option>
            <option value="math">Mathematics / गणित</option>
            <option value="nepali">Nepali / नेपाली</option>
            <option value="english">English / अंग्रेजी</option>
            <option value="social">Social Studies / सामाजिक</option>
            <option value="health">Health / स्वास्थ्य</option>
          </select>
          <FieldError msg={errors.subject} />
        </div>

        {/* Level — तह */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level <span className="text-gray-400 font-normal">/ तह</span>
          </label>
          <select
            value={data.level}
            onChange={(e) => onChange("level", e.target.value)}
            className={inputClass(errors, "level")}
          >
            <option value="">तह छान्नुहोस्</option>
            <option value="level_1">Level 1 / तह १</option>
            <option value="level_2">Level 2 / तह २</option>
            <option value="level_3">Level 3 / तह ३</option>
          </select>
          <FieldError msg={errors.level} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Grade — श्रेणी */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade <span className="text-gray-400 font-normal">/ श्रेणी</span>
          </label>
          <select
            value={data.grade}
            onChange={(e) => onChange("grade", e.target.value)}
            className={inputClass(errors, "grade")}
          >
            <option value="">श्रेणी छान्नुहोस्</option>
            <option value="first">First / प्रथम</option>
            <option value="second">Second / द्वितीय</option>
            <option value="third">Third / तृतीय</option>
          </select>
          <FieldError msg={errors.grade} />
        </div>

        {/* Type — प्रकार */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="text-gray-400 font-normal">/ प्रकार</span>
          </label>
          <select
            value={data.teacherType}
            onChange={(e) => onChange("teacherType", e.target.value)}
            className={inputClass(errors, "teacherType")}
          >
            <option value="">प्रकार छान्नुहोस्</option>
            <option value="permanent">Permanent / स्थायी</option>
            <option value="temporary">Temporary / अस्थायी</option>
            <option value="relief">Relief / राहत</option>
          </select>
          <FieldError msg={errors.teacherType} />
        </div>
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
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const remarksRef = useNepaliInput();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!data.appointmentDate.trim())
      errs.appointmentDate = "नियुक्ती मिति आवश्यक छ";
    else if (!/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(data.appointmentDate))
      errs.appointmentDate = "ढाँचा: २०८०/०३/१५";

    if (!data.qualification) errs.qualification = "शैक्षिक योग्यता छान्नुहोस्";

    // Optional fields — no validation needed, just pass through
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 3: Service Details</h2>
        <p className="text-sm text-gray-400">सेवा सम्बन्धी विवरण</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Appointment date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Date <span className="text-gray-400 font-normal">/ नियुक्ती मिति</span>
          </label>
          <input
            value={data.appointmentDate}
            onChange={(e) => onChange("appointmentDate", e.target.value)}
            placeholder="२०८०/०३/१५"
            className={inputClass(errors, "appointmentDate")}
          />
          <FieldError msg={errors.appointmentDate} />
        </div>

        {/* Promotion date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Promotion Date <span className="text-gray-400 font-normal">/ बढुवा मिति</span>
            <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
          </label>
          <input
            value={data.promotionDate}
            onChange={(e) => onChange("promotionDate", e.target.value)}
            placeholder="२०८२/०१/०१"
            className={inputClass(errors, "promotionDate")}
          />
        </div>
      </div>

      {/* Educational qualification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Educational Qualification <span className="text-gray-400 font-normal">/ शैक्षिक योग्यता</span>
        </label>
        <select
          value={data.qualification}
          onChange={(e) => onChange("qualification", e.target.value)}
          className={inputClass(errors, "qualification")}
        >
          <option value="">योग्यता छान्नुहोस्</option>
          <option value="slc">SLC / SEE</option>
          <option value="plus2">+2 / Intermediate / उच्च माध्यमिक</option>
          <option value="bachelor">Bachelor / स्नातक</option>
          <option value="master">Master / स्नातकोत्तर</option>
          <option value="mphil_phd">M.Phil / PhD</option>
        </select>
        <FieldError msg={errors.qualification} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Extraordinary leave */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Extraordinary Leave <span className="text-gray-400 font-normal">/ असाधारण बिदा</span>
            <span className="text-gray-400 font-normal text-xs ml-1">(days / optional)</span>
          </label>
          <input
            type="number"
            min="0"
            value={data.extraordinaryLeave}
            onChange={(e) => onChange("extraordinaryLeave", e.target.value)}
            placeholder="0"
            className={inputClass(errors, "extraordinaryLeave")}
          />
        </div>

        {/* Accumulated leave till Chaitra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Accumulated Leave till Chaitra <span className="text-gray-400 font-normal">/ चैतसम्मको संचित बि.बि.</span>
          </label>
          <input
            type="number"
            min="0"
            value={data.accumulatedLeave}
            onChange={(e) => onChange("accumulatedLeave", e.target.value)}
            placeholder="0"
            className={inputClass(errors, "accumulatedLeave")}
          />
        </div>
      </div>

      {/* Age turning 60 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year turning 60 (BS) <span className="text-gray-400 font-normal">/ ६० वर्ष पुग्ने उमेर</span>
          <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
        </label>
        <input
          value={data.ageSixtyYear}
          onChange={(e) => onChange("ageSixtyYear", e.target.value)}
          placeholder="२१००/०५/१५"
          className={inputClass(errors, "ageSixtyYear")}
        />
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Remarks <span className="text-gray-400 font-normal">/ कैफियत</span>
          <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
        </label>
        <input
          ref={remarksRef}
          value={data.remarks}
          onChange={(e) => onChange("remarks", e.target.value)}
          placeholder="थप विवरण..."
          className={inputClass(errors, "remarks")}
        />
        <p className="text-gray-400 text-xs mt-0.5">Type in English — converts to Nepali</p>
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
  { key: "citizenship", label: "Citizenship", sub: "नागरिकता" },
  { key: "degree", label: "Degree Certificate", sub: "प्रमाणपत्र" },
  { key: "transcript", label: "Transcript", sub: "अंकतालिका" },
  { key: "teachingLicense", label: "Teaching License", sub: "शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter", sub: "नियुक्तिपत्र" },
];

function Step4({
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
        <h2 className="text-lg font-bold text-[#0f2044]">Step 4: Upload Documents</h2>
        <p className="text-sm text-gray-400">कागजातहरू अपलोड गर्नुहोस्</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOC_FIELDS.map((doc) => (
          <div key={doc.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {doc.label} <span className="text-gray-400 font-normal">/ {doc.sub}</span>
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#0f2044] transition">
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => onChange(doc.key, e.target.files?.[0]?.name ?? "")}
              />
              {data[doc.key] ? (
                <p className="text-sm text-[#0f2044] font-medium text-center">✓ {data[doc.key]}</p>
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
        <button type="button" onClick={onBack} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
          ← Back / पछाडि
        </button>
        <button type="button" onClick={onNext} className="bg-[#0f2044] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition">
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
  const qualificationLabels: Record<string, string> = {
    slc: "SLC / SEE",
    plus2: "+2 / Intermediate",
    bachelor: "Bachelor / स्नातक",
    master: "Master / स्नातकोत्तर",
    mphil_phd: "M.Phil / PhD",
  };

  const typeLabels: Record<string, string> = {
    permanent: "Permanent / स्थायी",
    temporary: "Temporary / अस्थायी",
    relief: "Relief / राहत",
  };

  const sections = [
    {
      title: "Personal Info / व्यक्तिगत",
      rows: [
        ["Teacher's Name / शिक्षकको नाम", data.name],
        ["Father's Name / बाबुको नाम", data.fatherName],
        ["Permanent Address / स्थायी ठेगाना", data.permanentAddress],
        ["Date of Birth (BS) / जन्म मिति", data.dob],
        ["Phone / फोन", data.phone],
        ["Email / इमेल", data.email],
      ],
    },
    {
      title: "School & Position / विद्यालय तथा पद",
      rows: [
        ["District / जिल्ला", data.district],
        ["Municipality / नगरपालिका", data.municipality],
        ["School / विद्यालय", data.schoolName],
        ["Code No. / संकेत नं", data.tokenNo],
        ["Subject / विषय", data.subject],
        ["Level / तह", data.level],
        ["Grade / श्रेणी", data.grade],
        ["Type / प्रकार", typeLabels[data.teacherType] || data.teacherType],
      ],
    },
    {
      title: "Service Details / सेवा विवरण",
      rows: [
        ["Appointment Date / नियुक्ती मिति", data.appointmentDate],
        ["Promotion Date / बढुवा मिति", data.promotionDate || "—"],
        ["Qualification / योग्यता", qualificationLabels[data.qualification] || data.qualification],
        ["Extraordinary Leave / असाधारण बिदा", data.extraordinaryLeave || "0"],
        ["Accumulated Leave / संचित बि.बि.", data.accumulatedLeave || "0"],
        ["Age 60 Year / ६० वर्ष", data.ageSixtyYear || "—"],
        ["Remarks / कैफियत", data.remarks || "—"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f2044]">Step 5: Review & Submit</h2>
        <p className="text-sm text-gray-400">जानकारी जाँच गर्नुहोस् र पेश गर्नुहोस्</p>
      </div>

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
    // Step 1 — Personal
    name: "",
    fatherName: "",
    permanentAddress: "",
    dob: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Step 2 — School & Position
    district: "",
    municipality: "",
    schoolName: "",
    tokenNo: "",
    subject: "",
    level: "",
    grade: "",
    teacherType: "",
    // Step 3 — Service
    appointmentDate: "",
    promotionDate: "",
    qualification: "",
    extraordinaryLeave: "",
    accumulatedLeave: "",
    ageSixtyYear: "",
    remarks: "",
    // Step 4 — Documents
    citizenship: "",
    degree: "",
    transcript: "",
    teachingLicense: "",
    appointmentLetter: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Registration failed. Please try again.");
      window.location.href = "/login";
    } catch (err: any) {
      setError(err.message);
      setStep(5);
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
        <span>After submitting, your account will be reviewed and approved by the District Education Head.</span>
        <span className="text-blue-400 mx-2">|</span>
        <span className="text-blue-500">दर्ता पछि विभाग प्रमुखबाट स्वीकृत हुनेछ।</span>
      </div>

      {/* Content */}
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
            {step === 2 && <Step2 data={formData} onChange={handleChange} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 data={formData} onChange={handleChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 data={formData} onChange={handleChange} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
            {step === 5 && <Step5 data={formData} onBack={() => setStep(4)} onSubmit={handleSubmit} submitting={submitting} />}
          </div>
        </div>
      </div>
    </div>
  );
}