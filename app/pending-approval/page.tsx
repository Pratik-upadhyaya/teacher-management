"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, LogOut, Pencil } from "lucide-react";
import { authFetch, getAccessToken, logout } from "@/lib/api";
import { nepaliToAscii } from "@/components/NepaliNumberInput";
import {
  StepBar,
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
} from "@/components/teacherApplication/steps";

// Server field name -> formData field name is identical for every field
// this page touches, so the same shape used by the shared wizard steps
// (see app/register/page.tsx's formData) is reused here, just prefilled
// from GET /api/teachers/me/application/ instead of starting blank.
type ApplicationData = Record<string, any>;

function emptyFormData(): ApplicationData {
  return {
    name: "", nameEnglish: "", fatherName: "", gender: "", permanentAddress: "", permanentWardNo: "",
    dob: "", phone: "", email: "",
    district: "", municipality: "", wardNo: "", schoolName: "", schoolEmisCode: "", tokenNo: "",
    subject: "", subjectEnglish: "", level: "", grade: "", teacherType: "",
    appointmentDate: "", promotionDate: "", minQualification: "", highestQualification: "",
    extraordinaryLeave: "", ageSixtyYear: "", remarks: "",
    wasDifferentTypeBeforePermanent: "", permanentAppointmentDate: "", promotionDate2: "",
    citizenship: "", degree: "", seeSlcCertificate: "", photo: "", teachingLicense: "", appointmentLetter: "",
    highestQualificationDocument: "",
    transferDocuments: [] as File[],
  };
}

