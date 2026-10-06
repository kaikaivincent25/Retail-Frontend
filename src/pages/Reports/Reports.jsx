import { useEffect, useState } from "react";
import { getPeriodSummary } from "../../services/reportsApi";
import { formatCurrency } from "../../utils/money";
import "./Reports.css";

function isoDaysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const PRESETS = [
  { label: "Last 7 days", start: () => isoDaysAgo(6), end: () => isoDaysAgo(0) },
  { label: "Last 30 days", start: () => isoDaysAgo(29), end: () => isoDaysAgo(0) },
  {
    label: "This month",
    start: () => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    },
    end: () => isoDaysAgo(0),
  },
];

const METRICS = [
  { key: "total_sales", label: "Gross sales", symbol: "↗", format: formatCurrency },
  { key: "expense_total", label: "Expenses", symbol: "−", format: formatCurrency },
  { key: "net_sales", label: "Net sales", symbol: "=", format: formatCurrency },
  { key: "transaction_count", label: "Transactions", symbol: "#", format: (value) => value.toLocaleString() },
  { key: "estimated_profit", label: "Estimated profit", symbol: "◈", format: formatCurrency },
  { key: "low_stock_count", label: "Low stock items", symbol: "!", format: (value) => value.toLocaleString() },
];

function formatShortDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function Reports() {
  const [startDate, setStartDate] = useState(PRESETS[0].start());
  const [endDate, setEndDate] = useState(PRESETS[0].end());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrentRequest = true;
    setLoading(true);
    setError("");

    getPeriodSummary(startDate, endDate)
      .then((data) => {
        if (isCurrentRequest) setReport(data);
      })
      .catch((err) => {
        if (isCurrentRequest) {
          setReport(null);
          setError(err.response?.data?.detail || "Could not load report.");
        }
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [startDate, endDate]);

  function applyPreset(preset) {
    setStartDate(preset.start());
    setEndDate(preset.end());
  }

  const dailyBreakdown = report?.daily_breakdown ?? [];
  const topProducts = report?.top_products ?? [];
  const maxDaily = Math.max(...dailyBreakdown.map((day) => Math.abs(Number(day.net_sales || 0))), 1);
  const bestDay = dailyBreakdown.reduce(
    (best, day) => (Number(day.net_sales || 0) > Number(best?.net_sales || 0) ? day : best),
    null,
  );
  const averageDailySales = dailyBreakdown.length
    ? Number(report.net_sales || 0) / dailyBreakdown.length
    : 0;
  const maxProductQuantity = Math.max(...topProducts.map((product) => Number(product.quantity_sold || 0)), 1);
  const activePreset = PRESETS.find(
    (preset) => preset.start() === startDate && preset.end() === endDate,
  );

  return (
    <main className="reports-page">
      <section className="reports-hero" aria-labelledby="reports-title">
        <div className="reports-hero-content">
          <span className="reports-eyebrow">YOUR BUSINESS, AT A GLANCE</span>
          <h1 id="reports-title">Reports &amp; insights</h1>
          <p>Understand what is selling, track recorded expenses, and see your net sales with confidence.</p>
        </div>
        <div className="reports-hero-note">
          <span className="reports-note-dot" />
          <span>Sales after expenses</span>
        </div>
      </section>

      <section className="report-controls" aria-label="Report date range">
        <div className="range-heading">
          <span className="range-icon" aria-hidden="true">▦</span>
          <div>
            <strong>Reporting period</strong>
            <span>Choose a timeframe to explore</span>
          </div>
        </div>
        <div className="preset-list" aria-label="Quick date ranges">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={activePreset?.label === preset.label ? "is-active" : ""}
              type="button"
              aria-pressed={activePreset?.label === preset.label}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="date-fields">
          <label>
            <span>From</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <span className="date-separator" aria-hidden="true">—</span>
          <label>
            <span>To</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
      </section>

      {error && <div className="reports-error" role="alert">{error}</div>}

      {loading && (
        <div className="reports-status" role="status">
          <span className="reports-spinner" aria-hidden="true" />
          Updating your report…
        </div>
      )}

      {!loading && report && (
        <>
          <section className="summary-cards" aria-label="Key performance indicators">
            {METRICS.map((metric) => (
              <article className={`summary-card metric-${metric.key}`} key={metric.key}>
                <div className="metric-topline">
                  <span className="card-label">{metric.label}</span>
                  <span className="metric-symbol" aria-hidden="true">{metric.symbol}</span>
                </div>
                <strong className="card-value">
                  {metric.format(Number(report[metric.key] || 0))}
                </strong>
                <span className="metric-caption">For selected period</span>
              </article>
            ))}
          </section>

          <section className="reports-grid">
            <article className="report-section sales-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">DAILY CASH POSITION</span>
                  <h2>Daily net sales</h2>
                  <p>Gross sales less expenses recorded on each day.</p>
                </div>
                <span className="section-period">{formatShortDate(startDate)} – {formatShortDate(endDate)}</span>
              </div>

              {dailyBreakdown.length === 0 ? (
                <p className="empty-hint">No sales in this period. Try a different date range to see your performance.</p>
              ) : (
                <>
                  <div className="sales-insights">
                    <div>
                      <span>Daily average</span>
                      <strong>{formatCurrency(averageDailySales)}</strong>
                    </div>
                    <div>
                      <span>Best sales day</span>
                      <strong>{formatCurrency(Number(bestDay?.total || 0))}</strong>
                      {bestDay && <small>{formatShortDate(bestDay.date)}</small>}
                    </div>
                  </div>
                  <div className="daily-chart" role="img" aria-label={`Daily sales chart with ${dailyBreakdown.length} days`}>
                    {dailyBreakdown.map((day) => {
                      const total = Number(day.net_sales || 0);
                      const expenses = Number(day.expense_total || 0);
                      const barHeight = Math.max((Math.abs(total) / maxDaily) * 100, 3);
                      return (
                        <div
                          className="chart-bar-wrap"
                          key={day.date}
                          title={`${formatShortDate(day.date)}: net ${formatCurrency(total)} after ${formatCurrency(expenses)} expenses`}
                        >
                          <span className="chart-value">{formatCurrency(total)}</span>
                          <div className="chart-bar-track">
                            <div className={`chart-bar${total < 0 ? " is-negative" : ""}`} style={{ height: `${barHeight}%` }} />
                          </div>
                          <span className="chart-label">{formatShortDate(day.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </article>

            <article className="report-section products-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">WHAT CUSTOMERS LOVE</span>
                  <h2>Top products</h2>
                  <p>Your best performers, ranked by units sold.</p>
                </div>
                <span className="ranking-badge">{topProducts.length} products</span>
              </div>
              {topProducts.length === 0 ? (
                <p className="empty-hint">No product sales to show for this period yet.</p>
              ) : (
                <ol className="product-ranking">
                  {topProducts.map((product, index) => {
                    const quantity = Number(product.quantity_sold || 0);
                    return (
                      <li className="product-rank-row" key={product.variant_id}>
                        <span className={`rank-number ${index < 3 ? "rank-highlight" : ""}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="product-rank-detail">
                          <div className="product-rank-label">
                            <strong>{product.variant_name}</strong>
                            <span>{quantity.toLocaleString()} sold</span>
                          </div>
                          <div className="product-progress" aria-hidden="true">
                            <span style={{ width: `${(quantity / maxProductQuantity) * 100}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          </section>

          <nav className="report-shortcuts" aria-label="More reports">
            <a href="/reports/sales" className="report-shortcut">
              <span className="shortcut-icon" aria-hidden="true">↗</span>
              <span><strong>Sales transactions</strong><small>Review individual sales and receipts</small></span>
              <span className="shortcut-arrow" aria-hidden="true">→</span>
            </a>
            <a href="/reports/sessions" className="report-shortcut">
              <span className="shortcut-icon" aria-hidden="true">◷</span>
              <span><strong>Cash session history</strong><small>Explore register activity and totals</small></span>
              <span className="shortcut-arrow" aria-hidden="true">→</span>
            </a>
          </nav>
        </>
      )}
    </main>
  );
}

export default Reports;
