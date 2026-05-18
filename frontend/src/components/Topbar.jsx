import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'

const pageTitles = {
  '/dashboard':    { title: 'Dashboard',       sub: 'Welcome back!' },
  '/clinic-setup': { title: 'Clinic Setup',    sub: 'Manage your clinic profile' },
  '/masters':      { title: 'Masters',         sub: 'City, Species & Breed' },
  '/owners':       { title: 'Pet Owners',      sub: 'Manage pet owners' },
  '/pets':         { title: 'Pets',            sub: 'Manage registered pets' },
  '/doctors':      { title: 'Doctors & Staff', sub: 'Manage your team' },
}

export default function Topbar() {
  const { pathname } = useLocation()
  const page = pageTitles[pathname] || { title: 'Pet Clinic ERP', sub: '' }

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-slate-800 leading-tight">{page.title}</h1>
        <p className="text-xs text-slate-400">{page.sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}