// Converts the API's GET response (booleans, null, absolute file URLs)
// into the string-keyed shape the shared wizard step components expect
// (they were built for a fresh registration form, where every field
// starts as a plain string or File).
function toFormData(api: any): ApplicationData {
  return {
    ...emptyFormData(),
    ...api,
    wasDifferentTypeBeforePermanent:
      api.wasDifferentTypeBeforePermanent === true
        ? "true"
        : api.wasDifferentTypeBeforePermanent === false
        ? "false"
        : "",
    transferDocuments: [],
  };
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [application, setApplication] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [subStep, setSubStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationData>(emptyFormData());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    authFetch("/api/teachers/me/application/")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load your application.");
        return res.json();
      })
      .then((data) => {
        if (data.status === "approved") {
          window.location.href = "/dashboard";
          return;
        }
        setApplication(data);
        setFormData(toFormData(data));
      })
      .catch(() => setLoadError("Could not load your application. Please try again."))
      .finally(() => setLoading(false));
  }, [router]);

  function handleChange(field: string, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleTransferDocsChange(files: File[]) {
    setFormData((prev) => ({ ...prev, transferDocuments: files }));
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  // ── Submit the edited application ──────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = new FormData();

      const textFields = [
        "name", "nameEnglish", "fatherName", "gender", "permanentAddress",
        "district", "municipality", "schoolName", "schoolEmisCode", "tokenNo",
        "subject", "subjectEnglish", "level", "grade", "teacherType",
        "minQualification", "highestQualification",
      ];
      textFields.forEach((f) => payload.append(f, formData[f] ?? ""));

      const dateFields = [
        "permanentWardNo", "dob", "phone", "wardNo", "appointmentDate",
        "extraordinaryLeave", "ageSixtyYear",
      ];
      dateFields.forEach((f) => payload.append(f, nepaliToAscii(formData[f] ?? "")));

      if (formData.teacherType === "permanent") {
        payload.append("wasDifferentTypeBeforePermanent", formData.wasDifferentTypeBeforePermanent);
        if (formData.wasDifferentTypeBeforePermanent === "true") {
          payload.append("permanentAppointmentDate", nepaliToAscii(formData.permanentAppointmentDate || ""));
        }
        if (formData.grade === "second" || formData.grade === "first") {
          payload.append("promotionDate", nepaliToAscii(formData.promotionDate || ""));
        }
        if (formData.grade === "first") {
          payload.append("promotionDate2", nepaliToAscii(formData.promotionDate2 || ""));
        }
      }

      // Documents: only send fields the teacher actually re-uploaded
      // (a real File object) -- an unchanged field is left out of the
      // request entirely so the backend's partial PATCH leaves the
      // existing file alone rather than overwriting it with a string.
      const fileFields = [
        "citizenship", "degree", "seeSlcCertificate", "photo", "teachingLicense", "appointmentLetter",
      ];
      fileFields.forEach((f) => {
        if (formData[f] instanceof File) payload.append(f, formData[f]);
      });
      if (
        formData.highestQualification !== formData.minQualification &&
        formData.highestQualificationDocument instanceof File
      ) {
        payload.append("highestQualificationDocument", formData.highestQualificationDocument);
      }
      if (formData.teacherType === "permanent") {
        (formData.transferDocuments as File[]).forEach((file) => {
          payload.append("transferDocuments", file);
        });
      }

      const res = await authFetch("/api/teachers/me/application/", {
        method: "PATCH",
        body: payload,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Object.values(data).flat().join(" ") || "Could not save changes.";
        throw new Error(msg);
      }

      const updated = await res.json();
      setApplication(updated);
      setFormData(toFormData(updated));
      setEditing(false);
      setSubStep(1);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0fb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0f2044] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0fb] flex flex-col">
      <nav className="bg-[#0f2044] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Teacher Portal / शिक्षक पोर्टल</p>
            <p className="text-white/60 text-xs">Application Status / आवेदन स्थिति</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/80 text-sm border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
        >
          <LogOut size={14} />
          Logout / लगआउट
        </button>
      </nav>

      <div className="flex-1 flex items-start justify-center p-6 sm:p-8">
        <div className="w-full max-w-2xl">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {loadError}
            </div>
          )}

          {application && !editing && (
            <>
              {application.status === "rejected" ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
                    <AlertTriangle size={20} />
                    Application Rejected / आवेदन अस्वीकृत
                  </div>
                  <p className="text-sm text-red-600 mt-3">
                    <span className="font-semibold">Reason / कारण: </span>
                    {application.remarks || "No reason was provided."}
                  </p>
                  <p className="text-sm text-red-500 mt-2">
                    Please review and correct your application below, then resubmit for review.
                  </p>
                </div>
              ) : application.remarks ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold text-lg">
                    <AlertTriangle size={20} />
                    Changes Requested / परिवर्तन अनुरोध गरिएको
                  </div>
                  <p className="text-sm text-yellow-700 mt-3">
                    <span className="font-semibold">Message / सन्देश: </span>
                    {application.remarks}
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Please update your application below to address this, then resubmit.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
                    <Clock size={20} />
                    Application Under Review / आवेदन समीक्षामा
                  </div>
                  <p className="text-sm text-blue-600 mt-3">
                    Your application has been submitted and is awaiting review by the District
                    Education Head. You'll be able to log in to the full portal once it's
                    approved.
                  </p>
                  <p className="text-sm text-blue-500 mt-2">
                    तपाईंको आवेदन पेश गरिएको छ र समीक्षामा छ। स्वीकृत भएपछि पूर्ण पोर्टलमा प्रवेश गर्न
                    सक्नुहुनेछ।
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#0f2044]">{application.name}</p>
                  <p className="text-sm text-gray-400">{application.schoolName || "—"}</p>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-[#0f2044] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
                >
                  <Pencil size={14} />
                  Edit Application / सम्पादन गर्नुहोस्
                </button>
              </div>
            </>
          )}

          {application && editing && (
            <>
              <StepBar current={subStep <= 1 ? 1 : subStep + 1} />

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                  {submitError}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
                {subStep === 1 && (
                  <Step1 data={formData} onChange={handleChange} onNext={() => setSubStep(2)} />
                )}
                {subStep === 2 && (
                  <Step2
                    data={formData}
                    onChange={handleChange}
                    onNext={() => setSubStep(3)}
                    onBack={() => setSubStep(1)}
                  />
                )}
                {subStep === 3 && (
                  <Step3
                    data={formData}
                    onChange={handleChange}
                    onNext={() => setSubStep(4)}
                    onBack={() => setSubStep(2)}
                  />
                )}
                {subStep === 4 && (
                  <Step4
                    data={formData}
                    onChange={handleChange}
                    onTransferDocsChange={handleTransferDocsChange}
                    onNext={() => setSubStep(5)}
                    onBack={() => setSubStep(3)}
                  />
                )}
                {subStep === 5 && (
                  <Step5
                    data={formData}
                    onBack={() => setSubStep(4)}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                  />
                )}
              </div>

              <button
                onClick={() => {
                  setEditing(false);
                  setSubStep(1);
                  setFormData(toFormData(application));
                  setSubmitError("");
                }}
                className="text-sm text-gray-400 hover:text-gray-600 mt-4"
              >
                ← Cancel and go back / रद्द गर्नुहोस्
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
