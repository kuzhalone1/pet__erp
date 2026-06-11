/**
 * components/FormElements.jsx
 * Reusable form primitives used across pages.
 */
import React from 'react';

const inputStyle = {
  padding: '0.45rem 0.6rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  color: '#475569',
};

export function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, style = {} }) {
  const base = {
    padding: '0.45rem 1rem',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'background 0.15s',
    ...style,
  };
  const variants = {
    primary: { background: '#6366f1', color: '#fff' },
    secondary: { background: '#e2e8f0', color: '#334155' },
    danger: { background: '#ef4444', color: '#fff' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...(variants[variant] || variants.primary) }}>
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, placeholder = '', type = 'text', readOnly = false, name }) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ ...inputStyle, background: readOnly ? '#f1f5f9' : '#fff' }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options = [], name }) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <select name={name} value={value} onChange={onChange} style={inputStyle}>
        <option value="">-- Select --</option>
        {options.map((opt) =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
    </div>
  );
}

export function DatePicker({ label, value, onChange, name }) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type="date"
        name={name}
        value={value}
        onChange={e => onChange ? onChange(e.target.value) : null}
        style={inputStyle}
      />
    </div>
  );
}
