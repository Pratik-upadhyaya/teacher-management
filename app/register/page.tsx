"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { nepaliToAscii } from "@/components/NepaliNumberInput";
import {
  StepBar,
  Step1,
  AccountStep,
  Step2,
  Step3,
  Step4,
  Step5,
} from "@/components/teacherApplication/steps";

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
    // Special Promotion -- asked of every applicant regardless of teacherType
    isSpeciallyPromoted: "", specialPromotionDate: "",
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
      payload.append("isSpeciallyPromoted", formData.isSpeciallyPromoted);
      if (formData.isSpeciallyPromoted === "true") {
        payload.append("specialPromotionDate", nepaliToAscii(formData.specialPromotionDate));
      }
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