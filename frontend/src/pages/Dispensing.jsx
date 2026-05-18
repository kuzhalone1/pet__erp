import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Receipt, Search, ShoppingBag } from 'lucide-react'
import api from '../api'

const EMPTY_ITEM = { medicine_id: '', batch_id: '', quantity: 0, sale_price: 0, discount_pct: 0, medicine_name: '', batches: [] }

export default function Dispensing() {
  const [pets, setPets] = useState([])
  const [owners, setOwners] = useState([])
  const [medicines, setMedicines] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  
  const [form, setForm] = useState({ 
    owner_id: '', pet_id: '', prescription_id: '', 
    items: [], payment_mode: 'Cash', discount_amount: 0 
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/pets').then(r => setPets(r.data)).catch(() => {})
    api.get('/owners').then(r => setOwners(r.data)).catch(() => {})
    api.get('/inventory/medicines').then(r => setMedicines(r.data)).catch(() => {})
  }, [])

  const selectPet = async (pet_id) => {
    const pet = pets.find(p => p.pet_id === parseInt(pet_id))
    setForm(f => ({ ...f, pet_id, owner_id: pet?.owner_id?.toString() || f.owner_id }))
    if (pet_id) {
      // Find active prescriptions for this pet
      const rx = await api.get(`/prescriptions/pet/${pet_id}`).catch(() => ({data:[]}))
      setPrescriptions(rx.data)
    }
  }

  const loadPrescription = async (rx_id) => {
    const rx = prescriptions.find(r => r.prescription_id === parseInt(rx_id))
    if (!rx) return
    setForm(f => ({ ...f, prescription_id: rx_id }))
    
    // Auto-pre-fill items from prescription
    const newItems = await Promise.all(rx.items.map(async (item) => {
      // Find medicine in master to get ID
      const med = medicines.find(m => m.medicine_name.toLowerCase() === item.medicine_name.toLowerCase())
      if (!med) return { ...EMPTY_ITEM, medicine_name: item.medicine_name }
      
      const batchesR = await api.get(`/inventory/batches/${med.medicine_id}`).catch(() => ({data:[]}))
      return {
        ...EMPTY_ITEM,
        medicine_id: med.medicine_id,
        medicine_name: med.medicine_name,
        quantity: item.quantity || 0,
        sale_price: batchesR.data[0]?.sale_price || 0,
        batches: batchesR.data,
        batch_id: batchesR.data[0]?.batch_id || ''
      }
    }))
    setForm(f => ({ ...f, items: newItems }))
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  
  const updateItem = async (idx, key, val) => {
    const newItems = [...form.items]
    newItems[idx][key] = val
    
    if (key === 'medicine_id') {
      const med = medicines.find(m => m.medicine_id === parseInt(val))
      newItems[idx].medicine_name = med?.medicine_name || ''
      const batchesR = await api.get(`/inventory/batches/${val}`).catch(() => ({data:[]}))
      newItems[idx].batches = batchesR.data
      newItems[idx].batch_id = batchesR.data[0]?.batch_id || ''
      newItems[idx].sale_price = batchesR.data[0]?.sale_price || 0
    }
    
    if (key === 'batch_id') {
      const batch = newItems[idx].batches.find(b => b.batch_id === parseInt(val))
      newItems[idx].sale_price = batch?.sale_price || 0
    }
    
    setForm({ ...form, items: newItems })
  }

  const calculateTotal = () => {
    const lineTotal = form.items.reduce((sum, item) => (sum + (parseFloat(item.sale_price) || 0) * (parseFloat(item.quantity) || 0)), 0)
    return lineTotal - (parseFloat(form.discount_amount) || 0)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.items.length === 0 || form.items.some(i => !i.medicine_id || !i.batch_id)) return toast.error('Check required items')
    setSaving(true)
    try {
      await api.post('/pharmacy/bill', form)
      toast.success('Pharmacy bill generated!')
      setForm({ owner_id: '', pet_id: '', prescription_id: '', items: [], payment_mode: 'Cash', discount_amount: 0 })
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="text-primary-600" size={20} />
          Pharmacy Bill / Dispensing
        </h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <ShoppingBag size={18} /> {saving ? 'Generating...' : 'Finalize & Print'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-700 mb-4 text-xs uppercase tracking-wider">Patient Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Pet *</label>
                <select className="input-field" value={form.pet_id} onChange={e => selectPet(e.target.value)}>
                  <option value="">Select Pet</option>
                  {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name} ({p.pet_code})</option>)}
                </select>
              </div>
              <div><label className="label">Follow Prescription</label>
                <select className="input-field" value={form.prescription_id} onChange={e => loadPrescription(e.target.value)} disabled={!form.pet_id}>
                  <option value="">Select Prescription</option>
                  {prescriptions.map(r => <option key={r.prescription_id} value={r.prescription_id}>{r.rx_no} — {r.date}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Medicine List</h3>
              <button onClick={addItem} className="text-primary-700 text-xs flex items-center gap-1 font-bold hover:underline"><Plus size={14}/> Add Medicine</button>
            </div>
            
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold">
                <th className="px-2 py-2 text-left">Medicine</th>
                <th className="px-2 py-2 text-left">Batch (Expiry & Stock)</th>
                <th className="px-2 py-2 text-left w-20">Qty</th>
                <th className="px-2 py-2 text-left w-24">Price</th>
                <th className="px-2 py-2 text-left w-24">Net</th>
                <th className="px-2 py-2"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-1 min-w-[150px]">
                      <select className="input-field py-1" value={item.medicine_id} onChange={e => updateItem(idx, 'medicine_id', e.target.value)}>
                        <option value="">Select</option>
                        {medicines.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.medicine_name}</option>)}
                      </select>
                    </td>
                    <td className="p-1">
                      <select className="input-field py-1" value={item.batch_id} onChange={e => updateItem(idx, 'batch_id', e.target.value)}>
                        <option value="">Select Batch</option>
                        {item.batches?.map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.batch_no} (Exp: {b.expiry_date}, Stock: {b.current_qty})</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1"><input type="number" className="input-field py-1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></td>
                    <td className="p-1 w-24 px-2">₹{parseFloat(item.sale_price).toFixed(2)}</td>
                    <td className="p-1 w-24 font-bold text-slate-700">₹{(item.sale_price * item.quantity).toFixed(2)}</td>
                    <td className="p-1"><button onClick={() => removeItem(idx)} className="text-red-400 p-1"><Trash2 size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
             <h3 className="font-semibold text-slate-700 mb-4 text-xs uppercase tracking-wider">Summary</h3>
             <div className="space-y-3">
               <div className="flex justify-between text-sm"><span>Sub-Total:</span><span className="font-bold">₹{form.items.reduce((s,i) => s + (i.sale_price * i.quantity), 0).toFixed(2)}</span></div>
               <div><label className="label">Overall Discount (₹)</label><input type="number" className="input-field" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} /></div>
               <div><label className="label">Payment Mode</label>
                 <div className="flex gap-2">
                   {['Cash', 'UPI', 'Card'].map(m => (
                     <button key={m} onClick={() => setForm({...form, payment_mode: m})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${form.payment_mode === m ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                       {m}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                 <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Net Payable</span>
                 <span className="text-2xl font-black text-primary-600">₹{calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
