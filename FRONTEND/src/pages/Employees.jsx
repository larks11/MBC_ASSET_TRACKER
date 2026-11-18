import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { employeeApi } from "../services/index.js";
import usePaginated from "../hooks/usePaginated.js";
import PageHeader from "../components/ui/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import Field from "../components/ui/Field.jsx";
import Notice from "../components/ui/Notice.jsx";

const EMPTY = { employeeNo: "", name: "", position: "", department: "", email: "", contactNo: "" };

export default function Employees() {
  const table = usePaginated((p, s) => employeeApi.list(p, s), { initialSort: "name" });
  const [editing, setEditing] = useState(null); // null = sarado, {} = bag-o, {_id} = edit
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ tone: "success", text: "" });

  const openForm = (emp) => {
    setEditing(emp || {});
    setForm(emp ? { ...EMPTY, ...emp } : EMPTY);
    setFieldErrors({});
    setFormError("");
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editing._id) await employeeApi.update(editing._id, form);
      else await employeeApi.create(form);
      setNotice({ tone: "success", text: editing._id ? "Employee updated." : "Employee added." });
      setEditing(null);
      table.refetch();
    } catch (e) {
      setFormError(e.message);
      setFieldErrors(e.details || {});
    } finally {
      setSaving(false);
    }
  };

  const remove = async (emp) => {
    if (!window.confirm(`Delete ${emp.name}?`)) return;
    try {
      await employeeApi.remove(emp._id);
      setNotice({ tone: "success", text: "Employee deleted." });
      table.refetch();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };

  const columns = [
    { key: "employeeNo", header: "Employee no.", sortable: true },
    { key: "name", header: "Name", sortable: true, render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "position", header: "Position", sortable: true },
    { key: "department", header: "Department / location", sortable: true },
    { key: "email", header: "Email" },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" icon={Pencil} className="!px-2 !py-1" onClick={() => openForm(r)}>Edit</Button>
          <Button variant="ghost" icon={Trash2} className="!px-2 !py-1 text-red-600" onClick={() => remove(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        description="People who receive equipment. Their details appear on Memorandum Receipts."
        actions={<Button icon={Plus} onClick={() => openForm()}>Add employee</Button>}
      />
      <Notice tone={notice.tone} onClose={() => setNotice({ ...notice, text: "" })}>{notice.text}</Notice>

      <DataTable {...table} columns={columns} searchPlaceholder="Search by name, position, department..." />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? "Edit employee" : "Add employee"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save employee"}</Button>
          </>
        }
      >
        <Notice tone="error">{formError}</Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required value={form.name} onChange={set("name")} error={fieldErrors.name} className="sm:col-span-2" />
          <Field label="Employee no." value={form.employeeNo} onChange={set("employeeNo")} error={fieldErrors.employeeNo} />
          <Field label="Position" value={form.position} onChange={set("position")} />
          <Field label="Department / project location" value={form.department} onChange={set("department")} className="sm:col-span-2" />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field label="Contact no." value={form.contactNo} onChange={set("contactNo")} />
        </div>
      </Modal>
    </>
  );
}
