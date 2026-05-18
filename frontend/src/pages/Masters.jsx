import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, Syringe, Pill } from 'lucide-react'
import api from '../api'

// ─── Reusable sub-components (inline to keep file self-contained) ─────────────
function Table({ columns, data, searchValue, onSearchChange, searchPlaceholder, actions, emptyText }) {
  return (
    <div>
      {onSearchChange && (
        <div className="mb-4">
          <input
            className="input-field w-72"
            placeholder={searchPlaceholder || 'Search...'}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map(c => (
                <th key={c.key} className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.label}</th>
              ))}
              {actions && <th className="text-right py-3 px-4"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-slate-400 text-sm">{emptyText || 'No records found.'}</td></tr>
            ) : data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {columns.map(c => (
                  <td key={c.key} className="py-3 px-4 text-slate-700">
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
                {actions && <td className="py-3 px-4 text-right"><div className="flex gap-1 justify-end">{actions(row)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── CITY TAB ────────────────────────────────────────────────
function CityTab() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ city_name: '', state: '', pincode: '' })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/masters/cities', { params: { search } }).then(r => setData(r.data)).catch(() => {})

  useEffect(() => { load() }, [search])

  const openAdd = () => { setEditing(null); setForm({ city_name: '', state: '', pincode: '' }); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ city_name: row.city_name, state: row.state || '', pincode: row.pincode || '' }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.city_name) return toast.error('City name required')
    setSaving(true)
    try {
      if (editing) await api.put(`/masters/cities/${editing.city_id}`, form)
      else await api.post('/masters/cities', form)
      toast.success(editing ? 'City updated!' : 'City added!')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Permanently delete city "${row.city_name}"? This cannot be undone.`)) return
    try { await api.delete(`/masters/cities/${row.city_id}`); toast.success('City deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error deleting city') }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Cities <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add City</button>
      </div>
      <Table
        columns={[
          { key: 'city_name', label: 'City Name' },
          { key: 'state', label: 'State' },
          { key: 'pincode', label: 'Pincode' },
        ]}
        data={data}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cities..."
        actions={(row) => (
          <>
            <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(row)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          </>
        )}
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit City' : 'Add City'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">City Name *</label><input className="input-field" value={form.city_name} onChange={e => setForm(f => ({ ...f, city_name: e.target.value }))} placeholder="Hyderabad" autoFocus /></div>
          <div><label className="label">State</label><input className="input-field" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Telangana" /></div>
          <div><label className="label">Pincode</label><input className="input-field" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="500001" maxLength={10} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}

// ─── SPECIES TAB ─────────────────────────────────────────────
function SpeciesTab() {
  const [data, setData] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ species_name: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/masters/species').then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ species_name: '', notes: '' }); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ species_name: row.species_name, notes: row.notes || '' }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.species_name) return toast.error('Species name required')
    setSaving(true)
    try {
      if (editing) await api.put(`/masters/species/${editing.species_id}`, form)
      else await api.post('/masters/species', form)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Species <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Species</button>
      </div>
      <Table
        columns={[
          { key: 'species_name', label: 'Species' },
          { key: 'notes', label: 'Notes' },
        ]}
        data={data}
        actions={(row) => (
          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
        )}
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Species' : 'Add Species'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Species Name *</label><input className="input-field" value={form.species_name} onChange={e => setForm(f => ({ ...f, species_name: e.target.value }))} placeholder="Dog, Cat, Bird..." autoFocus /></div>
          <div><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional description" /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}

// ─── BREED TAB ───────────────────────────────────────────────
function BreedTab() {
  const [data, setData] = useState([])
  const [species, setSpecies] = useState([])
  const [filterSpecies, setFilterSpecies] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ species_id: '', breed_name: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/masters/breeds', { params: filterSpecies ? { species_id: filterSpecies } : {} }).then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [filterSpecies])
  useEffect(() => { api.get('/masters/species').then(r => setSpecies(r.data)).catch(() => {}) }, [])

  const speciesMap = Object.fromEntries(species.map(s => [s.species_id, s.species_name]))

  const openAdd = () => { setEditing(null); setForm({ species_id: '', breed_name: '', notes: '' }); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ species_id: row.species_id, breed_name: row.breed_name, notes: row.notes || '' }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.breed_name || !form.species_id) return toast.error('Species and breed name required')
    setSaving(true)
    try {
      if (editing) await api.put(`/masters/breeds/${editing.breed_id}`, form)
      else await api.post('/masters/breeds', form)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-700">Breeds <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
          <select className="input-field w-40 text-xs" value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
            <option value="">All Species</option>
            {species.map(s => <option key={s.species_id} value={s.species_id}>{s.species_name}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Breed</button>
      </div>
      <Table
        columns={[
          { key: 'breed_name', label: 'Breed Name' },
          { key: 'species_id', label: 'Species', render: (v) => speciesMap[v] || v },
          { key: 'notes', label: 'Notes' },
        ]}
        data={data}
        actions={(row) => (
          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
        )}
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Breed' : 'Add Breed'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Species *</label>
            <select className="input-field" value={form.species_id} onChange={e => setForm(f => ({ ...f, species_id: e.target.value }))}>
              <option value="">Select Species</option>
              {species.map(s => <option key={s.species_id} value={s.species_id}>{s.species_name}</option>)}
            </select>
          </div>
          <div><label className="label">Breed Name *</label><input className="input-field" value={form.breed_name} onChange={e => setForm(f => ({ ...f, breed_name: e.target.value }))} placeholder="Labrador, Persian..." autoFocus /></div>
          <div><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}

// ─── GST RATES TAB ───────────────────────────────────────────
function GstRateTab() {
  const [data, setData] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ rate_name: '', gst_percent: '', cgst_pct: '', sgst_pct: '', igst_pct: '' })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/masters/gst-rates').then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ rate_name: '', gst_percent: '', cgst_pct: '', sgst_pct: '', igst_pct: '' }); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ rate_name: row.rate_name, gst_percent: row.gst_percent, cgst_pct: row.cgst_pct, sgst_pct: row.sgst_pct, igst_pct: row.igst_pct }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.rate_name) return toast.error('Rate name required')
    setSaving(true)
    try {
      if (editing) await api.put(`/masters/gst-rates/${editing.gst_rate_id}`, form)
      else await api.post('/masters/gst-rates', form)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">GST Rate Slabs <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
          <p className="text-xs text-slate-400 mt-0.5">⚠️ Percent values are locked after creation to protect billing history.</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Slab</button>
      </div>
      <Table
        columns={[
          { key: 'rate_name',   label: 'Rate Name' },
          { key: 'gst_percent', label: 'GST %',  render: v => `${v}%` },
          { key: 'cgst_pct',   label: 'CGST %',  render: v => `${v}%` },
          { key: 'sgst_pct',   label: 'SGST %',  render: v => `${v}%` },
          { key: 'igst_pct',   label: 'IGST %',  render: v => `${v}%` },
        ]}
        data={data}
        actions={(row) => (
          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
        )}
        emptyText="No GST rate slabs found. Run migration_v3.sql to seed defaults."
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit GST Rate (Name only)' : 'Add GST Rate Slab'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Rate Name *</label><input className="input-field" value={form.rate_name} onChange={set('rate_name')} placeholder="e.g. GST 12%" autoFocus /></div>
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">GST % (Total)</label><input className="input-field" type="number" step="0.01" value={form.gst_percent} onChange={set('gst_percent')} placeholder="12" /></div>
              <div><label className="label">CGST %</label><input className="input-field" type="number" step="0.01" value={form.cgst_pct} onChange={set('cgst_pct')} placeholder="6" /></div>
              <div><label className="label">SGST %</label><input className="input-field" type="number" step="0.01" value={form.sgst_pct} onChange={set('sgst_pct')} placeholder="6" /></div>
              <div><label className="label">IGST %</label><input className="input-field" type="number" step="0.01" value={form.igst_pct} onChange={set('igst_pct')} placeholder="12" /></div>
            </div>
          )}
          {editing && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">⚠️ GST percent values cannot be edited once created. Only the rate name can be changed.</p>}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}

// ─── HSN CODE TAB ─────────────────────────────────────────────
function HsnTab() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ hsn_code: '', description: '', default_gst_pct: '12' })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/masters/hsn', { params: { search } }).then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [search])

  const openAdd = () => { setEditing(null); setForm({ hsn_code: '', description: '', default_gst_pct: '12' }); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ hsn_code: row.hsn_code, description: row.description, default_gst_pct: row.default_gst_pct }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.hsn_code || !form.description) return toast.error('HSN code and description required')
    setSaving(true)
    try {
      if (editing) await api.put(`/masters/hsn/${editing.hsn_id}`, form)
      else await api.post('/masters/hsn', form)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Deactivate HSN code "${row.hsn_code}"?`)) return
    try { await api.delete(`/masters/hsn/${row.hsn_id}`); toast.success('Deactivated'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">HSN Codes <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add HSN Code</button>
      </div>
      <Table
        columns={[
          { key: 'hsn_code',       label: 'HSN Code', width: 100 },
          { key: 'description',    label: 'Description' },
          { key: 'default_gst_pct', label: 'Default GST%', render: v => `${v}%` },
        ]}
        data={data}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by code or description..."
        actions={(row) => (
          <>
            <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(row)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          </>
        )}
        emptyText="No HSN codes found. Run migration_v3.sql to seed defaults."
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit HSN Code' : 'Add HSN Code'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">HSN Code *</label><input className="input-field" value={form.hsn_code} onChange={set('hsn_code')} placeholder="e.g. 3004" autoFocus /></div>
          <div><label className="label">Description *</label><input className="input-field" value={form.description} onChange={set('description')} placeholder="Medicaments for veterinary use" /></div>
          <div><label className="label">Default GST %</label><input className="input-field" type="number" step="0.01" value={form.default_gst_pct} onChange={set('default_gst_pct')} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}

// ─── VACCINE MASTER TAB ──────────────────────────────────────
function VaccineMasterTab() {
  const [data, setData]     = useState([])
  const [species, setSpecies] = useState([])
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const blank = { vaccine_name: '', species_id: '', disease: '', interval_days: '', dosage: '', company: '' }
  const [form, setForm]     = useState(blank)

  const load = () => api.get('/vaccines').then(r => setData(r.data)).catch(() => {})
  useEffect(() => {
    load()
    api.get('/masters/species').then(r => setSpecies(r.data)).catch(() => {})
  }, [])

  const speciesMap = Object.fromEntries(species.map(s => [s.species_id, s.species_name]))

  const openAdd  = () => { setEditing(null); setForm(blank); setModal(true) }
  const openEdit = row => {
    setEditing(row)
    setForm({
      vaccine_name:  row.vaccine_name,
      species_id:    row.species_id,
      disease:       row.disease       || '',
      interval_days: row.interval_days || '',
      dosage:        row.dosage        || '',
      company:       row.company       || '',
    })
    setModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!form.vaccine_name || !form.species_id) return toast.error('Vaccine name and species required')
    setSaving(true)
    try {
      const payload = { ...form, species_id: Number(form.species_id), interval_days: Number(form.interval_days) || 0 }
      if (editing) await api.put(`/vaccines/${editing.vaccine_id}`, payload)
      else         await api.post('/vaccines', payload)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Syringe size={18} className="text-primary-500" />
          <h3 className="font-semibold text-slate-700">Vaccine Master <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Vaccine</button>
      </div>
      <Table
        columns={[
          { key: 'vaccine_code',  label: 'Code' },
          { key: 'vaccine_name',  label: 'Vaccine Name' },
          { key: 'species_id',    label: 'Species', render: v => speciesMap[v] || v },
          { key: 'disease',       label: 'Disease / Coverage' },
          { key: 'interval_days', label: 'Interval (Days)', render: v => v ? `${v} days` : '—' },
          { key: 'dosage',        label: 'Dosage' },
          { key: 'company',       label: 'Company' },
        ]}
        data={data}
        actions={row => (
          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
        )}
        emptyText="No vaccines added yet. Click 'Add Vaccine' to create the first entry."
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Vaccine' : 'Add Vaccine Master'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Vaccine Name *</label>
              <input className="input-field" value={form.vaccine_name} onChange={set('vaccine_name')} placeholder="Rabies, Parvovirus..." autoFocus />
            </div>
            <div>
              <label className="label">Species *</label>
              <select className="input-field" value={form.species_id} onChange={set('species_id')}>
                <option value="">Select Species</option>
                {species.map(s => <option key={s.species_id} value={s.species_id}>{s.species_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Interval (Days)</label>
              <input className="input-field" type="number" value={form.interval_days} onChange={set('interval_days')} placeholder="365" />
            </div>
            <div>
              <label className="label">Disease Covered</label>
              <input className="input-field" value={form.disease} onChange={set('disease')} placeholder="Rabies, Distemper..." />
            </div>
            <div>
              <label className="label">Dosage</label>
              <input className="input-field" value={form.dosage} onChange={set('dosage')} placeholder="1 ml, 2 ml..." />
            </div>
            <div className="col-span-2">
              <label className="label">Manufacturer / Company</label>
              <input className="input-field" value={form.company} onChange={set('company')} placeholder="Zoetis, MSD..." />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}


// ─── MEDICINE MASTER TAB ─────────────────────────────────────
function MedicineMasterTab() {
  const [data, setData]       = useState([])
  const [search, setSearch]   = useState('')
  const [hsnCodes, setHsn]    = useState([])
  const [gstRates, setGst]    = useState([])
  const [units, setUnits]     = useState([])
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const blank = { medicine_name: '', medicine_name2: '', hsn_id: '', gst_rate_id: '', unit_id: '', reorder_level: 0, is_active: true }
  const [form, setForm] = useState(blank)

  const load = () =>
    api.get('/inventory/medicines', { params: { search, include_inactive: true } })
      .then(r => setData(r.data)).catch(() => {})

  useEffect(() => { load() }, [search])
  useEffect(() => {
    api.get('/inventory/units').then(r => setUnits(r.data)).catch(() => {})
    api.get('/masters/hsn').then(r => setHsn(r.data)).catch(() => {})
    api.get('/masters/gst-rates').then(r => setGst(r.data)).catch(() => {})
  }, [])

  const openAdd  = () => { setEditing(null); setForm(blank); setModal(true) }
  const openEdit = row => {
    setEditing(row)
    setForm({
      medicine_name:  row.medicine_name,
      medicine_name2: row.medicine_name2 || '',
      hsn_id:         row.hsn_id         || '',
      gst_rate_id:    row.gst_rate_id    || '',
      unit_id:        row.unit_id        || '',
      reorder_level:  row.reorder_level  ?? 0,
      is_active:      row.is_active,
    })
    setModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!form.medicine_name) return toast.error('Medicine name required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        hsn_id: form.hsn_id ? Number(form.hsn_id) : null,
        gst_rate_id: form.gst_rate_id ? Number(form.gst_rate_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        reorder_level: Number(form.reorder_level) || 0
      }
      if (editing) await api.put(`/inventory/medicines/${editing.medicine_id}`, payload)
      else         await api.post('/inventory/medicines', payload)
      toast.success('Saved!'); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: k === 'is_active' ? e.target.checked : e.target.value }))

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-primary-500" />
          <h3 className="font-semibold text-slate-700">Medicine / Item Master <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Medicine</button>
      </div>
      <Table
        columns={[
          { key: 'medicine_code',  label: 'Code' },
          { key: 'medicine_name',  label: 'Trade Name' },
          { key: 'medicine_name2', label: 'Generic Name' },
          { key: 'current_stock',  label: 'Stock', render: (v, row) => (
            <span className={`font-semibold ${v <= (row.reorder_level || 0) ? 'text-red-500' : 'text-emerald-600'}`}>{v}</span>
          )},
          { key: 'is_active', label: 'Status', render: v => (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {v ? 'Active' : 'Inactive'}
            </span>
          )},
        ]}
        data={data}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search medicines..."
        actions={row => (
          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
        )}
        emptyText="No medicines found. Click 'Add Medicine' to create the first item."
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Medicine' : 'Add Medicine Master'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Medicine / Trade Name *</label>
            <input className="input-field" value={form.medicine_name} onChange={set('medicine_name')} placeholder="Amoxyclav 500mg" autoFocus />
          </div>
          <div>
            <label className="label">Generic / Alternate Name</label>
            <input className="input-field" value={form.medicine_name2} onChange={set('medicine_name2')} placeholder="Amoxicillin + Clavulanate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit of Measure</label>
              <select className="input-field" value={form.unit_id} onChange={set('unit_id')}>
                <option value="">Select Unit</option>
                {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input className="input-field" type="number" value={form.reorder_level} onChange={set('reorder_level')} placeholder="10" />
            </div>
            <div>
              <label className="label">HSN Code</label>
              <select className="input-field" value={form.hsn_id} onChange={set('hsn_id')}>
                <option value="">Select HSN</option>
                {hsnCodes.map(h => <option key={h.hsn_id} value={h.hsn_id}>{h.hsn_code} – {h.description}</option>)}
              </select>
            </div>
            <div>
              <label className="label">GST Rate</label>
              <select className="input-field" value={form.gst_rate_id} onChange={set('gst_rate_id')}>
                <option value="">Select Rate</option>
                {gstRates.map(g => <option key={g.gst_rate_id} value={g.gst_rate_id}>{g.rate_name} ({g.gst_percent}%)</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4" />
            Item is Active
          </label>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}


// ─── UNIT TAB ────────────────────────────────────────────────
function UnitTab() {
  const [data, setData] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ unit_name: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/inventory/units').then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ unit_name: '', is_active: true }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.unit_name) return toast.error('Unit name required')
    setSaving(true)
    try {
      await api.post('/inventory/units', form)
      toast.success('Unit added!')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Units of Measure <span className="text-slate-400 font-normal text-sm">({data.length})</span></h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} />Add Unit</button>
      </div>
      <Table
        columns={[
          { key: 'unit_name', label: 'Unit Name' },
          { key: 'is_active', label: 'Status', render: v => (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {v ? 'Active' : 'Inactive'}
            </span>
          )},
        ]}
        data={data}
        emptyText="No units found. Add a unit to get started."
      />
      <FormModal isOpen={modal} onClose={() => setModal(false)} title="Add Unit of Measure">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Unit Name *</label><input className="input-field" value={form.unit_name} onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))} placeholder="Nos, Box, Strips..." autoFocus /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
            Unit is Active
          </label>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </FormModal>
    </>
  )
}


// ─── MASTERS PAGE ─────────────────────────────────────────────
const TABS = ['City', 'Species', 'Breed', 'GST Rates', 'HSN Codes', 'Units', 'Vaccines', 'Medicines']

export default function Masters() {
  const [tab, setTab] = useState('City')

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'City'       && <CityTab />}
        {tab === 'Species'    && <SpeciesTab />}
        {tab === 'Breed'      && <BreedTab />}
        {tab === 'GST Rates'  && <GstRateTab />}
        {tab === 'HSN Codes'  && <HsnTab />}
        {tab === 'Units'      && <UnitTab />}
        {tab === 'Vaccines'   && <VaccineMasterTab />}
        {tab === 'Medicines'  && <MedicineMasterTab />}
      </div>
    </div>
  )
}
