import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList, Eye } from 'lucide-react'
import api from '../api'
import Table from '../components/Table'

const STATUS_COLORS = {
  Open:   'bg-blue-100 text-blue-700',
  Closed: 'bg-green-100 text-green-700',
  Billed: 'bg-purple-100 text-purple-700',
}

export default function Consultations() {
  const navigate    = useNavigate()
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [pets, setPets]     = useState([])
  const [doctors, setDoctors] = useState([])
  const [owners, setOwners]   = useState([])

  const load = () => {
    const params = {}
    if (dateFrom) params.consult_date = dateFrom
    api.get('/consultations', { params }).then(r => setData(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [dateFrom])
  useEffect(() => {
    api.get('/pets').then(r => setPets(r.data)).catch(() => {})
    api.get('/doctors').then(r => setDoctors(r.data)).catch(() => {})
    api.get('/owners').then(r => setOwners(r.data)).catch(() => {})
  }, [])

  const petMap   = Object.fromEntries(pets.map(p => [p.pet_id, p.name]))
  const docMap   = Object.fromEntries(doctors.map(d => [d.doctor_id, d.name]))
  const ownerMap = Object.fromEntries(owners.map(o => [o.owner_id, o.name]))

  const filtered = data.filter(c =>
    !search ||
    (petMap[c.pet_id] || '').toLowerCase().includes(search.toLowerCase()) ||
    (ownerMap[c.owner_id] || '').toLowerCase().includes(search.toLowerCase()) ||
    c.consult_no.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Consultations</h2>
          <p className="text-xs text-slate-400">{data.length} records</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input-field w-44"
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            placeholder="Filter by date" />
          <button onClick={() => navigate('/consultations/new')}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Walk-In OPD
          </button>
        </div>
      </div>

      <Table
        columns={[
          { key: 'consult_no',   label: 'Consult No', width: 120 },
          { key: 'consult_date', label: 'Date' },
          { key: 'pet_id',       label: 'Pet',    render: v => petMap[v] || v },
          { key: 'owner_id',     label: 'Owner',  render: v => ownerMap[v] || v },
          { key: 'doctor_id',    label: 'Doctor', render: v => docMap[v] ? `Dr. ${docMap[v]}` : v },
          { key: 'visit_type',   label: 'Type',   render: v => <span className="badge bg-slate-100 text-slate-600">{v}</span> },
          { key: 'diagnosis',    label: 'Diagnosis', render: v => v ? v.slice(0, 40) + (v.length > 40 ? '…' : '') : '—' },
          { key: 'status',       label: 'Status', render: v => (
            <span className={`badge ${STATUS_COLORS[v] || 'bg-slate-100'}`}>{v}</span>
          )},
        ]}
        data={filtered}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by consult no, pet, owner..."
        actions={row => (
          <button onClick={() => navigate(`/consultations/${row.consult_id}`)}
            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            <Eye size={14} />
          </button>
        )}
        emptyText="No consultations found. Use 'Walk-In OPD' or check in from Appointments."
      />
    </div>
  )
}
