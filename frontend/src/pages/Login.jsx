import { Link, useNavigate } from 'react-router-dom'
import {useState} from 'react'
import './login.css'

function Login() {
    // hooks
 const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const navigate = useNavigate()

  // handler functions
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.id]: e.target.value
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
    })
    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('token', data.access_token)
      navigate('/dashboard')
    }
    else {
      // Handle login error
      alert('Login failed. Please check your credentials and try again.')
    }
  }

  
  return (
    <div className="auth-page">
      <section className="auth-shell">
        <aside className="brand-side">
          <Link to="/" className="brand">
            <span className="brand-mark">A</span>
            <span>Aureus Banking</span>
          </Link>
          <div className="hero-copy">
            <span className="eyebrow">🔒 Secure executive access</span>
            <h1>Welcome back to <span>premium banking.</span></h1>
            <p>Sign in to review accounts, payments, invoices, SAP sync status, and audit activity from your luxury banking dashboard.</p>
          </div>
          <div className="security-list">
            <div className="security-item">
              <div className="security-icon">✓</div>
              <div><strong>Bank-grade security</strong><span>2FA-ready login flow and session protection.</span></div>
            </div>
            <div className="security-item">
              <div className="security-icon">🔄</div>
              <div><strong>SAP visibility</strong><span>Track enterprise syncs and audit events.</span></div>
            </div>
          </div>
        </aside>

        <main className="form-side">
          <form className="form-card" onSubmit={handleSubmit}>
            <Link to="/" className="back-link">← Back to homepage</Link>
            <h2>Login</h2>
            <p>Access your Aureus Banking workspace.</p>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap"><span>✉</span><input id="email" value={form.email} onChange={handleChange} type="email" placeholder="james@company.com" /></div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap"><span>●</span><input id="password" value={form.password} onChange={handleChange} type="password" placeholder="Enter your password" /></div>
            </div>

            <div className="form-row">
              <label className="checkbox"><input type="checkbox" /> Remember me</label>
              <a href="#">Forgot password?</a>
            </div>

            <button className="btn btn-primary" type="submit">Login →</button>

            <div className="divider">or</div>
            <Link to="/register" className="btn">Create new account</Link>

            
          </form>
        </main>
      </section>
    </div>
  )
}

export default Login
