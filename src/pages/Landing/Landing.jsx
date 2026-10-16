import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Landing.css";

function Landing() {
  const { user } = useAuth();

  return (
    <div className="lp-page">
      <nav className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="RISA home">
          <span className="lp-brand-mark">R</span>
          <span className="lp-brand-name">RISA</span>
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

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-hero-kicker">Made for everyday retail in Kenya</p>

            <h1>Know what you sold, what is left, and what is in the till.</h1>

            <p className="lp-hero-lead">
              RISA is the shop system built around how Kenyan shops really sell:
              loose sugar by the quarter kilo, packaged goods by the piece. Record
              every sale at the counter and see your stock and cash clearly, all
              day long.
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
                No barcode scanner needed
              </li>
            </ul>
          </div>

          <div
            className="lp-hero-visual"
            role="img"
            aria-label="Illustration of a sample sales slip from a RISA shop"
          >
            <div className="lp-slip">
              <div className="lp-slip-paper">
                <div className="lp-slip-head">
                  <span className="lp-slip-mark">R</span>
                  <div>
                    <strong>RISA</strong>
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

                <p className="lp-slip-foot">Sale recorded. Stock and sales updated.</p>
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
            Designed for Kenyan shops
          </div>
          <div>
            <span className="lp-strip-icon" aria-hidden="true">▤</span>
            Sells packaged and loose goods
          </div>
          <div>
            <span className="lp-strip-icon" aria-hidden="true">◎</span>
            Clear records, every day
          </div>
        </section>

        <section className="lp-features" id="features">
          <header className="lp-section-head">
            <h2>Built around the questions shop owners ask every day.</h2>
            <p>
              Your sales, stock, staff and cash all need attention. RISA brings
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
              <h3>Selling sugar by the quarter kilo?</h3>
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
                Every purchase, sale, damage and correction is recorded, so you
                can see why a number changed.
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
              <h2>Simple at the counter. Useful long after the sale.</h2>
              <p>
                RISA follows a real retail day, from serving a customer to
                checking stock and reviewing what happened in your shop.
              </p>
            </div>

            <ol className="lp-steps">
              <li>
                <span className="lp-step-num">1</span>
                <div>
                  <strong>At the counter</strong>
                  <p>Record everyday sales, loose and packaged products alike.</p>
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
                  <p>Use your records to see clearly how the day went.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {!user && (
          <section className="lp-final">
            <div className="lp-final-copy">
              <h2>Give your shop a clearer way to sell.</h2>
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
                Already using RISA? <Link to="/login">Log in</Link>
              </span>
            </div>
          </section>
        )}
      </main>

      <footer className="lp-footer">
        <Link to="/" className="lp-footer-brand">RISA</Link>
        <p>Built for Kenyan micro-retail.</p>
        <span className="lp-footer-note">A clearer view of your everyday business.</span>
      </footer>
    </div>
  );
}

export default Landing;