import { useEffect, useState } from "react";
import { History, Pencil, Plus, QrCode, Trash2, Wrench } from "lucide-react";
import { assetApi } from "../services/index.js";
import usePaginated from "../hooks/usePaginated.js";
import PageHeader from "../components/ui/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Field from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import Notice from "../components/ui/Notice.jsx";
import AssetHistoryModal from "../components/ui/AssetHistoryModal.jsx";
import RepairEntryModal from "../components/ui/RepairEntryModal.jsx";
import AssetQrModal from "../components/ui/AssetQrModal.jsx";

const STATUSES = ["Active", "Available", "Damaged", "For Repair", "Disposed"];
const TYPES = ["Laptop", "Desktop", "Printer", "Monitor", "Keyboard", "Mouse", "UPS", "AVR", "CCTV Camera", "DVR", "NVR", "Router", "Switch", "Server", "Telephone", "Biometrics", "Tablet", "Access Point"];
const SPEC_TYPES = ["Laptop", "Desktop", "Server"];

const EMPTY_SPECS = {
  operatingSystem: "", systemType: "", processor: "", ram: "", hardDisk: "",
  motherboard: "", opticalDiskDrive: "", cardReader: "", programsInstalled: "",
};
const EMPTY = {
  assetType: "", company: "MAC Builders Corp.", brand: "", model: "", serialNo: "", location: "",
  rfNo: "", acumaticaRI: "", poNo: "", datePurchased: "", supplier: "", invoiceNo: "", invoiceDate: "",
  rrNo: "", amount: "", warrantyDate: "", receivedDate: "", remarks: "",
  specs: EMPTY_SPECS,
};

const dateInput = (d) => (d ? String(d).slice(0, 10) : "");
const blank = (v) => (v === undefined || v === null ? "" : v);

function toForm(a) {
  const f = { ...EMPTY, specs: { ...EMPTY_SPECS } };
  Object.keys(EMPTY).forEach((k) => {
    if (k === "specs") return;
    f[k] = blank(a[k]);
  });
  ["datePurchased", "invoiceDate", "warrantyDate", "receivedDate"].forEach((k) => (f[k] = dateInput(a[k])));
  Object.keys(EMPTY_SPECS).forEach((k) => (f.specs[k] = blank(a.specs?.[k])));
  return f;
}

function toPayload(f) {
  const out = { category: "Non-Consumable" };
  Object.entries(f).forEach(([k, v]) => {
    if (k === "specs") {
      out.specs = Object.fromEntries(Object.entries(v).map(([sk, sv]) => [sk, sv === "" ? null : sv]));
    } else if (k === "amount") {
      out.amount = v === "" ? null : Number(v);
    } else {
      out[k] = v === "" ? null : v;
    }
  });
  out.assetType = f.assetType;
  return out;
}

const TONES = {
  dark: "bg-navy-900 text-white hover:bg-navy-800",
  solid: "bg-brand-600 text-white hover:bg-brand-700",
  soft: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  outline: "border border-brand-600 bg-white text-brand-700 hover:bg-brand-50",
};

