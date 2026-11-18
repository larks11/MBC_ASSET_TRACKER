import { Activity, FileText, ListChecks, Trash2, Undo2, UserCheck, Warehouse, Wrench, ScrollText, Download } from "lucide-react";
import { assetApi, repairApi, reportApi, transactionApi } from "../../services/index.js";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import { fmtDate, TXN_LABELS } from "../../utils/format.js";
import { ASSET_STATUSES, ASSET_TYPES, REPAIR_STATUSES, TXN_STATUSES } from "../../utils/constants.js";

const id = (key = "assetId") => (r) => <span className="tabular font-medium text-navy-800">{r[key]}</span>;
const badge = (r) => <StatusBadge status={r.status} />;
const brandModel = (r) => [r.brand, r.model].filter(Boolean).join(" / ");
const date = (key) => ({ render: (r) => fmtDate(r[key]), text: (r) => fmtDate(r[key]) });
const txnTypes = Object.entries(TXN_LABELS).map(([value, label]) => ({ value, label }));

const assetCols = {
  company: { key: "company", header: "Company", sortable: true },
  assetType: { key: "assetType", header: "Asset type", sortable: true },
  assetId: { key: "assetId", header: "Asset ID", sortable: true, render: id() },
  brand: { key: "brand", header: "Brand", sortable: true },
  model: { key: "model", header: "Model", sortable: true },
  serialNo: { key: "serialNo", header: "Serial number" },
  status: { key: "status", header: "Status", sortable: true, render: badge },
  user: { key: "currentUser", header: "Current user", render: (r) => r.currentUser?.name || "—", text: (r) => r.currentUser?.name },
  location: { key: "location", header: "Location", sortable: true },
};

const assetFilters = [
  { key: "assetType", placeholder: "All asset types", options: ASSET_TYPES },
  { key: "status", placeholder: "All statuses", options: ASSET_STATUSES },
];

/**
 * Kada report: source (API call), base filters, filters, columns(ctx), ug optional nga excel export.
 * ctx.download(path, params, filename) → mo-download sa file gikan sa backend template.
 */
