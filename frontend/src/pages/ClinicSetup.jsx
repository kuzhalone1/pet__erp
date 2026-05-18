import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Save, Building2 } from 'lucide-react'
import api from '../api'
import AddressBlock from '../components/AddressBlock'

export default function ClinicSetup() {
  const DEFAULTS = {
    clinic_name: '', 
    address1: '', address2: '', address3: '', 
    city_id: '', city_name: '', district: '', state_name: '', state_code: '',
    pincode: '', phone: '', alt_phone: '', email: '',
    website: '', gstin: '', pan: '', reg_number: '', drug_license_no: '',
    fy_start_month: 4
  }
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [exists, setExists] = useState(false)
  const [cities, setCities] = useState([])

  useEffect(() => {
    setFetching(true)
    Promise.all([
      api.get('/clinic/setup').catch(err => err.response?.status === 404 ? { data: {} } : Promise.reject(err)),
      api.get('/masters/cities')
    ]).then(([setupRes, citiesRes]) => {
      if (setupRes.data.clinic_id) {
        setForm({ ...DEFAULTS, ...setupRes.data })
        setExists(true)
      }
      setCities(citiesRes.data)
    }).catch((err) => {
      console.error('Data load error:', err)
      toast.error('Failed to load clinic data')
    }).finally(() => setFetching(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clinic_name) { toast.error('Clinic Name is required'); return }
    setLoading(true)
    try {
      if (exists) {
        await api.put('/clinic/setup', form)
      } else {
        await api.post('/clinic/setup', form)
        setExists(true)
      }
      toast.success('Clinic profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  if (fetching) return (
    <div className="card flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="card">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Building2 size={20} className="text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Clinic Profile</h2>
            <p className="text-xs text-slate-400">{exists ? 'Update your clinic details' : 'Set up your clinic for the first time'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            <div className="md:col-span-2">
              <label className="label">Clinic Name *</label>
              <input className="input-field" value={form.clinic_name} onChange={set('clinic_name')} placeholder="e.g. PawCare Veterinary Clinic" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone || ''} onChange={set('phone')} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">Alternate Phone</label>
              <input className="input-field" value={form.alt_phone || ''} onChange={set('alt_phone')} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" value={form.email || ''} onChange={set('email')} placeholder="info@clinic.com" />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input-field" value={form.website || ''} onChange={set('website')} placeholder="https://..." />
            </div>
          </div>

          <AddressBlock form={form} set={set} cities={cities} />

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div>
              <label className="label">Drug License No.</label>
              <input className="input-field" value={form.drug_license_no || ''} onChange={set('drug_license_no')} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Vet Council Reg. No.</label>
              <input className="input-field" value={form.reg_number || ''} onChange={set('reg_number')} placeholder="VET/TS/2023/001" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Financial Year Starts In</label>
              <select className="input-field" value={form.fy_start_month || 4} onChange={set('fy_start_month')}>
                <option value={1}>January (Jan – Dec)</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April (Apr – Mar) — Indian FY</option>
                <option value={7}>July</option>
                <option value={10}>October</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {loading ? 'Saving...' : exists ? 'Update Clinic' : 'Save Clinic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
