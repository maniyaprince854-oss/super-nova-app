import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaLogoAuth } from "../../components/NovaLogo";
import { createStudent } from "../../database/students";
import { classOptions } from "../../data/mockData";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    studentClass: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim() || !form.username.trim() || !form.password.trim() || !form.studentClass) {
      setError("All fields are required");
      return;
    }

    if (form.username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (form.password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = createStudent({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        studentClass: form.studentClass,
      });

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/student/login");
      }, 1500);
    }, 500);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-hero">
          <NovaLogoAuth />
          <p className="auth-hero-tagline">Your journey starts here</p>
        </div>

        <div className="auth-card-body">
          <h2 className="auth-form-title">Create Account</h2>
          <p className="auth-form-sub">Join Nova Classes today</p>

          {success ? (
            <div className="register-success">
              <span className="register-success-icon">✓</span>
              <p>Account created successfully!</p>
              <span className="register-redirect">Redirecting to login...</span>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="form-input"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="studentClass">Class</label>
                <select
                  id="studentClass"
                  name="studentClass"
                  className="form-input form-select"
                  value={form.studentClass}
                  onChange={handleChange}
                >
                  <option value="">Select your class</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="btn-loader"></span> : "Create Account"}
              </button>

              <p className="auth-switch-link">
                Already have an account?{" "}
                <button type="button" className="link-btn" onClick={() => navigate("/student/login")}>
                  Login here
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