export const REPORTS = [
  {
    id: "masterlist",
    title: "Generate masterlist",
    icon: ListChecks,
    description: "Every non-consumable asset. Download it on the official IT Asset Masterlist form (MBC-SP-ICT-06F1).",
    source: (p, s) => assetApi.list(p, s),
    base: { category: "Non-Consumable" },
    sort: "assetType",
    search: "Search by asset ID, brand, model, serial...",
    filters: assetFilters,
    excel: { label: "Masterlist (Excel)", path: "/exports/masterlist", params: ["assetType", "status"], filename: "IT-Asset-Masterlist.xlsx" },
    columns: () => [
      assetCols.company, assetCols.assetType, assetCols.assetId, assetCols.brand, assetCols.model,
      assetCols.serialNo, assetCols.user, assetCols.location, assetCols.status,
    ],
  },
  {
    id: "memorandum-receipt",
    title: "Memorandum receipt",
    icon: FileText,
    description: "Deployed equipment per employee. Generate the Memorandum Receipt (MBC-SP-WHS-06F1) as a Word file.",
    source: (p, s) => transactionApi.list(p, s),
    base: { type: "Deploy", status: "Completed" },
    sort: "-date",
    search: "Search by transaction number or employee...",
    filters: [{ key: "employee", type: "employee", placeholder: "All employees" }],
    columns: (ctx) => [
      { key: "transactionNo", header: "Transaction number", sortable: true, render: id("transactionNo") },
      { key: "date", header: "Deployed date", sortable: true, ...date("date") },
      { key: "user", header: "User", render: (r) => r.employeeSnapshot?.name, text: (r) => r.employeeSnapshot?.name },
      {
        key: "items",
        header: "Equipment",
        render: (r) => <span className="text-slate-600">{r.items.map((i) => i.asset?.assetType).filter(Boolean).join(", ")}</span>,
        text: (r) => r.items.map((i) => i.asset?.assetId).join(", "),
      },
      {
        key: "actions",
        header: "Action",
        render: (r) => (
          <Button
            icon={Download}
            className="!px-3 !py-1.5"
            disabled={ctx.busy === r._id}
            onClick={() => ctx.download(`/exports/memorandum-receipt/${r._id}`, {}, `Memorandum-Receipt-${r.transactionNo}.docx`, r._id)}
          >
            {ctx.busy === r._id ? "Preparing..." : "Generate MR"}
          </Button>
        ),
      },
    ],
  },
  {
    id: "user-receipt",
    title: "IT asset user receipt",
    icon: UserCheck,
    description: "Equipment each employee currently holds.",
    source: (p, s) => assetApi.list(p, s),
    base: { status: "Active" },
    sort: "assetType",
    search: "Search by asset ID, brand, serial...",
    filters: [{ key: "currentUser", type: "employee", placeholder: "All employees" }],
    columns: () => [
      assetCols.user,
      { key: "position", header: "Position", render: (r) => r.currentUser?.position || "—", text: (r) => r.currentUser?.position },
      assetCols.assetId, assetCols.assetType,
      { key: "bm", header: "Brand / model", render: brandModel, text: brandModel },
      assetCols.serialNo, assetCols.location,
    ],
  },
  {
    id: "inventory",
    title: "Inventory of assets",
    icon: Warehouse,
    description: "All assets, consumable and non-consumable, with stock on hand.",
    source: (p, s) => assetApi.list(p, s),
    base: {},
    sort: "assetType",
    search: "Search by asset ID, brand, model, serial...",
    filters: [{ key: "category", placeholder: "All categories", options: ["Non-Consumable", "Consumable"] }, ...assetFilters],
    columns: () => [
      assetCols.assetId, { key: "category", header: "Category", sortable: true }, assetCols.assetType, assetCols.brand, assetCols.model,
      assetCols.serialNo,
      { key: "quantity", header: "Qty", sortable: true, className: "tabular text-right", render: (r) => r.quantity, text: (r) => r.quantity },
      assetCols.location, assetCols.status,
    ],
  },
  {
    id: "disposed",
    title: "Disposed assets",
    icon: Trash2,
    description: "Items that left inventory. Each task has its own disposal log (MBC-SP-ICT-06F4).",
    source: (p, s) => reportApi.flat("disposed", p, s),
    base: {},
    sort: "-date",
    search: "Search by task, ticket, asset ID...",
    filters: [],
    columns: (ctx) => [
      { key: "date", header: "Disposal date", sortable: true, ...date("date") },
      { key: "taskNo", header: "Task no.", sortable: true },
      { key: "ticketNo", header: "Ticket no." },
      assetCols.assetId, assetCols.assetType, assetCols.brand, assetCols.model, assetCols.serialNo,
      { key: "meansOfDisposal", header: "Means of disposal", sortable: true },
      {
        key: "actions",
        header: "Action",
        render: (r) => (
          <Button
            variant="secondary"
            icon={Download}
            className="!px-3 !py-1.5"
            disabled={ctx.busy === r._id}
            onClick={() => ctx.download(`/exports/disposal/${r.transactionId}`, {}, `IT-Asset-Disposal-Log-${r.taskNo || r.transactionNo}.xlsx`, r._id)}
          >
            Disposal log
          </Button>
        ),
      },
    ],
  },
  {
    id: "repairs",
    title: "Repair monitoring",
    icon: Wrench,
    description: "Repair and service tickets. The Excel form (MBC-SP-ICT-06F3) holds 19 tickets, so filter by date or status.",
    source: (p, s) => repairApi.list(p, s),
    base: {},
    sort: "-dateReceived",
    search: "Search by ticket, asset, problem...",
    dates: true,
    filters: [{ key: "status", placeholder: "All statuses", options: REPAIR_STATUSES }],
    excel: { label: "Repair log (Excel)", path: "/exports/repairs", params: ["status", "from", "to"], filename: "IT-Asset-Repair-Monitoring.xlsx" },
    columns: () => [
      { key: "ticketNo", header: "Ticket no.", sortable: true, render: id("ticketNo") },
      { key: "dateReceived", header: "Date received", sortable: true, ...date("dateReceived") },
      { key: "assetCode", header: "Asset code", sortable: true },
      assetCols.assetType,
      { key: "problem", header: "Problem / diagnosis", className: "max-w-xs truncate" },
      { key: "solution", header: "Solution", className: "max-w-xs truncate" },
      { key: "dateFinished", header: "Finished", ...date("dateFinished") },
      { key: "status", header: "Status", sortable: true, render: badge },
    ],
  },
  {
    id: "returned",
    title: "Returned assets",
    icon: Undo2,
    description: "Equipment returned or turned over to ICT.",
    source: (p, s) => reportApi.flat("returned", p, s),
    base: {},
    sort: "-date",
    search: "Search by employee, asset ID...",
    filters: [],
    columns: () => [
      { key: "date", header: "Date returned", sortable: true, ...date("date") },
      { key: "transactionNo", header: "Transaction no.", sortable: true, render: id("transactionNo") },
      { key: "type", header: "Type", render: (r) => TXN_LABELS[r.type] || r.type, text: (r) => TXN_LABELS[r.type] },
      { key: "employee", header: "Returned by", sortable: true },
      assetCols.assetId, assetCols.assetType,
      { key: "bm", header: "Brand / model", render: brandModel, text: brandModel },
      assetCols.serialNo,
      { key: "condition", header: "Condition", render: (r) => <StatusBadge status={r.condition === "Damaged" ? "Damaged" : "Available"} />, text: (r) => r.condition },
    ],
  },
  {
    id: "transaction-logs",
    title: "Transaction logs",
    icon: ScrollText,
    description: "Every request, deployment, return, and disposal.",
    source: (p, s) => transactionApi.list(p, s),
    base: {},
    sort: "-date",
    search: "Search by transaction number, employee...",
    dates: true,
    filters: [
      { key: "type", placeholder: "All types", options: txnTypes },
      { key: "status", placeholder: "All statuses", options: TXN_STATUSES },
    ],
    columns: () => [
      { key: "transactionNo", header: "Transaction no.", sortable: true, render: id("transactionNo") },
      { key: "type", header: "Type", sortable: true, render: (r) => TXN_LABELS[r.type] || r.type, text: (r) => TXN_LABELS[r.type] },
      { key: "date", header: "Date", sortable: true, ...date("date") },
      { key: "employee", header: "Employee", render: (r) => r.employeeSnapshot?.name || "—", text: (r) => r.employeeSnapshot?.name },
      { key: "items", header: "Items", className: "tabular", render: (r) => r.items.length, text: (r) => r.items.length },
      { key: "status", header: "Status", sortable: true, render: badge },
    ],
  },
  {
    id: "active",
    title: "Active assets",
    icon: Activity,
    description: "Assets that are deployed right now.",
    source: (p, s) => assetApi.list(p, s),
    base: { status: "Active" },
    sort: "assetType",
    search: "Search by asset ID, brand, serial...",
    filters: [{ key: "assetType", placeholder: "All asset types", options: ASSET_TYPES }],
    columns: () => [assetCols.assetId, assetCols.assetType, assetCols.brand, assetCols.model, assetCols.serialNo, assetCols.user, assetCols.location],
  },
];
