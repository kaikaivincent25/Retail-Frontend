import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const benefits = [
  { number: "01", title: "Sell faster", text: "Record sales in seconds and keep customers moving." },
  { number: "02", title: "Stay in control", text: "Know what is in stock and understand every movement." },
  { number: "03", title: "See the bigger picture", text: "Review sales, cash and team activity from one clear view." },
];

function Landing() {
  const { user } = useAuth();
  const appDestination = user?.role === "cashier" ? "/sales" : "/dashboard";

  return (
    <div className="lp-page">
      <nav className="lp-nav" aria-label="Main navigation">
        <Link to="/" className="lp-brand" aria-label="RIS home">
          <span className="lp-brand-mark"><img src="/pwa-192x192.png" alt="" /></span>
          <span className="lp-brand-name">RIS<span className="lp-brand-period">.</span></span>
        </Link>
        <div className="lp-nav-links">
          <a href="#benefits">Why RIS</a>
          <a href="#ordering">Online ordering</a>
        </div>
        <div className="lp-nav-actions">
          {user ? (
            <Link to={appDestination} className="lp-btn lp-btn-small">Open your workspace <span aria-hidden="true">→</span></Link>
          ) : (
            <>
              <Link to="/login" className="lp-login-link">Log in</Link>
              <Link to="/signup" className="lp-btn lp-btn-small">Start free <span aria-hidden="true">→</span></Link>
            </>
          )}
        </div>
      </nav>

      <div className="lp-preview-note" role="status"><span className="lp-preview-dot" aria-hidden="true" /> Development preview · Sample data only</div>

      <main>
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-hero-copy">
            <p className="lp-hero-kicker"><span className="lp-kicker-line" /> Retail, made simpler</p>
            <h1 id="lp-hero-title">Run your shop.<br /><span>Know your numbers.</span></h1>
            <p className="lp-hero-lead">RIS brings sales, stock, cash and team activity into one simple workspace—so you can spend less time chasing records and more time growing your business.</p>
            {!user && <div className="lp-ctas"><Link to="/signup" className="lp-btn lp-btn-primary">Create your shop <span aria-hidden="true">→</span></Link><a href="#benefits" className="lp-btn lp-btn-ghost">See how it works</a></div>}
            <div className="lp-trust-line"><span aria-hidden="true">✓</span> Built for Kenyan small businesses · Works on phone, tablet and desktop</div>
          </div>

          <div className="lp-hero-visual" role="img" aria-label="RIS sales and stock overview preview">
            <div className="lp-visual-glow" />
            <div className="lp-visual-label"><span /> YOUR SHOP, IN VIEW</div>
            <div className="lp-dashboard-card">
              <div className="lp-dashboard-top"><div><span className="lp-mini-brand">RIS.</span><strong>Today at a glance</strong></div><span className="lp-live-pill"><i /> Live</span></div>
              <div className="lp-metric-grid"><div><small>Today's sales</small><strong>KES 24,850</strong><em>↑ 12.4%</em></div><div><small>Items sold</small><strong>148</strong><em>Across 42 products</em></div></div>
              <div className="lp-chart" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="lp-dashboard-footer"><span>Sales overview</span><span>Stock healthy <b>✓</b></span></div>
            </div>
            <div className="lp-stock-tag"><span className="lp-stock-icon">↗</span><span><strong>Stock movement logged</strong><small>Sugar · ¼ kg sold</small></span><span className="lp-stock-check">✓</span></div>
            <div className="lp-visual-note"><span className="lp-note-dot" /> One clearer view of your day</div>
          </div>
        </section>

        <section className="lp-benefits" id="benefits" aria-labelledby="lp-benefits-title">
          <div className="lp-section-intro"><p className="lp-eyebrow">Everything your day needs</p><h2 id="lp-benefits-title">Less guesswork.<br /><span>More control.</span></h2><p>From the counter to closing time, RIS keeps the important details connected.</p></div>
          <div className="lp-benefit-grid">{benefits.map((benefit) => <article className="lp-benefit-card" key={benefit.number}><span className="lp-benefit-number">{benefit.number}</span><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}</div>
        </section>

        <section className="lp-ordering" id="ordering" aria-labelledby="lp-ordering-title">
          <div className="lp-ordering-icon" aria-hidden="true">↗</div>
          <div><p className="lp-eyebrow lp-eyebrow-light">Coming next</p><h2 id="lp-ordering-title">Let customers order from your shop.</h2><p>Online ordering is on the way. Soon your shop will be able to receive and manage customer orders through RIS.</p></div>
          <span className="lp-coming-soon">Coming soon</span>
        </section>

        {!user && <section className="lp-final" aria-labelledby="lp-final-title"><div><p className="lp-eyebrow">Start with a clearer day</p><h2 id="lp-final-title">Your shop deserves a simpler system.</h2></div><div className="lp-final-actions"><Link to="/signup" className="lp-btn lp-btn-primary">Create your shop <span aria-hidden="true">→</span></Link><span>Already using RIS? <Link to="/login">Log in</Link></span></div></section>}
      </main>

      <footer className="lp-footer"><Link to="/" className="lp-footer-brand">RIS<span>.</span></Link><p>Built for Kenyan small businesses and everyday retail.</p><span className="lp-footer-note">One clear view of your business.</span></footer>
    </div>
  );
}

export default Landing;
