/**
 * components/index.js — Barrel export for all shared components.
 * DebitNote.jsx imports { FormModal, GLPopup, ItemSearchModal, Toast } from "../components"
 */
export { default as FormModal } from './FormModal.jsx';
export { default as GLPopup } from './GLSearchModal.jsx';   // alias
export { default as GLSearchModal } from './GLSearchModal.jsx';
export { default as ItemSearchModal } from './ItemSearchModal.jsx';
export { default as Table } from './Table.jsx';
export { default as AddressBlock } from './AddressBlock.jsx';

/**
 * Toast — lightweight inline toast helper (no extra library needed).
 * Used as Toast.success('msg') / Toast.error('msg').
 */
export const Toast = {
  success: (msg) => {
    console.log('[Toast success]', msg);
    // Mount a quick notification to the DOM
    _showToast(msg, '#22c55e');
  },
  error: (msg) => {
    console.error('[Toast error]', msg);
    _showToast(msg, '#ef4444');
  },
};

function _showToast(message, color) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 99999,
    background: color, color: '#fff', padding: '0.75rem 1.25rem',
    borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    animation: 'fadeIn 0.2s ease',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
