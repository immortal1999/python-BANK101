import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Cards from './pages/Cards'
import Statements from './pages/Statements'
import Support from './pages/Support'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Signed-in pages share the sidebar / top bar / support chat */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:accountId" element={<Accounts />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="/support" element={<Support />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
