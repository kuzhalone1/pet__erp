import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Save, Trash2, Edit2,
  Calendar, CreditCard, Banknote, Hash,
  FileText, ChevronDown, ChevronUp,
  CheckCircle2, ReceiptText, X, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import api from '../api/axios';

const FY_OPTIONS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const PAYMENT_TYPES = ['Cash', 'Cheque', 'NEFT', 'UPI', 'RTGS'];

// ─── Reusable SearchableSelect ─────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => String(o.id) === String(value));

  useEffect(() => {
    setSearch(selected ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}` : (!value ? '' : search));
  }, [selected, value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => {
    const t = search.toLowerCase();
    return o.name?.toLowerCase().includes(t) || o.code?.toLowerCase().includes(t);
  });

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        disabled={disabled}
        className={`input-field h-10 w-full pr-10 ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); setIsOpen(true); if (!e.target.value) onChange(''); }}
        onFocus={() => !disabled && setIsOpen(true)}
      />
      <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-4 py-2 text-sm text-slate-400">No matches</div>
            : filtered.map(o => (
              <button key={o.id} type="button"
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex justify-between items-center
                  ${String(o.id) === String(value) ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-700'}`}
                onClick={() => { onChange(o.id); setSearch(`${o.name}${o.code ? ` (${o.code})` : ''}`); setIsOpen(false); }}
              >
                <span>{o.name}</span>
                {o.code && <span className="text-xs text-slate-400 font-mono">{o.code}</span>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function PaymentVoucher() {
  const [activeTab, setActiveTab] = useState('new');

  // Lookup data
  const [suppliers, setSuppliers] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);

  // Bills panel
  const [pendingBills, setPendingBills] = useState([]);
  const [fetchingBills, setFetchingBills] = useState(false);
  const [billsFetched, setBillsFetched] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fyFilter, setFyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // History detail view
  const [expandedRow, setExpandedRow] = useState(null);

  // Next voucher preview
  const [nextVoucherNo, setNextVoucherNo] = useState('');
  const [loadingVNo, setLoadingVNo] = useState(false);

  // Manual amount (used for advance / no-bill payments)
  const [manualAmount, setManualAmount] = useState('');

  // Saving
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    fy_code: '2026-27',
    voucher_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    gl_party_id: '',
    gl_cashbank_id: '',
    payment_type: 'Cash',
    ref_no: '',
    ref_date: '',
    narration: '',
    details: []   // [{vou_type, bill_id, bill_no, bill_date, bill_amount, prev_paid, balance_amount, amount_paid}]
  };
  const [form, setForm] = useState({ ...emptyForm });

  // ── Fetch preview voucher no ──────────────────────────────────────────
  const fetchNextVoucherNo = async (fyCode) => {
    setLoadingVNo(true);
    try {
      const res = await api.get('/accounts/payment-vouchers/next-voucher-no', { params: { fy_code: fyCode } });
      setNextVoucherNo(res.data.voucher_no);
    } catch { setNextVoucherNo('PV-Auto'); }
    finally { setLoadingVNo(false); }
  };

  // ── Load lookup data on mount ─────────────────────────────────────────
  useEffect(() => {
    api.get('/inventory/suppliers?limit=500').then(r => setSuppliers(r.data || [])).catch(() => toast.error('Failed to load suppliers'));
    api.get('/ledger/gl').then(r => setGlAccounts(r.data || [])).catch(() => toast.error('Failed to load GL accounts'));
    fetchNextVoucherNo('2026-27');
  }, []);

  useEffect(() => { if (!form.supplier_id) fetchNextVoucherNo(form.fy_code); }, [form.fy_code]);

  // ── Fetch bills when supplier selected ───────────────────────
  const handleSupplierChange = async (supplierId) => {
    setForm(f => ({ ...f, supplier_id: supplierId, gl_party_id: '', details: [] }));
    setPendingBills([]);
    setBillsFetched(false);
    setManualAmount('');
  };

  const fetchBills = async () => {
    if (!form.supplier_id) return toast.error('Select a party (Supplier) first');
    setFetchingBills(true);
    try {
      const res = await api.get(`/accounts/payment-vouchers/fetch-bills/${form.supplier_id}`);
      setPendingBills(res.data.bills || []);
      // Auto-set the party's GL account
      if (res.data.gl_party_id && res.data.gl_party_id !== -1) {
        setForm(f => ({ ...f, gl_party_id: res.data.gl_party_id }));
      } else {
        toast('No GL account linked to this supplier. Please set it in Suppliers master.', { icon: '⚠️' });
      }
      setBillsFetched(true);
      if ((res.data.bills || []).length === 0) {
        toast('No pending bills for this party', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch bills');
    } finally {
      setFetchingBills(false);
    }
  };

  // ── Toggle bill in/out of detail lines ───────────────────────────────
  const toggleBill = (bill) => {
    setForm(f => {
      const exists = f.details.find(d => d.bill_id === bill.bill_id && d.vou_type === 'Bill');
      if (exists) {
        return { ...f, details: f.details.filter(d => !(d.bill_id === bill.bill_id && d.vou_type === 'Bill')) };
      }
      const balance = parseFloat(bill.balance || 0);
      return {
        ...f,
        details: [...f.details, {
          vou_type: 'Bill',
          bill_id: bill.bill_id,
          bill_no: bill.bill_no,
          bill_date: bill.bill_date,
          bill_amount: parseFloat(bill.net_amount),
          prev_paid: parseFloat(bill.prev_paid || 0),
          balance_amount: balance,
          amount_paid: balance,
          adv_id: null
        }]
      };
    });
  };

  // ── Edit amount_paid on a detail line ────────────────────────────
  const updateDetailAmount = (index, value) => {
    setForm(f => {
      const details = [...f.details];
      const parsed = parseFloat(value) || 0;
      const balance = details[index].balance_amount || 0;
      if (parsed > balance) {
        toast.error(`Amount cannot exceed balance ₹${Number(balance).toLocaleString('en-IN')}`);
        return f;
      }
      details[index] = { ...details[index], amount_paid: parsed };
      return { ...f, details };
    });
  };

  const removeDetail = (index) => {
    setForm(f => ({ ...f, details: f.details.filter((_, i) => i !== index) }));
  };

  // ── Computed totals ───────────────────────────────────────────────────
  const totalPaid = form.details.reduce((s, d) => s + (parseFloat(d.amount_paid) || 0), 0);
  // If no bill lines selected, use the manual amount (advance payment scenario)
  const displayTotal = form.details.length > 0 ? totalPaid : parseFloat(manualAmount || 0);

  // ── Whether ref fields should be shown (not applicable for Cash) ──────
  const showRefFields = form.payment_type !== 'Cash';

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fy_code)          return toast.error('FY Code required');
    if (!form.voucher_date)     return toast.error('Payment Date required');
    if (!form.supplier_id)      return toast.error('Party (Supplier) required');
    if (!form.gl_party_id)      return toast.error('Party GL account required — click "Fetch Bills" first to auto-populate it');
    if (!form.gl_cashbank_id)   return toast.error('Cash/Bank account required');
    if (displayTotal <= 0)      return toast.error('Total amount must be greater than 0');
    if (form.details.length === 0 && (!manualAmount || parseFloat(manualAmount) <= 0)) {
      return toast.error('Enter the advance / manual payment amount');
    }
    if (showRefFields && !form.ref_no) {
      toast('Reference number is missing for non-cash payment. Proceeding anyway.', { icon: '⚠️' });
    }

    setSaving(true);
    try {
      const selectedSupplier = suppliers.find(s => s.supplier_id === Number(form.supplier_id));
      const selectedCashbank = glAccounts.find(g => g.gl_id === Number(form.gl_cashbank_id));

      const payload = {
        fy_code: form.fy_code,
        voucher_date: form.voucher_date,
        gl_party_id: Number(form.gl_party_id),
        party_name: selectedSupplier?.supplier_name || 'Unknown Party',
        gl_cashbank_id: Number(form.gl_cashbank_id),
        cashbank_name: selectedCashbank?.gl_name || 'Unknown Bank',
        total_amount: displayTotal,
        payment_type: form.payment_type,
        ref_no: form.ref_no || null,
        ref_date: form.ref_date || null,
        narration: form.narration || null,
        details: form.details.length > 0
          ? form.details.map(d => ({
              vou_type: d.vou_type,
              bill_id: d.bill_id || null,
              bill_no: d.bill_no || null,
              bill_date: d.bill_date || null,
              bill_amount: d.bill_amount || null,
              prev_paid: d.prev_paid || 0,
              balance_amount: d.balance_amount || null,
              amount_paid: d.amount_paid,
              adv_id: d.adv_id || null
            }))
          : [{
              // Advance / manual payment — single detail line
              vou_type: 'Advance',
              bill_id: null,
              bill_no: null,
              bill_date: null,
              bill_amount: null,
              prev_paid: 0,
              balance_amount: null,
              amount_paid: parseFloat(manualAmount),
              adv_id: null
            }]
      };

      await api.post('/accounts/payment-vouchers/', payload);
      toast.success('Payment Voucher saved successfully!');
      resetForm();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save payment voucher');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset form ───────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ ...emptyForm, fy_code: '2026-27' });
    setPendingBills([]);
    setBillsFetched(false);
    setManualAmount('');
    fetchNextVoucherNo('2026-27');
  };

  // ── Fetch history ────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = {};
      if (fyFilter) params.fy_code = fyFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/accounts/payment-vouchers', { params });
      setHistory(res.data);
    } catch { toast.error('Failed to load payment vouchers'); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab]);

  // ── Cancel a voucher ─────────────────────────────────────────────────
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this payment voucher? GL postings will be reversed.')) return;
    try {
      await api.delete(`/accounts/payment-vouchers/${id}`);
      toast.success('Voucher cancelled and GL reversed');
      fetchHistory();
    } catch (err) { toast.error(err.response?.data?.detail || 'Cancel failed'); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const supplierOptions = suppliers.map(s => ({ id: s.supplier_id, name: s.supplier_name, code: s.supplier_code }));
  const glOptions       = glAccounts.map(g => ({ id: g.gl_id, name: g.gl_name, code: g.gl_code }));

  const isBillSelected  = (bill_id) => form.details.some(d => d.bill_id === bill_id && d.vou_type === 'Bill');

  const statusBadge = (s) => {
    const cls = s === 'Posted'    ? 'bg-emerald-100 text-emerald-700'
              : s === 'Cancelled' ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-700';
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>{s}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <ReceiptText className="p-2 bg-indigo-50 text-indigo-600 rounded-xl" size={24} />
          Payment Vouchers
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
          <button onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <Plus size={14} /> New
          </button>
          <button onClick={() => { setActiveTab('history'); resetForm(); }}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <Search size={14} /> History
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NEW VOUCHER FORM
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'new' && (
        <div className="space-y-5">

          {/* ── SECTION 1: VOUCHER HEADER ── */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Voucher Header</p>
              {/* Advance / Manual amount field — only shown when no bills are selected */}
              {form.details.length === 0 && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                  <span className="text-xs font-bold text-indigo-700">Advance / Manual Amount: ₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    className="w-28 text-right bg-transparent outline-none font-bold text-indigo-700"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Voucher No preview */}
              <div className="flex-1 min-w-[150px]">
                <label className="label flex items-center gap-1 text-indigo-700"><Hash size={13} /> Voucher No</label>
                <input readOnly value={loadingVNo ? '...' : nextVoucherNo}
                  className="input-field h-10 w-full font-mono bg-white text-indigo-700 font-bold cursor-not-allowed"
                  title="Auto-generated on save" />
              </div>
              {/* FY Code */}
              <div className="flex-1 min-w-[130px]">
                <label className="label flex items-center gap-1"><Calendar size={13} /> FY Code *</label>
                <select className="input-field h-10 w-full" value={form.fy_code}
                  onChange={e => setForm({ ...form, fy_code: e.target.value })}>
                  {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
              {/* Voucher Date */}
              <div className="flex-1 min-w-[150px]">
                <label className="label flex items-center gap-1"><Calendar size={13} /> Payment Date *</label>
                <input type="date" className="input-field h-10 w-full" value={form.voucher_date}
                  onChange={e => setForm({ ...form, voucher_date: e.target.value })} />
              </div>
              {/* Payment Type */}
              <div className="flex-1 min-w-[140px]">
                <label className="label flex items-center gap-1"><CreditCard size={13} /> Payment Type</label>
                <select className="input-field h-10 w-full" value={form.payment_type}
                  onChange={e => setForm({ ...form, payment_type: e.target.value, ref_no: '', ref_date: '' })}>
                  {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Party (Supplier) */}
              <div className="flex-1 min-w-[240px]">
                <label className="label flex items-center gap-1"><CreditCard size={13} /> Party (Supplier) *</label>
                <SearchableSelect options={supplierOptions} value={form.supplier_id}
                  onChange={handleSupplierChange} placeholder="Search supplier name..." />
              </div>
              {/* Cash / Bank */}
              <div className="flex-1 min-w-[240px]">
                <label className="label flex items-center gap-1"><Banknote size={13} /> Cash / Bank A/c *</label>
                <SearchableSelect options={glOptions} value={form.gl_cashbank_id}
                  onChange={val => setForm({ ...form, gl_cashbank_id: val })} placeholder="Search GL account..." />
              </div>
            </div>

            {/* Ref No + Ref Date (hidden for Cash) + Narration */}
            <div className="flex flex-wrap gap-4 p-3 bg-white rounded-xl border border-slate-200">
              {showRefFields && (
                <>
                  <div className="flex-1 min-w-[180px]">
                    <label className="label flex items-center gap-1">
                      <FileText size={13} /> Ref No
                      <span className="text-xs text-slate-400 font-normal ml-1">(Cheque / UTR / NEFT No)</span>
                    </label>
                    <input type="text" className="input-field h-10 w-full font-mono" value={form.ref_no}
                      onChange={e => setForm({ ...form, ref_no: e.target.value })} placeholder="e.g. CHQ-001234" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="label flex items-center gap-1"><Calendar size={13} /> Ref Date</label>
                    <input type="date" className="input-field h-10 w-full" value={form.ref_date}
                      onChange={e => setForm({ ...form, ref_date: e.target.value })} />
                  </div>
                </>
              )}
              {!showRefFields && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <FileText size={13} /> Ref No / Ref Date not applicable for Cash payments
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <label className="label flex items-center gap-1"><Edit2 size={13} /> Narration</label>
                <input type="text" className="input-field h-10 w-full" value={form.narration}
                  onChange={e => setForm({ ...form, narration: e.target.value })} placeholder="Remarks..." />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: FETCH BILLS BUTTON + GRIDS ── */}
          <div className="flex items-center gap-3">
            <button onClick={fetchBills} disabled={!form.supplier_id || fetchingBills}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all">
              <RefreshCw size={14} className={fetchingBills ? 'animate-spin' : ''} />
              {fetchingBills ? 'Fetching...' : 'Fetch Bills'}
            </button>
            {billsFetched && (
              <span className="text-xs text-slate-500 font-semibold">
                {pendingBills.length} bill(s) found
              </span>
            )}
            {!billsFetched && form.supplier_id && (
              <span className="text-xs text-amber-600 font-semibold">
                ⚠ Click "Fetch Bills" to populate the party GL account (required even for advance payments)
              </span>
            )}
          </div>

          {billsFetched && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Pending Purchase Bills — click to select
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-3 py-2">Bill No</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Bill Amount</th>
                      <th className="px-3 py-2 text-right">Prev Paid</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                      <th className="px-3 py-2 text-center">Add</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingBills.length === 0
                      ? <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400 text-xs">No pending bills</td></tr>
                      : pendingBills.map(b => {
                        const sel = isBillSelected(b.bill_id);
                        return (
                          <tr key={b.bill_id} onClick={() => toggleBill(b)}
                            className={`cursor-pointer transition-colors ${sel ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-2 font-mono text-indigo-600 font-semibold text-xs">{b.bill_no}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">
                              {b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">₹{Number(b.net_amount).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right text-slate-500">₹{Number(b.prev_paid || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right font-bold text-indigo-600">₹{Number(b.balance).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-center">
                              <div className={`w-4 h-4 mx-auto rounded border-2 flex items-center justify-center
                                ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {sel && <CheckCircle2 size={10} className="text-white" />}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SECTION 3: SELECTED PAYMENT LINES ── */}
          {form.details.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Payment Lines — edit amounts</p>
                <span className="text-sm font-black text-indigo-700">Total: ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Bill No</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2 text-right">Bill Amt</th>
                      <th className="px-4 py-2 text-right">Prev Paid</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-right">Paying Now ✏️</th>
                      <th className="px-4 py-2 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {form.details.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                            {d.vou_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{d.bill_no || '—'}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {d.bill_date ? new Date(d.bill_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">₹{Number(d.bill_amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right text-slate-500">₹{Number(d.prev_paid || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-semibold">₹{Number(d.balance_amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min="0" max={d.balance_amount} step="0.01"
                            value={d.amount_paid}
                            onChange={e => updateDetailAmount(i, e.target.value)}
                            className="w-32 text-right px-2 py-1 border border-slate-300 rounded-lg text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => removeDetail(i)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                      <td colSpan="6" className="px-4 py-3 text-right font-black text-slate-700 text-sm uppercase tracking-wide">
                        Total Paying:
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-700 text-base">
                        ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div className="flex gap-4">
            <button onClick={resetForm}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all">
              Discard
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all">
              {saving ? 'Saving...' : <><Save size={16} />Save Payment Voucher</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HISTORY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-dashed">
            <select className="input-field h-10 w-32" value={fyFilter} onChange={e => setFyFilter(e.target.value)}>
              <option value="">All FY</option>
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            <select className="input-field h-10 w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Posted">Posted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button onClick={fetchHistory}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">
              Apply Filters
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-black text-slate-400 uppercase">
                  <th className="px-4 py-3">Voucher No</th>
                  <th className="px-4 py-3">FY</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Payment Type</th>
                  <th className="px-4 py-3">Ref No</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory
                  ? <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                  : history.length === 0
                  ? <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-400">No records found</td></tr>
                  : history.map(rec => {
                    const isExpanded = expandedRow === rec.payment_id;
                    return (
                      <React.Fragment key={rec.payment_id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-indigo-600 text-sm font-bold">{rec.voucher_no}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{rec.fy_code}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {rec.voucher_date ? new Date(rec.voucher_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {rec.party_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{rec.payment_type}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-500">{rec.ref_no || '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            ₹{Number(rec.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">{statusBadge(rec.status)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View details toggle */}
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : rec.payment_id)}
                                title={isExpanded ? 'Hide details' : 'View details'}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                {isExpanded ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              {/* Cancel button */}
                              {rec.status === 'Posted' && (
                                <button onClick={() => handleCancel(rec.payment_id)}
                                  title="Cancel voucher"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── Expanded Detail Rows ── */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" className="px-4 pb-4 bg-indigo-50">
                              <div className="rounded-xl border border-indigo-100 overflow-hidden mt-1">
                                <div className="px-4 py-2 bg-indigo-100 border-b border-indigo-200">
                                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                    Payment Details — {rec.voucher_no}
                                    {rec.narration && <span className="ml-3 font-normal normal-case text-indigo-400">Narration: {rec.narration}</span>}
                                  </p>
                                </div>
                                {rec.details && rec.details.length > 0 ? (
                                  <table className="w-full text-sm bg-white">
                                    <thead>
                                      <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                                        <th className="px-4 py-2">Line</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Bill No</th>
                                        <th className="px-4 py-2">Bill Date</th>
                                        <th className="px-4 py-2 text-right">Bill Amt</th>
                                        <th className="px-4 py-2 text-right">Prev Paid</th>
                                        <th className="px-4 py-2 text-right">Balance</th>
                                        <th className="px-4 py-2 text-right font-black text-indigo-600">Amount Paid</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {rec.details.map((det, di) => (
                                        <tr key={di} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 text-xs text-slate-400">{det.line_no}</td>
                                          <td className="px-4 py-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                                              {det.vou_type}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 font-mono text-xs text-indigo-600">{det.bill_no || '—'}</td>
                                          <td className="px-4 py-2 text-xs text-slate-500">
                                            {det.bill_date ? new Date(det.bill_date).toLocaleDateString('en-IN') : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-xs">
                                            {det.bill_amount ? `₹${Number(det.bill_amount).toLocaleString('en-IN')}` : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-xs text-slate-500">
                                            {det.prev_paid != null ? `₹${Number(det.prev_paid).toLocaleString('en-IN')}` : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-xs">
                                            {det.balance_amount ? `₹${Number(det.balance_amount).toLocaleString('en-IN')}` : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-right font-bold text-indigo-700">
                                            ₹{Number(det.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                                        <td colSpan="7" className="px-4 py-2 text-right text-xs font-black text-slate-600 uppercase">
                                          Total Paid:
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-indigo-700">
                                          ₹{Number(rec.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                ) : (
                                  <div className="px-4 py-4 text-center text-xs text-slate-400 bg-white">No line details available</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
