import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, BookOpen, Lock } from 'lucide-react'
import api from '../api'
import Table from '../components/Table'
import FormModal from '../components/FormModal'

const GROUPS = ['Assets', 'Liabilities', 'Income', 'Expense', 'Capital']

const EMPTY = {
  gl_code: '', gl_name: '', group_name: 'Assets',
  sub_group: '', opening_balance: 0, balance_type: 'DR'
}

export default function Ledger() {
  const [data, setData] = useState([])
  const [filterGroup, setFilterGroup] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  const load = () => api.get('/ledger/gl', { params: { group_name: filterGroup || undefined, include_inactive: includeInactive } }).then(r => setData(r.data)).catch(() => {})
  useEffect(() => { load() }, [filterGroup, includeInactive])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({
      gl_code: row.gl_code, gl_name: row.gl_name, group_name: row.group_name,
      sub_group: row.sub_group || '', opening_balance: row.opening_balance || 0,
      balance_type: row.balance_type || 'DR'
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.gl_code || !form.gl_name || !form.group_name) return toast.error('GL Code, Name, and Group are required')
    setSaving(true)
    const payload = { ...form, opening_balance: parseFloat(form.opening_balance) || 0 }
    try {
      if (editing) await api.put(`/ledger/gl/${editing.gl_id}`, payload)
      else await api.post('/ledger/gl', payload)
      toast.success(editing ? 'Account updated!' : 'Account created!')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const groupColors = {
    'Assets':      'bg-blue-50 text-blue-700',
    'Liabilities': 'bg-red-50 text-red-700',
    'Income':      'bg-green-50 text-green-700',
    'Expense':     'bg-amber-50 text-amber-700',
    'Capital':     'bg-purple-50 text-purple-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg"><BookOpen size={18} className="text-primary-600" /></div>
          <div>
            <h2 className="font-bold text-slate-800">Chart of Accounts</h2>
            <p className="text-xs text-slate-400">General Ledger Master</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Account</button>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-1 flex-wrap">
            {['', ...GROUPS].map(g => (
              <button key={g} onClick={() => setFilterGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${filterGroup === g ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >{g || 'All Groups'}</button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 ml-auto">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="w-3 h-3 accent-primary-600" />
            Show Inactive
          </label>
        </div>
        <Table
          columns={[
            { key: 'gl_code',         label: 'GL Code', width: 100 },
            { key: 'gl_name',         label: 'Account Name' },
            { key: 'group_name',      label: 'Group', render: v => <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${groupColors[v] || 'bg-slate-100 text-slate-600'}`}>{v}</span> },
            { key: 'sub_group',       label: 'Sub-Group' },
            { key: 'opening_balance', label: 'Opening Bal', render: v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
            { key: 'balance_type',    label: 'Type' },
            { key: 'is_system',       label: '', render: v => v ? <Lock size={12} className="text-slate-400" title="System account — protected" /> : null },
          ]}
          data={data}
          emptyText="No GL accounts found. Run migration_v3.sql to seed defaults."
          actions={(row) => (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title={row.is_system ? 'System account: only Opening Balance editable' : 'Edit'}
            ><Pencil size={14} /></button>
          )}
        />
      </div>

      <FormModal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit Account — ${editing?.gl_name}` : 'Add GL Account'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.is_system && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
              <Lock size={12} /> System account — only Opening Balance and Balance Type can be changed.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">GL Code *</label>
              <input className={`input-field ${editing?.is_system ? 'bg-slate-50 text-slate-400' : ''}`} value={form.gl_code} onChange={set('gl_code')} placeholder="CASH" readOnly={!!editing?.is_system} />
            </div>
            <div>
              <label className="label">Account Name *</label>
              <input className={`input-field ${editing?.is_system ? 'bg-slate-50 text-slate-400' : ''}`} value={form.gl_name} onChange={set('gl_name')} placeholder="Cash Account" readOnly={!!editing?.is_system} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Group *</label>
              <select className={`input-field ${editing?.is_system ? 'bg-slate-50 text-slate-400' : ''}`} value={form.group_name} onChange={set('group_name')} disabled={!!editing?.is_system}>
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sub-Group</label>
              <input className={`input-field ${editing?.is_system ? 'bg-slate-50 text-slate-400' : ''}`} value={form.sub_group} onChange={set('sub_group')} placeholder="Current Assets" readOnly={!!editing?.is_system} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Opening Balance (₹)</label><input className="input-field" type="number" step="0.01" value={form.opening_balance} onChange={set('opening_balance')} /></div>
            <div>
              <label className="label">Balance Type</label>
              <select className="input-field" value={form.balance_type} onChange={set('balance_type')}>
                <option value="DR">DR — Debit Balance</option>
                <option value="CR">CR — Credit Balance</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update Account' : 'Create Account'}</button>
          </div>
        </form>
      </FormModal>
    </div>
  )
}
