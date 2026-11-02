import { useEffect, useState } from "react";
import api from "../../services/api";
import "./Billing.css";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function Billing() {
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/billing"), api.get("/billing/plans")])
      .then(([billingResponse, plansResponse]) => {
        setBilling(billingResponse.data);
        setPlans(plansResponse.data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Could not load billing details.");
      });
  }, []);

  if (error) return <div className="billing-page"><div className="billing-error">{error}</div></div>;
  if (!billing) return <div className="billing-page"><p className="billing-loading">Loading billing…</p></div>;

  return (
    <div className="billing-page">
      <header className="billing-heading">
        <div>
          <span className="billing-eyebrow">SUBSCRIPTION</span>
          <h1>Plans and billing</h1>
          <p>Choose the plan that fits your shop as it grows.</p>
        </div>
        <div className="billing-status-card">
          <span>{billing.status === "trialing" ? "Free trial" : billing.status}</span>
          <strong>{billing.days_remaining} days remaining</strong>
          <small>{billing.active_users} active user{billing.active_users === 1 ? "" : "s"}</small>
        </div>
      </header>

      <section className="billing-current-card">
        <div>
          <span className="billing-card-label">CURRENT PLAN</span>
          <h2>{billing.plan.name}</h2>
          <p>{billing.status === "trialing" ? "You are using the full Business plan during your 45-day free trial." : "Your shop subscription and feature access."}</p>
        </div>
        <div className="billing-current-price">
          <strong>{money.format(billing.plan.monthly_price)}</strong>
          <span>per month after trial</span>
        </div>
      </section>

      <section className="billing-plans-section">
        <div className="billing-section-heading">
          <div><span className="billing-card-label">PLANS</span><h2>Grow at your own pace</h2></div>
          <small>Payments will be enabled through the billing checkout.</small>
        </div>
        <div className="billing-plan-grid">
          {plans.map((plan) => (
            <article className={`billing-plan-card ${plan.code === billing.plan.code ? "is-current" : ""}`} key={plan.code}>
              {plan.code === billing.plan.code && <span className="billing-current-badge">Current</span>}
              <h3>{plan.name}</h3>
              <div className="billing-plan-price">{money.format(plan.monthly_price)}<small>/month</small></div>
              <p>{plan.max_users ? `Up to ${plan.max_users} active users` : "Unlimited active users"}</p>
              <ul>
                {Object.entries(plan.features).filter(([, enabled]) => enabled).map(([feature]) => (
                  <li key={feature}>{feature.replaceAll(".", " ")}</li>
                ))}
              </ul>
              <button type="button" disabled={plan.code === billing.plan.code}>
                {plan.code === billing.plan.code ? "Current plan" : "Choose plan"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Billing;
