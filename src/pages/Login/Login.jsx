
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(username, password);
      if (user.role === "cashier") {
        navigate("/sales");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">

        {/* Brand Panel */}
        <section className="login-brand-panel">
          <div className="brand-header">
            <div className="brand-logo">R</div>
            <div className="brand-name">
              <h2>RISA</h2>
              <span>RETAIL INTELLIGENCE</span>
            </div>
          </div>

          <div className="brand-content">
            <span className="brand-eyebrow">
              SMARTER RETAIL. SIMPLER BUSINESS.
            </span>

            <h1>
              Your business,
              <br />
              <span>in better hands.</span>
            </h1>

            <p>
              A simpler way to manage sales, track inventory,
              and understand your retail business.
            </p>

            <div className="brand-features">
              <div className="brand-feature">
                <span className="feature-icon">↗</span>
                <div>
                  <strong>Faster sales</strong>
                  <span>Keep every transaction moving.</span>
                </div>
              </div>

              <div className="brand-feature">
                <span className="feature-icon">▦</span>
                <div>
                  <strong>Smarter inventory</strong>
                  <span>Know what your shop has in stock.</span>
                </div>
              </div>

              <div className="brand-feature">
                <span className="feature-icon">◷</span>
                <div>
                  <strong>Better visibility</strong>
                  <span>Stay informed about your business.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>Built for everyday retail.</span>
            <span>© 2026 RISA</span>
          </div>
        </section>

        {/* Login Panel */}
        <section className="login-form-panel">
          <div className="login-form-container">
            <div className="mobile-brand">
              <div className="brand-logo">R</div>
              <span>RISA</span>
            </div>

            <div className="login-heading">
              <span className="welcome-label">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>
                Enter your credentials to access your retail workspace.
              </p>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" disabled={loading}>
                <span>{loading ? "Signing in..." : "Sign in to RISA"}</span>
                {!loading && <span className="button-arrow">→</span>}
              </button>
            </form>

            <p className="login-footer">
              Don't have a shop yet? <Link to="/signup">Create one</Link>
            </p>

            <div className="login-security">
              <span className="security-icon">✓</span>
              <span>Your workspace is protected and secure.</span>
            </div>
          </div>

          <div className="login-bottom">
            <span>RISA Retail Management System</span>
            <span>Simple. Reliable. Efficient.</span>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Login;