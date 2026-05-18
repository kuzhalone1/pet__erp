import React, { useState, useEffect } from 'react'
import { Plus, Search, MessageCircle, MessageSquare, Copy, Syringe, Calendar, User, Mail, Phone, ExternalLink, Save, Trash2, Edit, History } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api'

export default function Vaccination() {
  const [activeTab, setActiveTab] = useState('record')
  const [vaccines, setVaccines] = useState([])
  const [history, setHistory] = useState([])
  const [dueList, setDueList] = useState([])
  const [pets, setPets] = useState([])
  const [species, setSpecies] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [dueDays, setDueDays] = useState(30)

  // Form States
  const [recordForm, setRecordForm] = useState({ 
    pet_id: '', 
    vaccine_id: '', 
    doctor_id: '',
    given_date: new Date().toISOString().split('T')[0], 
    next_due_date: '',
    batch_no: '',
    expiry_date: '',
    dose_ml: '',
    site: '',
    notes: '',
    vaccination_code: ''
  })
  
  const [masterForm, setMasterForm] = useState({ 
    vaccine_name: '', 
    company: '', 
    disease: '', 
    dosage: '', 
    route: 'SC', 
    species_id: '', 
    interval_days: 365 
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [v, d, p, s, docs, r] = await Promise.all([
        api.get('/vaccines'),
        api.get('/vaccination-reminders/due'),
        api.get('/pets'),
        api.get('/masters/species'),
        api.get('/doctors'),
        api.get('/vaccination-records')
      ])
      setVaccines(v.data)
      setDueList(d.data)
      setPets(p.data)
      setSpecies(s.data)
      setDoctors(docs.data)
      setHistory(r.data)
    } catch (err) { 
      console.error(err)
      toast.error("Failed to load vaccination data")
    } finally {
      setLoading(false)
    }
  }

  const fetchDueReminders = async (days) => {
    try {
      const res = await api.get(`/vaccination-reminders/due?days=${days === 'all' ? 365 : days}`)
      setDueList(res.data)
    } catch (err) {
      toast.error("Failed to load reminders")
    }
  }

  const handleDueFilterChange = (days) => {
    setDueDays(days)
    fetchDueReminders(days)
  }

  const handleRecordSubmit = async (e) => {
    e.preventDefault()
    if (!recordForm.pet_id || !recordForm.vaccine_id || !recordForm.given_date) {
      return toast.error("Please fill all required fields")
    }
    
    const pet = pets.find(p => p.pet_id === parseInt(recordForm.pet_id))
    if (!pet) return toast.error("Pet not found")

    setLoading(true)
    try {
      if (editingRecordId) {
        await api.put(`/vaccination-records/${editingRecordId}`, {
          ...recordForm,
          pet_id: parseInt(recordForm.pet_id),
          vaccine_id: parseInt(recordForm.vaccine_id),
          doctor_id: recordForm.doctor_id ? parseInt(recordForm.doctor_id) : null,
          owner_id: pet.owner_id
        })
        toast.success("Record Updated!")
      } else {
        await api.post('/vaccination-records', {
          ...recordForm,
          pet_id: parseInt(recordForm.pet_id),
          vaccine_id: parseInt(recordForm.vaccine_id),
          doctor_id: recordForm.doctor_id ? parseInt(recordForm.doctor_id) : null,
          owner_id: pet.owner_id,
          next_due_date: recordForm.next_due_date || null
        })
        toast.success("Vaccination Recorded!")
      }
      resetRecordForm()
      fetchAll()
    } catch (err) { 
      toast.error(err.response?.data?.detail || "Error saving vaccination record")
    } finally {
      setLoading(false)
    }
  }

  const resetRecordForm = () => {
    setRecordForm({ 
        pet_id: '', vaccine_id: '', doctor_id: '', 
        given_date: new Date().toISOString().split('T')[0], 
        next_due_date: '', batch_no: '', expiry_date: '', 
        dose_ml: '', site: '', notes: '', vaccination_code: ''
    })
    setEditingRecordId(null)
  }

  const handleMasterSubmit = async (e) => {
    e.preventDefault()
    if (!masterForm.vaccine_name || !masterForm.species_id) {
      return toast.error("Name and Species are required")
    }
    setLoading(true)
    try {
      if (editingId) {
        await api.put(`/vaccines/${editingId}`, {
          ...masterForm,
          species_id: parseInt(masterForm.species_id),
          interval_days: parseInt(masterForm.interval_days) || 0
        })
        toast.success("Vaccine Master Updated!")
      } else {
        await api.post('/vaccines', {
          ...masterForm,
          species_id: parseInt(masterForm.species_id),
          interval_days: parseInt(masterForm.interval_days) || 0
        })
        toast.success("Vaccine Master Added!")
      }
      setMasterForm({ vaccine_name: '', company: '', disease: '', dosage: '', route: 'SC', species_id: '', interval_days: 365 })
      setEditingId(null)
      fetchAll()
    } catch (err) { 
      toast.error("Error saving vaccine master")
    } finally {
      setLoading(false)
    }
  }

  const deleteVaccine = async (id) => {
    if (!window.confirm("Are you sure? This will deactivate the vaccine.")) return
    try {
      await api.delete(`/vaccines/${id}`)
      toast.success("Vaccine deactivated")
      fetchAll()
    } catch (err) { toast.error("Error deleting vaccine") }
  }

  const deleteRecord = async (id) => {
    if (!window.confirm("Delete this vaccination record forever?")) return
    try {
      await api.delete(`/vaccination-records/${id}`)
      toast.success("Record deleted")
      fetchAll()
    } catch (err) { toast.error("Error deleting record") }
  }

  const startEditMaster = (v) => {
    setEditingId(v.vaccine_id)
    setMasterForm({ 
        vaccine_name: v.vaccine_name, 
        company: v.company || '', 
        disease: v.disease || '', 
        dosage: v.dosage || '', 
        route: v.route || 'SC', 
        species_id: v.species_id, 
        interval_days: v.interval_days 
    })
    setActiveTab('master')
  }

  const startEditRecord = (r) => {
    setEditingRecordId(r.vacc_record_id)
    setRecordForm({
        pet_id: r.pet_id,
        vaccine_id: r.vaccine_id,
        doctor_id: r.doctor_id || '',
        given_date: r.given_date,
        next_due_date: r.next_due_date || '',
        batch_no: r.batch_no || '',
        expiry_date: r.expiry_date || '',
        dose_ml: r.dose_ml || '',
        site: r.site || '',
        notes: r.notes || '',
        vaccination_code: r.vaccination_code || ''
    })
    setActiveTab('record')
  }

  const copyToClipboard = (txt, label) => {
    if (!txt) return toast.error(`${label} not available`)
    navigator.clipboard.writeText(txt)
    toast.success(`${label} copied!`)
  }

  const handleWhatsApp = (phone, petName, vaccineName, dueDate) => {
    if (!phone) return toast.error("Phone number missing")
    const msg = `Hi, this is a reminder from the Pet Clinic. Your pet ${petName} is due for ${vaccineName} vaccination on ${dueDate}. Please book an appointment soon.`
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSMS = (phone, petName, vaccineName, dueDate, ownerName) => {
    if (!phone) return toast.error("Phone number missing")
    const msg = `Dear ${ownerName}, your pet ${petName} is due for ${vaccineName} on ${dueDate}. Please visit the clinic to schedule an appointment. Phone: 9876543210`
    navigator.clipboard.writeText(msg)
    toast.success("SMS message copied to clipboard!")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Vaccination Center</h2>
          <p className="text-sm text-slate-500">Manage vaccine records and reminders</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
          {[
            { id: 'record', label: 'Record' },
            { id: 'history', label: 'History' },
            { id: 'due', label: 'Due Reminders' },
            { id: 'master', label: 'Vaccine Master' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'record' && (
        <div className="card max-w-2xl mx-auto shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-600">
            <Syringe size={20}/> {editingRecordId ? 'Edit Vaccination Record' : 'Record Vaccination'}
          </h3>
          <form onSubmit={handleRecordSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Select Pet *</label>
                <select className="input-field" value={recordForm.pet_id} onChange={e => setRecordForm({...recordForm, pet_id: e.target.value})} required>
                  <option value="">-- Choose Pet --</option>
                  {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name} ({p.owner_name})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Select Vaccine *</label>
                <select className="input-field" value={recordForm.vaccine_id} onChange={e => setRecordForm({...recordForm, vaccine_id: e.target.value})} required>
                  <option value="">-- Choose Vaccine --</option>
                  {vaccines.map(v => <option key={v.vaccine_id} value={v.vaccine_id}>{v.vaccine_name} ({v.company})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Administered By (Doctor)</label>
                <select className="input-field" value={recordForm.doctor_id} onChange={e => setRecordForm({...recordForm, doctor_id: e.target.value})}>
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date Given *</label>
                <input type="date" className="input-field" value={recordForm.given_date} onChange={e => setRecordForm({...recordForm, given_date: e.target.value})} required/>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Batch No / Expiry</label>
                <div className="flex gap-2">
                    <input placeholder="Batch #" className="input-field w-1/2" value={recordForm.batch_no} onChange={e => setRecordForm({...recordForm, batch_no: e.target.value})} />
                    <input type="date" className="input-field w-1/2" value={recordForm.expiry_date} onChange={e => setRecordForm({...recordForm, expiry_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Next Due Date (Auto if empty)</label>
                <input type="date" className="input-field" value={recordForm.next_due_date} onChange={e => setRecordForm({...recordForm, next_due_date: e.target.value})}/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="label">Dosage (ml)</label>
                  <input type="number" step="0.1" placeholder="1.0" className="input-field" value={recordForm.dose_ml} onChange={e => setRecordForm({...recordForm, dose_ml: e.target.value})} />
               </div>
               <div>
                  <label className="label">Injection Site / Route</label>
                  <input placeholder="SC / IM / Oral" className="input-field" value={recordForm.site} onChange={e => setRecordForm({...recordForm, site: e.target.value})} />
               </div>
            </div>


            <div>
              <label className="label">Notes</label>
              <textarea className="input-field h-20" value={recordForm.notes} onChange={e => setRecordForm({...recordForm, notes: e.target.value})} placeholder="Any observations..."></textarea>
            </div>

            <div className="flex gap-3">
                <button disabled={loading} className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
                    {loading ? 'Saving...' : <><Save size={18}/> {editingRecordId ? 'Update Record' : 'Save Record'}</>}
                </button>
                {editingRecordId && (
                    <button type="button" onClick={resetRecordForm} className="px-6 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-500 text-xs">Cancel</button>
                )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card !p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Record #</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Pet Detail</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vaccine</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Doctor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date Given</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No vaccination history found</td></tr>
                ) : (
                  history.map(r => (
                    <tr key={r.vacc_record_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[10px] font-bold text-primary-600">{r.vacc_record_no}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{r.pet_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.vaccine_name}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{r.vaccination_code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{r.doctor_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{new Date(r.given_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => startEditRecord(r)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit size={16}/></button>
                           <button onClick={() => deleteRecord(r.vacc_record_id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'due' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              {[
                { val: 'all', label: 'All' },
                { val: 30, label: '30 Days' },
                { val: 15, label: '15 Days' },
                { val: 5, label: '5 Days' }
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => handleDueFilterChange(f.val)}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${dueDays === f.val ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Due Reminders</div>
          </div>
          <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Pet Detail</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vaccine</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-rose-500">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contact Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Remind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dueList.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No vaccination reminders found</td></tr>
                ) : (
                  dueList.map(item => (
                    <tr key={item.reminder_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{item.pet_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><User size={10}/> {item.owner_name}</div>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm text-slate-600 font-medium">{item.vaccine_name}</div></td>
                      <td className="px-6 py-4 font-bold text-rose-500 text-sm">{new Date(item.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => copyToClipboard(item.phone, 'Phone')} className="text-xs text-slate-600 flex items-center gap-1.5 hover:text-primary-600 group">
                            <Phone size={12} className="text-slate-400 group-hover:text-primary-600 transition-colors"/> {item.phone || 'N/A'} <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleWhatsApp(item.phone, item.pet_name, item.vaccine_name, item.due_date)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 inline-flex items-center gap-1.5 text-xs font-bold transition-all border border-emerald-100"><MessageCircle size={14}/> WhatsApp</button>
                          <button onClick={() => handleSMS(item.phone, item.pet_name, item.vaccine_name, item.due_date, item.owner_name)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 inline-flex items-center gap-1.5 text-xs font-bold transition-all border border-blue-100"><MessageSquare size={14}/> SMS</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'master' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card shadow-sm h-fit">
            <h3 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Plus size={16} className="text-primary-600"/> {editingId ? 'Edit Vaccine' : 'Add Vaccine Master'}
            </h3>
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div>
                <label className="label">Vaccine Name *</label>
                <input placeholder="e.g. DHPPiL" className="input-field" value={masterForm.vaccine_name} onChange={e => setMasterForm({...masterForm, vaccine_name: e.target.value})} required/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="label">Species *</label>
                    <select className="input-field" value={masterForm.species_id} onChange={e => setMasterForm({...masterForm, species_id: e.target.value})} required>
                      <option value="">-- Choose --</option>
                      {species.map(s => <option key={s.species_id} value={s.species_id}>{s.species_name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="label">Route</label>
                    <select className="input-field" value={masterForm.route} onChange={e => setMasterForm({...masterForm, route: e.target.value})}>
                        <option value="SC">Subcutaneous (SC)</option>
                        <option value="IM">Intramuscular (IM)</option>
                        <option value="Oral">Oral</option>
                        <option value="Intranasal">Intranasal</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div>
                    <label className="label">Company / Brand</label>
                    <input placeholder="e.g. MSD, Zoetis" className="input-field" value={masterForm.company} onChange={e => setMasterForm({...masterForm, company: e.target.value})}/>
                 </div>
                 <div>
                    <label className="label">Disease Focus</label>
                    <input placeholder="e.g. Parvo, Distemper" className="input-field" value={masterForm.disease} onChange={e => setMasterForm({...masterForm, disease: e.target.value})}/>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="label">Dosage (Qty)</label>
                   <input placeholder="1ml" className="input-field" value={masterForm.dosage} onChange={e => setMasterForm({...masterForm, dosage: e.target.value})}/>
                 </div>
                 <div>
                   <label className="label">Interval (Days)</label>
                   <input type="number" className="input-field" value={masterForm.interval_days} onChange={e => setMasterForm({...masterForm, interval_days: e.target.value})}/>
                 </div>
              </div>
              <div className="flex gap-2">
                <button disabled={loading} className="btn-primary flex-1 py-3 mt-2 flex items-center justify-center gap-2">
                    {loading ? 'Saving...' : <><Save size={18}/> {editingId ? 'Update Vaccine' : 'Add to Master'}</>}
                </button>
                {editingId && (
                    <button type="button" onClick={() => {setEditingId(null); setMasterForm({ vaccine_name: '', company: '', disease: '', dosage: '', route: 'SC', species_id: '', interval_days: 365 })}} className="mt-2 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-500 text-xs">Cancel</button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 card !p-0 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vaccine Detail</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Species</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Interval</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vaccines.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">No vaccines in master list</td></tr>
                  ) : (
                    vaccines.map(v => (
                      <tr key={v.vaccine_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{v.vaccine_name} <span className="text-[10px] font-mono text-primary-500 font-normal">({v.vaccine_code})</span></div>
                          <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-100 px-1 rounded">{v.company || 'Generic'}</span>
                            {v.disease && <><span>•</span> <span>{v.disease}</span></>}
                            {v.route && <><span>•</span> <span>{v.route}</span></>}
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-primary-50 text-primary-600 rounded text-[10px] font-bold uppercase">{species.find(s => s.species_id === v.species_id)?.species_name || 'All'}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-600">{v.interval_days} Days</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button onClick={() => startEditMaster(v)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit size={16}/></button>
                             <button onClick={() => deleteVaccine(v.vaccine_id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </div>
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
  )
}

