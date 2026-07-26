"use client";
import { useEffect, useState } from "react";
import { authFetch, fetchDocumentBlobUrl } from "@/lib/api";
import {
  SUBJECT_LABELS,
  LEVEL_LABELS,
  GRADE_LABELS,
  TEACHER_TYPE_LABELS,
  formatTeacherField,
} from "@/lib/teacherLabels";

// ── Validation ──────────────────────────────────────────────────────────────
// Note: email is intentionally not part of the editable profile form or its
// validation -- see the read-only email field further down for why.

interface ProfileErrors {
  name?: string;
  phone?: string;
  permanentAddress?: string;
}

interface PasswordErrors {
  current?: string;
  newPass?: string;
  confirm?: string;
}

function validateProfile(form: { name: string; phone: string; permanentAddress: string }): ProfileErrors {
  const errs: ProfileErrors = {};

  if (!form.name.trim()) {
    errs.name = "पूरा नाम आवश्यक छ। (Full name is required)";
  } else if (form.name.trim().length < 2) {
    errs.name = "नाम कम्तिमा २ अक्षरको हुनुपर्छ। (Min 2 characters)";
  }

  if (!form.phone.trim()) {
    errs.phone = "फोन नम्बर आवश्यक छ। (Phone is required)";
  } else if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) {
    errs.phone = "मान्य फोन नम्बर प्रविष्ट गर्नुहोस्। (Enter a valid phone number)";
  }

  if (!form.permanentAddress.trim()) {
    errs.permanentAddress = "स्थायी ठेगाना आवश्यक छ। (Address is required)";
  }

  return errs;
}

