import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Save,
  Edit2,
  Search,
  Calendar,
  CreditCard,
  CheckCircle2,
  Filter,
  X,
  Banknote,
  ChevronDown,
  ChevronUp,
  FileText,
  Hash
} from 'lucide-react';
import api from '../api/axios';

const FY_OPTIONS = ['2023-24', '2024-25', '2025-26', '2026-27'];

function SearchableSelect({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedOption = options.find(o => String(o.id) === String(value));

  useEffect(() => {
    if (selectedOption) {
      setSearch(selectedOption.name + (selectedOption.code ? ` (${selectedOption.code})` : ''));
    } else if (!value) {
      setSearch('');
    }
  }, [selectedOption, value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => {
    const term = search.toLowerCase();
    const nameMatch = o.name?.toLowerCase().includes(term);
    const codeMatch = o.code?.toLowerCase().includes(term);
    return nameMatch || codeMatch;
  });

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        className="input-field h-10 w-full pr-10"
        placeholder={placeholder}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setIsOpen(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => setIsOpen(true)}
      />
      <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-400">No matches found</div>
          ) : (
            filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex justify-between items-center ${String(o.id) === String(value) ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-700'}`}
                onClick={() => {
                  onChange(o.id);
                  setSearch(o.name + (o.code ? ` (${o.code})` : ''));
                  setIsOpen(false);
                }}
              >
                <span>{o.name}</span>
                {o.code && <span className="text-xs text-slate-400 font-mono">{o.code}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdvancePayments() {
  const [activeTab, setActiveTab] = useState('new');
  const [fyCodeFilter, setFyCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [advTypeFilter, setAdvTypeFilter] = useState('Given');

  const [parties, setParties] = useState([]);
  const [cashbanks, setCashbanks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingVoucherNo, setEditingVoucherNo] = useState('');
  const [nextVoucherNo, setNextVoucherNo] = useState('');
  const [loadingVoucherNo, setLoadingVoucherNo] = useState(false);

  const emptyForm = {
    fy_code: '2025-26',
    voucher_date: new Date().toISOString().split('T')[0],
    adv_type: 'Given',
    gl_party_id: '',
    gl_cashbank_id: '',
    amount: 0,
    doc_no: '',
    doc_date: '',
    narration: ''
  };

  const [form, setForm] = useState({ ...emptyForm });

  // Fetch preview of next voucher no (without consuming it)
  const fetchNextVoucherNo = async (fyCode) => {
    setLoadingVoucherNo(true);
    try {
      const res = await api.get('/accounts/advance-payments/next-voucher-no', {
        params: { fy_code: fyCode }
      });
      setNextVoucherNo(res.data.voucher_no);
    } catch {
      setNextVoucherNo('AD-Auto');
    } finally {
      setLoadingVoucherNo(false);
    }
  };

  // Fetch all GL accounts for Cash/Bank/GL selection
  useEffect(() => {
    api.get('/ledger/gl')
       .then(res => setCashbanks(res.data))
       .catch(() => toast.error('Error loading general ledger accounts'));
  }, []);

  // Fetch preview voucher no on mount and when FY changes (only in new mode)
  useEffect(() => {
    if (!editingId) {
      fetchNextVoucherNo(form.fy_code);
    }
  }, [form.fy_code, editingId]);

  // Fetch Parties based on Advance Type
  const fetchParties = async (type) => {
    try {
      const endpoint = type === 'Given'
        ? '/ledger/gl?group_name=Creditors'
        : '/ledger/gl?group_name=Debtors';
      const res = await api.get(endpoint);
      setParties(res.data);
    } catch {
      toast.error('Error loading parties');
    }
  };

  useEffect(() => {
    fetchParties(form.adv_type);
    setForm(f => ({ ...f, gl_party_id: '' }));
  }, [form.adv_type]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fyCodeFilter) params.fy_code = fyCodeFilter;
      if (statusFilter) params.status = statusFilter;
      if (advTypeFilter) params.party_type = advTypeFilter === 'Given' ? 'Supplier' : 'Customer';

      const res = await api.get('/accounts/advance-payments', { params });
      setHistory(res.data);
    } catch {
      toast.error('Error loading advance payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setEditingVoucherNo('');
    fetchNextVoucherNo(emptyForm.fy_code);
  };

  const handleSave = async () => {
    if (!form.fy_code) return toast.error('FY Code required');
    if (!form.gl_party_id) return toast.error('Party selection required');
    if (!form.gl_cashbank_id) return toast.error('Cash/Bank selection required');
    if (Number(form.amount) <= 0) return toast.error('Amount must be greater than 0');

    const party = parties.find(p => String(p.gl_id) === String(form.gl_party_id));
    const cb = cashbanks.find(c => String(c.gl_id) === String(form.gl_cashbank_id));

    setSaving(true);
    try {
      const payload = {
        fy_code: form.fy_code,
        voucher_date: form.voucher_date,
        gl_party_id: form.gl_party_id,
        party_name: party?.gl_name || '',
        party_type: form.adv_type === 'Given' ? 'Supplier' : 'Customer',
        gl_cashbank_id: form.gl_cashbank_id,
        cashbank_name: cb?.gl_name || '',
        amount: Number(form.amount),
        doc_no: form.doc_no || null,
        doc_date: form.doc_date || null,
        narration: form.narration
      };

      if (editingId) {
        await api.put(`/accounts/advance-payments/${editingId}`, {
          voucher_date: form.voucher_date,
          doc_no: form.doc_no || null,
          doc_date: form.doc_date || null,
          narration: form.narration
        });
        toast.success('Advance payment updated');
      } else {
        await api.post('/accounts/advance-payments/', payload);
        toast.success('Advance payment created');
      }
      resetForm();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving advance payment');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.adv_id);
    setEditingVoucherNo(record.voucher_no || '');
    const isGiven = record.party_type === 'Supplier';
    setForm({
      fy_code: record.fy_code,
      voucher_date: record.voucher_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      adv_type: isGiven ? 'Given' : 'Received',
      gl_party_id: record.gl_party_id,
      gl_cashbank_id: record.gl_cashbank_id || '',
      amount: record.amount,
      doc_no: record.doc_no || '',
      doc_date: record.doc_date?.split('T')[0] || '',
      narration: record.narration || ''
    });
    setActiveTab('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this advance payment?')) return;
    try {
      await api.delete(`/accounts/advance-payments/${id}`);
      toast.success('Cancelled');
      fetchHistory();
    } catch {
      toast.error('Error cancelling');
    }
  };

  // Displayed voucher number: existing one in edit mode, preview in new mode
  const displayedVoucherNo = editingId
    ? editingVoucherNo
    : (loadingVoucherNo ? '...' : nextVoucherNo);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <CreditCard className="p-2 bg-indigo-50 text-indigo-600 rounded-xl" size={24} />
          Advance Payments
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Plus size={14} /> {editingId ? 'Edit Mode' : 'New'}
          </button>
          <button
            onClick={() => { setActiveTab('history'); resetForm(); }}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Search size={14} /> History
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 gap-6">

          {/* VOUCHER HEADER STRIP */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-wrap items-end gap-4">
            {/* Voucher No — read-only preview */}
            <div className="flex-1 min-w-[160px]">
              <label className="label flex items-center gap-1 text-indigo-700">
                <Hash size={13} /> Voucher No
              </label>
              <input
                id="adv-voucher-no"
                type="text"
                readOnly
                value={displayedVoucherNo}
                className="input-field h-10 w-full font-mono bg-white text-indigo-700 font-bold cursor-not-allowed"
                title={editingId ? 'Existing voucher number' : 'Auto-generated on save'}
              />
            </div>

            {/* FY Code */}
            <div className="flex-1 min-w-[140px]">
              <label className="label flex items-center gap-1"><Calendar size={13} /> FY Code *</label>
              <select
                id="adv-fy-code"
                className="input-field h-10 w-full"
                value={form.fy_code}
                disabled={!!editingId}
                onChange={e => setForm({ ...form, fy_code: e.target.value })}
              >
                <option value="">Select FY</option>
                {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>

            {/* Voucher Date */}
            <div className="flex-1 min-w-[160px]">
              <label className="label flex items-center gap-1"><Calendar size={13} /> Voucher Date *</label>
              <input
                id="adv-voucher-date"
                type="date"
                className="input-field h-10 w-full"
                value={form.voucher_date}
                onChange={e => setForm({ ...form, voucher_date: e.target.value })}
              />
            </div>

            {/* Advance Type */}
            <div className="flex-1 min-w-[180px]">
              <label className="label flex items-center gap-1"><Filter size={13} /> Advance Type *</label>
              <select
                id="adv-type"
                className="input-field h-10 w-full"
                value={form.adv_type}
                disabled={!!editingId}
                onChange={e => setForm({ ...form, adv_type: e.target.value })}
              >
                <option value="Given">Advance Given (to Supplier)</option>
                <option value="Received">Advance Received (from Customer)</option>
              </select>
            </div>
          </div>

          {/* PARTY & CASH/BANK */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1">
                <CreditCard size={14} />
                {form.adv_type === 'Given' ? 'Supplier Party *' : 'Customer Party *'}
              </label>
              <SearchableSelect
                placeholder="Select or type party name..."
                options={parties.map(p => ({ id: p.gl_id, name: p.gl_name, code: p.gl_code }))}
                value={form.gl_party_id}
                onChange={val => setForm({ ...form, gl_party_id: val })}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Banknote size={14} /> Cash / Bank Account *</label>
              <SearchableSelect
                placeholder="Select or type GL account..."
                options={cashbanks.map(c => ({ id: c.gl_id, name: c.gl_name, code: c.gl_code }))}
                value={form.gl_cashbank_id}
                onChange={val => setForm({ ...form, gl_cashbank_id: val })}
              />
            </div>
          </div>

          {/* AMOUNT */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1"><CheckCircle2 size={14} /> Amount *</label>
              <input
                id="adv-amount"
                type="number"
                className="input-field h-10 w-full text-lg font-bold text-indigo-600"
                value={form.amount}
                disabled={!!editingId}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* DOC NO & DOC DATE */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div>
              <label className="label flex items-center gap-1">
                <FileText size={14} /> Doc No
                <span className="text-xs text-slate-400 font-normal ml-1">(Cheque / Advice / Ref No)</span>
              </label>
              <input
                id="adv-doc-no"
                type="text"
                className="input-field h-10 w-full font-mono"
                value={form.doc_no}
                onChange={e => setForm({ ...form, doc_no: e.target.value })}
                placeholder="e.g. CHQ-001234"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={14} /> Doc Date
              </label>
              <input
                id="adv-doc-date"
                type="date"
                className="input-field h-10 w-full"
                value={form.doc_date}
                onChange={e => setForm({ ...form, doc_date: e.target.value })}
              />
            </div>
          </div>

          {/* NARRATION */}
          <div>
            <label className="label flex items-center gap-1"><Edit2 size={14} /> Narration</label>
            <textarea
              id="adv-narration"
              className="input-field h-24 w-full"
              value={form.narration}
              onChange={e => setForm({ ...form, narration: e.target.value })}
              placeholder="Remarks..."
            />
          </div>

          {/* ACTIONS */}
          <div className="flex gap-4">
            <button
              id="adv-discard"
              onClick={resetForm}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
            >
              Discard
            </button>
            <button
              id="adv-save"
              disabled={saving}
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
            >
              {saving ? 'Processing...' : <><Save size={16} className="inline mr-1" /> {editingId ? 'Update' : 'Create'} Advance</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* FILTER BAR */}
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded-xl border border-dashed">
            <select
              className="input-field h-10 w-32"
              value={fyCodeFilter}
              onChange={e => setFyCodeFilter(e.target.value)}
            >
              <option value="">All FY</option>
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            <select
              className="input-field h-10 w-36"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              className="input-field h-10 w-44"
              value={advTypeFilter}
              onChange={e => setAdvTypeFilter(e.target.value)}
            >
              <option value="Given">Given (Suppliers)</option>
              <option value="Received">Received (Customers)</option>
            </select>
            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
            >
              Apply Filters
            </button>
          </div>

          {/* HISTORY TABLE */}
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-black text-slate-400 uppercase">
                  <th className="px-4 py-3">Voucher No</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Voucher Date</th>
                  <th className="px-4 py-3">Doc No</th>
                  <th className="px-4 py-3">Doc Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400">No records found</td></tr>
                ) : (
                  history.map(rec => (
                    <tr key={rec.adv_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-indigo-600 text-sm">{rec.voucher_no || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-700">{rec.party_name}</div>
                        <div className="text-xs text-slate-400">{rec.party_type}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {rec.voucher_date ? new Date(rec.voucher_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{rec.doc_no || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {rec.doc_date ? new Date(rec.doc_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">₹{Number(rec.amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${rec.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            rec.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                            rec.status === 'Adjusted' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        {rec.status === 'Open' && (
                          <>
                            <button
                              title="Edit"
                              onClick={() => handleEdit(rec)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              title="Cancel"
                              onClick={() => handleDelete(rec.adv_id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
