"use client";
import NepaliInput from "@/components/NepaliInput";
import NepaliNumberInput, { nepaliToAscii, toNepaliDigits } from "@/components/NepaliNumberInput";
import { useState } from "react";

// ── Districts & Municipalities ────────────────────────────────────
const DISTRICTS: Record<string, { en: string; np: string; municipalities: { en: string; np: string }[] }> = {
  Kaski: {
    en: "Kaski",
    np: "कास्की",
    municipalities: [
      { en: "Pokhara Metropolitan City", np: "पोखरा महानगरपालिका" },
      { en: "Annapurna Rural Municipality", np: "अन्नपूर्ण गाउँपालिका" },
      { en: "Madi Rural Municipality", np: "माडी गाउँपालिका" },
      { en: "Machhapuchchhre Rural Municipality", np: "माछापुच्छ्रे गाउँपालिका" },
      { en: "Rupa Rural Municipality", np: "रूपा गाउँपालिका" },
    ],
  },
  Syangja: {
    en: "Syangja",
    np: "स्याङ्जा",
    municipalities: [
      { en: "Putalibazar Municipality", np: "पुतलीबजार नगरपालिका" },
      { en: "Galyang Municipality", np: "गल्याङ नगरपालिका" },
      { en: "Chapakot Municipality", np: "चापाकोट नगरपालिका" },
      { en: "Biruwa Municipality", np: "बिरुवा नगरपालिका" },
      { en: "Arjunchaupari Rural Municipality", np: "अर्जुनचौपारी गाउँपालिका" },
      { en: "Harinas Rural Municipality", np: "हरिनास गाउँपालिका" },
      { en: "Kaligandaki Rural Municipality", np: "कालीगण्डकी गाउँपालिका" },
      { en: "Phedikhola Rural Municipality", np: "फेदीखोला गाउँपालिका" },
      { en: "Waling Municipality", np: "वालिङ नगरपालिका" },
    ],
  },
  Tanahun: {
    en: "Tanahun",
    np: "तनहुँ",
    municipalities: [
      { en: "Byas Municipality", np: "व्यास नगरपालिका" },
      { en: "Bhimad Municipality", np: "भिमाद नगरपालिका" },
      { en: "Shuklagandaki Municipality", np: "शुक्लागण्डकी नगरपालिका" },
      { en: "Bandipur Rural Municipality", np: "बन्दीपुर गाउँपालिका" },
      { en: "Devghat Rural Municipality", np: "देवघाट गाउँपालिका" },
      { en: "Ghiring Rural Municipality", np: "घिरिङ गाउँपालिका" },
      { en: "Myagde Rural Municipality", np: "म्याग्दे गाउँपालिका" },
      { en: "Rhishing Rural Municipality", np: "ऋषिङ गाउँपालिका" },
      { en: "Anbukhaireni Rural Municipality", np: "आँबुखैरेनी गाउँपालिका" },
    ],
  },
  Baglung: {
    en: "Baglung",
    np: "बागलुङ",
    municipalities: [
      { en: "Baglung Municipality", np: "बागलुङ नगरपालिका" },
      { en: "Galkot Municipality", np: "गल्कोट नगरपालिका" },
      { en: "Dhorpatan Municipality", np: "ढोरपाटन नगरपालिका" },
      { en: "Bareng Rural Municipality", np: "बारेङ गाउँपालिका" },
      { en: "Badigad Rural Municipality", np: "बडिगाड गाउँपालिका" },
      { en: "Taman Rural Municipality", np: "तमान गाउँपालिका" },
      { en: "Nisikhola Rural Municipality", np: "निसीखोला गाउँपालिका" },
      { en: "Jaimini Municipality", np: "जैमिनी नगरपालिका" },
      { en: "Kanthekhola Rural Municipality", np: "काँठेखोला गाउँपालिका" },
    ],
  },
  Parbat: {
    en: "Parbat",
    np: "पर्वत",
    municipalities: [
      { en: "Kushma Municipality", np: "कुश्मा नगरपालिका" },
      { en: "Phalebas Municipality", np: "फलेबास नगरपालिका" },
      { en: "Modi Rural Municipality", np: "मोदी गाउँपालिका" },
      { en: "Mahashila Rural Municipality", np: "महाशिला गाउँपालिका" },
      { en: "Painyu Rural Municipality", np: "पैयूँ गाउँपालिका" },
      { en: "Bihadi Rural Municipality", np: "विहादी गाउँपालिका" },
      { en: "Jaljala Rural Municipality", np: "जलजला गाउँपालिका" },
    ],
  },
  Myagdi: {
    en: "Myagdi",
    np: "म्याग्दी",
    municipalities: [
      { en: "Beni Municipality", np: "बेनी नगरपालिका" },
      { en: "Mangala Rural Municipality", np: "मंगला गाउँपालिका" },
      { en: "Malika Rural Municipality", np: "मालिका गाउँपालिका" },
      { en: "Annapurna Rural Municipality", np: "अन्नपूर्ण गाउँपालिका" },
      { en: "Dhaulagiri Rural Municipality", np: "धौलागिरी गाउँपालिका" },
      { en: "Raghuganga Rural Municipality", np: "रघुगंगा गाउँपालिका" },
    ],
  },
  Mustang: {
    en: "Mustang",
    np: "मुस्ताङ",
    municipalities: [
      { en: "Mustang Rural Municipality", np: "मुस्ताङ गाउँपालिका" },
      { en: "Gharapjhong Rural Municipality", np: "घरपझोङ गाउँपालिका" },
      { en: "Lomanthang Rural Municipality", np: "लोमन्थाङ गाउँपालिका" },
      { en: "Thasang Rural Municipality", np: "थसाङ गाउँपालिका" },
      { en: "Waragung Muktikhsetra Rural Municipality", np: "वारागुङ मुक्तिक्षेत्र गाउँपालिका" },
    ],
  },
  Manang: {
    en: "Manang",
    np: "मनाङ",
    municipalities: [
      { en: "Chame Rural Municipality", np: "चामे गाउँपालिका" },
      { en: "Narpa Bhumi Rural Municipality", np: "नार्पा भूमि गाउँपालिका" },
      { en: "Narphu Rural Municipality", np: "नार्फु गाउँपालिका" },
      { en: "Manang Disyang Rural Municipality", np: "मनाङ डिसयाङ गाउँपालिका" },
    ],
  },
  Nawalpur: {
    en: "Nawalpur",
    np: "नवलपुर",
    municipalities: [
      { en: "Kawasoti Municipality", np: "कावासोती नगरपालिका" },
      { en: "Gaindakot Municipality", np: "गैंडाकोट नगरपालिका" },
      { en: "Madhyabindu Municipality", np: "मध्यविन्दु नगरपालिका" },
      { en: "Bulingtar Rural Municipality", np: "बुलिङटार गाउँपालिका" },
      { en: "Devchuli Municipality", np: "देवचुली नगरपालिका" },
      { en: "Hupsekot Municipality", np: "हुप्सेकोट नगरपालिका" },
      { en: "Binayi Tribeni Rural Municipality", np: "विनायी त्रिवेणी गाउँपालिका" },
      { en: "Baudimai Rural Municipality", np: "बौदीमाई गाउँपालिका" },
    ],
  },
  Gorkha: {
    en: "Gorkha",
    np: "गोरखा",
    municipalities: [
      { en: "Gorkha Municipality", np: "गोरखा नगरपालिका" },
      { en: "Palungtar Municipality", np: "पालुङटार नगरपालिका" },
      { en: "Sulikot Rural Municipality", np: "सुलीकोट गाउँपालिका" },
      { en: "Siranchok Rural Municipality", np: "सिरानचोक गाउँपालिका" },
      { en: "Arpak Dudhapokhara Rural Municipality", np: "अर्पक दूधपोखरी गाउँपालिका" },
      { en: "Bhimsenthapa Rural Municipality", np: "भिमसेनथापा गाउँपालिका" },
      { en: "Tsum Nubri Rural Municipality", np: "तसुम नुब्री गाउँपालिका" },
      { en: "Dharche Rural Municipality", np: "धार्चे गाउँपालिका" },
      { en: "Gandaki Rural Municipality", np: "गण्डकी गाउँपालिका" },
      { en: "Ajirkot Rural Municipality", np: "अजिरकोट गाउँपालिका" },
    ],
  },
  Lamjung: {
    en: "Lamjung",
    np: "लम्जुङ",
    municipalities: [
      { en: "Besisahar Municipality", np: "बेसीशहर नगरपालिका" },
      { en: "Madhya Nepal Municipality", np: "मध्यनेपाल नगरपालिका" },
      { en: "Rainas Municipality", np: "रायनास नगरपालिका" },
      { en: "Sundarbazar Municipality", np: "सुन्दरबजार नगरपालिका" },
      { en: "Dordi Rural Municipality", np: "दोर्दी गाउँपालिका" },
      { en: "Dudhpokhari Rural Municipality", np: "दूधपोखरी गाउँपालिका" },
      { en: "Kwholasothar Rural Municipality", np: "क्व्होलासोथर गाउँपालिका" },
      { en: "Marsyangdi Rural Municipality", np: "मर्स्याङ्दी गाउँपालिका" },
    ],
  },
};

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
    } else {
      // BS months can have up to 32 days; use 32 as ceiling
      if (day < 1 || day > 32) {
        errs[field] = `दिन १ देखि ${toNepaliDigits("32")} भित्र हुनुपर्छ`;
      }
    }
  }
}

