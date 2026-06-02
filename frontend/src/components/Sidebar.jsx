import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Hospital, MapPin, PawPrint,
  Users, Stethoscope, LogOut, ChevronRight,
  CalendarDays, ClipboardList, Syringe, Pill,
  Package, ShoppingCart, Receipt,
  BookOpen, Handshake, UserCog, Building2
} from 'lucide-react'

const navGroups = [
  {
    label: '🏢 Master System',
    badge: 'NEW',
    items: [
      { to: '/companies', icon: Building2, label: 'Company Profiles' },
    ]
  },
  {
    label: '📦 Phase 1 — Masters',
    badge: 'LIVE',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/clinic-setup', icon: Hospital, label: 'Clinic Setup' },
      { to: '/masters', icon: MapPin, label: 'Masters' },
      { to: '/owners', icon: Users, label: 'Pet Owners' },
      { to: '/pets', icon: PawPrint, label: 'Pets' },
      { to: '/doctors', icon: Stethoscope, label: 'Doctors & Staff' },
      { to: '/agents', icon: Handshake, label: 'Referral Agents' },
      { to: '/suppliers', icon: Package, label: 'Suppliers' },
      { to: '/medicines', icon: Pill, label: 'Medicine Master' },
      { to: '/vaccination', icon: Syringe, label: 'Vaccination' },
      { to: '/users', icon: UserCog, label: 'User Management' },
    ]
  },
  // ─── FUTURE PHASES ───
  {
    label: 'Phase 2 — Clinical',
    items: [
      { to: '/appointments',   icon: CalendarDays,   label: 'Appointments' },
      { to: '/consultations',  icon: ClipboardList,  label: 'Consultations' },
      { to: '/procedures',     icon: Stethoscope,    label: 'Procedures' },
    ]
  },
  {
    label: 'Phase 3 — Pharmacy & Stock',
    items: [
      { to: '/sales-billing', icon: Receipt,      label: 'Sales Billing' },
      { to: '/purchases',     icon: ShoppingCart, label: 'Purchases' },
      { to: '/inventory',     icon: Package,      label: 'Inventory' },
    ]
  },
  {
    label: 'Phase 4 — Accounts',
    items: [
      { to: '/ledger',       icon: BookOpen,     label: 'Chart of Accounts' },
    ]
  },
]

export default function Sidebar({ isOpen = true }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shadow-sm shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm">
            🐾
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">Pet Clinic ERP</p>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-2 px-3 mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.label}</p>
              {group.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">{group.badge}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
                  }
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
            {(user.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{user.full_name || 'Admin'}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
