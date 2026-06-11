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
import AdvancePayments from './pages/AdvancePayments'
import BankArrivals from './pages/BankArrivals'
import ReceiptVoucher from './pages/ReceiptVoucher'
import PaymentVoucher from './pages/PaymentVoucher'
import JournalVoucher from './pages/JournalVoucher'
import CreditNote from './pages/CreditNote'
import DebitNote from './pages/DebitNote'
import GSTReports from './pages/GSTReports'
import AccountsReports from './pages/AccountsReports'

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
        <Route path="accounts/advance-payments"    element={<AdvancePayments />} />
        <Route path="accounts/bank-arrivals"       element={<BankArrivals />} />
        <Route path="accounts/receipt-vouchers"   element={<ReceiptVoucher />} />
        <Route path="accounts/payment-vouchers"   element={<PaymentVoucher />} />
        <Route path="accounts/journal-vouchers"   element={<JournalVoucher />} />
        <Route path="accounts/credit-notes"       element={<CreditNote />} />
        <Route path="accounts/debit-notes"        element={<DebitNote />} />
        <Route path="reports/gst"                 element={<GSTReports />} />
        <Route path="reports/accounts"            element={<AccountsReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
