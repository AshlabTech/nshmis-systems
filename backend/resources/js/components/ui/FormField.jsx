import { formatLabel } from '../../utils/format';

export function TextField({ name, label, defaultValue = '', type = 'text' }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} />
    </div>
  );
}

export function SelectField({ name, label, options = [], defaultValue = '', onChange }) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: formatLabel(o) } : o,
  );
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} onChange={onChange}>
        <option value="">All</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ControlledSelect({ name, label, options = [], value, onChange }) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: formatLabel(o) } : o,
  );
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
