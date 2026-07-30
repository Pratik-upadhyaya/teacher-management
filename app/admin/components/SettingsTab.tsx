"use client";
import { useState } from "react";
import { authFetch } from "@/lib/api";
import { Lock } from "lucide-react";

interface PasswordErrors {
  current?: string;
  newPass?: string;
  confirm?: string;
}

function validatePasswords(passwords: {
  current: string;
  newPass: string;
  confirm: string;
}): PasswordErrors {
  const errs: PasswordErrors = {};

  if (!passwords.current) {
    errs.current = "Current password is required.";
  }

  if (!passwords.newPass) {
    errs.newPass = "New password is required.";
  } else if (passwords.newPass.length < 8) {
    // Matches the backend's MinimumLengthValidator (8 chars) -- catching
    // this client-side avoids a round trip just to get rejected.
    errs.newPass = "Password must be at least 8 characters.";
  } else if (passwords.newPass === passwords.current) {
    errs.newPass = "New password must be different from the current password.";
  }

  if (!passwords.confirm) {
    errs.confirm = "Please confirm the new password.";
  } else if (passwords.confirm !== passwords.newPass) {
    errs.confirm = "Passwords do not match.";
  }

  return errs;
}

const fieldClass = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
    hasError
      ? "border-red-300 focus:ring-red-200"
      : "border-gray-200 focus:ring-blue-200"
  }`;

export default function SettingsTab() {
  const [changing, setChanging] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  function updateField(field: keyof typeof passwords, value: string) {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const errs = validatePasswords(passwords);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setChanging(true);
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
        throw new Error(body.error || "Could not update password.");
      }
      setSuccessMsg("Password updated successfully.");
      setPasswords({ current: "", newPass: "", confirm: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "Could not update password.");
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f2044]">Settings</h2>
        <p className="text-sm text-gray-500">Manage your admin account</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-semibold text-[#0f2044] mb-4 flex items-center gap-2">
          <Lock size={18} />
          Change Password
        </h3>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="admin-current-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current password
            </label>
            <input
              id="admin-current-password"
              type="password"
              value={passwords.current}
              onChange={(e) => updateField("current", e.target.value)}
              placeholder="••••••••"
              className={fieldClass(!!errors.current)}
              autoComplete="current-password"
            />
            {errors.current && (
              <p className="text-red-500 text-xs mt-1">{errors.current}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="admin-new-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New password
              </label>
              <input
                id="admin-new-password"
                type="password"
                value={passwords.newPass}
                onChange={(e) => updateField("newPass", e.target.value)}
                placeholder="New password"
                className={fieldClass(!!errors.newPass)}
                autoComplete="new-password"
              />
              {errors.newPass && (
                <p className="text-red-500 text-xs mt-1">{errors.newPass}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="admin-confirm-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm password
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => updateField("confirm", e.target.value)}
                placeholder="Confirm"
                className={fieldClass(!!errors.confirm)}
                autoComplete="new-password"
              />
              {errors.confirm && (
                <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={changing}
            className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-60"
          >
            {changing ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
