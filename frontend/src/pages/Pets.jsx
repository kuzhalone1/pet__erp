import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, RotateCcw, BookOpen } from 'lucide-react'
import api from '../api'
import Table from '../components/Table'
import FormModal from '../components/FormModal'
import PetBookModal from '../components/PetBookModal'

const EMPTY = {
  name: '', owner_id: '', species_id: '', breed_id: '',
  gender: '', dob: '', age_years: '', age_months: '',
  color: '', weight_kg: '', microchip_no: '', is_neutered: false, notes: ''
}

export default function Pets() {
  const location = useLocation()
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [owners, setOwners] = useState([])
  const [species, setSpecies] = useState([])
  const [breeds, setBreeds] = useState([])
  const [breedsGlobal, setBreedsGlobal] = useState([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [bookPetId, setBookPetId] = useState(null)

  const load = () => api.get('/pets', { params: { search, include_inactive: includeInactive } }).then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [search, includeInactive])
  useEffect(() => {
    api.get('/owners').then(r => setOwners(r.data)).catch(() => {})
    api.get('/masters/species').then(r => setSpecies(r.data)).catch(() => {})
    api.get('/masters/breeds').then(r => setBreedsGlobal(r.data)).catch(() => {})
  }, [])

  // Load breeds when species changes
  useEffect(() => {
    if (form.species_id) {
      api.get('/masters/breeds', { params: { species_id: form.species_id } }).then(r => setBreeds(r.data)).catch(() => {})
    } else {
      setBreeds([])
    }
  }, [form.species_id])

  const speciesMap = Object.fromEntries(species.map(s => [s.species_id, s.species_name]))
  const ownerMap   = Object.fromEntries(owners.map(o => [o.owner_id, o.name]))
  const breedMap   = Object.fromEntries(breedsGlobal.map(b => [b.breed_id, b.breed_name]))

  // Handle incoming redirect state
  useEffect(() => {
    if (location.state?.editPetId && data.length > 0) {
      const pet = data.find(p => p.pet_id === location.state.editPetId)
      if (pet) openEdit(pet)
    } else if (location.state?.preselectOwnerId) {
      setEditing(null)
      setForm({ ...EMPTY, owner_id: location.state.preselectOwnerId })
      setModal(true)
    }
  }, [location.state, data])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({
      name: row.name, owner_id: row.owner_id, species_id: row.species_id,
      breed_id: row.breed_id || '', gender: row.gender || '', dob: row.dob || '',
      age_years: row.age_years || '', age_months: row.age_months || '',
      color: row.color || '', weight_kg: row.weight_kg || '',
      microchip_no: row.microchip_no || '', is_neutered: row.is_neutered || false, notes: row.notes || ''
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.owner_id || !form.species_id) return toast.error('Name, owner, and species are required')
    setSaving(true)
    const payload = {
      ...form,
      owner_id:   parseInt(form.owner_id),
      species_id: parseInt(form.species_id),
      breed_id:   form.breed_id ? parseInt(form.breed_id) : null,
      age_years:  form.age_years ? parseInt(form.age_years) : null,
      age_months: form.age_months ? parseInt(form.age_months) : null,
      weight_kg:  form.weight_kg ? parseFloat(form.weight_kg) : null,
      dob:        form.dob ? form.dob : null,
      gender:     form.gender ? form.gender : null,
      color:      form.color ? form.color : null,
      microchip_no: form.microchip_no ? form.microchip_no : null,
      notes:      form.notes ? form.notes : null,
    }
    try {
      if (editing) await api.put(`/pets/${editing.pet_id}`, payload)
      else await api.post('/pets', payload)
      toast.success(editing ? 'Pet updated!' : 'Pet registered!')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Deactivate pet "${row.name}"?`)) return
    try { await api.delete(`/pets/${row.pet_id}`); toast.success('Deactivated'); load() } catch { toast.error('Error') }
  }

  const handleReactivate = async (row) => {
    if (!confirm(`Reactivate pet "${row.name}"?`)) return
    try { await api.put(`/pets/${row.pet_id}/reactivate`); toast.success('Reactivated'); load() } catch { toast.error('Error') }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-bold text-slate-800">Pets</h2>
            <p className="text-xs text-slate-400">{data.length} registered pets</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="w-3.5 h-3.5 accent-primary-600" />
            Show Inactive
          </label>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Register Pet
        </button>
      </div>

      <Table
        columns={[
          { key: 'pet_code', label: 'Code', width: 100 },
          { key: 'name', label: 'Pet Name' },
          { key: 'species_id', label: 'Species', render: v => speciesMap[v] || '—' },
          { key: 'breed_id', label: 'Breed', render: v => breedMap[v] || '—' },
          { key: 'gender', label: 'Gender' },
          { key: 'weight_kg', label: 'Weight', render: v => v ? `${v} kg` : '—' },
          { key: 'owner_id', label: 'Owner', render: v => ownerMap[v] || '—' },
          { key: 'is_active', label: 'Status', render: (v) => v ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Active</span> : <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Inactive</span> },
        ]}
        data={data}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search pets by name..."
        actions={(row) => (
          <>
            <button onClick={() => setBookPetId(row.pet_id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Open Pet Book"><BookOpen size={14} /></button>
            {row.is_active ? (
              <>
                <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(row)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate"><Trash2 size={14} /></button>
              </>
            ) : (
              <button onClick={() => handleReactivate(row)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Reactivate"><RotateCcw size={14} /></button>
            )}
          </>
        )}
        emptyText="No pets registered. Click 'Register Pet' to add one."
      />

      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Pet' : 'Register Pet'} size="lg">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">Pet Name *</label><input className="input-field" value={form.name} onChange={set('name')} placeholder="e.g. Bruno" autoFocus /></div>
            <div className="md:col-span-2">
              <label className="label">Owner *</label>
              <select className="input-field" value={form.owner_id} onChange={set('owner_id')}>
                <option value="">Select Owner</option>
                {owners.map(o => <option key={o.owner_id} value={o.owner_id}>{o.name} — {o.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Species *</label>
              <select className="input-field" value={form.species_id} onChange={set('species_id')}>
                <option value="">Select Species</option>
                {species.map(s => <option key={s.species_id} value={s.species_id}>{s.species_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Breed</label>
              <select className="input-field" value={form.breed_id} onChange={set('breed_id')} disabled={!form.species_id}>
                <option value="">Select Breed (optional)</option>
                {breeds.map(b => <option key={b.breed_id} value={b.breed_id}>{b.breed_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input-field" value={form.gender} onChange={set('gender')}>
                <option value="">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div><label className="label">Date of Birth</label><input className="input-field" type="date" value={form.dob} onChange={set('dob')} /></div>
            <div><label className="label">Age (Years)</label><input className="input-field" type="number" value={form.age_years} onChange={set('age_years')} placeholder="0" min={0} /></div>
            <div><label className="label">Age (Months)</label><input className="input-field" type="number" value={form.age_months} onChange={set('age_months')} placeholder="0" min={0} max={11} /></div>
            <div><label className="label">Color / Markings</label><input className="input-field" value={form.color} onChange={set('color')} placeholder="Golden, Black & White..." /></div>
            <div><label className="label">Weight (kg)</label><input className="input-field" type="number" step="0.1" value={form.weight_kg} onChange={set('weight_kg')} placeholder="0.0" /></div>
            <div><label className="label">Microchip No.</label><input className="input-field" value={form.microchip_no} onChange={set('microchip_no')} placeholder="Optional" /></div>
            <div className="flex items-center gap-3 mt-2">
              <input type="checkbox" id="is_neutered" checked={form.is_neutered} onChange={set('is_neutered')} className="w-4 h-4 accent-primary-600" />
              <label htmlFor="is_neutered" className="text-sm font-medium text-slate-600">Neutered / Spayed</label>
            </div>
            <div className="md:col-span-2"><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={set('notes')} placeholder="Any additional notes" /></div>
          </div>
          <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update Pet' : 'Register Pet'}</button>
          </div>
        </form>
      </FormModal>

      <PetBookModal isOpen={!!bookPetId} onClose={() => setBookPetId(null)} petId={bookPetId} />
    </div>
  )
}

