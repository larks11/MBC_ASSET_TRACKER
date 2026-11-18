// Label + input/select/textarea, may error message sa ubos.
export default function Field({ label, error, required, as = "input", className = "", children, ...props }) {
  const base =
    "w-full rounded border bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none";
  const border = error ? "border-red-400" : "border-line";
  const Tag = as;
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <Tag className={`${base} ${border}`} {...props}>
        {children}
      </Tag>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
