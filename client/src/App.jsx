import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PayrollProvider } from './context/PayrollContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Streamers from './pages/Streamers'
import Recruiters from './pages/Recruiters'
import RecruitingList from './pages/RecruitingList'
import StaffDept from './pages/StaffDept'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <PayrollProvider>
                  <Layout />
                </PayrollProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/streamers" element={<Streamers />} />
            <Route path="/recruiters" element={<Recruiters />} />
            <Route path="/recruiting-list" element={<RecruitingList />} />
            <Route
              path="/management"
              element={<StaffDept dept="management" title="الإدارة" subtitle="Base Salary ثابت + عمولة Tiers يدوية + بونص/خصم شهري" />}
            />
            <Route
              path="/it"
              element={<StaffDept dept="it" title="IT" subtitle="نفس منطق الإدارة بالظبط" />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
