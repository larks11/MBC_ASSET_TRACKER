import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="rounded p-1.5 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-navy-900">IAMS</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
