import { useEffect, useState } from "react";
import { repairApi } from "../../services/index.js";
import Modal from "./Modal.jsx";
import Field from "./Field.jsx";
import Button from "./Button.jsx";
import Notice from "./Notice.jsx";

const STATUSES = ["For Repair", "Repaired", "Damaged"];
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { problem: "", solution: "", technician: "", status: "For Repair", dateReceived: "", dateFinished: "" };

// Mag-entry og record sa kasaysayan (repair / service) para sa usa ka asset
export default function RepairEntryModal({ asset, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (asset) {
      setForm({ ...EMPTY, dateReceived: today() });
      setError("");
    }
  }, [asset?._id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.problem.trim()) return setError("Problem / diagnosis is required.");
    const payload = { asset: asset._id, problem: form.problem.trim(), status: form.status };
    ["solution", "technician", "dateReceived", "dateFinished"].forEach((k) => {
      if (form[k]) payload[k] = form[k];
    });

    setSaving(true);
    setError("");
    try {
      const ticket = await repairApi.create(payload);
      onSaved?.(ticket);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!asset}
      onClose={onClose}
      title={asset ? `Add record · ${asset.assetId}` : ""}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save record"}</Button>
        </>
      }
    >
      <Notice tone="error">{error}</Notice>
      <p className="mb-4 text-sm text-slate-600">
        This creates a repair ticket and updates the asset status automatically (For Repair, Damaged, or back to Active/Available when Repaired).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status" as="select" value={form.status} onChange={set("status")}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Field>
        <Field label="Date received" type="date" value={form.dateReceived} onChange={set("dateReceived")} />
        <Field label="Problem / diagnosis" required as="textarea" rows={2} className="sm:col-span-2" value={form.problem} onChange={set("problem")} />
        <Field label="Solution / recommendation" as="textarea" rows={2} className="sm:col-span-2" value={form.solution} onChange={set("solution")} />
        <Field label="Technician" value={form.technician} onChange={set("technician")} />
        {form.status === "Repaired" && (
          <Field label="Date finished" type="date" value={form.dateFinished} onChange={set("dateFinished")} />
        )}
      </div>
    </Modal>
  );
}