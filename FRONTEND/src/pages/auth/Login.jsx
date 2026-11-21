import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Clock, Eye, EyeOff, Loader2, Lock, LogIn, User } from "lucide-react";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const input =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null); // { text, tone: "error" | "warn" }
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password)
      return setError({ text: "Please enter your username or email and password.", tone: "error" });
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      const text = err.message || "Login failed. Please try again.";
      // Pending = amber (paghulat), ang uban = pula
      setError({ text, tone: err.status === 403 && /waiting/i.test(text) ? "warn" : "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Log in to the ICT Asset Monitoring System."
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="inline-flex items-center gap-1 font-semibold text-[#006B3C] hover:text-[#00A651]"
          >
            Create account <ArrowRight size={15} />
          </Link>
        </>
      }
    >
      {error && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
            error.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"
          }`}
          role="alert"
        >
          {error.tone === "warn" ? (
            <Clock size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          {error.text}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-slate-700">Username or email</label>
          <div className="relative">
            <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#006B3C]" />
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or you@example.com"
              className={input}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#006B3C]" />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`${input} pr-12`}
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
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00A651]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00A651]/30 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}