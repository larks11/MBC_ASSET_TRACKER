import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";

/**
 * Reusable server-side table.
 * columns: [{ key, header, sortable, render(row), className }]
 * Gamita kauban sa usePaginated(): <DataTable {...table} columns={...} />
 */
export default function DataTable({
  columns,
  rows,
  meta,
  loading,
  error,
  sort,
  toggleSort,
  search,
  setSearch,
  searchPlaceholder = "Search...",
  filters, // JSX: dropdown filters
  toolbarRight, // JSX: buttons sa tuo
  page,
  setPage,
  limit,
  setLimit,
  emptyText = "No records found.",
  rowKey = "_id",
}) {
  const sortField = sort?.replace(/^-/, "");
  const desc = sort?.startsWith("-");
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="rounded-md border border-line bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded border border-line bg-white py-2 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
          />
        </div>
        {filters}
        <div className="ml-auto flex items-center gap-2">{toolbarRight}</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap border-b border-line px-4 py-2.5 font-medium ${c.className || ""}`}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-navy-900">
                      {c.header}
                      {sortField === c.key ? (
                        desc ? <ChevronDown size={14} className="text-brand-600" /> : <ChevronUp size={14} className="text-brand-600" />
                      ) : (
                        <ChevronsUpDown size={14} className="text-slate-300" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50" : ""}>
            {rows.map((row) => (
              <tr key={row[rowKey]} className="border-b border-line/70 last:border-0 hover:bg-brand-50/40">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 text-slate-700 ${c.className || ""}`}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
            <Inbox size={28} className="text-slate-300" />
            <p className="text-sm">{emptyText}</p>
          </div>
        )}
        {error && <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>}
        {loading && rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Loading...</p>}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="tabular">
            {from}–{to} of {meta.total}
          </span>
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="rounded border border-line bg-white px-2 py-1 text-sm"
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded border border-line p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tabular px-2">
            Page {meta.page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= meta.pages}
            className="rounded border border-line p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
