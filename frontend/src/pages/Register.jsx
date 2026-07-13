import { Link, useNavigate} from 'react-router-dom'
import './register.css'
import { useState } from 'react'

function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})

  const friendly = {
    phone_number: "Phone number needs 10 digits",
    username: "Username must have at least 3 characters",
    password: "Password must have at least 12 characters",
    address: "Address is required",
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.id]: e.target.value
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    // client-side checks (instant feedback; backend still validates on submit).
    // Keys must match the render keys (date_of_birth, phone_number) so they show
    // under the right field.
    const clientErrors = {}
    if (form.firstName.trim().length < 2) clientErrors.firstName = 'First name must be at least 2 characters'
    if (form.lastName.trim().length < 2) clientErrors.lastName = 'Last name must be at least 2 characters'
    if (!form.username.trim()) clientErrors.username = 'Username is required'
    if (!form.email.trim()) clientErrors.email = 'Email is required'
    if (!form.dateOfBirth) clientErrors.date_of_birth = 'Date of birth is required'
    if (!form.phone.trim()) clientErrors.phone_number = 'Phone number is required'
    if (!form.address.trim()) clientErrors.address = 'Address is required'
    if (!form.password) clientErrors.password = 'Password is required'
    if (form.password !== form.confirmPassword) clientErrors.confirmPassword = 'Passwords do not match'

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email,
        username: form.username,
        password: form.password,
        full_name: `${form.firstName} ${form.lastName}`,
        date_of_birth: form.dateOfBirth,
        phone_number: form.phone,
        address: form.address
      })
    })

    if (response.ok) {
      navigate('/login')
    }
    else {
      const data = await response.json()
      const fieldErrors = {}
      if (Array.isArray(data.detail)) {
        // 422 validation errors: [{ loc: ["body","email"], msg: "..." }, ...]
        data.detail.forEach((err) => {
          const field = err.loc.at(-1)
          fieldErrors[field] = friendly[field] || err.msg
        })
      } else {
        // HTTPException (e.g. 409 duplicate): detail is a string
        fieldErrors.general = data.detail || 'Registration failed'
      }
      setErrors(fieldErrors)
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
            <span className="eyebrow">✦ New client onboarding</span>
            <h1>Create your <span>private banking</span> profile.</h1>
            <p>Start with your details now. In a real bank this would run KYC/AML identity verification — here it maps directly to the PostgreSQL user table.</p>
          </div>
          <div className="steps">
            <div className="step"><div className="step-num">1</div><div><strong>Basic details</strong><span>Name, contact, and password.</span></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>KYC/AML review</strong><span>Tracked by kyc_status / aml_status fields (defaults: pending).</span></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>Open an account</strong><span>Choose checking/savings after login, from the dashboard.</span></div></div>
          </div>
        </aside>

        <main className="form-side">
          <form className="form-card" onSubmit={handleSubmit}>
            <Link to="/" className="back-link">← Back to homepage</Link>
            <h2>Create Account</h2>
            <p>Register a new banking profile.</p>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <div className="input-wrap"><input id="firstName" value={form.firstName} onChange={handleChange} type="text" placeholder="James" /></div>
                {errors.firstName && <p className="field-error">{errors.firstName}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <div className="input-wrap"><input id="lastName" value={form.lastName} onChange={handleChange} type="text" placeholder="Whitaker" /></div>
                {errors.lastName && <p className="field-error">{errors.lastName}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrap"><input id="username" value={form.username} onChange={handleChange} type="text" placeholder="jwhitaker" /></div>
                {errors.username && <p className="field-error">{errors.username}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <div className="input-wrap"><input id="email" value={form.email} onChange={handleChange} type="email" placeholder="james@company.com" /></div>
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of birth</label>
                <div className="input-wrap"><input id="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" /></div>
                {errors.date_of_birth && <p className="field-error">{errors.date_of_birth}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone number</label>
                <div className="input-wrap"><input id="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="+1 (555) 123-4567" /></div>
                {errors.phone_number && <p className="field-error">{errors.phone_number}</p>}
              </div>

              <div className="form-group full">
                <label htmlFor="address">Address</label>
                <div className="input-wrap"><input id="address" value={form.address} onChange={handleChange} type="text" placeholder="123 Main St, City, State" /></div>
                {errors.address && <p className="field-error">{errors.address}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap"><input id="password" value={form.password} onChange={handleChange} type="password" placeholder="Create password (12+ chars)" /></div>
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className="input-wrap"><input id="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="Confirm password" /></div>
                {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
              </div>
            </div>

            <label className="checkbox"><input type="checkbox" /> I agree to the <a href="#">Terms and Privacy Policy</a></label>
            <button className="btn btn-primary" type="submit">Create Account →</button>
            <p className="alt-action">Already have an account? <Link to="/login">Login</Link></p>
            <div className="demo-note">Maps to UserCreate: first + last → full_name; username, email, date_of_birth, address, phone_number, password. (confirmPassword is a client-side check only; account type is chosen later when opening an account.)</div>
          </form>
        </main>
      </section>
    </div>
  )
}

export default Register
