"use client";
import { useEffect, useState } from "react";

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
    email: "",
    address: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("access");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/teachers/me/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setTeacher(data);
        setForm({
          name: data.name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
        });
      } catch {
        setErrorMsg("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teachers/me/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Failed to save.");
      setSuccessMsg("Profile updated successfully.");
      localStorage.setItem("teacher_name", form.name);
    } catch {
      setErrorMsg("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/change-password/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: passwords.current,
            new_password: passwords.newPass,
          }),
        }
      );
      if (!res.ok) throw new Error("Incorrect current password.");
      setSuccessMsg("Password changed successfully.");
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

  const initials = teacher?.name
    ?.trim()
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("") ?? "T";

  return (
    <div className="flex gap-6">

      {/* Left sidebar card */}
      <div className="w-56 shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-[#0f2044] font-bold text-xl mx-auto">
            {initials.toUpperCase()}
          </div>
          <p className="font-semibold text-gray-800">{teacher?.name}</p>
          <p className="text-xs text-gray-400">
            {teacher?.subject} · {teacher?.position}
          </p>
          <a href="#" className="text-xs text-blue-500 block">
          {teacher?.school?.name}
          </a>
          <span className="inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
            ● Approved by Admin
          </span>

          <div className="text-left pt-3 space-y-2 text-xs text-gray-500 divide-y divide-gray-50">
            {[
              ["TSC No.", teacher?.tsc_no],
              ["Recruited", teacher?.join_date],
              ["District", teacher?.school?.district],
              ["Classes", teacher?.classes],
              ["Subject", teacher?.subject],
              ["Member since", teacher?.member_since],
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

        {/* Feedback messages */}
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
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full name{" "}
                  <span className="text-gray-400 font-normal">/ पूरा नाम</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone{" "}
                  <span className="text-gray-400 font-normal">/ फोन नम्बर</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address{" "}
                <span className="text-gray-400 font-normal">/ इमेल</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permanent address{" "}
                <span className="text-gray-400 font-normal">/ स्थायी ठेगाना</span>
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ward No., Municipality, District"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
              />
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
                onClick={() =>
                  setForm({
                    name: teacher?.name ?? "",
                    phone: teacher?.phone ?? "",
                    email: teacher?.email ?? "",
                    address: teacher?.address ?? "",
                  })
                }
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
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={passwords.newPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPass: e.target.value })
                  }
                  placeholder="New password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  placeholder="Confirm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
                />
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
      </div>
    </div>
  );
}