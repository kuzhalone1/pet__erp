import React, { useState, useEffect } from 'react'
import api from '../api'

export default function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [loading, setLoading] = useState(false)

  // Masters for Modal
  const [units, setUnits] = useState([])
  const [hsnCodes, setHsnCodes] = useState([])
  const [gstRates, setGstRates] = useState([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [formData, setFormData] = useState({
    medicine_name: '',
    medicine_name2: '',
    dosage_form: '',
    strength: '',
    hsn_id: '',
    gst_rate_id: '',
    unit_id: '',
    reorder_level: 0,
    is_active: true
  })

  useEffect(() => {
    fetchMedicines()
    fetchMasters()
  }, [search, showActiveOnly])

  const fetchMasters = async () => {
    try {
      const [u, h, g] = await Promise.all([
        api.get('/inventory/units'),
        api.get('/masters/hsn'),
        api.get('/masters/gst-rates')
      ])
      setUnits(u.data)
      setHsnCodes(h.data)
      setGstRates(g.data)
    } catch (err) {
      console.error("Master fetch failed", err)
    }
  }

  const fetchMedicines = async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventory/medicines', {
        params: { search, include_inactive: !showActiveOnly }
      })
      setMedicines(res.data)
    } catch (err) {
      alert("Failed to fetch medicines")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (med = null) => {
    if (med) {
      setEditingMedicine(med)
      setFormData({
        medicine_name: med.medicine_name,
        medicine_name2: med.medicine_name2 || '',
        dosage_form: med.dosage_form || '',
        strength: med.strength || '',
        hsn_id: med.hsn_id || '',
        gst_rate_id: med.gst_rate_id || '',
        unit_id: med.unit_id || '',
        reorder_level: med.reorder_level,
        is_active: med.is_active
      })
    } else {
      setEditingMedicine(null)
      setFormData({
        medicine_name: '',
        medicine_name2: '',
        dosage_form: '',
        strength: '',
        hsn_id: '',
        gst_rate_id: '',
        unit_id: '',
        reorder_level: 0,
        is_active: true
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        hsn_id: formData.hsn_id ? Number(formData.hsn_id) : null,
        gst_rate_id: formData.gst_rate_id ? Number(formData.gst_rate_id) : null,
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        reorder_level: Number(formData.reorder_level) || 0
      }
      if (editingMedicine) {
        await api.put(`/inventory/medicines/${editingMedicine.medicine_id}`, payload)
      } else {
        await api.post('/inventory/medicines', payload)
      }
      setIsModalOpen(false)
      fetchMedicines()
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.detail || err.message))
    }
  }


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Medicine / Item Master</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <span>+ Add Medicine</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center border border-gray-100">
        <input 
          type="text"
          placeholder="Search by name or generic..."
          className="flex-1 min-w-[300px] border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input 
            type="checkbox" 
            checked={!showActiveOnly} 
            onChange={() => setShowActiveOnly(!showActiveOnly)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          Show Inactive
        </label>
      </div>

      {/* MEDICINE TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicine Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Strength</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {medicines.map(med => (
              <tr key={med.medicine_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-indigo-600">{med.medicine_code}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-900">{med.medicine_name}</div>
                  <div className="text-xs text-gray-400">{med.medicine_name2}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{med.dosage_form || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{med.strength || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-bold ${med.current_stock <= med.reorder_level ? 'text-red-500' : 'text-emerald-500'}`}>
                    {med.current_stock}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${med.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {med.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenModal(med)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {editingMedicine ? 'Edit Medicine' : 'New Medicine Master'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Medicine Primary Name</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.medicine_name}
                    onChange={e => setFormData({...formData, medicine_name: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Generic / Alternate Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.medicine_name2}
                    onChange={e => setFormData({...formData, medicine_name2: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dosage Form</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.dosage_form}
                    onChange={e => setFormData({...formData, dosage_form: e.target.value})}
                  >
                    <option value="">Select Form</option>
                    {['Tablet','Capsule','Syrup','Injection','Drops','Ointment','Powder','Cream','Gel','Spray'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Strength / Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 250ml, 5mg/5ml"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.strength}
                    onChange={e => setFormData({...formData, strength: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit of Measure</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.unit_id}
                    onChange={e => setFormData({...formData, unit_id: e.target.value})}
                  >
                    <option value="">Select Unit</option>
                    {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reorder Level (Min Stock)</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.reorder_level}
                    onChange={e => setFormData({...formData, reorder_level: e.target.value})}
                  />
                </div>

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-bold text-indigo-600 mb-3">GST & HSN Compliance</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">HSN Code</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.hsn_id}
                    onChange={e => setFormData({...formData, hsn_id: e.target.value})}
                  >
                    <option value="">Select HSN</option>
                    {hsnCodes.map(h => <option key={h.hsn_id} value={h.hsn_id}>{h.hsn_code} - {h.description}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">GST Rate (%)</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.gst_rate_id}
                    onChange={e => setFormData({...formData, gst_rate_id: e.target.value})}
                  >
                    <option value="">Select Rate</option>
                    {gstRates.map(g => <option key={g.gst_rate_id} value={g.gst_rate_id}>{g.rate_name} ({g.gst_percent}%)</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="checkbox" 
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <label className="text-sm font-medium text-gray-700">Item is Active</label>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all"
                >
                  Save Medicine
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
