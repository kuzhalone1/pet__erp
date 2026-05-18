import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClinicSetup from './pages/ClinicSetup'
import Masters from './pages/Masters'
import PetOwners from './pages/PetOwners'
import Pets from './pages/Pets'
import Doctors from './pages/Doctors'
// Phase 2
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import ConsultationForm from './pages/ConsultationForm'
import Vaccination from './pages/Vaccination'
// Phase 3
import Medicines from './pages/Medicines'
import ProceduresMaster from './pages/ProceduresMaster'
import Suppliers from './pages/Suppliers'
import Inventory from './pages/Inventory'
import Purchases from './pages/Purchases'
import SalesBilling from './pages/SalesBill'
import Ledger from './pages/Ledger'
import Agents from './pages/Agents'
import UsersPage from './pages/Users'
import Companies from './pages/Companies'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="clinic-setup" element={<ClinicSetup />} />
        <Route path="masters"      element={<Masters />} />
        <Route path="owners"       element={<PetOwners />} />
        <Route path="pets"         element={<Pets />} />
        <Route path="doctors"      element={<Doctors />} />
        {/* Master System */}
        <Route path="companies"    element={<Companies />} />
        {/* Phase 2 */}
        <Route path="appointments"           element={<Appointments />} />
        <Route path="consultations"          element={<Consultations />} />
        <Route path="consultations/new"      element={<ConsultationForm />} />
        <Route path="consultations/:id"      element={<ConsultationForm />} />
        <Route path="vaccination"            element={<Vaccination />} />
        {/* Phase 3 */}
        <Route path="medicines"             element={<Medicines />} />
        <Route path="procedures"            element={<ProceduresMaster />} />
        <Route path="suppliers"             element={<Suppliers />} />
        <Route path="inventory"             element={<Inventory />} />
        <Route path="purchases"             element={<Purchases />} />
        <Route path="sales-billing"         element={<SalesBilling />} />
        {/* Stage 1 & 2 */}
        <Route path="ledger"               element={<Ledger />} />
        <Route path="agents"               element={<Agents />} />
        <Route path="users"                element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
