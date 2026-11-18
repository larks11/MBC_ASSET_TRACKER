// options: ["Laptop", ...] o [{ value, label }]
export default function FilterSelect({ value, onChange, options, placeholder, label }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label || placeholder}
      className="rounded border border-line bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}
