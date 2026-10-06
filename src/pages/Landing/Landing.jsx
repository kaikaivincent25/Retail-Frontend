
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Landing.css";

function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="RISA home">
          <span className="brand-mark">R</span>
          <span className="brand-accent">RISA</span>
        </Link>

        <div className="landing-nav-right">
          <span className="nav-tagline">Made for everyday retail</span>
          {user ? (
            <Link
              to={user.role === "cashier" ? "/sales" : "/dashboard"}
              className="landing-cta-small"
            >
              Go to your dashboard <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link to="/login" className="landing-cta-small">
              Log in <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              RETAIL, MADE SIMPLER
            </div>

            <h1>
              Your shop deserves
              <span> a clearer way to sell.</span>
            </h1>

            <p className="hero-description">
              From loose sugar and measured portions to everyday packaged goods,
              RISA is designed around how Kenyan shops actually work.
              Record sales, keep an eye on stock, and understand how your day is going.
            </p>

            {!user && (
              <div className="landing-ctas">
                <Link to="/signup" className="landing-cta-primary">
                  Create your shop <span aria-hidden="true">→</span>
                </Link>
                <Link to="/login" className="landing-cta-secondary">
                  I already have an account
                </Link>
              </div>
            )}

            <div className="hero-reassurance">
              <span className="reassurance-check">✓</span>
              <span>Works on phones, tablets, and desktops</span>
              <span className="reassurance-divider">·</span>
              <span>No barcode scanner required</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration of a shop sales summary">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="shop-preview">
              <div className="preview-topbar">
                <div className="preview-brand">
                  <span className="preview-brand-mark">R</span>
                  <span>RISA</span>
                </div>
                <span className="preview-status">
                  <span /> Shop overview
                </span>
              </div>

              <div className="preview-greeting">
                <span className="preview-kicker">A BETTER VIEW OF YOUR DAY</span>
                <h3>Your shop, at a glance.</h3>
                <p>Keep the important things in reach.</p>
              </div>

              <div className="preview-summary">
                <div className="preview-summary-card">
                  <span className="summary-icon sales-icon">↗</span>
                  <span className="summary-label">Sales</span>
                  <strong>Today’s activity</strong>
                  <small>Track each completed sale</small>
                </div>
                <div className="preview-summary-card">
                  <span className="summary-icon stock-icon">▦</span>
                  <span className="summary-label">Stock</span>
                  <strong>Know what remains</strong>
                  <small>Keep stock changes visible</small>
                </div>
              </div>

              <div className="preview-activity">
                <div className="preview-activity-heading">
                  <strong>Built for the counter</strong>
                  <span>Simple workflow</span>
                </div>
                <div className="preview-step">
                  <span className="step-number">01</span>
                  <span className="step-copy">
                    <strong>Select a product</strong>
                    <small>Choose what the customer is buying</small>
                  </span>
                  <span className="step-check">✓</span>
                </div>
                <div className="preview-step">
                  <span className="step-number">02</span>
                  <span className="step-copy">
                    <strong>Record the payment</strong>
                    <small>Make checkout straightforward</small>
                  </span>
                  <span className="step-check">✓</span>
                </div>
                <div className="preview-step">
                  <span className="step-number">03</span>
                  <span className="step-copy">
                    <strong>Keep your records</strong>
                    <small>See sales and stock activity</small>
                  </span>
                  <span className="step-check">✓</span>
                </div>
              </div>
            </div>

            <div className="floating-note note-top">
              <span className="note-icon">✓</span>
              <span><strong>Less guesswork</strong><small>More visibility</small></span>
            </div>
            <div className="floating-note note-bottom">
              <span className="note-icon note-icon-light">◷</span>
              <span><strong>Made for daily use</strong><small>At your shop’s pace</small></span>
            </div>
          </div>
        </section>

        <section className="landing-trust-strip" aria-label="Product highlights">
          <div>
            <span className="trust-icon">⌂</span>
            <span>Designed for Kenyan shops</span>
          </div>
          <div>
            <span className="trust-icon">▤</span>
            <span>Packaged and loose goods</span>
          </div>
          <div>
            <span className="trust-icon">◎</span>
            <span>Clearer daily records</span>
          </div>
        </section>

        <section className="landing-intro">
          <span className="section-eyebrow">THE EVERYDAY CHALLENGE</span>
          <h2>Running a shop is already a lot of work.</h2>
          <p>
            Your sales, stock, staff, and cash all need attention. RISA brings
            essential shop tasks into one practical system, so you can spend less
            time working around your records and more time serving customers.
          </p>
        </section>

        <section className="landing-features">
          <article className="feature-card">
            <div className="feature-icon feature-icon-green">↗</div>
            <span className="feature-number">01 / SALES</span>
            <h3>Serve customers without the extra steps</h3>
            <p>
              Select a product, record the payment, and move to the next customer.
              No barcode scanner is required.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon feature-icon-sand">⚖</div>
            <span className="feature-number">02 / LOOSE GOODS</span>
            <h3>Sell measured goods with confidence</h3>
            <p>
              Set portions such as ¼ kg for goods sold by measure, helping attendants
              follow a consistent selling process.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon feature-icon-blue">▦</div>
            <span className="feature-number">03 / INVENTORY</span>
            <h3>Know what is happening to your stock</h3>
            <p>
              Keep a record of stock changes, including purchases, sales, damage,
              and corrections.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon feature-icon-rose">◉</div>
            <span className="feature-number">04 / ACCOUNTABILITY</span>
            <h3>Keep shop activity more visible</h3>
            <p>
              Review cash session counts and staff activity to help you follow
              what happens during the working day.
            </p>
          </article>
        </section>

        <section className="landing-workflow">
          <div className="workflow-copy">
            <span className="section-eyebrow">A PRACTICAL FIT FOR YOUR SHOP</span>
            <h2>Simple enough for the counter. Useful beyond the sale.</h2>
            <p>
              RISA is designed to support the flow of a real retail day—from
              serving a customer to checking stock and reviewing shop activity.
            </p>
          </div>

          <div className="workflow-points">
            <div className="workflow-point">
              <span>01</span>
              <div>
                <strong>At the counter</strong>
                <p>Record everyday sales, including loose and packaged products.</p>
              </div>
            </div>
            <div className="workflow-point">
              <span>02</span>
              <div>
                <strong>During the day</strong>
                <p>Keep stock movements and staff actions recorded.</p>
              </div>
            </div>
            <div className="workflow-point">
              <span>03</span>
              <div>
                <strong>When reviewing</strong>
                <p>Use your records to get a clearer picture of shop activity.</p>
              </div>
            </div>
          </div>
        </section>

        {!user && (
          <section className="landing-final-cta">
            <div>
              <span className="section-eyebrow">TAKE THE NEXT STEP</span>
              <h2>Make your shop easier to keep track of.</h2>
              <p>Set up your shop and explore a more organised way to manage daily retail.</p>
            </div>
            <div className="final-cta-actions">
              <Link to="/signup" className="landing-cta-primary">
                Create your shop <span aria-hidden="true">→</span>
              </Link>
              <span>Already using RISA? <Link to="/login">Log in</Link></span>
            </div>
          </section>
        )}
      </main>

      <footer className="landing-footer">
        <Link to="/" className="footer-brand">RISA</Link>
        <p>Built for Kenyan micro-retail.</p>
        <span className="footer-note">A clearer view of your everyday business.</span>
      </footer>
    </div>
  );
}

export default Landing;