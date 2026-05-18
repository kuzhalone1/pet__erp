import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Plus, Trash2, ShoppingCart, Save, Search, 
  History, FileText, Printer, ArrowLeft, Filter,
  Calendar, Package, User, Edit2, X, Info
} from 'lucide-react'
import api from '../api'

const EMPTY_ITEM = { 
  medicine_id: '', 
  batch_no: '', 
  mfg_date: '', 
  expiry_date: '', 
  quantity: 0, 
  free_quantity: 0, 
  purchase_price: 0, 
  sale_price: 0, 
  gst_pct: 12 
}

export default function Purchases() {
  const [activeTab, setActiveTab] = useState('new') // 'new' or 'history'
  const [suppliers, setSuppliers] = useState([])
  const [medicines, setMedicines] = useState([])
  const [history, setHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBillId, setEditingBillId] = useState(null)
  
  const [form, setForm] = useState({ 
    supplier_id: '', 
    bill_date: new Date().toISOString().slice(0, 10), 
    supplier_invoice_no: '', 
    items: [{ ...EMPTY_ITEM }], 
    discount_amount: 0,
    notes: ''
  })

  useEffect(() => {
    fetchGlobals()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab, searchQuery])

  const fetchGlobals = async () => {
    try {
      const [s, m] = await Promise.all([
        api.get('/inventory/suppliers'),
        api.get('/inventory/medicines')
      ])
      setSuppliers(s.data)
      setMedicines(m.data)
    } catch (err) { toast.error('Error loading Master data') }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/pharmacy/purchase?q=${searchQuery}`)
      setHistory(r.data)
    } catch (err) { toast.error('Error loading history') }
    finally { setLoading(false) }
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  
  const updateItem = (idx, key, val) => {
    const newItems = [...form.items]
    newItems[idx][key] = val
    setForm({ ...form, items: newItems })
  }

  const calculateGstSummary = () => {
    const summary = {}
    form.items.forEach(item => {
      const gstPct = parseFloat(item.gst_pct) || 0
      const qty = parseFloat(item.quantity) || 0
      const free = parseFloat(item.free_quantity) || 0
      const pPrice = parseFloat(item.purchase_price) || 0
      
      const totalQty = qty + free
      const taxable = pPrice * totalQty
      const taxAmount = taxable * (gstPct / 100)
      const net = taxable + taxAmount

      if (!summary[gstPct]) {
        summary[gstPct] = { gstPct, taxable: 0, taxAmount: 0, net: 0 }
      }
      summary[gstPct].taxable += taxable
      summary[gstPct].taxAmount += taxAmount
      summary[gstPct].net += net
    })
    return Object.values(summary).sort((a, b) => a.gstPct - b.gstPct)
  }

  const calculateTotal = () => {
    const gstSummary = calculateGstSummary()
    const totalNet = gstSummary.reduce((sum, s) => sum + s.net, 0)
    return totalNet - (parseFloat(form.discount_amount) || 0)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.supplier_id) return toast.error('Please select a Supplier')
    if (form.items.some(i => !i.medicine_id || !i.batch_no || !i.expiry_date || i.quantity <= 0)) {
      return toast.error('Check all items (Qty, Batch, Expiry required)')
    }
    
    setSaving(true)
    try {
      if (editingBillId) {
        await api.put(`/pharmacy/purchase/${editingBillId}`, form)
        toast.success('Purchase bill updated successfully!')
      } else {
        await api.post('/pharmacy/purchase', form)
        toast.success('Purchase bill recorded successfully!')
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
      supplier_id: '', 
      bill_date: new Date().toISOString().slice(0, 10), 
      supplier_invoice_no: '', 
      items: [{ ...EMPTY_ITEM }], 
      discount_amount: 0,
      notes: ''
    })
    setEditingBillId(null)
  }

  const handleEdit = (bill) => {
    setEditingBillId(bill.bill_id)
    setForm({
      supplier_id: bill.supplier_id,
      bill_date: bill.bill_date,
      supplier_invoice_no: bill.supplier_invoice_no || '',
      discount_amount: bill.discount_amount || 0,
      notes: bill.notes || '',
      items: bill.items.map(i => ({
        medicine_id: i.medicine_id,
        batch_no: i.batch_no,
        mfg_date: i.mfg_date || '',
        expiry_date: i.expiry_date,
        quantity: i.quantity,
        free_quantity: i.free_quantity,
        purchase_price: i.purchase_price,
        sale_price: i.sale_price,
        gst_pct: i.gst_pct
      }))
    })
    setActiveTab('new')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill? This will reverse the stock!')) return
    try {
      await api.delete(`/pharmacy/purchase/${id}`)
      toast.success('Bill deleted and stock reversed')
      fetchHistory()
    } catch (err) { toast.error('Error deleting bill') }
  }

  const printBill = (bill) => {
    toast('Print functionality coming soon!', { icon: '🖨️' })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <ShoppingCart size={24} />
            </div>
            {editingBillId ? 'Edit Purchase Entry' : 'Purchase Management'}
          </h1>
          <p className="text-sm text-slate-500 font-medium ml-12">
            {editingBillId ? `Ref: ${history.find(h => h.bill_id===editingBillId)?.bill_no}` : 'Inward stock and supplier billing'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            {editingBillId ? <Edit2 size={16}/> : <Plus size={16}/>} 
            {editingBillId ? 'Editing Bill' : 'New Entry'}
          </button>
          <button 
            onClick={() => { setActiveTab('history'); resetForm(); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            <History size={16}/> Bill History
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 gap-6">
          {editingBillId && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-700">
                <Info size={20}/>
                <span className="text-sm font-bold">You are currently editing an existing bill. Saving will update stock records.</span>
              </div>
              <button onClick={resetForm} className="text-amber-800 hover:bg-amber-100 p-1 rounded-lg flex items-center gap-1 text-xs font-black">
                <X size={14}/> CANCEL EDIT
              </button>
            </div>
          )}

          <div className="card shadow-lg border-t-4 border-primary-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="label">Select Supplier *</label>
                <select 
                  className="input-field h-12 text-base font-medium" 
                  value={form.supplier_id} 
                  onChange={e => setForm({...form, supplier_id: e.target.value})}
                >
                  <option value="">Choose Supplier...</option>
                  {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bill Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="date" className="input-field pl-10 h-12" value={form.bill_date} onChange={e => setForm({...form, bill_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Inv. No / Batch Ref</label>
                <input className="input-field h-12 uppercase font-bold" value={form.supplier_invoice_no} onChange={e => setForm({...form, supplier_invoice_no: e.target.value})} placeholder="e.g. INV-2024" />
              </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
              <table className="w-full text-xs min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest font-black text-[10px] border-y border-slate-100">
                    <th className="px-3 py-4 text-left w-[280px]">Product / Medicine</th>
                    <th className="px-2 py-4 text-left w-[140px]">Batch No</th>
                    <th className="px-2 py-4 text-left w-[120px]">Mfg Date</th>
                    <th className="px-2 py-4 text-left w-[120px]">Expiry</th>
                    <th className="px-2 py-4 text-center w-[100px]">Qty</th>
                    <th className="px-2 py-4 text-center w-[100px]">Free</th>
                    <th className="px-2 py-4 text-right w-[140px]">P.Price</th>
                    <th className="px-2 py-4 text-right w-[140px]">S.Price</th>
                    <th className="px-2 py-4 text-center w-[90px]">GST%</th>
                    <th className="px-2 py-4 text-right w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-2 py-3">
                        <select className="input-field py-2 text-[11px] font-bold" value={item.medicine_id} onChange={e => updateItem(idx, 'medicine_id', e.target.value)}>
                          <option value="">Select Medicine...</option>
                          {medicines.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.medicine_name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input className="input-field py-2 uppercase font-bold text-center" value={item.batch_no} onChange={e => updateItem(idx, 'batch_no', e.target.value)} placeholder="NO..." />
                      </td>
                      <td className="px-2 py-3">
                        <input type="date" className="input-field py-2 text-[10px]" value={item.mfg_date} onChange={e => updateItem(idx, 'mfg_date', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="date" className="input-field py-2 text-[10px] text-rose-600 font-bold" value={item.expiry_date} onChange={e => updateItem(idx, 'expiry_date', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" className="input-field py-2 text-center font-bold" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" className="input-field py-2 text-center" value={item.free_quantity} onChange={e => updateItem(idx, 'free_quantity', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" className="input-field py-2 text-right font-bold text-emerald-600" value={item.purchase_price} onChange={e => updateItem(idx, 'purchase_price', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" className="input-field py-2 text-right font-bold text-primary-600" value={item.sale_price} onChange={e => updateItem(idx, 'sale_price', e.target.value)} />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" className="input-field py-2 text-center" value={item.gst_pct} onChange={e => updateItem(idx, 'gst_pct', e.target.value)} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addItem} className="mt-6 inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold text-xs hover:border-primary-300 hover:text-primary-600 transition-all">
              <Plus size={16}/> Add Another Product
            </button>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
              <div>
                <label className="label mb-4">GST Slab Summary</label>
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
                      {calculateGstSummary().length === 0 && (
                        <tr><td colSpan="4" className="py-4 text-center text-slate-400 italic">No items added</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6">
                  <label className="label">Billing Notes</label>
                  <textarea className="input-field h-24" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any extra information..." />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-bold text-sm uppercase">Extra Discount</span>
                  <input type="number" className="input-field w-32 py-1 text-right font-bold border-none bg-white shadow-sm" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} />
                </div>
                <div className="flex items-center justify-between px-6 py-6 bg-slate-900 rounded-2xl text-white shadow-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Final Payable Amount</span>
                    <span className="text-sm font-medium text-primary-400">Net Pur Bill Amount</span>
                  </div>
                  <span className="text-3xl font-black">₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="mt-2 w-full h-14 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-wider hover:bg-primary-700 disabled:bg-slate-300 flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 shadow-primary-100"
                >
                  <Save size={20} /> {saving ? 'Processing...' : (editingBillId ? 'Update & Save Changes' : 'Save & Post Purchase')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* History Search & Filters */}
          <div className="card !p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input 
                placeholder="Search by Bill No or Supplier Invoice No..." 
                className="input-field pl-10 h-11 text-sm font-bold" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
              <Filter size={18}/> Filters
            </button>
          </div>

          {/* History Table */}
          <div className="card overflow-hidden !p-0 shadow-lg border-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 text-left">Internal Bill No</th>
                    <th className="px-6 py-4">Supplier / Invoice</th>
                    <th className="px-6 py-4 text-right">Items</th>
                    <th className="px-6 py-4 text-right">Final Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-wider">Loading history...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No purchase history found</td></tr>
                  ) : history.map(bill => (
                    <tr key={bill.bill_id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-black text-primary-600 font-mono tracking-tighter">{bill.bill_no}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold italic"><Calendar size={10}/> {new Date(bill.bill_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-tight line-clamp-1">
                          {suppliers.find(s => s.supplier_id === bill.supplier_id)?.supplier_name || 'Loading...'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">INV REF: {bill.supplier_invoice_no || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-600 uppercase">
                           {bill.items?.length || 0} SKU
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-slate-800 tracking-tight">₹{parseFloat(bill.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${bill.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(bill)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit Bill"><Edit2 size={16}/></button>
                          <button onClick={() => printBill(bill)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Print Bill"><Printer size={16}/></button>
                          <button onClick={() => handleDelete(bill.bill_id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Bill"><Trash2 size={16}/></button>
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