function validatePasswords(passwords: { current: string; newPass: string; confirm: string }): PasswordErrors {
  const errs: PasswordErrors = {};

  if (!passwords.current) {
    errs.current = "हालको पासवर्ड आवश्यक छ। (Current password is required)";
  }

  if (!passwords.newPass) {
    errs.newPass = "नयाँ पासवर्ड आवश्यक छ। (New password is required)";
  } else if (passwords.newPass.length < 8) {
    // Matches the backend's MinimumLengthValidator (8 chars) -- catching
    // this client-side avoids a round trip just to get rejected.
    errs.newPass = "पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ। (Min 8 characters)";
  } else if (passwords.newPass === passwords.current) {
    errs.newPass = "नयाँ पासवर्ड हालकोभन्दा फरक हुनुपर्छ। (Must differ from current)";
  }

  if (!passwords.confirm) {
    errs.confirm = "पासवर्ड पुष्टि गर्नुहोस्। (Please confirm password)";
  } else if (passwords.confirm !== passwords.newPass) {
    errs.confirm = "पासवर्ड मेल खाएन। (Passwords do not match)";
  }

  return errs;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    permanentAddress: "",
  });

  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await authFetch("/api/teachers/me/");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setTeacher(data);
        setForm({
          name: data.name ?? "",
          phone: data.phone ?? "",
          permanentAddress: data.permanentAddress ?? "",
        });
      } catch {
        setErrorMsg("प्रोफाइल लोड गर्न सकिएन। (Failed to load profile)");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  // Passport photo as the profile avatar. teacher.photo is a raw storage-
  // relative path (from TeacherSerializer, fields='__all__'), so it needs
  // the authenticated /media/ fetch, same as the Documents page and the
  // admin teacher detail page use for previewing this teacher's own files.
  useEffect(() => {
    if (!teacher?.photo) { setPhotoUrl(null); return; }
    let cancelled = false;
    fetchDocumentBlobUrl(`/media/${teacher.photo}`)
      .then((url) => { if (!cancelled) setPhotoUrl(url); })
      .catch(() => { if (!cancelled) setPhotoUrl(null); });
    return () => { cancelled = true; };
  }, [teacher?.photo]);

  // Clear individual field errors on change
  function updateForm(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function updatePasswords(field: keyof typeof passwords, value: string) {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const errs = validateProfile(form);
    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch("/api/teachers/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("परिवर्तन सुरक्षित गर्न सकिएन। (Failed to save)");
      const updated = await res.json();
      setTeacher(updated);
      setSuccessMsg("प्रोफाइल सफलतापूर्वक अपडेट भयो। (Profile updated successfully)");
      localStorage.setItem("teacher_name", updated.name);
    } catch {
      setErrorMsg("परिवर्तन सुरक्षित गर्न सकिएन। (Could not save changes)");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const errs = validatePasswords(passwords);
    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authFetch("/api/accounts/change-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.newPass,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || "हालको पासवर्ड गलत छ। (Incorrect current password)"
        );
      }
      setSuccessMsg("पासवर्ड सफलतापूर्वक परिवर्तन भयो। (Password changed successfully)");
      setPasswords({ current: "", newPass: "", confirm: "" });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#0f2044] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials =
    teacher?.name
      ?.trim()
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("") ?? "T";

  // Reflects the teacher's real `status` field -- this used to be a
  // hard-coded "Approved by Admin" badge regardless of actual status,
  // which would misrepresent a still-pending or rejected application.
  const statusBadge: Record<string, { label: string; className: string }> = {
    approved: { label: "● Approved by Admin", className: "bg-green-100 text-green-700" },
    pending: { label: "● Pending Review", className: "bg-yellow-100 text-yellow-700" },
    rejected: { label: "● Rejected", className: "bg-red-100 text-red-700" },
  };
  const status = statusBadge[teacher?.status] ?? statusBadge.pending;

  const memberSince = teacher?.created_at
    ? new Date(teacher.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : undefined;

  // Shared input class helper
  const fieldClass = (hasError: boolean) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
        : "border-gray-200 focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
    }`;

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* Left sidebar card */}
      <div className="w-full lg:w-56 shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center space-y-2">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Passport size photo"
              className="w-16 h-16 rounded-full object-cover mx-auto ring-1 ring-gray-100"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-[#0f2044] font-bold text-xl mx-auto">
              {initials.toUpperCase()}
            </div>
          )}
          <p className="font-semibold text-gray-800">{teacher?.name}</p>
          <p className="text-xs text-gray-400">
            {formatTeacherField(SUBJECT_LABELS, teacher?.subject)} · {formatTeacherField(TEACHER_TYPE_LABELS, teacher?.teacherType)}
          </p>
          <p className="text-xs text-gray-500">{teacher?.schoolName}</p>
          <span
            className={`inline-block text-xs px-3 py-1 rounded-full ${status.className}`}
          >
            {status.label}
          </span>
          <div className="text-left pt-3 space-y-2 text-xs text-gray-500 divide-y divide-gray-50">
            {[
              ["Token No.", teacher?.tokenNo],
              ["Appointed", teacher?.appointmentDate],
              ["District", teacher?.district],
              [
                "Level / Grade",
                teacher?.level || teacher?.grade
                  ? `${formatTeacherField(LEVEL_LABELS, teacher?.level)} · ${formatTeacherField(GRADE_LABELS, teacher?.grade)}`
                  : null,
              ],
              ["Teacher type", formatTeacherField(TEACHER_TYPE_LABELS, teacher?.teacherType)],
              ["Member since", memberSince],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between pt-2">
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-600">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right forms */}
      <div className="flex-1 space-y-5">

        {/* Feedback banners */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {errorMsg}
          </div>
        )}

        {/* Edit Profile */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-[#0f2044] mb-4">
            ✏️ Edit Profile · प्रोफाइल सम्पादन
          </h2>
          <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full name */}
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full name <span className="text-gray-400 font-normal">/ पूरा नाम</span>
                </label>
                <input
                  id="profile-name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="पूरा नाम"
                  className={fieldClass(!!profileErrors.name)}
                />
                {profileErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
                </label>
                <input
                  id="profile-phone"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="९८XXXXXXXX"
                  className={fieldClass(!!profileErrors.phone)}
                />
                {profileErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.phone}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="md:col-span-2">
                <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address <span className="text-gray-400 font-normal">/ इमेल</span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={teacher?.email ?? ""}
                  disabled
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Your email is your login ID and can&apos;t be changed here — contact an
                  admin if it needs to be updated.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="profile-address" className="block text-sm font-medium text-gray-700 mb-1">
                Permanent address{" "}
                <span className="text-gray-400 font-normal">/ स्थायी ठेगाना</span>
              </label>
              <input
                id="profile-address"
                type="text"
                value={form.permanentAddress}
                onChange={(e) => updateForm("permanentAddress", e.target.value)}
                placeholder="Ward No., Municipality, District"
                className={fieldClass(!!profileErrors.permanentAddress)}
              />
              {profileErrors.permanentAddress && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.permanentAddress}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes / परिवर्तन सुरक्षित"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    name: teacher?.name ?? "",
                    phone: teacher?.phone ?? "",
                    permanentAddress: teacher?.permanentAddress ?? "",
                  });
                  setProfileErrors({});
                }}
                className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-[#0f2044] mb-4">
            🔒 Change Password · पासवर्ड परिवर्तन
          </h2>
          <form onSubmit={handleChangePassword} noValidate className="space-y-4">
            <div>
              <label htmlFor="profile-current-password" className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                id="profile-current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => updatePasswords("current", e.target.value)}
                placeholder="••••••••"
                className={fieldClass(!!passwordErrors.current)}
              />
              {passwordErrors.current && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.current}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  value={passwords.newPass}
                  onChange={(e) => updatePasswords("newPass", e.target.value)}
                  placeholder="New password"
                  className={fieldClass(!!passwordErrors.newPass)}
                />
                {passwordErrors.newPass && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.newPass}</p>
                )}
              </div>
              <div>
                <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => updatePasswords("confirm", e.target.value)}
                  placeholder="Confirm"
                  className={fieldClass(!!passwordErrors.confirm)}
                />
                {passwordErrors.confirm && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm}</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-60"
            >
              {changingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        {/* Principal Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0f2044]">
                🏫 School Information
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Any teacher can submit their school's information for admin approval.
              </p>
            </div>
            <a
              href="/principal"
              className="bg-[#0f2044] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
            >
              Fill School Information →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}