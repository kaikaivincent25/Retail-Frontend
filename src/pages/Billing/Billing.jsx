import { useEffect, useState } from "react";
import api from "../../services/api";
import "./Billing.css";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const PLAN_DETAILS = {
  free: {
    tagline: "Start selling and keep your shop organized at no cost.",
    audience: "For getting started",
  },
  starter: {
    tagline: "Add more day-to-day control as your shop grows.",
    audience: "For small teams",
  },
  business: {
    tagline: "Turn shop activity into clearer business decisions.",
    audience: "For growing shops",
  },
  pro: {
    tagline: "Give a larger team more room to work together.",
    audience: "For larger teams",
  },
};

const FEATURE_LABELS = {
  "reports.basic": "Daily sales snapshot",
  "inventory.reports": "Stock insights",
  expenses: "Expense tracking",
  "reports.full": "Detailed sales and profitability reports",
  "reports.export": "Print-ready report summaries",
  "audit.logs": "Activity history",
  "mpesa.tools": "M-Pesa payment tools",
  online_store: "Public storefront and online orders",
};

function planFeatures(plan) {
  return Object.entries(plan.features || {})
    .filter(([key, enabled]) => enabled && FEATURE_LABELS[key])
    .map(([key]) => FEATURE_LABELS[key]);
}

