import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Boxes, Send, Wrench, Undo2, Trash2,
  ClipboardCheck, FileBarChart, Users, Headset, X,
} from "lucide-react";

const NAV = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    title: "IT assets",
    items: [
      { to: "/assets", label: "Non-consumable", icon: Laptop, end: true },
      { to: "/assets/consumable", label: "Consumable", icon: Boxes },
    ],
  },
  {
    title: "Transactions",
    items: [
      { to: "/transactions/deploy", label: "Assign / deploy", icon: Send },
      { to: "/transactions/repair", label: "For repair / diagnose", icon: Wrench },
      { to: "/transactions/return", label: "Return / turn over", icon: Undo2 },
      { to: "/transactions/disposal", label: "For disposal", icon: Trash2 },
    ],
  },
  {
    title: "Monitoring",
    items: [{ to: "/maintenance", label: "Preventive maintenance", icon: ClipboardCheck }],
  },
  {
    title: "Records",
    items: [
      { to: "/reports", label: "Reports and logs", icon: FileBarChart },
      { to: "/employees", label: "Employees", icon: Users },
      { to: "/service-requests", label: "Service requests", icon: Headset },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-900/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-base font-bold leading-tight tracking-tight">MAC Builders Corp.</p>
            <p className="text-xs text-brand-200">ICT Asset Monitoring System</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group, i) => (
            <div key={i} className="mb-4">
              {group.title && <p className="mb-1 px-3 text-xs font-medium text-brand-200/80">{group.title}</p>}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-white text-navy-900 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-3 text-xs text-white/50">Purok 8, Brgy. Linao, Ormoc City</div>
      </aside>
    </>
  );
}
