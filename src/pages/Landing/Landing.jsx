import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Landing() {
  const { user } = useAuth();

  return (
    <div className="lp-page">
      <nav className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="RIS home">
          <span className="lp-brand-mark"><img src="/pwa-192x192.png" alt="" /></span>
          <span className="lp-brand-name">RIS<span className="lp-brand-period">.</span></span>
        </Link>
        <div className="lp-nav-links">
          <a href="#businesses">Who it's for</a>
          <a href="#features">What you get</a>
          <a href="#how">How it works</a>
        </div>
        <div className="lp-nav-right">
          {user ? (
            <Link to={user.role === "cashier" ? "/sales" : "/dashboard"} className="lp-btn lp-btn-small">
              Go to your dashboard <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link to="/login" className="lp-btn lp-btn-small">Log in <span aria-hidden="true">↗</span></Link>
          )}
        </div>
      </nav>

      <div className="lp-preview-banner" role="status">
        <span className="lp-preview-dot" aria-hidden="true" />
        <strong>Development preview</strong>
        <span className="lp-preview-divider" aria-hidden="true" />
        <span>Sample data only — no real sales or payments are processed.</span>
      </div>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-hero-kicker"><span className="lp-kicker-line" /> Retail, made clearer</p>
            <h1>Run your shop.<br /><span>Know your numbers.</span></h1>
            <p className="lp-hero-lead">
              From the first sale to the end-of-day review, RIS brings your
              products, sales, stock and team activity into one clear workspace.
              Spend less time piecing records together and more time moving
              your business forward.
            </p>
            {!user && (
              <div className="lp-ctas">
                <Link to="/signup" className="lp-btn lp-btn-primary">Create your shop <span aria-hidden="true">→</span></Link>
                <Link to="/login" className="lp-btn lp-btn-ghost">I already have an account</Link>
              </div>
            )}
            <ul className="lp-assurances">
              <li><span className="lp-tick" aria-hidden="true">✓</span> Phone, tablet and desktop ready</li>
              <li><span className="lp-tick" aria-hidden="true">✓</span> Built around everyday retail</li>
            </ul>
          </div>

          <div className="lp-hero-visual" role="img" aria-label="Illustration of a sample RIS sales record and stock update">
            <div className="lp-visual-orbit lp-orbit-one" />
            <div className="lp-visual-orbit lp-orbit-two" />
            <div className="lp-visual-label"><span /> YOUR RETAIL, IN VIEW</div>
            <div className="lp-slip">
              <div className="lp-slip-paper">
                <div className="lp-slip-head">
                  <span className="lp-slip-mark"><img src="/pwa-192x192.png" alt="" /></span>
                  <div><strong>RIS</strong><small>SALES RECORD · SAMPLE</small></div>
                  <span className="lp-slip-status">Recorded</span>
                </div>
                <div className="lp-slip-meta"><span>Today's sale</span><span>Counter 01</span></div>
                <ul className="lp-slip-lines">
                  <li><span>Sugar, loose<small>¼ kg</small></span><span>KES 55</span></li>
                  <li><span>Maize flour<small>2 kg pack</small></span><span>KES 180</span></li>
                  <li><span>Cooking oil<small>1 litre</small></span><span>KES 340</span></li>
                </ul>
                <div className="lp-slip-total"><span>Total recorded</span><strong>575</strong></div>
                <p className="lp-slip-foot">KES · Sample transaction</p>
              </div>
            </div>
            <div className="lp-stock-tag">
              <span className="lp-stock-icon">↗</span>
              <span><strong>Stock movement logged</strong><small>Sugar · ¼ kg sold</small></span>
              <span className="lp-stock-check">✓</span>
            </div>
            <div className="lp-visual-note"><span className="lp-note-dot" /> One clearer view of your day</div>
          </div>
        </section>

        <section className="lp-strip" aria-label="Product highlights">
          <div><span className="lp-strip-icon">01</span><span><strong>Made for retail teams</strong><small>Practical day-to-day workflows</small></span></div>
          <div><span className="lp-strip-icon">02</span><span><strong>Flexible catalogues</strong><small>Products, portions and variations</small></span></div>
          <div><span className="lp-strip-icon">03</span><span><strong>Records you can review</strong><small>Sales, stock and staff activity</small></span></div>
        </section>

        <section className="lp-businesses" id="businesses" aria-labelledby="lp-businesses-title">
          <div className="lp-businesses-intro">
            <p className="lp-eyebrow">One system. Different kinds of retail.</p>
            <h2 id="lp-businesses-title">Your business is unique.<br /><span>Your system should keep up.</span></h2>
            <p>RIS is designed for more than one kind of shop. Shape your product catalogue around what you sell, how you sell it and the way your business operates.</p>
          </div>
          <div className="lp-business-grid">
            <article className="lp-business-card"><span className="lp-business-icon">⌁</span><div><h3>Electronics</h3><p>Keep models, serial numbers, accessories and warranty details organised.</p></div><span className="lp-card-arrow">↗</span></article>
            <article className="lp-business-card"><span className="lp-business-icon">◌</span><div><h3>Boutiques &amp; fashion</h3><p>Manage sizes, colours, variations and fast-moving stock.</p></div><span className="lp-card-arrow">↗</span></article>
            <article className="lp-business-card"><span className="lp-business-icon">▤</span><div><h3>Bookshops</h3><p>Bring books, stationery and school supplies into one catalogue.</p></div><span className="lp-card-arrow">↗</span></article>
            <article className="lp-business-card"><span className="lp-business-icon">＋</span><div><h3>Household &amp; general retail</h3><p>Sell packaged, loose or general merchandise with confidence.</p></div><span className="lp-card-arrow">↗</span></article>
          </div>
        </section>

        <section className="lp-features" id="features">
          <header className="lp-section-head">
            <div><p className="lp-eyebrow">The everyday details, connected</p><h2>Less guesswork.<br /><span>More control of the day.</span></h2></div>
            <p>A retail business runs on hundreds of small decisions. RIS helps bring the important details together, from serving customers to understanding what happened after the doors close.</p>
          </header>
          <div className="lp-bento">
            <article className="lp-card lp-card-sales">
              <div className="lp-card-topline"><span className="lp-card-index">01 / SALES</span><span className="lp-card-symbol">↗</span></div>
              <h3>Keep the queue moving.</h3>
              <p>Select products, record payments and serve the next customer. No barcode scanner is needed.</p>
              <div className="lp-flow" aria-hidden="true"><span>Select product</span><b>→</b><span className="lp-flow-main">Record payment</span><b>→</b><span>Next customer</span></div>
            </article>
            <article className="lp-card lp-card-loose">
              <div className="lp-card-topline"><span className="lp-card-index">02 / CATALOGUE</span><span className="lp-card-symbol">＋</span></div>
              <h3>Your products, your way.</h3>
              <p>Set portions such as ¼ kg for goods sold by measure, so attendants can sell consistently.</p>
              <div className="lp-portions" aria-hidden="true"><span className="lp-portion-on">¼ kg</span><span>½ kg</span><span>1 kg</span></div>
            </article>
            <article className="lp-card lp-card-stock">
              <div className="lp-card-topline"><span className="lp-card-index">03 / INVENTORY</span><span className="lp-card-symbol">⌁</span></div>
              <h3>Know why stock changed.</h3>
              <p>Purchases, sales, adjustments and corrections are recorded, giving you a clearer picture of stock movement.</p>
              <ul className="lp-ledger" aria-hidden="true"><li><span>Purchase</span><span className="lp-positive">+20 kg</span></li><li><span>Sale</span><span>−¼ kg</span></li><li><span>Damage</span><span>−1 kg</span></li><li><span>Correction</span><span className="lp-positive">+½ kg</span></li></ul>
            </article>
            <article className="lp-card lp-card-people">
              <div className="lp-card-topline"><span className="lp-card-index">04 / TEAM &amp; CASH</span><span className="lp-card-symbol">◎</span></div>
              <h3>Close the day with context.</h3>
              <p>Review cash session counts and staff activity to follow what happened throughout the working day.</p>
              <ul className="lp-checks" aria-hidden="true"><li><span className="lp-check-icon">✓</span><span>Cash session count<em>Recorded</em></span></li><li><span className="lp-check-icon">✓</span><span>Staff activity<em>Recorded</em></span></li></ul>
            </article>
          </div>
        </section>

        <section className="lp-how" id="how">
          <div className="lp-how-inner">
            <div className="lp-how-copy">
              <p className="lp-eyebrow lp-eyebrow-light">A clearer retail routine</p>
              <h2>From the first sale to the final review.</h2>
              <p>RIS follows the rhythm of your retail day, helping you keep everyday activity connected and easier to understand.</p>
              {!user && <Link to="/signup" className="lp-how-link">Start with your shop <span>→</span></Link>}
            </div>
            <ol className="lp-steps">
              <li><span className="lp-step-num">01</span><div><strong>At the counter</strong><p>Record sales quickly, whether you sell units, variations or measured goods.</p></div></li>
              <li><span className="lp-step-num">02</span><div><strong>Throughout the day</strong><p>Keep stock movements and staff actions on record as they happen.</p></div></li>
              <li><span className="lp-step-num">03</span><div><strong>When you review</strong><p>Use reports to see what is selling, what needs attention and where to focus.</p></div></li>
            </ol>
          </div>
        </section>

        {!user && (
          <section className="lp-final">
            <div className="lp-final-copy">
              <p className="lp-eyebrow">Make every retail day clearer</p>
              <h2>Ready to get a better view of your business?</h2>
              <p>Create your shop and start recording sales the way your customers actually buy.</p>
            </div>
            <div className="lp-final-actions">
              <Link to="/signup" className="lp-btn lp-btn-primary">Create your shop <span aria-hidden="true">→</span></Link>
              <span>Already using RIS? <Link to="/login">Log in</Link></span>
            </div>
            <span className="lp-final-decoration" aria-hidden="true">RIS.</span>
          </section>
        )}
      </main>

      <footer className="lp-footer">
        <Link to="/" className="lp-footer-brand">RIS<span>.</span></Link>
        <p>Built for Kenyan small businesses and everyday retail.</p>
        <span className="lp-footer-note">One clear view of your business.</span>
      </footer>
    </div>
  );
}

export default Landing;
