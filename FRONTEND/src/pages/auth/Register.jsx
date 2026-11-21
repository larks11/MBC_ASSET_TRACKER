import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertCircle, ArrowRight, AtSign, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User, UserPlus,
} from "lucide-react";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const input =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/;

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Please enter a valid email.";
    if (!USERNAME_RE.test(form.username.trim()))
      e.username = "3-30 characters: letters, numbers, . _ - only.";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const res = await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
      });
      setSuccess(res.message || "Your registration request has been submitted.");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (k) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;
  const ring = (k) => (errors[k] ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "");
  const icon = "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#006B3C]";
  const label = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <AuthShell
      title="Create account"
      subtitle="Your account will be activated once an administrator approves it."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-[#006B3C] hover:text-[#00A651]">
            Login <ArrowRight size={15} />
          </Link>
        </>
      }
    >
      {success ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
          <CheckCircle2 size={48} className="text-[#00A651]" />
          <p className="font-semibold text-[#003B25]">Registration submitted!</p>
          <p className="text-sm text-slate-500">{success}</p>
          <Link
            to="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#00A651]/25"
          >
            Back to login <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className={label}>Full name</label>
              <div className="relative">
                <User size={18} className={icon} />
                <input id="name" autoComplete="name" value={form.name} onChange={set("name")} placeholder="Juan Dela Cruz" className={`${input} ${ring("name")}`} />
              </div>
              {fieldError("name")}
            </div>

            <div>
              <label htmlFor="email" className={label}>Email</label>
              <div className="relative">
                <Mail size={18} className={icon} />
                <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={`${input} ${ring("email")}`} />
              </div>
              {fieldError("email")}
            </div>

            <div>
              <label htmlFor="username" className={label}>Username</label>
              <div className="relative">
                <AtSign size={18} className={icon} />
                <input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.username}
                  onChange={set("username")}
                  placeholder="juan.delacruz"
                  className={`${input} ${ring("username")}`}
                />
              </div>
              {fieldError("username")}
            </div>

            <div>
              <label htmlFor="password" className={label}>Password</label>
              <div className="relative">
                <Lock size={18} className={icon} />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 8 characters"
                  className={`${input} pr-12 ${ring("password")}`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-[#006B3C]"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldError("password")}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={label}>Confirm password</label>
              <div className="relative">
                <Lock size={18} className={icon} />
                <input
                  id="confirmPassword"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Re-enter your password"
                  className={`${input} ${ring("confirmPassword")}`}
                />
              </div>
              {fieldError("confirmPassword")}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00A651]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00A651]/30 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {busy ? "Submitting..." : "Create account"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}