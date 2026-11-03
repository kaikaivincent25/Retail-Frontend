import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Landing() {
  const { user } = useAuth();

  return (
    <div className="lp-page">
      <nav className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="RIS home">
          <span className="lp-brand-mark"><img src="/pwa-192x192.png" alt="" /></span>
          <span className="lp-brand-name">RIS</span>
        </Link>

        <div className="lp-nav-links">
          <a href="#features">What you get</a>
          <a href="#how">How it works</a>
        </div>

        <div className="lp-nav-right">
          {user ? (
            <Link
              to={user.role === "cashier" ? "/sales" : "/dashboard"}
              className="lp-btn lp-btn-small"
            >
              Go to your dashboard
            </Link>
          ) : (
            <Link to="/login" className="lp-btn lp-btn-small">
              Log in
            </Link>
          )}
        </div>
      </nav>

      <div className="lp-preview-banner" role="status">
        <span className="lp-preview-dot" aria-hidden="true" />
        <strong>Development preview</strong>
        <span>Sample data only</span>
        <span className="lp-preview-divider" aria-hidden="true" />
        <span>No real sales or payments are processed</span>
      </div>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-hero-kicker">One simple system for growing retail businesses</p>

            <h1>Run your shop with confidence, whatever you sell.</h1>

            <p className="lp-hero-lead">
              RIS brings sales, products, inventory, staff and reports into one
              clear workspace for small retail businesses. Whether you sell
              electronics, fashion, books, household goods or general merchandise,
              keep your business moving and your decisions grounded in real records.
            </p>

            {!user && (
              <div className="lp-ctas">
                <Link to="/signup" className="lp-btn lp-btn-primary">
                  Create your shop
                </Link>
                <Link to="/login" className="lp-btn lp-btn-ghost">
                  I already have an account
                </Link>
              </div>
            )}

            <ul className="lp-assurances">
              <li>
                <span className="lp-tick" aria-hidden="true">✓</span>
                Works on phones, tablets and desktops
              </li>
              <li>
                <span className="lp-tick" aria-hidden="true">✓</span>
                Works with the way your shop already sells
              </li>
            </ul>
          </div>

          <div
            className="lp-hero-visual"
            role="img"
            aria-label="Illustration of a sample sales slip from an RIS retail business"
          >
            <div className="lp-hero-emblem" aria-hidden="true">
              <img src="/pwa-192x192.png" alt="" />
            </div>
            <div className="lp-slip">
              <div className="lp-slip-paper">
                <div className="lp-slip-head">
                  <span className="lp-slip-mark">R</span>
                  <div>
                    <strong>RIS</strong>
                    <small>Sales slip (sample)</small>
                  </div>
                </div>

                <ul className="lp-slip-lines">
                  <li>
                    <span>
                      Sugar, loose
                      <small>¼ kg</small>
                    </span>
                    <span>55</span>
                  </li>
                  <li>
                    <span>
                      Maize flour
                      <small>2 kg pack</small>
                    </span>
                    <span>180</span>
                  </li>
                  <li>
                    <span>
                      Cooking oil
                      <small>1 litre</small>
                    </span>
                    <span>340</span>
                  </li>
                </ul>

                <div className="lp-slip-total">
                  <span>Total (KES)</span>
                  <strong>575</strong>
                </div>

                  <p className="lp-slip-foot">Sale recorded. Stock and records updated.</p>
              </div>
            </div>

            <div className="lp-stock-tag">
              <strong>Stock updated</strong>
              <small>Sugar, loose: ¼ kg sold</small>
            </div>
          </div>
        </section>

        <section className="lp-strip" aria-label="Product highlights">
          <div>
            <span className="lp-strip-icon" aria-hidden="true">⌂</span>
            Built for small retail teams
          </div>
          <div>
            <span className="lp-strip-icon" aria-hidden="true">▤</span>
            Flexible for any product catalogue
          </div>
          <div>
            <span className="lp-strip-icon" aria-hidden="true">◎</span>
            Clear records, every day
          </div>
        </section>

        <section className="lp-businesses" aria-labelledby="lp-businesses-title">
          <div className="lp-businesses-intro">
            <p className="lp-eyebrow">Made to fit your business</p>
            <h2 id="lp-businesses-title">Your shop has its own products. Your system should adapt.</h2>
            <p>
              Start with the retail workflow you know and shape your catalogue as
              your business grows. RIS is an open retail information system, not a
              household-only tool.
            </p>
          </div>
          <div className="lp-business-grid">
            <article className="lp-business-card">
              <span className="lp-business-icon" aria-hidden="true">⌁</span>
              <div><h3>Electronics</h3><p>Track models, serial numbers, accessories and warranty details.</p></div>
            </article>
            <article className="lp-business-card">
              <span className="lp-business-icon" aria-hidden="true">◌</span>
              <div><h3>Boutiques &amp; fashion</h3><p>Manage sizes, colours, variations and fast-moving stock.</p></div>
            </article>
            <article className="lp-business-card">
              <span className="lp-business-icon" aria-hidden="true">▤</span>
              <div><h3>Bookshops</h3><p>Organise books, stationery and school supplies in one catalogue.</p></div>
            </article>
            <article className="lp-business-card">
              <span className="lp-business-icon" aria-hidden="true">+</span>
              <div><h3>Household &amp; general retail</h3><p>Sell packaged, loose or general merchandise with confidence.</p></div>
            </article>
          </div>
        </section>

        <section className="lp-features" id="features">
          <header className="lp-section-head">
            <h2>Everything you need to understand and grow your shop.</h2>
            <p>
              Your sales, stock, staff and cash all need attention. RIS brings
              them into one practical system, so you spend less time chasing
              records and more time serving customers.
            </p>
          </header>

          <div className="lp-bento">
            <article className="lp-card lp-card-sales">
              <h3>Customers waiting? Keep the line moving.</h3>
              <p>
                Select a product, record the payment, and call the next customer.
                No barcode scanner is needed.
              </p>
              <div className="lp-flow" aria-hidden="true">
                <span>Select product</span>
                <span className="lp-flow-main">Record payment</span>
                <span>Next customer</span>
              </div>
            </article>

            <article className="lp-card lp-card-loose">
              <h3>Products change? Your catalogue can too.</h3>
              <p>
                Set portions such as ¼ kg for goods sold by measure, so every
                attendant sells the same way.
              </p>
              <div className="lp-portions" aria-hidden="true">
                <span className="lp-portion-on">¼ kg</span>
                <span>½ kg</span>
                <span>1 kg</span>
              </div>
            </article>

            <article className="lp-card lp-card-stock">
              <h3>Stock not matching the shelf?</h3>
              <p>
                Every purchase, sale, adjustment and correction is recorded, so
                you can see why a number changed.
              </p>
              <ul className="lp-ledger" aria-hidden="true">
                <li><span>Purchase</span><span>+20 kg</span></li>
                <li><span>Sale</span><span>−¼ kg</span></li>
                <li><span>Damage</span><span>−1 kg</span></li>
                <li><span>Correction</span><span>+½ kg</span></li>
              </ul>
            </article>

            <article className="lp-card lp-card-people">
              <h3>Cash short at closing time?</h3>
              <p>
                Review cash session counts and staff activity to follow what
                happened during the working day.
              </p>
              <ul className="lp-checks" aria-hidden="true">
                <li><span>Cash session count</span><em>Recorded</em></li>
                <li><span>Staff activity</span><em>Recorded</em></li>
              </ul>
            </article>
          </div>
        </section>

        <section className="lp-how" id="how">
          <div className="lp-how-inner">
            <div className="lp-how-copy">
              <h2>Simple at the counter. Powerful when you review.</h2>
              <p>
                RIS follows your real retail day, from serving a customer to
                checking stock, supporting staff and reviewing what happened.
              </p>
            </div>

            <ol className="lp-steps">
              <li>
                <span className="lp-step-num">1</span>
                <div>
                  <strong>At the counter</strong>
                  <p>Record sales quickly, whether you sell units, variations or measured goods.</p>
                </div>
              </li>
              <li>
                <span className="lp-step-num">2</span>
                <div>
                  <strong>During the day</strong>
                  <p>Stock movements and staff actions are kept on record as they happen.</p>
                </div>
              </li>
              <li>
                <span className="lp-step-num">3</span>
                <div>
                  <strong>When you review</strong>
                  <p>Use reports to spot what is selling, what needs attention and where to grow.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {!user && (
          <section className="lp-final">
            <div className="lp-final-copy">
              <h2>Give your retail business a clearer way to grow.</h2>
              <p>
                Create your shop and start recording sales the way your customers
                actually buy.
              </p>
            </div>
            <div className="lp-final-actions">
              <Link to="/signup" className="lp-btn lp-btn-primary">
                Create your shop
              </Link>
              <span>
                Already using RIS? <Link to="/login">Log in</Link>
              </span>
            </div>
          </section>
        )}
      </main>

      <footer className="lp-footer">
        <Link to="/" className="lp-footer-brand">RIS</Link>
        <p>Built for Kenyan small businesses and everyday retail.</p>
        <span className="lp-footer-note">One clear view of your business.</span>
      </footer>
    </div>
  );
}

export default Landing;
