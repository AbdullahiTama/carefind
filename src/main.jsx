import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import Feed from './Feed.jsx'
import Search from './Search.jsx'
import BusinessProfile from './BusinessProfile.jsx'
import Login from './Login.jsx'
import Profile from './Profile.jsx'
import PublicProfile from './PublicProfile.jsx'
import SavedPosts from './SavedPosts.jsx'
import VerifyProfessional from './VerifyProfessional.jsx'
import ClaimBusiness from './ClaimBusiness.jsx'
import Dashboard from './Dashboard.jsx'
import BusinessDashboard from './BusinessDashboard.jsx'
import ProfessionalDashboard from './ProfessionalDashboard.jsx'
import DrugProfile from './DrugProfile.jsx'
import Wallet from './Wallet.jsx'
import ProfessionalMonetization from './ProfessionalMonetization.jsx'
const AdminPanel = React.lazy(() => import('./AdminPanel.jsx'))
const AdminLogin = React.lazy(() => import('./AdminLogin.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/search" element={<Search />} />
          <Route path="/business/:id" element={<BusinessProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:id" element={<PublicProfile />} />
          <Route path="/saved" element={<SavedPosts />} />
          <Route path="/verify" element={<VerifyProfessional />} />
          <Route path="/claim-business" element={<ClaimBusiness />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/business-dashboard" element={<BusinessDashboard />} />
          <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />
          <Route path="/drug/:name" element={<DrugProfile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/earn" element={<ProfessionalMonetization />} />
          <Route path="/admin" element={<React.Suspense fallback={<div style={{padding:20}}>Loading...</div>}><AdminPanel /></React.Suspense>} />
          <Route path="/admin-login" element={<React.Suspense fallback={<div style={{padding:20}}>Loading...</div>}><AdminLogin /></React.Suspense>} />
          <Route path="/admin-panel" element={<React.Suspense fallback={<div style={{padding:20}}>Loading...</div>}><AdminPanel /></React.Suspense>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