// ── Step 1: Personal Info ─────────────────────────────────────────
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

    if (!data.name.trim())
      errs.name = "शिक्षकको नाम आवश्यक छ";

    if (!data.fatherName.trim())
      errs.fatherName = "बाबुको नाम आवश्यक छ";

    if (!data.permanentAddress.trim())
      errs.permanentAddress = "स्थायी ठेगाना आवश्यक छ";

    validateNepaliDate(data.dob, errs, "dob", "जन्म मिति");

    const asciiPhone = nepaliToAscii(data.phone.trim());
    if (!data.phone.trim())
      errs.phone = "फोन नम्बर आवश्यक छ";
    else if (!/^(98|97)\d{8}$/.test(asciiPhone))
      errs.phone = "मान्य नेपाली नम्बर (९८/९७XXXXXXXX)";

    if (!data.email.trim())
      errs.email = "इमेल आवश्यक छ";

    if (!data.password)
      errs.password = "पासवर्ड आवश्यक छ";
    else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(data.password))
      errs.password = "कम्तीमा ८ अक्षर, १ letter र १ number";

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teacher's Name <span className="text-gray-400 font-normal">/ शिक्षकको नाम</span>
          </label>
          <NepaliInput
            value={data.name}
            onChange={(val) => onChange("name", val)}
            placeholder="राम श्रेष्ठ"
            className={ic(errors, "name")}
            error={errors.name}
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Father's Name <span className="text-gray-400 font-normal">/ बाबुको नाम</span>
          </label>
          <NepaliInput
            value={data.fatherName}
            onChange={(val) => onChange("fatherName", val)}
            placeholder="हरि श्रेष्ठ"
            className={ic(errors, "fatherName")}
          />
          <FieldError msg={errors.fatherName} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permanent Address <span className="text-gray-400 font-normal">/ स्थायी ठेगाना</span>
        </label>
        <NepaliInput
          value={data.permanentAddress}
          onChange={(val: string) => onChange("permanentAddress", val)}
          placeholder="पोखरा-१०, कास्की"
          className={ic(errors, "permanentAddress")}
        />
        <FieldError msg={errors.permanentAddress} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth (BS) <span className="text-gray-400 font-normal">/ जन्म मिति</span>
          </label>
          {/* NepaliNumberInput: digits auto-convert, slash allowed for date format */}
          <NepaliNumberInput
            value={data.dob}
            onChange={(val: string) => onChange("dob", val)}
            placeholder="२०४०/०५/१५"
            className={ic(errors, "dob")}
            allowSlash
          />
          <FieldError msg={errors.dob} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
          </label>
          {/* NepaliNumberInput: digits auto-convert, no slash/dash needed */}
          <NepaliNumberInput
            value={data.phone}
            onChange={(val: string  ) => onChange("phone", val)}
            placeholder="९८XXXXXXXX"
            className={ic(errors, "phone")}
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-gray-400 font-normal">/ इमेल</span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="ram@school.edu.np"
          className={ic(errors, "email")}
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
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            placeholder="••••••••"
            className={ic(errors, "confirmPassword")}
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
  onChange: (f: string, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const districtData = data.district ? DISTRICTS[data.district] : null;
  const municipalities = districtData ? districtData.municipalities : [];

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-gray-400 font-normal">/ जिल्ला</span>
          </label>
          <select
            title="District"
            value={data.district}
            onChange={(e) => handleDistrictChange(e.target.value)}
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
            onChange={(e) => onChange("municipality", e.target.value)}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          School Name <span className="text-gray-400 font-normal">/ विद्यालयको नाम</span>
        </label>
        <NepaliInput
          value={data.schoolName}
          onChange={(val: string) => onChange("schoolName", val)}
          placeholder="श्री बाल कल्याण माध्यमिक विद्यालय"
          className={ic(errors, "schoolName")}
        />
        <FieldError msg={errors.schoolName} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Code / Token No. <span className="text-gray-400 font-normal">/ संकेत नं</span>
        </label>
        {/* Plain input: alphanumeric + dash, not purely numeric */}
        <input
          value={data.tokenNo}
          onChange={(e) => onChange("tokenNo", e.target.value)}
          placeholder="TSC-2080-04521"
          className={ic(errors, "tokenNo")}
        />
        <FieldError msg={errors.tokenNo} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-gray-400 font-normal">/ विषय</span>
          </label>
          <select
            title="Subject"
            value={data.subject}
            onChange={(e) => onChange("subject", e.target.value)}
            className={ic(errors, "subject")}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level <span className="text-gray-400 font-normal">/ तह</span>
          </label>
          <select
            title="Level"
            value={data.level}
            onChange={(e) => onChange("level", e.target.value)}
            className={ic(errors, "level")}
          >
            <option value="">तह छान्नुहोस्</option>
            <option value="primary">Primary / आधारभूत (१–५)</option>
            <option value="lower_secondary">Lower Secondary / निम्न माध्यमिक (६–८)</option>
            <option value="secondary">Secondary / माध्यमिक (९–१०)</option>
            <option value="higher_secondary">Higher Secondary / उच्च माध्यमिक (११–१२)</option>
          </select>
          <FieldError msg={errors.level} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade <span className="text-gray-400 font-normal">/ श्रेणी</span>
          </label>
          <select
            title="Grade"
            value={data.grade}
            onChange={(e) => onChange("grade", e.target.value)}
            className={ic(errors, "grade")}
          >
            <option value="">श्रेणी छान्नुहोस्</option>
            <option value="first">First / प्रथम</option>
            <option value="second">Second / द्वितीय</option>
            <option value="third">Third / तृतीय</option>
          </select>
          <FieldError msg={errors.grade} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="text-gray-400 font-normal">/ प्रकार</span>
          </label>
          <select
            title="Teacher Type"
            value={data.teacherType}
            onChange={(e) => onChange("teacherType", e.target.value)}
            className={ic(errors, "teacherType")}
          >
            <option value="">प्रकार छान्नुहोस्</option>
            <option value="permanent">Permanent / स्थायी</option>
            <option value="temporary">Temporary / अस्थायी</option>
            <option value="grant">Grant / अनुदान</option>
            <option value="shi_anudan">Shi Anudan / शि अनुदान</option>
            <option value="relief">Relief / राहत</option>
            <option value="private">Private / निजी</option>
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
  onChange: (f: string, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    validateNepaliDate(data.appointmentDate, errs, "appointmentDate", "नियुक्ती मिति");

    // promotionDate is optional — only validate format if filled
    if (data.promotionDate.trim()) {
      validateNepaliDate(data.promotionDate, errs, "promotionDate", "बढुवा मिति");
    }

    // ageSixtyYear is optional — only validate format if filled
    if (data.ageSixtyYear.trim()) {
      validateNepaliDate(data.ageSixtyYear, errs, "ageSixtyYear", "६० वर्ष पुग्ने मिति");
    }

    if (!data.qualification)
      errs.qualification = "शैक्षिक योग्यता छान्नुहोस्";

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Date <span className="text-gray-400 font-normal">/ नियुक्ती मिति</span>
          </label>
          <NepaliNumberInput
            value={data.appointmentDate}
            onChange={(val: string) => onChange("appointmentDate", val)}
            placeholder="२०८०/०३/१५"
            className={ic(errors, "appointmentDate")}
            allowSlash
          />
          <FieldError msg={errors.appointmentDate} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Promotion Date <span className="text-gray-400 font-normal">/ बढुवा मिति</span>
            <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
          </label>
          <NepaliNumberInput
            value={data.promotionDate}
            onChange={(val: string  ) => onChange("promotionDate", val)}
            placeholder="२०८२/०१/०१"
            className={ic(errors, "promotionDate")}
            allowSlash
          />
          <FieldError msg={errors.promotionDate} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Educational Qualification <span className="text-gray-400 font-normal">/ शैक्षिक योग्यता</span>
        </label>
        <select
          title="Educational Qualification"
          value={data.qualification}
          onChange={(e) => onChange("qualification", e.target.value)}
          className={ic(errors, "qualification")}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Extraordinary Leave <span className="text-gray-400 font-normal">/ असाधारण बिदा</span>
            <span className="text-gray-400 font-normal text-xs ml-1">(days / optional)</span>
          </label>
          {/* NepaliNumberInput: day counts as Nepali digits */}
          <NepaliNumberInput
            value={data.extraordinaryLeave}
            onChange={(val: string) => onChange("extraordinaryLeave", val)}
            placeholder="०"
            className={ic(errors, "extraordinaryLeave")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Accumulated Leave till Chaitra <span className="text-gray-400 font-normal">/ चैतसम्मको संचित बि.बि.</span>
          </label>
          <NepaliNumberInput
            value={data.accumulatedLeave}
            onChange={(val: string) => onChange("accumulatedLeave", val)}
            placeholder="०"
            className={ic(errors, "accumulatedLeave")}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year Turning 60 (BS) <span className="text-gray-400 font-normal">/ ६० वर्ष पुग्ने उमेर</span>
          <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
        </label>
        <NepaliNumberInput
          value={data.ageSixtyYear}
          onChange={(val: string) => onChange("ageSixtyYear", val)}
          placeholder="२१००/०५/१५"
          className={ic(errors, "ageSixtyYear")}
          allowSlash
        />
        <FieldError msg={errors.ageSixtyYear} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Remarks <span className="text-gray-400 font-normal">/ कैफियत</span>
          <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
        </label>
        <NepaliInput
          value={data.remarks}
          onChange={(val: string) => onChange("remarks", val)}
          placeholder="थप विवरण..."
          className={ic(errors, "remarks")}
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
  onChange: (f: string, v: string) => void;
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
  const qualLabels: Record<string, string> = {
    slc: "SLC / SEE",
    plus2: "+2 / Intermediate",
    bachelor: "Bachelor / स्नातक",
    master: "Master / स्नातकोत्तर",
    mphil_phd: "M.Phil / PhD",
  };
  const typeLabels: Record<string, string> = {
    permanent: "Permanent / स्थायी",
    temporary: "Temporary / अस्थायी",
    grant: "Grant / अनुदान",
    shi_anudan: "Shi Anudan / शि अनुदान",
    relief: "Relief / राहत",
    private: "Private / निजी",
  };
  const levelLabels: Record<string, string> = {
    primary: "Primary / आधारभूत (१–५)",
    lower_secondary: "Lower Secondary / निम्न माध्यमिक (६–८)",
    secondary: "Secondary / माध्यमिक (९–१०)",
    higher_secondary: "Higher Secondary / उच्च माध्यमिक (११–१२)",
  };

  const districtLabel = data.district
    ? `${DISTRICTS[data.district]?.en} / ${DISTRICTS[data.district]?.np}`
    : "—";
  const municipalityLabel = data.district && data.municipality
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
        ["Father's Name / बाबुको नाम", data.fatherName],
        ["Permanent Address / स्थायी ठेगाना", data.permanentAddress],
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
        ["School / विद्यालय", data.schoolName],
        ["Code No. / संकेत नं", data.tokenNo],
        ["Subject / विषय", data.subject],
        ["Level / तह", levelLabels[data.level] || data.level],
        ["Grade / श्रेणी", data.grade],
        ["Type / प्रकार", typeLabels[data.teacherType] || data.teacherType],
      ],
    },
    {
      title: "Service Details / सेवा विवरण",
      rows: [
        ["Appointment Date / नियुक्ती मिति", data.appointmentDate],
        ["Promotion Date / बढुवा मिति", data.promotionDate || "—"],
        ["Qualification / योग्यता", qualLabels[data.qualification] || data.qualification],
        ["Extraordinary Leave / असाधारण बिदा", data.extraordinaryLeave || "०"],
        ["Accumulated Leave / संचित बि.बि.", data.accumulatedLeave || "०"],
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
    // Step 1
    name: "", fatherName: "", permanentAddress: "",
    dob: "", phone: "", email: "", password: "", confirmPassword: "",
    // Step 2
    district: "", municipality: "", schoolName: "", tokenNo: "",
    subject: "", level: "", grade: "", teacherType: "",
    // Step 3
    appointmentDate: "", promotionDate: "", qualification: "",
    extraordinaryLeave: "", accumulatedLeave: "", ageSixtyYear: "", remarks: "",
    // Step 4
    citizenship: "", degree: "", transcript: "", teachingLicense: "", appointmentLetter: "",
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

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center gap-2 text-sm text-blue-700">
        <span>ℹ️</span>
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