import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Save, Trash2, Edit2,
  Calendar, Hash, FileText,
  ChevronDown, ChevronUp, BookOpen,
  CheckCircle2, X, RefreshCw, Eye, EyeOff,
  AlertTriangle, ArrowUpDown
} from 'lucide-react';
import api from '../api/axios';

const FY_OPTIONS = ['2023-24', '2024-25', '2025-26', '2026-27'];

// ─── Inline SearchableSelect for GL accounts ──────────────────────────────
function GLSearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => o.gl_id === value);

  useEffect(() => {
    setSearch(selected
      ? `${selected.gl_name}${selected.gl_code ? ` (${selected.gl_code})` : ''}`
      : (!value ? '' : search)
    );
  }, [selected, value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => {
    const t = search.toLowerCase();
    return (
      o.gl_name?.toLowerCase().includes(t) ||
      o.gl_code?.toLowerCase().includes(t) ||
      o.group_name?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        disabled={disabled}
        className={`input-field h-9 w-full pr-8 text-xs ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        placeholder={placeholder || 'Search GL account...'}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setIsOpen(true);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
      />
      <div className="absolute right-2 top-2.5 text-slate-400 pointer-events-none">
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-72 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
            : filtered.map(o => (
              <button
                key={o.gl_id}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center gap-2
                  ${o.gl_id === value ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-700'}`}
                onClick={() => {
                  onChange(o.gl_id);
                  setSearch(`${o.gl_name}${o.gl_code ? ` (${o.gl_code})` : ''}`);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{o.gl_name}</span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{o.gl_code}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Build an empty row ─────────────────────────────────────────────────────
const makeEmptyRow = () => ({
  _id: crypto.randomUUID(),
  gl_cr_id: null,
  cr_account_name: '',
  gl_dr_id: null,
  dr_account_name: '',
  cr_amount: '',
  dr_amount: '',
});

// ─── Main Component ─────────────────────────────────────────────────────────
export default function JournalVoucher() {
  const [activeTab, setActiveTab] = useState('new');

  // GL accounts master
  const [glAccounts, setGlAccounts] = useState([]);

  // Next voucher number
  const [nextVoucherNo, setNextVoucherNo] = useState('');
  const [loadingVNo, setLoadingVNo] = useState(false);

  // Form state
  const [form, setForm] = useState({
    fy_code: '2026-27',
    voucher_date: new Date().toISOString().split('T')[0],
    narration: '',
    bill_ref_no: '',
  });
  const [lines, setLines] = useState([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fyFilter, setFyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // Saving
  const [saving, setSaving] = useState(false);

  // ── Fetch GL accounts ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/ledger/gl')
      .then(r => setGlAccounts(r.data || []))
      .catch(() => toast.error('Failed to load GL accounts'));
    fetchNextVoucherNo('2026-27');
  }, []);

  // ── Fetch next voucher number ──────────────────────────────────────────
  const fetchNextVoucherNo = async (fyCode) => {
    setLoadingVNo(true);
    try {
      // The backend uses doc_sequences with doc_type='JV'
      // We peek at the next JV number via a GET on the journal list count
      // (there is no dedicated next-no endpoint for JV, so we derive it from list)
      const res = await api.get('/accounts/journal-vouchers', { params: { fy_code: fyCode } });
      const count = (res.data || []).length;
      // Format same as backend: JV-{fin_year}{padded_no}
      const fyShort = fyCode.replace('-', '').slice(2); // '2026-27' → '2627'
      setNextVoucherNo(`JV-${fyShort}${String(count + 1).padStart(5, '0')}`);
    } catch {
      setNextVoucherNo('JV-Auto');
    } finally {
      setLoadingVNo(false);
    }
  };

  useEffect(() => {
    fetchNextVoucherNo(form.fy_code);
  }, [form.fy_code]);

  // ── Line helpers ────────────────────────────────────────────────────────
  const updateLine = useCallback((id, changes) => {
    setLines(prev => prev.map(l => l._id === id ? { ...l, ...changes } : l));
  }, []);

  const removeLine = useCallback((id) => {
    setLines(prev => {
      if (prev.length <= 1) return prev; // keep at least 1
      return prev.filter(l => l._id !== id);
    });
  }, []);

  const addLine = () => setLines(prev => [...prev, makeEmptyRow()]);

  // ── Computed totals ──────────────────────────────────────────────────────
  const totalCR = lines.reduce((s, l) => s + (parseFloat(l.cr_amount) || 0), 0);
  const totalDR = lines.reduce((s, l) => s + (parseFloat(l.dr_amount) || 0), 0);
  const diff = Math.abs(totalCR - totalDR);
  const isBalanced = diff < 0.005; // float tolerance
  const hasAnyEntry = lines.some(
    l => l.gl_cr_id || l.gl_dr_id || parseFloat(l.cr_amount) > 0 || parseFloat(l.dr_amount) > 0
  );

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fy_code)        return toast.error('FY Code required');
    if (!form.voucher_date)   return toast.error('Voucher Date required');
    if (!form.narration.trim()) return toast.error('Narration is required for journal entries');
    if (!hasAnyEntry)         return toast.error('Enter at least one journal line');
    if (!isBalanced)          return toast.error(`Journal does not balance — difference: ₹${diff.toFixed(2)}`);

    // Filter out blank lines
    const validLines = lines.filter(
      l => l.gl_cr_id || l.gl_dr_id || parseFloat(l.cr_amount) > 0 || parseFloat(l.dr_amount) > 0
    );

    // Each line must have at least one account
    for (let i = 0; i < validLines.length; i++) {
      const l = validLines[i];
      if (!l.gl_cr_id && !l.gl_dr_id) {
        return toast.error(`Line ${i + 1}: at least one GL account (CR or DR) required`);
      }
      if ((parseFloat(l.cr_amount) || 0) === 0 && (parseFloat(l.dr_amount) || 0) === 0) {
        return toast.error(`Line ${i + 1}: amount cannot be zero`);
      }
    }

    // ── Split compound rows into single-sided lines ─────────────────────────
    // The DB has a CHECK CONSTRAINT "line_one_side" which enforces:
    //   each journal_line row can only have CR amount OR DR amount > 0, not both.
    // Our UI shows one row with both CR and DR for user convenience,
    // so we split each compound row into two individual single-sided lines here.
    const splitLines = [];
    for (const l of validLines) {
      const crAmt = parseFloat(l.cr_amount) || 0;
      const drAmt = parseFloat(l.dr_amount) || 0;

      if (l.gl_cr_id && crAmt > 0) {
        splitLines.push({
          gl_cr_id: l.gl_cr_id,
          cr_account_name: l.cr_account_name || null,
          gl_dr_id: null,
          dr_account_name: null,
          cr_amount: crAmt,
          dr_amount: 0,
        });
      }
      if (l.gl_dr_id && drAmt > 0) {
        splitLines.push({
          gl_cr_id: null,
          cr_account_name: null,
          gl_dr_id: l.gl_dr_id,
          dr_account_name: l.dr_account_name || null,
          cr_amount: 0,
          dr_amount: drAmt,
        });
      }
    }

    if (splitLines.length === 0) {
      return toast.error('No valid journal lines to save');
    }

    setSaving(true);
    try {
      const payload = {
        fy_code: form.fy_code,
        voucher_date: form.voucher_date,
        narration: form.narration,
        bill_ref_no: form.bill_ref_no || null,
        lines: splitLines,
      };

      await api.post('/accounts/journal-vouchers/', payload);
      toast.success('Journal Voucher saved and GL posted!');
      resetForm();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save journal voucher');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      fy_code: '2026-27',
      voucher_date: new Date().toISOString().split('T')[0],
      narration: '',
      bill_ref_no: '',
    });
    setLines([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);
    fetchNextVoucherNo('2026-27');
  };

  // ── Fetch history ──────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = {};
      if (fyFilter)   params.fy_code = fyFilter;
      if (dateFrom)   params.start_date = dateFrom;
      if (dateTo)     params.end_date = dateTo;
      const res = await api.get('/accounts/journal-vouchers', { params });
      setHistory(res.data);
    } catch {
      toast.error('Failed to load journal vouchers');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab]);

  // ── Cancel voucher ─────────────────────────────────────────────────────
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this journal voucher? All GL postings will be reversed.')) return;
    try {
      await api.delete(`/accounts/journal-vouchers/${id}`);
      toast.success('Journal Voucher cancelled — GL reversed');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed');
    }
  };

  // ── Status badge ───────────────────────────────────────────────────────
  const statusBadge = (s) => {
    const cls = s === 'Posted'    ? 'bg-emerald-100 text-emerald-700'
              : s === 'Cancelled' ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-700';
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
        {s}
      </span>
    );
  };

  // ── GL account lookup helper ───────────────────────────────────────────
  const glName = (id) => {
    const acc = glAccounts.find(g => g.gl_id === id);
    return acc ? acc.gl_name : `GL #${id}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <BookOpen className="p-2 bg-violet-50 text-violet-600 rounded-xl" size={24} />
          Journal Voucher
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'new' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Plus size={14} /> New
          </button>
          <button
            onClick={() => { setActiveTab('history'); resetForm(); }}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'history' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Search size={14} /> History
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NEW VOUCHER FORM
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'new' && (
        <div className="space-y-5">

          {/* ── Section 1: Voucher Header ── */}
          <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl space-y-3">
            <p className="text-xs font-black text-violet-500 uppercase tracking-widest">Voucher Header</p>

            <div className="flex flex-wrap gap-4">
              {/* Voucher No */}
              <div className="flex-1 min-w-[150px]">
                <label className="label flex items-center gap-1 text-violet-700">
                  <Hash size={13} /> Voucher No
                </label>
                <input
                  readOnly
                  value={loadingVNo ? '...' : nextVoucherNo}
                  className="input-field h-10 w-full font-mono bg-white text-violet-700 font-bold cursor-not-allowed"
                  title="Auto-generated on save"
                />
              </div>
              {/* FY Code */}
              <div className="flex-1 min-w-[130px]">
                <label className="label flex items-center gap-1">
                  <Calendar size={13} /> FY Code *
                </label>
                <select
                  className="input-field h-10 w-full"
                  value={form.fy_code}
                  onChange={e => setForm({ ...form, fy_code: e.target.value })}
                >
                  {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
              {/* Voucher Date */}
              <div className="flex-1 min-w-[150px]">
                <label className="label flex items-center gap-1">
                  <Calendar size={13} /> Voucher Date *
                </label>
                <input
                  type="date"
                  className="input-field h-10 w-full"
                  value={form.voucher_date}
                  onChange={e => setForm({ ...form, voucher_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 p-3 bg-white rounded-xl border border-slate-200">
              {/* Narration */}
              <div className="flex-[2] min-w-[240px]">
                <label className="label flex items-center gap-1">
                  <Edit2 size={13} /> Narration *
                </label>
                <input
                  type="text"
                  className="input-field h-10 w-full"
                  value={form.narration}
                  onChange={e => setForm({ ...form, narration: e.target.value })}
                  placeholder="e.g. Being depreciation charged for April 2026"
                />
              </div>
              {/* Bill / Ref No */}
              <div className="flex-1 min-w-[180px]">
                <label className="label flex items-center gap-1">
                  <FileText size={13} /> Bill / Ref No
                </label>
                <input
                  type="text"
                  className="input-field h-10 w-full font-mono"
                  value={form.bill_ref_no}
                  onChange={e => setForm({ ...form, bill_ref_no: e.target.value })}
                  placeholder="e.g. INV-2024-001"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Journal Lines Grid ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ArrowUpDown size={13} /> Journal Lines
                <span className="font-normal normal-case text-slate-400">— each row can have one CR side and one DR side</span>
              </p>
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"
              >
                <Plus size={12} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2 w-56">
                      <span className="text-blue-600">CR</span> Account (Credit)
                    </th>
                    <th className="px-3 py-2 text-right w-32">
                      <span className="text-blue-600">CR</span> Amount ₹
                    </th>
                    <th className="px-2 py-2 w-6 text-slate-300">|</th>
                    <th className="px-3 py-2 w-56">
                      <span className="text-rose-600">DR</span> Account (Debit)
                    </th>
                    <th className="px-3 py-2 text-right w-32">
                      <span className="text-rose-600">DR</span> Amount ₹
                    </th>
                    <th className="px-3 py-2 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((line, idx) => (
                    <tr key={line._id} className="hover:bg-slate-50 transition-colors">
                      {/* Row number */}
                      <td className="px-3 py-2 text-xs text-slate-400 font-mono">{idx + 1}</td>

                      {/* CR Account */}
                      <td className="px-3 py-2">
                        <GLSearchableSelect
                          options={glAccounts}
                          value={line.gl_cr_id}
                          onChange={(gl_id) => {
                            const acc = glAccounts.find(g => g.gl_id === gl_id);
                            updateLine(line._id, {
                              gl_cr_id: gl_id,
                              cr_account_name: acc?.gl_name || '',
                            });
                          }}
                          placeholder="Search CR account..."
                        />
                      </td>

                      {/* CR Amount */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.cr_amount}
                          onChange={e => updateLine(line._id, { cr_amount: e.target.value })}
                          className="w-full text-right px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Divider */}
                      <td className="px-1 py-2 text-slate-200 text-center font-thin select-none">|</td>

                      {/* DR Account */}
                      <td className="px-3 py-2">
                        <GLSearchableSelect
                          options={glAccounts}
                          value={line.gl_dr_id}
                          onChange={(gl_id) => {
                            const acc = glAccounts.find(g => g.gl_id === gl_id);
                            updateLine(line._id, {
                              gl_dr_id: gl_id,
                              dr_account_name: acc?.gl_name || '',
                            });
                          }}
                          placeholder="Search DR account..."
                        />
                      </td>

                      {/* DR Amount */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.dr_amount}
                          onChange={e => updateLine(line._id, { dr_amount: e.target.value })}
                          className="w-full text-right px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-rose-700 bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Remove */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeLine(line._id)}
                          disabled={lines.length <= 1}
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan="2" className="px-3 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wide">
                      Totals:
                    </td>
                    <td className="px-3 py-3 text-right font-black text-blue-700 text-sm">
                      ₹{totalCR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                    <td className="px-3 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wide"></td>
                    <td className="px-3 py-3 text-right font-black text-rose-700 text-sm">
                      ₹{totalDR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>

                  {/* Balance checker */}
                  <tr className={`border-t ${isBalanced ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <td colSpan="7" className="px-3 py-2">
                      <div className={`flex items-center gap-2 text-xs font-bold ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isBalanced
                          ? <><CheckCircle2 size={14} /> Journal is balanced — CR = DR = ₹{totalCR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
                          : <><AlertTriangle size={14} /> Journal is out of balance by ₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })} — CR: ₹{totalCR.toFixed(2)}, DR: ₹{totalDR.toFixed(2)}</>
                        }
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-4">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isBalanced || !hasAnyEntry}
              title={!isBalanced ? 'Journal must balance before saving' : ''}
              className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-violet-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving...' : <><Save size={16} /> Save Journal Voucher</>}
            </button>
          </div>

          {/* Balance hint when not balanced */}
          {hasAnyEntry && !isBalanced && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                <strong>Journal must balance before saving.</strong> Total Credit must equal Total Debit.
                Currently out of balance by <strong>₹{diff.toFixed(2)}</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HISTORY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-dashed">
            <select
              className="input-field h-10 w-32"
              value={fyFilter}
              onChange={e => setFyFilter(e.target.value)}
            >
              <option value="">All FY</option>
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">From</span>
              <input
                type="date"
                className="input-field h-10 w-40"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <span className="text-xs text-slate-500 font-semibold">To</span>
              <input
                type="date"
                className="input-field h-10 w-40"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-all"
            >
              <RefreshCw size={14} /> Apply Filters
            </button>
          </div>

          {/* History table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-black text-slate-400 uppercase">
                  <th className="px-4 py-3">Voucher No</th>
                  <th className="px-4 py-3">FY</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Narration</th>
                  <th className="px-4 py-3">Ref / Bill No</th>
                  <th className="px-4 py-3 text-right">Total CR</th>
                  <th className="px-4 py-3 text-right">Total DR</th>
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
                    const isExpanded = expandedRow === rec.journal_id;
                    return (
                      <React.Fragment key={rec.journal_id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-violet-600 text-sm font-bold">{rec.voucher_no}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{rec.fy_code}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {rec.voucher_date ? new Date(rec.voucher_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate" title={rec.narration}>
                            {rec.narration}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {rec.bill_ref_no || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700">
                            ₹{Number(rec.total_cr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700">
                            ₹{Number(rec.total_dr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">{statusBadge(rec.status)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View lines */}
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : rec.journal_id)}
                                title={isExpanded ? 'Hide lines' : 'View lines'}
                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                              >
                                {isExpanded ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              {/* Cancel */}
                              {rec.status === 'Posted' && (
                                <button
                                  onClick={() => handleCancel(rec.journal_id)}
                                  title="Cancel voucher"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── Expanded line details ── */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" className="px-4 pb-4 bg-violet-50">
                              <div className="rounded-xl border border-violet-100 overflow-hidden mt-1">
                                <div className="px-4 py-2 bg-violet-100 border-b border-violet-200">
                                  <p className="text-xs font-black text-violet-600 uppercase tracking-widest">
                                    Journal Lines — {rec.voucher_no}
                                    {rec.narration && (
                                      <span className="ml-3 font-normal normal-case text-violet-400">
                                        {rec.narration}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {rec.lines && rec.lines.length > 0 ? (
                                  <table className="w-full text-sm bg-white">
                                    <thead>
                                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                        <th className="px-4 py-2 w-8">Ln</th>
                                        <th className="px-4 py-2">CR Account</th>
                                        <th className="px-4 py-2 text-right">CR Amount</th>
                                        <th className="px-4 py-2">DR Account</th>
                                        <th className="px-4 py-2 text-right">DR Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {rec.lines.map((line, li) => (
                                        <tr key={li} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 text-xs text-slate-400">{line.line_no}</td>
                                          <td className="px-4 py-2 text-sm text-slate-700">
                                            {line.cr_account_name || (line.gl_cr_id ? glName(line.gl_cr_id) : '—')}
                                          </td>
                                          <td className="px-4 py-2 text-right font-semibold text-blue-700">
                                            {parseFloat(line.cr_amount || 0) > 0
                                              ? `₹${Number(line.cr_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                              : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-slate-700">
                                            {line.dr_account_name || (line.gl_dr_id ? glName(line.gl_dr_id) : '—')}
                                          </td>
                                          <td className="px-4 py-2 text-right font-semibold text-rose-700">
                                            {parseFloat(line.dr_amount || 0) > 0
                                              ? `₹${Number(line.dr_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                              : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-violet-200 bg-violet-50">
                                        <td colSpan="2" className="px-4 py-2 text-right text-xs font-black text-slate-600 uppercase">
                                          Totals:
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-blue-700">
                                          ₹{Number(rec.total_cr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td />
                                        <td className="px-4 py-2 text-right font-black text-rose-700">
                                          ₹{Number(rec.total_dr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                ) : (
                                  <div className="px-4 py-4 text-center text-xs text-slate-400 bg-white">
                                    No line details available
                                  </div>
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
