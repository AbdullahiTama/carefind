import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import Feed from './Feed.jsx'
import Search from './Search.jsx'
import BusinessProfile from './BusinessProfile.jsx'
import Login from './Login.jsx'
import Onboarding from './Onboarding.jsx'
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
import AdminLogin from './AdminLogin.jsx'
import News from './News.jsx'
import NewsArticle from './NewsArticle.jsx'
import LiveSession from './LiveSession.jsx'
import Notifications from './Notifications.jsx'
import LiveShow from './LiveShow.jsx'
import LiveDashboard from './LiveDashboard.jsx'

const AdminPanel = lazy(() => import('./AdminPanel.jsx'))

const Loading = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
    <p style={{ color: '#64748b' }}>Loading...</p>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/search" element={<Search />} />
          <Route path="/business/:id" element={<BusinessProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
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
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsArticle />} />
          <Route path="/live/:id" element={<LiveSession />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/live-show/:id" element={<LiveShow />} />
          <Route path="/live-dashboard/:id" element={<LiveDashboard />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-panel" element={<Suspense fallback={<Loading />}><AdminPanel /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