function IconBtn({ title, icon: Icon, tone, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${TONES[tone]}`}
    >
      <Icon size={15} />
    </button>
  );
}

export default function Assets() {
  const table = usePaginated((p, s) => assetApi.list(p, s), {
    initialSort: "assetId",
    initialFilters: { category: "Non-Consumable" },
  });

  const [notice, setNotice] = useState({ tone: "success", text: "" });
  const [historyAsset, setHistoryAsset] = useState(null);
  const [repairAsset, setRepairAsset] = useState(null);
  const [qrAsset, setQrAsset] = useState(null);
  const [histKey, setHistKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // asset kung edit, null kung add
  const [form, setForm] = useState(EMPTY);
  const [nextId, setNextId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Preview sa Asset ID kung nag-add
  useEffect(() => {
    if (!formOpen || editing || !form.assetType) {
      setNextId("");
      return;
    }
    assetApi.nextId(form.assetType).then((r) => setNextId(r.assetId)).catch(() => setNextId(""));
  }, [formOpen, editing, form.assetType]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setSpec = (k) => (e) => setForm((f) => ({ ...f, specs: { ...f.specs, [k]: e.target.value } }));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, specs: { ...EMPTY_SPECS } });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setForm(toForm(asset));
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.assetType) return setError("Asset type is required.");
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(form);
      if (editing) await assetApi.update(editing._id, payload);
      else await assetApi.create(payload);
      setNotice({ tone: "success", text: editing ? "Asset updated." : "Asset added." });
      setFormOpen(false);
      setHistKey((k) => k + 1);
      table.refetch();
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (asset) => {
    if (!window.confirm(`Delete ${asset.assetId}? This cannot be undone.`)) return;
    try {
      await assetApi.remove(asset._id);
      setFormOpen(false);
      setNotice({ tone: "success", text: `${asset.assetId} deleted.` });
      table.refetch();
    } catch (e) {
      setError(e.message || "Failed to delete.");
    }
  };

  const columns = [
    { key: "company", header: "Company", sortable: true },
    { key: "assetType", header: "Asset type", sortable: true },
    { key: "assetId", header: "Asset ID", sortable: true, render: (r) => <span className="tabular font-medium text-navy-800">{r.assetId}</span> },
    { key: "brand", header: "Brand", sortable: true },
    { key: "model", header: "Model", sortable: true },
    { key: "serialNo", header: "Serial number" },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <IconBtn title="Report problem / repair" tone="dark" icon={Wrench} onClick={() => setRepairAsset(r)} />
          <IconBtn title="History record" tone="solid" icon={History} onClick={() => setHistoryAsset(r)} />
          <IconBtn title="Edit asset" tone="soft" icon={Pencil} onClick={() => openEdit(r)} />
          <IconBtn title="QR code" tone="outline" icon={QrCode} onClick={() => setQrAsset(r)} />
        </div>
      ),
    },
  ];

  const showSpecs = SPEC_TYPES.includes(form.assetType);

  return (
    <>
      <PageHeader
        title="Non-consumable assets"
        description="Equipment that is assigned to employees, departments, or projects."
        actions={<Button icon={Plus} onClick={openAdd}>Add asset</Button>}
      />
      <Notice tone={notice.tone} onClose={() => setNotice({ ...notice, text: "" })}>{notice.text}</Notice>

      <DataTable
        {...table}
        columns={columns}
        searchPlaceholder="Search by asset ID, brand, model, serial..."
        filters={
          <>
            <FilterSelect value={table.filters.assetType} onChange={(v) => table.setFilter("assetType", v)} options={TYPES} placeholder="All types" />
            <FilterSelect value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={STATUSES} placeholder="All statuses" />
          </>
        }
      />

      {/* History record */}
      <AssetHistoryModal
        asset={historyAsset}
        reloadKey={histKey}
        onClose={() => setHistoryAsset(null)}
        onAddRecord={(a) => setRepairAsset(a)}
      />

      {/* Entry record to history (repair ticket) */}
      <RepairEntryModal
        asset={repairAsset}
        onClose={() => setRepairAsset(null)}
        onSaved={(t) => {
          setNotice({ tone: "success", text: `${t.ticketNo} saved. Asset status updated.` });
          setHistKey((k) => k + 1);
          table.refetch();
        }}
      />

      {/* QR */}
      <AssetQrModal asset={qrAsset} onClose={() => setQrAsset(null)} />

      {/* Add / Edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={editing ? `Edit ${editing.assetId}` : "Add asset"}
        footer={
          <>
            {editing && (
              <Button variant="danger" icon={Trash2} className="mr-auto" onClick={() => remove(editing)} disabled={saving}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Add asset"}</Button>
          </>
        }
      >
        <Notice tone="error">{error}</Notice>

        <Section title="Basic information">
          <Field label="Asset type" required as="select" value={form.assetType} onChange={set("assetType")} disabled={!!editing}>
            <option value="">Select type</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Field>
          <Field label="Asset ID" value={editing ? editing.assetId : nextId || "Auto-generated"} disabled readOnly />
          <Field label="Company" value={form.company} onChange={set("company")} />
          <Field label="Location" value={form.location} onChange={set("location")} />
          <Field label="Brand" value={form.brand} onChange={set("brand")} />
          <Field label="Model" value={form.model} onChange={set("model")} />
          <Field label="Serial number" value={form.serialNo} onChange={set("serialNo")} />
        </Section>

        <Section title="Purchase and receiving">
          <Field label="RF no." value={form.rfNo} onChange={set("rfNo")} />
          <Field label="Acumatica RI" value={form.acumaticaRI} onChange={set("acumaticaRI")} />
          <Field label="PO no." value={form.poNo} onChange={set("poNo")} />
          <Field label="Date purchased" type="date" value={form.datePurchased} onChange={set("datePurchased")} />
          <Field label="Supplier" value={form.supplier} onChange={set("supplier")} />
          <Field label="Invoice no." value={form.invoiceNo} onChange={set("invoiceNo")} />
          <Field label="Invoice date" type="date" value={form.invoiceDate} onChange={set("invoiceDate")} />
          <Field label="RR no." value={form.rrNo} onChange={set("rrNo")} />
          <Field label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} />
          <Field label="Warranty date" type="date" value={form.warrantyDate} onChange={set("warrantyDate")} />
          <Field label="Receiving date" type="date" value={form.receivedDate} onChange={set("receivedDate")} />
        </Section>

        {showSpecs && (
          <Section title="Specifications (Asset History Record)">
            <Field label="Operating system" value={form.specs.operatingSystem} onChange={setSpec("operatingSystem")} />
            <Field label="System type" value={form.specs.systemType} onChange={setSpec("systemType")} />
            <Field label="Processor" value={form.specs.processor} onChange={setSpec("processor")} />
            <Field label="RAM" value={form.specs.ram} onChange={setSpec("ram")} />
            <Field label="Hard disk" value={form.specs.hardDisk} onChange={setSpec("hardDisk")} />
            <Field label="Motherboard" value={form.specs.motherboard} onChange={setSpec("motherboard")} />
            <Field label="Optical disk drive" value={form.specs.opticalDiskDrive} onChange={setSpec("opticalDiskDrive")} />
            <Field label="Card reader" value={form.specs.cardReader} onChange={setSpec("cardReader")} />
            <Field label="Programs installed" as="textarea" rows={2} className="sm:col-span-2" value={form.specs.programsInstalled} onChange={setSpec("programsInstalled")} />
          </Section>
        )}

        <Section title="Remarks">
          <Field label="Remarks" as="textarea" rows={2} className="sm:col-span-2" value={form.remarks} onChange={set("remarks")} />
        </Section>
      </Modal>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}