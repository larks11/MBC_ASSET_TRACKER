import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Boxes, Send, Wrench, Undo2, Trash2,
  ClipboardCheck, FileBarChart, Users, Headset, X, Building2, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import usePendingCount from "../hooks/usePendingCount.js";

// Logo nga direkta sa dark-green sidebar (walay puti nga kahon).
// Gisulayan sa pagkasunod-sunod: 1) puti-text nga version, 2) ang daan nga images.png.
// box/img = normal nga gidak-on | boxCollapsed/imgCollapsed = kung collapsed ang sidebar (desktop)
const LOGOS = [
  {
    src: "/logo-sidebar.png",
    box: "",
    boxCollapsed: "",
    img: "h-auto w-full max-w-[220px]",
    imgCollapsed: "lg:max-w-[56px]",
  },
  {
    src: "/images.png",
    box: "h-[88px] w-full overflow-hidden",
    boxCollapsed: "lg:h-12 lg:w-12",
    img: "h-auto w-[150%] max-w-none translate-x-[3.5%]",
    imgCollapsed: "lg:w-[230%]",
  },
];

const NAV = [
  { title: "Main", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    title: "IT Assets",
    items: [
      { to: "/assets", label: "Non-consumable", icon: Laptop, end: true },
      { to: "/assets/consumable", label: "Consumable", icon: Boxes },
    ],
  },
  {
    title: "Transactions",
    items: [
      { to: "/transactions/deploy", label: "Assign / Deploy", icon: Send },
      { to: "/transactions/repair", label: "For Repair / Diagnose", icon: Wrench },
      { to: "/transactions/return", label: "Return / Turn Over", icon: Undo2 },
      { to: "/transactions/disposal", label: "For Disposal", icon: Trash2 },
    ],
  },
  {
    title: "Monitoring",
    items: [{ to: "/maintenance", label: "Preventive Maintenance", icon: ClipboardCheck }],
  },
  {
    title: "Records",
    items: [
      { to: "/reports", label: "Reports and Logs", icon: FileBarChart },
      { to: "/employees", label: "Employees", icon: Users },
      { to: "/service-requests", label: "Service Requests", icon: Headset },
    ],
  },
];

// Makita ra sa admin
const ADMIN_GROUP = {
  title: "Administration",
  items: [{ to: "/admin", label: "Admin Dashboard", icon: ShieldCheck, badge: true }],
};

/**
 * open      → mobile drawer
 * collapsed → desktop: icon-only nga sidebar
 * onClose   → i-close ang mobile drawer
 */
export default function Sidebar({ open, onClose, collapsed = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const pending = usePendingCount(isAdmin);
  const groups = isAdmin ? [...NAV, ADMIN_GROUP] : NAV;

  const [logoIdx, setLogoIdx] = useState(0);
  const logo = LOGOS[logoIdx];

  // Escape = close sa mobile drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Itago ang text kung collapsed (sa desktop ra; ang mobile drawer kanunay full)
  const hide = collapsed ? "lg:hidden" : "";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 animate-fade-in bg-navy-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-navy-800 to-navy-900 text-white shadow-pop transition-[width,transform] duration-200 lg:static lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          collapsed ? "lg:w-[84px]" : "lg:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo: transparent PNG direkta sa sidebar. Walay background, border, o shadow. */}
        <div
          className={`relative flex shrink-0 items-center justify-center bg-transparent px-5 pb-3 pt-6 ${
            collapsed ? "lg:px-2 lg:pb-2 lg:pt-5" : ""
          }`}
        >
          {logo ? (
            <div
              className={`flex items-center justify-center bg-transparent ${logo.box} ${
                collapsed ? logo.boxCollapsed : ""
              }`}
            >
              <img
                key={logo.src}
                src={logo.src}
                alt="MAC Builders Corp."
                draggable={false}
                onError={() => setLogoIdx((i) => i + 1)}
                className={`select-none bg-transparent object-contain ${logo.img} ${
                  collapsed ? logo.imgCollapsed : ""
                }`}
              />
            </div>
          ) : (
            <span className="text-center text-lg font-extrabold leading-tight text-brand-300">
              MAC<span className="block text-[11px] font-semibold tracking-widest text-white">BUILDERS CORP.</span>
            </span>
          )}

          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="scroll-thin mt-2 flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, i) => (
            <div key={group.title || i} className="mb-5">
              <p className={`mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-brand-200/70 ${hide}`}>
                {group.title}
              </p>
              {i > 0 && <div className={`mx-3 mb-2 hidden border-t border-white/10 ${collapsed ? "lg:block" : ""}`} />}

              {group.items.map(({ to, label, icon: Icon, end, badge }) => {
                const count = badge ? pending : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                        collapsed ? "lg:justify-center lg:px-0" : ""
                      } ${
                        isActive
                          ? "bg-brand-100 font-semibold text-navy-900 shadow-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <span className="relative shrink-0">
                      <Icon size={18} />
                      {count > 0 && (
                        <span
                          className={`absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-navy-800 ${
                            collapsed ? "lg:block" : ""
                          }`}
                        />
                      )}
                    </span>
                    <span className={`truncate ${hide}`}>{label}</span>
                    {count > 0 && (
                      <span className={`ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white ${hide}`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? "lg:justify-center lg:p-2.5" : ""}`}>
            <Building2 size={20} className="shrink-0 text-brand-300" />
            <div className={`min-w-0 ${hide}`}>
              <p className="truncate text-xs font-semibold">ICT Asset Monitoring System</p>
              <p className="truncate text-[11px] text-white/50">Purok 8, Brgy. Linao, Ormoc City</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}