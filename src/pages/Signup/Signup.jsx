
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Signup.css";

function Signup() {
  const [shopName, setShopName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup({
        shop_name: shopName,
        shop_location: shopLocation || null,
        admin_full_name: fullName,
        admin_username: username,
        admin_password: password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create your shop. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-shell">
        <header className="signup-topbar">
          <Link to="/" className="signup-brand" aria-label="RISA home">
            <span className="signup-brand-mark">R</span>
            <span>RISA</span>
          </Link>
          <div className="signup-topbar-note">
            Already registered?
            <Link to="/login">Log in <span aria-hidden="true">→</span></Link>
          </div>
        </header>

        <main className="signup-layout">
          <section className="signup-intro">
            <span className="signup-eyebrow">
              <span className="signup-eyebrow-dot" />
              GET YOUR SHOP STARTED
            </span>

            <h1>
              A more organised
              <span> way to run your shop.</span>
            </h1>

            <p className="signup-intro-text">
              Create your shop account and bring your everyday sales, stock,
              and shop activity into one place.
            </p>

            <div className="signup-benefits">
              <div className="signup-benefit">
                <span className="benefit-icon">✓</span>
                <div>
                  <strong>Your shop, your account</strong>
                  <p>Set up your shop and owner details in one place.</p>
                </div>
              </div>
              <div className="signup-benefit">
                <span className="benefit-icon">▦</span>
                <div>
                  <strong>Designed for everyday retail</strong>
                  <p>For packaged products and goods sold by measure.</p>
                </div>
              </div>
              <div className="signup-benefit">
                <span className="benefit-icon">◎</span>
                <div>
                  <strong>A clearer view of your business</strong>
                  <p>Keep useful sales and stock records together.</p>
                </div>
              </div>
            </div>

            <div className="signup-side-note">
              <span className="side-note-mark">“</span>
              <p>
                Your shop is unique. Start with the details that make it yours.
              </p>
            </div>
          </section>

          <section className="signup-form-panel">
            <div className="signup-card">
              <div className="signup-card-heading">
                <span className="signup-step-label">SHOP SETUP <span>·</span> 01</span>
                <h2>Create your shop</h2>
                <p>Enter your details below to set up your owner account.</p>
              </div>

              {error && (
                <div className="signup-error" role="alert">
                  <span className="error-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="signup-form-section">
                  <div className="form-section-heading">
                    <span className="form-section-number">01</span>
                    <div>
                      <h3>About your shop</h3>
                      <p>Help identify your business.</p>
                    </div>
                  </div>

                  <div className="signup-field">
                    <label htmlFor="shopName">Shop name <span>*</span></label>
                    <input
                      id="shopName"
                      name="shopName"
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Green Valley Store"
                      required
                      autoFocus
                    />
                    <small>Use the name your customers know your shop by.</small>
                  </div>

                  <div className="signup-field">
                    <label htmlFor="shopLocation">Shop location <span className="optional-label">Optional</span></label>
                    <input
                      id="shopLocation"
                      name="shopLocation"
                      type="text"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Nairobi"
                    />
                    <small>Add a town, estate, or area to help identify your shop.</small>
                  </div>
                </div>

                <div className="signup-form-divider" />

                <div className="signup-form-section">
                  <div className="form-section-heading">
                    <span className="form-section-number">02</span>
                    <div>
                      <h3>Your owner account</h3>
                      <p>These details will be used for your account.</p>
                    </div>
                  </div>

                  <div className="signup-field">
                    <label htmlFor="fullName">Your full name <span>*</span></label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="signup-field">
                    <label htmlFor="username">Choose a username <span>*</span></label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Create a username"
                      required
                      minLength={3}
                      autoComplete="username"
                    />
                    <small>At least 3 characters.</small>
                  </div>

                  <div className="signup-field">
                    <label htmlFor="password">Choose a password <span>*</span></label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <small>Use at least 6 characters.</small>
                  </div>
                </div>

                <button className="signup-submit" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="signup-spinner" />
                      Creating your shop...
                    </>
                  ) : (
                    <>
                      Create my shop account <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                <p className="signup-form-note">
                  By creating an account, you are setting up your shop on RISA.
                </p>
              </form>

              <div className="signup-mobile-login">
                Already have an account? <Link to="/login">Log in</Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="signup-footer">
          <span>© RISA</span>
          <span>Built for Kenyan micro-retail.</span>
        </footer>
      </div>
    </div>
  );
}

export default Signup;