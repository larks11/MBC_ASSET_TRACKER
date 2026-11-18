import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { REPORTS } from "./reportConfig.jsx";

export default function ReportsLayout() {
  return (
    <>
      <PageHeader title="Reports and logs" description="Masterlists, transaction logs, and official forms generated from the MAC Builders templates." />
      <div className="flex flex-col gap-5 lg:flex-row">
        <nav aria-label="Reports" className="shrink-0 lg:w-60">
          <ul className="flex gap-1 overflow-x-auto rounded-md border border-line bg-white p-1.5 lg:flex-col lg:overflow-visible">
            {REPORTS.map(({ id, title, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <NavLink
                  to={`/reports/${id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 whitespace-nowrap rounded px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50"
                    }`
                  }
                >
                  <Icon size={16} />
                  {title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  );
}
