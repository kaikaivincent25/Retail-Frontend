import { useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi from "../../services/platformApi";
import "./PlatformLogin.css";

function PlatformLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams({ username, password });
      const response = await platformApi.post("/platform/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      sessionStorage.setItem("platform_token", response.data.access_token);
      navigate("/platform");
    } catch (err) {
      setError(err.response?.data?.detail || "Platform sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="platform-login-page">
      <form className="platform-login-card" onSubmit={handleSubmit}>
        <span className="platform-kicker">RIS CONTROL CENTRE</span>
        <h1>Platform owner sign in</h1>
        <p>This area is for RIS operators. Shop users should use the normal sign-in page.</p>
        {error && <div className="platform-error" role="alert">{error}</div>}
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
      </form>
    </main>
  );
}

export default PlatformLogin;
