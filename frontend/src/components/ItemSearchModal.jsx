/**
 * components/ItemSearchModal.jsx
 * Searchable popup for selecting a medicine / inventory item.
 * Props: show, onHide, onSelect(item)
 */
import React, { useState, useEffect } from 'react';
import api from '../api.js';

export default function ItemSearchModal({ show, onHide, onSelect }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setQuery('');
    setLoading(true);
    api.get('/inventory/medicines')
      .then(res => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [show]);

  if (!show) return null;

  const filtered = items.filter(it => {
    const q = query.toLowerCase();
    return (
      (it.medicine_name || '').toLowerCase().includes(q) ||
      (it.medicine_code || '').toLowerCase().includes(q)
    );
  });

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  };
  const modal = {
    background: '#fff', borderRadius: '10px', width: '560px', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  };

  return (
    <div style={overlay} onClick={onHide}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Select Medicine / Item</h3>
          <button onClick={onHide} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <input
            autoFocus
            type="text"
            placeholder="Search by name or code..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>No items found.</p>
          ) : filtered.map(it => (
            <div
              key={it.medicine_id}
              onClick={() => { onSelect(it); onHide(); }}
              style={{
                padding: '0.65rem 1.25rem', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '120px 1fr 80px 60px',
                gap: '0.5rem', alignItems: 'center',
                borderBottom: '1px solid #f8fafc', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontWeight: 600, color: '#6366f1', fontSize: '0.82rem' }}>{it.medicine_code || it.medicine_id}</span>
              <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{it.medicine_name}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>HSN: {it.hsn_code || '—'}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>GST: {it.gst_pct || 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
