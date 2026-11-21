import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Boxes, CheckCircle2, ChevronDown, FileBarChart, LayoutDashboard,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, Send, UserCircle, Wrench,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { dashboardApi } from "../services/index.js";
import { useAuth } from "../context/AuthContext.jsx";

const STORE_KEY = "iams.sidebar.collapsed";

// I-close ang dropdown kung nag-click sa gawas o nag-Escape
function useDismiss(ref, active, onDismiss) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onDismiss();
    const onKey = (e) => e.key === "Escape" && onDismiss();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, active, onDismiss]);
}

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

/* Notification bell: gikuha gikan sa existing /api/dashboard (pending, repair, low stock) */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  useEffect(() => {
    let alive = true;
    let ctrl = new AbortController();
    const load = () => {
      ctrl = new AbortController();
      dashboardApi
        .summary(ctrl.signal)
        .then((d) => alive && setData(d))
        .catch(() => {});
    };
    load();
    const timer = setInterval(() => {
      ctrl.abort();
      load();
    }, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
      ctrl.abort();
    };
  }, []);

  const items = [
    { to: "/transactions/deploy", label: "Pending transactions", n: data?.pendingTransactions, icon: Send },
    { to: "/transactions/repair", label: "Open repair tickets", n: data?.openRepairs, icon: Wrench },
    { to: "/assets/consumable", label: "Consumables at or below reorder level", n: data?.consumables?.lowStock, icon: Boxes },
  ].filter((i) => i.n > 0);
  const total = items.reduce((sum, i) => sum + i.n, 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-brand-50 hover:text-navy-800"
        aria-label={`Notifications${total ? `, ${total} new` : ""}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold text-navy-800">Notifications</p>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center text-sm text-slate-500">
              <CheckCircle2 size={26} className="text-brand-400" />
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map(({ to, label, n, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1 text-slate-700">{label}</span>
                    <span className="tabular rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* Profile sa naka-login nga user + dropdown (My Account, Sign out) */
function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  const name = user?.name || "User";
  const firstName = name.split(" ")[0];

  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white ring-2 ring-brand-100">
      {initials(name)}
    </span>
  );

  const signOut = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const linkCls = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-brand-50";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-brand-50"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {avatar}
        <span className="hidden max-w-[110px] truncate text-sm font-medium text-slate-700 sm:block">{firstName}</span>
        <ChevronDown size={16} className={`hidden text-slate-400 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            {avatar}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-800">{name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link to="/account" onClick={() => setOpen(false)} className={linkCls}>
              <UserCircle size={16} className="text-slate-400" /> My Account
            </Link>
            <Link to="/" onClick={() => setOpen(false)} className={linkCls}>
              <LayoutDashboard size={16} className="text-slate-400" /> Dashboard
            </Link>
            <Link to="/reports" onClick={() => setOpen(false)} className={linkCls}>
              <FileBarChart size={16} className="text-slate-400" /> Reports and Logs
            </Link>
            <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // I-close ang mobile drawer kung nagbalhin og page
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const btn = "rounded-lg p-2 text-slate-600 transition-colors hover:bg-brand-50 hover:text-navy-800";

  return (
    <div className="flex h-full">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 shadow-[0_1px_0_rgb(6_78_59/0.03)] sm:px-6">
          <button onClick={() => setMobileOpen(true)} className={`${btn} lg:hidden`} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            onClick={toggleCollapsed}
            className={`${btn} hidden lg:inline-flex`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          <div className="hidden h-6 w-px bg-line sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-800">MAC Builders Corp.</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">ICT Asset Monitoring System</p>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div key={pathname} className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}