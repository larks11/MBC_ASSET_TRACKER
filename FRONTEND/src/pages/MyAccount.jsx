import { AtSign, CalendarDays, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ChangePasswordForm from "../components/ChangePasswordForm.jsx";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

export default function MyAccount() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const rows = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: AtSign, label: "Username", value: user.username || "—" },
    { icon: ShieldCheck, label: "Role", value: user.role === "admin" ? "Administrator" : "User" },
    {
      icon: CalendarDays,
      label: "Member since",
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">My Account</h1>
      <p className="mt-1 text-slate-500">Your account information.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="self-start overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4 border-b border-line bg-gradient-to-r from-navy-800 to-navy-700 px-6 py-6">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-navy-800">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{user.name}</p>
              <p className="truncate text-sm text-white/70">{user.email}</p>
            </div>
          </div>

          <dl className="divide-y divide-line">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="truncate text-sm font-medium text-slate-800">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="border-t border-line px-6 py-4">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="self-start rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <KeyRound size={17} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-navy-800">Change password</h2>
              <p className="text-xs text-slate-500">Your current password is required.</p>
            </div>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}