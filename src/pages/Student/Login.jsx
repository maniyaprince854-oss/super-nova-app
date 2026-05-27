import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaLogoAuth } from "../../components/NovaLogo";
import { authenticateStudent } from "../../database/students";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      setError("Both fields are required");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = authenticateStudent(form.username.trim().toLowerCase(), form.password);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      sessionStorage.setItem("supernova_current_student", JSON.stringify(result.student));
      setLoading(false);
      navigate("/student/dashboard");
    }, 400);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-hero">
          <NovaLogoAuth />
          <p className="auth-hero-tagline">Welcome back</p>
        </div>

        <div className="auth-card-body">
          <h2 className="auth-form-title">Student Login</h2>
          <p className="auth-form-sub">Sign in to your account</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                name="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="btn-loader"></span> : "Login"}
            </button>

            <p className="auth-switch-link">
              Don't have an account?{" "}
              <button type="button" className="link-btn" onClick={() => navigate("/student/register")}>
                Create one
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