function Billing() {
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [startingTrial, setStartingTrial] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [resumingTrial, setResumingTrial] = useState(false);

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

  const canStartTrial =
    billing?.plan.code === "free" && !billing.trial_used && !billing.trial_ends_at;

  async function startTrial() {
    setStartingTrial(true);
    setError("");
    try {
      const response = await api.post("/billing/start-trial");
      setBilling(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not start the free trial.");
    } finally {
      setStartingTrial(false);
    }
  }

  async function startMpesaCheckout(plan) {
    if (!phoneNumber.trim()) {
      setError("Enter the M-Pesa number that should approve this payment.");
      document.getElementById("billing-phone-number")?.focus();
      return;
    }
    setCheckoutPlan(plan.code);
    setError("");
    setPaymentMessage("");
    try {
      const response = await api.post("/billing/mpesa/checkout", {
        plan_code: plan.code,
        phone_number: phoneNumber,
      });
      setPaymentMessage(response.data.message);
      let paymentResolved = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusResponse = await api.get(`/billing/mpesa/payments/${response.data.payment_id}`);
        if (statusResponse.data.status === "completed") {
          paymentResolved = true;
          setPaymentMessage(`Payment confirmed. ${statusResponse.data.plan_name} is now active.`);
          const billingResponse = await api.get("/billing");
          setBilling(billingResponse.data);
          break;
        }
        if (statusResponse.data.status === "failed") {
          paymentResolved = true;
          setError("M-Pesa did not complete the payment. You can try again.");
          break;
        }
      }
      if (!paymentResolved) {
        setPaymentMessage("Your payment is still processing. Refresh this page before trying again to avoid a duplicate payment.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not start the M-Pesa payment.");
    } finally {
      setCheckoutPlan("");
    }
  }

  async function cancelPlan() {
    const confirmation = billing.status === "trialing"
      ? "Cancel your trial? Your Business features will remain available until the original trial end date. You can resume the trial before then, and payment will only be available after the trial ends."
      : "Move this shop to the Free plan? Sales, products, and inventory will remain available.";
    if (!window.confirm(confirmation)) return;
    setCanceling(true);
    setError("");
    try {
      const response = await api.post("/billing/cancel");
      setBilling(response.data);
      setPaymentMessage(billing.status === "trialing"
        ? "Trial cancellation scheduled. Your trial access remains active until its original end date."
        : "Your shop is now on the Free plan. Sales, products, and inventory remain available.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not change your plan.");
    } finally {
      setCanceling(false);
    }
  }

  async function resumeTrial() {
    setResumingTrial(true);
    setError("");
    try {
      const response = await api.post("/billing/resume-trial");
      setBilling(response.data);
      setPaymentMessage("Your Business trial is active again through its original end date.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not resume your trial.");
    } finally {
      setResumingTrial(false);
    }
  }

  if (error && !billing) {
    return <main className="billing-page"><div className="billing-error" role="alert">{error}</div></main>;
  }
  if (!billing) {
    return <main className="billing-page"><p className="billing-loading" role="status">Loading your plan details…</p></main>;
  }

  const isFreePlan = billing.plan.code === "free";
  const isTrialing = billing.status === "trialing";
  const trialCancellationPending = isTrialing && Boolean(billing.canceled_at);
  const currentStatus = isTrialing
    ? trialCancellationPending ? "Trial ending" : "Free trial"
    : isFreePlan
      ? "Free plan"
      : billing.status.replaceAll("_", " ");
  const currentPeriodDescription = isTrialing
    ? trialCancellationPending
      ? `${billing.days_remaining} days left · cancellation scheduled`
      : `${billing.days_remaining} days left in your trial`
    : isFreePlan
      ? "No expiry · core shop tools stay available"
      : billing.status === "active"
        ? `${billing.days_remaining} days in this billing period`
        : "Review your plan options below";

  return (
    <main className="billing-page">
      <header className="billing-heading">
        <div className="billing-heading-copy">
          <span className="billing-eyebrow">SIMPLE, FLEXIBLE PLANS</span>
          <h1>Plans that grow with your shop</h1>
          <p>Start free, then add more tools and team capacity when you need them.</p>
        </div>
        <aside className="billing-status-card" aria-label="Current subscription status">
          <span className="billing-status-label">YOUR PLAN</span>
          <strong>{currentStatus}</strong>
          <small>{currentPeriodDescription}</small>
          <small>{billing.active_users} active team member{billing.active_users === 1 ? "" : "s"}</small>
        </aside>
      </header>

      <section className="billing-core-promise" aria-label="Features included on every plan">
        <div className="billing-core-icon" aria-hidden="true">✓</div>
        <div>
          <h2>Core shop tools are always free</h2>
          <p>Make sales, add products, and manage inventory on the Free plan. These essentials stay available without a paid subscription.</p>
        </div>
        <ul>
          <li>Sales &amp; checkout</li>
          <li>Product catalog</li>
          <li>Inventory management</li>
        </ul>
      </section>

      <section className="billing-current-card" aria-label="Current plan details">
        <div className="billing-current-copy">
          <span className="billing-card-label">CURRENT PLAN</span>
          <h2>{billing.plan.name}</h2>
          <p>
            {isTrialing
              ? trialCancellationPending
                ? "Your trial remains active until its original end date. Resume it here any time before then; paid plans become available only after the trial ends."
                : "Your trial includes Business plan access. You can cancel and resume it until the original end date; paid plans become available only after the trial ends."
              : PLAN_DETAILS[billing.plan.code]?.tagline || "Your shop plan and included features."}
          </p>
        </div>
        <div className="billing-current-price">
          <strong>{isFreePlan ? "Free" : money.format(billing.plan.monthly_price)}</strong>
          {!isFreePlan && <span>per month</span>}
          {canStartTrial && (
            <button type="button" className="billing-trial-button" onClick={startTrial} disabled={startingTrial}>
              {startingTrial ? "Starting your trial…" : "Try Business free for 45 days"}
            </button>
          )}
          {isTrialing && !trialCancellationPending && (
            <button type="button" className="billing-cancel-button" onClick={cancelPlan} disabled={canceling}>
              {canceling ? "Updating trial…" : "Cancel trial"}
            </button>
          )}
          {trialCancellationPending && (
            <button type="button" className="billing-trial-button" onClick={resumeTrial} disabled={resumingTrial}>
              {resumingTrial ? "Resuming trial…" : "Resume trial"}
            </button>
          )}
          {!isFreePlan && !isTrialing && (
            <button type="button" className="billing-cancel-button" onClick={cancelPlan} disabled={canceling}>
              {canceling ? "Updating plan…" : "Switch to Free"}
            </button>
          )}
        </div>
      </section>

      <section className="billing-plans-section" aria-labelledby="billing-plans-title">
        <div className="billing-section-heading">
          <div>
            <span className="billing-card-label">CHOOSE YOUR NEXT STEP</span>
            <h2 id="billing-plans-title">Compare plans</h2>
            <p>All prices are in Kenyan shillings and billed monthly.</p>
          </div>
          <label className="billing-phone-field" htmlFor="billing-phone-number">
            <span>M-Pesa number</span>
            <input
              id="billing-phone-number"
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="0712 345 678"
              inputMode="tel"
              aria-describedby="billing-phone-help"
            />
            <small id="billing-phone-help">You’ll approve the payment on your phone.</small>
          </label>
        </div>

        {error && <div className="billing-error" role="alert">{error}</div>}
        {paymentMessage && <div className="billing-success" role="status">{paymentMessage}</div>}

        <div className="billing-plan-grid">
          {plans.map((plan) => {
            const isCurrent = plan.code === billing.plan.code && (billing.status === "active" || isTrialing);
            const isRecommended = plan.code === "business";
            const isLockedDuringTrial = isTrialing && !isCurrent;
            const isPaid = plan.code !== "free";
            const features = planFeatures(plan);
            const planDescription = PLAN_DETAILS[plan.code];
            const teamSize = plan.max_users
              ? `Up to ${plan.max_users} active team members`
              : "Unlimited team members";
            let buttonLabel = isCurrent
              ? "Current plan"
              : isLockedDuringTrial
                ? "Plan changes locked during trial"
                : checkoutPlan === plan.code
                  ? "Waiting for M-Pesa approval…"
                  : `Choose ${plan.name}`;

            if (isTrialing && isCurrent) buttonLabel = "Business trial active";

            return (
              <article
                className={`billing-plan-card${isCurrent ? " is-current" : ""}${isRecommended ? " is-recommended" : ""}`}
                key={plan.code}
              >
                <div className="billing-plan-badges">
                  {isRecommended && <span className="billing-recommended-badge">MOST POPULAR</span>}
                  {isCurrent && <span className="billing-current-badge">YOUR PLAN</span>}
                </div>
                <span className="billing-plan-audience">{planDescription?.audience || "Flexible plan"}</span>
                <h3>{plan.name}</h3>
                <p className="billing-plan-tagline">{planDescription?.tagline || "Tools to help your shop run smoothly."}</p>
                <div className="billing-plan-price">
                  <strong>{money.format(plan.monthly_price)}</strong>
                  <span>/ month</span>
                </div>
                <div className="billing-plan-team">{teamSize}</div>
                <div className="billing-plan-includes">Everything you need to run your shop, plus:</div>
                <ul className="billing-feature-list">
                  {features.length > 0
                    ? features.map((feature) => <li key={feature}>{feature}</li>)
                    : <li>Core sales, products, and inventory</li>}
                </ul>
                {isPaid ? (
                  <button
                    type="button"
                    className="billing-plan-button"
                    disabled={isCurrent || isLockedDuringTrial || Boolean(checkoutPlan)}
                    onClick={() => startMpesaCheckout(plan)}
                  >
                    {buttonLabel}
                  </button>
                ) : (
                  <div className="billing-free-plan-note">
                    {isCurrent ? "You’re already on Free" : "Switch to Free using the button above"}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <p className="billing-payment-note">Payments are made securely through M-Pesa. Your plan changes after payment is confirmed.</p>
      </section>
    </main>
  );
}

export default Billing;
