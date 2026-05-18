import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Plus, Trash2, Save, User, PawPrint, Stethoscope, 
  Search, History, Printer, Edit2, X, Info, Filter,
  Calendar, ShoppingBag, ArrowRight, CheckCircle2
} from 'lucide-react'
import api from '../api'

const EMPTY_LINE = { 
  id: Date.now(), 
  line_type: 'Medicine', 
  medicine_id: '', 
  batch_id: '', 
  procedure_id: '', 
  qty: 1, 
  rate: 0, 
  discount_pct: 0 
}

export default function SalesBill() {
  const [activeTab, setActiveTab] = useState('new')
  const [owners, setOwners] = useState([])
  const [pets, setPets] = useState([])
  const [doctors, setDoctors] = useState([])
  const [medicines, setMedicines] = useState([])
  const [procedures, setProcedures] = useState([])
  const [batches, setBatches] = useState({}) 
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBillId, setEditingBillId] = useState(null)
  const [searchNo, setSearchNo] = useState('')

  const [form, setForm] = useState({
    bill_date: new Date().toISOString().split('T')[0],
    owner_id: '',
    pet_id: '',
    doctor_id: '',
    payment_mode: 'Cash',
    notes: '',
    items: [{ ...EMPTY_LINE }]
  })

  useEffect(() => {
    fetchMasters()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  const fetchMasters = async () => {
    try {
      const [o, d, m, p] = await Promise.all([
        api.get('/owners'),
        api.get('/doctors'),
        api.get('/inventory/medicines'),
        api.get('/services/procedures')
      ])
      setOwners(o.data)
      setDoctors(d.data)
      setMedicines(m.data)
      setProcedures(p.data)
    } catch (err) { toast.error('Error loading master data') }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const r = await api.get('/billing/sales/')
      setHistory(r.data)
    } catch (err) { toast.error('Error loading history') }
    finally { setLoading(false) }
  }

  const fetchOwnerPets = async (id) => {
    try {
      const res = await api.get(`/pets?owner_id=${id}`)
      setPets(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchMedicineBatches = async (medId) => {
    if (batches[medId]) return
    try {
      const res = await api.get(`/inventory/batches/${medId}`)
      setBatches(prev => ({ ...prev, [medId]: res.data }))
    } catch (err) { console.error(err) }
  }

  const addLine = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_LINE, id: Date.now() }] }))
  const removeLine = (id) => setForm(f => ({ ...f, items: f.items.filter(l => l.id !== id) }))

  const updateLine = (id, field, value) => {
    const newItems = form.items.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      if (field === 'medicine_id' && value) {
        fetchMedicineBatches(value)
        const med = medicines.find(m => m.medicine_id === parseInt(value))
        if(med) updated.gst_pct = med.gst_pct
      }
      if (field === 'batch_id' && value) {
        const batch = batches[l.medicine_id]?.find(b => b.batch_id === parseInt(value))
        if (batch) updated.rate = batch.sale_price
      }
      if (field === 'procedure_id' && value) {
        const proc = procedures.find(p => p.procedure_id === parseInt(value))
        if (proc) {
          updated.rate = proc.fee
          updated.gst_pct = proc.gst_pct
        }
      }
      return updated
    })
    setForm({ ...form, items: newItems })
  }

  const calculateGstSummary = () => {
    const slabs = {}
    form.items.forEach(l => {
      const gross = (parseFloat(l.rate) || 0) * (parseFloat(l.qty) || 0)
      const disc = gross * ((parseFloat(l.discount_pct) || 0) / 100)
      const taxable = gross - disc
      const gstPct = parseFloat(l.gst_pct) || 18
      const taxAmount = taxable * (gstPct / 100)
      
      if (!slabs[gstPct]) slabs[gstPct] = { gstPct, taxable: 0, taxAmount: 0, net: 0 }
      slabs[gstPct].taxable += taxable
      slabs[gstPct].taxAmount += taxAmount
      slabs[gstPct].net += (taxable + taxAmount)
    })
    return Object.values(slabs).sort((a,b) => b.gstPct - a.gstPct)
  }

  const calculateTotals = () => {
    const summary = calculateGstSummary()
    const subtotal = summary.reduce((acc, s) => acc + s.taxable, 0)
    const totalTax = summary.reduce((acc, s) => acc + s.taxAmount, 0)
    return { subtotal, totalTax, grandTotal: Math.round(subtotal + totalTax) }
  }

  const handleSave = async () => {
    if (!form.owner_id) return toast.error('Please select an Owner')
    if (form.items.some(l => (l.line_type==='Medicine' && !l.batch_id) || (l.line_type==='Procedure' && !l.procedure_id))) {
      return toast.error('All lines must have an item selected')
    }

    setSaving(true)
    try {
      // Format items for backend
      const items = form.items.map((l, idx) => ({
        line_no: idx + 1,
        line_type: l.line_type,
        medicine_id: l.medicine_id ? parseInt(l.medicine_id) : null,
        batch_id: l.batch_id ? parseInt(l.batch_id) : null,
        procedure_id: l.procedure_id ? parseInt(l.procedure_id) : null,
        qty: parseFloat(l.qty),
        rate: parseFloat(l.rate),
        discount_pct: parseFloat(l.discount_pct)
      }))

      const payload = { ...form, items }

      if (editingBillId) {
        await api.put(`/billing/sales/${editingBillId}`, payload)
        toast.success('Bill updated successfully!')
      } else {
        const res = await api.post('/billing/sales/confirm', payload)
        toast.success(`Bill Generated: ${res.data.bill_number}`)
      }
      resetForm()
      setActiveTab('history')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving bill')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({
      bill_date: new Date().toISOString().split('T')[0],
      owner_id: '',
      pet_id: '',
      doctor_id: '',
      payment_mode: 'Cash',
      notes: '',
      items: [{ ...EMPTY_LINE }]
    })
    setEditingBillId(null)
  }

  const handleEdit = (bill) => {
    setEditingBillId(bill.bill_id)
    setForm({
      bill_date: bill.bill_date,
      owner_id: bill.owner_id,
      pet_id: bill.pet_id || '',
      doctor_id: bill.doctor_id || '',
      payment_mode: bill.payment_mode || 'Cash',
      notes: bill.notes || '',
      items: bill.items.map(i => ({
        id: i.item_id,
        line_type: i.line_type,
        medicine_id: i.medicine_id || '',
        batch_id: i.batch_id || '',
        procedure_id: i.procedure_id || '',
        qty: i.qty,
        rate: i.rate,
        discount_pct: i.discount_pct
      }))
    })
    if (bill.owner_id) fetchOwnerPets(bill.owner_id)
    bill.items.forEach(i => { if(i.medicine_id) fetchMedicineBatches(i.medicine_id) })
    setActiveTab('new')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill and reverse stock?')) return
    try {
      await api.delete(`/billing/sales/${id}`)
      toast.success('Bill deleted')
      fetchHistory()
    } catch (err) { toast.error('Error deleting bill') }
  }

  const searchBill = async () => {
    if (!searchNo) return
    try {
      const res = await api.get(`/billing/sales/by-number/${searchNo}`)
      handleEdit(res.data)
    } catch (err) { toast.error('Bill not found') }
  }

  const { subtotal, totalTax, grandTotal } = calculateTotals()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingBag size={24} />
            </div>
            {editingBillId ? 'Edit Sales Bill' : 'Sales & Retail Billing'}
          </h1>
          <p className="text-sm text-slate-500 font-medium ml-12">
            {editingBillId ? `Updating Bill: ${editingBillId}` : 'Tax-compliant retail invoice engine'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            {editingBillId ? <Edit2 size={14}/> : <Plus size={14}/>} {editingBillId ? 'Edit Mode' : 'New Bill'}
          </button>
          <button 
            onClick={() => { setActiveTab('history'); resetForm(); }}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <History size={14}/> History
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="card shadow-xl border-t-4 border-indigo-600">
            {/* INVOICE SEARCH BAR */}
            <div className="mb-8 p-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-200 border-dashed">
              <div className="text-xs font-black text-slate-400 uppercase w-32">Quick Search:</div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  className="input-field pl-10 h-10 text-sm font-bold bg-white" 
                  placeholder="Enter Bill Number (e.g. SB-001) and press Enter..." 
                  value={searchNo}
                  onChange={e => setSearchNo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchBill()}
                />
              </div>
              <button 
                onClick={searchBill}
                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-black transition-all"
              >
                Load Bill
              </button>
            </div>

            {/* SELECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
              <div>
                <label className="label flex items-center gap-2"><User size={14}/> Pet Owner *</label>
                <select className="input-field h-11 font-bold text-sm" value={form.owner_id} onChange={e => { setForm({...form, owner_id: e.target.value}); fetchOwnerPets(e.target.value); }}>
                  <option value="">Choose Owner...</option>
                  {owners.map(o => <option key={o.owner_id} value={o.owner_id}>{o.name} ({o.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-2"><PawPrint size={14}/> Pet Name</label>
                <select className="input-field h-11 text-sm font-bold" value={form.pet_id} onChange={e => setForm({...form, pet_id: e.target.value})}>
                  <option value="">Select Pet...</option>
                  {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-2"><Stethoscope size={14}/> Doctor Name</label>
                <select className="input-field h-11 text-sm font-bold" value={form.doctor_id} onChange={e => setForm({...form, doctor_id: e.target.value})}>
                  <option value="">Select Doctor...</option>
                  {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-2"><Calendar size={14}/> Bill Date</label>
                <input type="date" className="input-field h-11 font-bold" value={form.bill_date} onChange={e => setForm({...form, bill_date: e.target.value})} />
              </div>
            </div>

            {/* BILL LINES */}
            <div className="overflow-x-auto -mx-6 px-6 mb-6">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-4 text-left w-40">Type</th>
                    <th className="px-4 py-4 text-left">Description / Product</th>
                    <th className="px-4 py-4 text-left w-40">Batch No</th>
                    <th className="px-4 py-4 text-center w-24">Qty</th>
                    <th className="px-4 py-4 text-right w-32">Rate (₹)</th>
                    <th className="px-4 py-4 text-right w-24">Disc %</th>
                    <th className="px-4 py-4 text-right w-32">Amount</th>
                    <th className="px-2 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-3">
                        <select className="input-field py-1.5 font-bold" value={l.line_type} onChange={e => updateLine(l.id, 'line_type', e.target.value)}>
                          <option value="Medicine">Medicine Item</option>
                          <option value="Procedure">Svc Procedure</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {l.line_type === 'Medicine' ? (
                          <select className="input-field py-1.5 font-bold" value={l.medicine_id} onChange={e => updateLine(l.id, 'medicine_id', e.target.value)}>
                            <option value="">Choose Med...</option>
                            {medicines.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.medicine_name}</option>)}
                          </select>
                        ) : (
                          <select className="input-field py-1.5 font-bold" value={l.procedure_id} onChange={e => updateLine(l.id, 'procedure_id', e.target.value)}>
                            <option value="">Choose Svc...</option>
                            {procedures.map(p => <option key={p.procedure_id} value={p.procedure_id}>{p.procedure_name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.line_type === 'Medicine' && (
                          <select className="input-field py-1.5 text-[10px] font-black uppercase text-indigo-600" value={l.batch_id} onChange={e => updateLine(l.id, 'batch_id', e.target.value)}>
                            <option value="">Batch...</option>
                            {batches[l.medicine_id]?.map(b => <option key={b.batch_id} value={b.batch_id}>{b.batch_no} ({b.current_qty} Avl)</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" className="input-field py-1.5 text-center font-bold" value={l.qty} onChange={e => updateLine(l.id, 'qty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" className="input-field py-1.5 text-right font-black text-slate-700" value={l.rate} onChange={e => updateLine(l.id, 'rate', e.target.value)} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" className="input-field py-1.5 text-right text-rose-500 font-bold" value={l.discount_pct} onChange={e => updateLine(l.id, 'discount_pct', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 border-l border-slate-50">
                        ₹{((l.rate * l.qty) * (1 - (l.discount_pct||0)/100)).toFixed(2)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={() => removeLine(l.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addLine} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95">
              <Plus size={14}/> Add Item / Service Line
            </button>

            {/* GST Summary & TOTALS AREA */}
            <div className="flex flex-col md:flex-row justify-between gap-12 border-t border-slate-100 pt-8">
              <div className="flex-1 max-w-lg">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                        <th className="py-2 text-left">GST%</th>
                        <th className="py-2 text-right">Taxable</th>
                        <th className="py-2 text-right">CGST</th>
                        <th className="py-2 text-right">SGST</th>
                        <th className="py-2 text-right">Total GST</th>
                        <th className="py-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculateGstSummary().map(s => (
                        <tr key={s.gstPct}>
                          <td className="py-2 font-black text-slate-600">{s.gstPct}%</td>
                          <td className="py-2 text-right">₹{s.taxable.toLocaleString()}</td>
                          <td className="py-2 text-right text-slate-500">₹{(s.taxAmount/2).toLocaleString()}</td>
                          <td className="py-2 text-right text-slate-500">₹{(s.taxAmount/2).toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-primary-600">₹{s.taxAmount.toLocaleString()}</td>
                          <td className="py-2 text-right font-black text-slate-900">₹{s.net.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Payment Mode</label>
                    <select className="input-field h-10 font-bold text-sm" value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-[10px] uppercase font-black text-slate-400">Reference / Notes</label>
                    <textarea className="input-field h-22 text-sm py-2" placeholder="Internal remarks..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                    <span className="uppercase tracking-widest text-[10px]">Net Taxable:</span>
                    <span className="font-mono">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-indigo-500">
                    <span className="uppercase tracking-widest text-[10px]">GST (CGST+SGST):</span>
                    <span className="font-mono">+ ₹{totalTax.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 mt-4 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Grand Total (Rounded)</span>
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest italic">Payable Amount</span>
                    </div>
                    <span className="text-4xl font-black text-slate-900">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={resetForm} className="flex-1 px-4 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm">Discard</button>
                  <button 
                    disabled={saving}
                    onClick={handleSave}
                    className="flex-[2] px-6 py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300"
                  >
                    {saving ? 'Processing...' : (
                      <>
                        <Save size={18}/> {editingBillId ? 'Update & Save Changes' : 'Confirm & Save Bill'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden shadow-xl border-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Bill Details</th>
                    <th className="px-6 py-5">Customer / Pet</th>
                    <th className="px-6 py-5">Doctor / Agent</th>
                    <th className="px-6 py-5 text-right">Invoice Amount</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-black uppercase animate-pulse">Fetching history...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No invoices found</td></tr>
                  ) : history.map(bill => (
                    <tr key={bill.bill_id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-black text-indigo-600 font-mono tracking-tighter">{bill.bill_number}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold italic"><Calendar size={10}/> {new Date(bill.bill_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-700 uppercase">{bill.owner?.name || 'Walking Customer'}</div>
                        <div className="text-[10px] text-indigo-400 flex items-center gap-1 font-black uppercase"><PawPrint size={10}/> {bill.pet?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Stethoscope size={12}/> {bill.doctor?.name || 'House Staff'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Mode: {bill.payment_mode}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-slate-800">₹{parseFloat(bill.net_payable).toLocaleString()}</div>
                        <div className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Paid Fully</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(bill)} className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                          <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Printer size={16}/></button>
                          <button onClick={() => handleDelete(bill.bill_id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
