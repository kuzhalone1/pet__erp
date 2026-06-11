/**
 * components/GLSearchModal.jsx
 * Searchable popup for selecting a GL account.
 * Props: show, onHide, onSelect(code, name), type (optional filter label)
 */
import React, { useState, useEffect } from 'react';
import api from '../api.js';

export default function GLSearchModal({ show, onHide, onSelect, type = '' }) {
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setQuery('');
    setLoading(true);
    api.get('/gl-master')
      .then(res => setAccounts(res.data || []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, [show]);

  if (!show) return null;

  const filtered = accounts.filter(a => {
    const q = query.toLowerCase();
    return (
      (a.gl_code || '').toLowerCase().includes(q) ||
      (a.gl_name || '').toLowerCase().includes(q)
    );
  });

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  };
  const modal = {
    background: '#fff', borderRadius: '10px', width: '480px', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  };

  return (
    <div style={overlay} onClick={onHide}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Select GL Account {type ? `— ${type}` : ''}
          </h3>
          <button onClick={onHide} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <input
            autoFocus
            type="text"
            placeholder="Search by code or name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>No accounts found.</p>
          ) : filtered.map(a => (
            <div
              key={a.gl_id}
              onClick={() => { onSelect(a.gl_code, a.gl_name); onHide(); }}
              style={{
                padding: '0.65rem 1.25rem', cursor: 'pointer', display: 'flex', gap: '0.75rem',
                borderBottom: '1px solid #f8fafc', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontWeight: 600, color: '#6366f1', minWidth: '90px', fontSize: '0.82rem' }}>{a.gl_code}</span>
              <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{a.gl_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>{a.group_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
