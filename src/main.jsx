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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
