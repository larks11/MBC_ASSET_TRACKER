import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { authApi } from "../services/authApi.js";
import { setToken } from "../services/api.js";

const input =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";

const FIELDS = [
  { key: "currentPassword", label: "Current password", auto: "current-password" },
  { key: "newPassword", label: "New password", auto: "new-password", hint: "At least 8 characters" },
  { key: "confirmPassword", label: "Confirm new password", auto: "new-password" },
];

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.currentPassword) return setError("Please enter your current password.");
    if (form.newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (form.newPassword !== form.confirmPassword) return setError("New passwords do not match.");
    if (form.newPassword === form.currentPassword)
      return setError("New password must be different from the current password.");

    setBusy(true);
    try {
      const res = await authApi.changePassword(form);
      if (res.token) setToken(res.token); // magpabilin nga naka-login
      setSuccess("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-[#DDF8E9] px-3 py-2.5 text-sm text-[#006B3C]" role="status">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> {success}
        </div>
      )}

      {FIELDS.map(({ key, label, auto, hint }, i) => (
        <div key={key}>
          <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#006B3C]" />
            <input
              id={key}
              type={show ? "text" : "password"}
              autoComplete={auto}
              value={form[key]}
              onChange={set(key)}
              placeholder={hint || label}
              className={`${input} ${i === 0 ? "pr-12" : ""}`}
            />
            {i === 0 && (
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-[#006B3C]"
                aria-label={show ? "Hide passwords" : "Show passwords"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#00A651]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
        {busy ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}