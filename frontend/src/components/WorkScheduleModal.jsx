import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Clock, Calendar, Save, Trash2 } from 'lucide-react'
import api from '../api'
import FormModal from './FormModal'

const DAYS = [
  { id: 0, name: 'Monday' },
  { id: 1, name: 'Tuesday' },
  { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' },
  { id: 4, name: 'Friday' },
  { id: 5, name: 'Saturday' },
  { id: 6, name: 'Sunday' }
]

export default function WorkScheduleModal({ isOpen, onClose, doctorId, doctorName }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/doctor-schedule/${doctorId}`)
      setSchedules(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && doctorId) load()
  }, [isOpen, doctorId])

  const handleUpsert = async (day) => {
    const existing = schedules.find(s => s.day_of_week === day.id)
    const start_time = prompt('Start Time (HH:MM)', existing?.start_time?.slice(0, 5) || '09:00')
    if (start_time === null) return
    const end_time = prompt('End Time (HH:MM)', existing?.end_time?.slice(0, 5) || '17:00')
    if (end_time === null) return
    const slot_duration = prompt('Slot Duration (minutes)', existing?.slot_duration || '15')
    if (slot_duration === null) return

    setSaving(true)
    try {
      await api.post('/doctor-schedule', {
        doctor_id: doctorId,
        day_of_week: day.id,
        start_time,
        end_time,
        slot_duration: parseInt(slot_duration)
      })
      toast.success(`Schedule saved for ${day.name}`)
      load()
    } catch (err) {
      toast.error('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (scheduleId) => {
    if (!confirm('Remove this schedule?')) return
    try {
      await api.delete(`/doctor-schedule/${scheduleId}`)
      toast.success('Schedule removed')
      load()
    } catch {
      toast.error('Error removing schedule')
    }
  }

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Work Schedule — Dr. ${doctorName}`} size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 mb-4">Set available time slots and durations for each day of the week.</p>
        
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {DAYS.map(day => {
            const sch = schedules.find(s => s.day_of_week === day.id)
            return (
              <div key={day.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sch ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                  <span className="font-bold text-slate-700 text-sm">{day.name}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  {sch ? (
                    <div className="flex flex-col items-end">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Clock size={12} className="text-primary-500" />
                        {sch.start_time.slice(0, 5)} – {sch.end_time.slice(0, 5)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {sch.slot_duration} min slots
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Off Duty</span>
                  )}
                  
                  <div className="flex items-center gap-1 ml-4 border-l pl-4 border-slate-200">
                    <button 
                      onClick={() => handleUpsert(day)}
                      disabled={saving}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Set Schedule"
                    >
                      <Calendar size={16} />
                    </button>
                    {sch && (
                      <button 
                        onClick={() => handleDelete(sch.schedule_id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear Day"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <button onClick={onClose} className="btn-secondary w-full mt-4">Close</button>
      </div>
    </FormModal>
  )
}
