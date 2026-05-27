import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NovaLogoAuth } from "../../components/NovaLogo";
import "./Login.css";

const ADMIN_USER = "admin";
const ADMIN_PASS = "nova@123";

export default function AdminLogin() {
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
    if (!form.username.trim() || !form.password) {
      setError("Both fields are required");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (form.username.trim() === ADMIN_USER && form.password === ADMIN_PASS) {
        sessionStorage.setItem("supernova_admin", "true");
        navigate("/admin", { replace: true });
      } else {
        setError("Incorrect username or password");
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-hero">
          <NovaLogoAuth />
          <p className="auth-hero-tagline">ADMIN PORTAL</p>
        </div>
        <div className="auth-card-body">
          <h1 className="auth-form-title">Admin Sign In</h1>
          <p className="auth-form-sub">Enter your admin credentials to continue</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                className="form-input"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? <span className="btn-loader" /> : "Sign In"}
            </button>
          </form>
          <p className="auth-switch-link" style={{ marginTop: "1rem" }}>
            Not an admin?{" "}
            <button className="link-btn" type="button" onClick={() => navigate("/student/login")}>
              Student login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
