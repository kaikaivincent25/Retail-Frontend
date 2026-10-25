import { useEffect, useState } from "react";
import { getPeriodSummary } from "../../services/reportsApi";
import { getReceiptProfile } from "../../services/profileApi";
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
  { key: "total_sales", label: "Sales revenue", symbol: "↗", format: formatCurrency },
  { key: "cost_of_goods_sold", label: "Cost of goods sold", symbol: "−", format: formatCurrency },
  { key: "gross_profit", label: "Gross profit", symbol: "◈", format: formatCurrency },
  { key: "expense_total", label: "Expenses", symbol: "−", format: formatCurrency },
  { key: "staff_consumption_total", label: "Staff consumption cost", symbol: "↘", format: formatCurrency },
  { key: "damage_total", label: "Stock write-offs", symbol: "−", format: formatCurrency },
  { key: "transaction_count", label: "Transactions", symbol: "#", format: (value) => value.toLocaleString() },
  { key: "estimated_profit", label: "Estimated net profit", symbol: "=", format: formatCurrency },
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
  const [shopProfile, setShopProfile] = useState(null);

  useEffect(() => {
    getReceiptProfile()
      .then((data) => setShopProfile(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    Promise.resolve()
      .then(() => {
        if (!isCurrentRequest) return null;
        setLoading(true);
        setError("");
        return getPeriodSummary(startDate, endDate);
      })
      .then((data) => {
        if (!data) return;
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
  const lossMakingProducts = report?.loss_making_products ?? [];
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
      <header className="reports-print-header" aria-hidden="true">
        <div className="reports-print-header-top">
          <div className="reports-print-shop">
            <h1 className="reports-print-shop-name">{shopProfile?.name || "Retail Shop"}</h1>
            {shopProfile?.location && <p className="reports-print-shop-location">{shopProfile.location}</p>}
          </div>
          <div className="reports-print-doc-meta">
            <span className="reports-print-badge">Financial Report</span>
            <p className="reports-print-timestamp">
              Printed {new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="reports-print-title-bar">
          <h2>Business Performance &amp; Insights</h2>
          <span className="reports-print-period">
            Reporting Period: {formatShortDate(startDate)} – {formatShortDate(endDate)}
          </span>
        </div>
      </header>
      <section className="reports-hero" aria-labelledby="reports-title">
        <div className="reports-hero-content">
          <span className="reports-eyebrow">YOUR BUSINESS, AT A GLANCE</span>
          <h1 id="reports-title">Reports &amp; insights</h1>
          <p>Understand sales, cash expenses, and staff stock use as separate business costs.</p>
        </div>
        <div className="reports-hero-actions">
          <div className="reports-hero-note">
            <span className="reports-note-dot" />
            <span className="reports-note-copy">
              <strong>Sales after expenses</strong>
              <small>{formatShortDate(startDate)} - {formatShortDate(endDate)}</small>
            </span>
          </div>
          <button
            className="reports-print-button"
            type="button"
            onClick={() => window.print()}
            disabled={loading || !report}
          >
            Print report
          </button>
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
          <div className="reports-section-intro">
            <div>
              <span>PERFORMANCE SNAPSHOT</span>
              <h2>Business at a glance</h2>
            </div>
            <p>Key figures for the selected reporting period.</p>
          </div>
          <section
            className={`profit-status profit-status--${report.cost_data_complete ? report.profit_status : "incomplete"}`}
            aria-live="polite"
          >
            <strong>
              {!report.cost_data_complete ? "Profit or loss is incomplete" :
                report.profit_status === "profit" ? "This period shows a profit" :
                  report.profit_status === "loss" ? "This period shows a loss" : "This period breaks even"}
            </strong>
            <span>
              {!report.cost_data_complete
                ? "Some sold items had no recorded cost. Update stock costs for a reliable result."
                : "Estimated net profit includes cost of goods sold, recorded expenses, staff use, and stock write-offs."}
            </span>
          </section>
          <section className="period-comparison" aria-label="Comparison with the previous period">
            <div>
              <span className="comparison-eyebrow">PREVIOUS EQUAL PERIOD</span>
              <strong>{formatShortDate(report.comparison.start_date)} - {formatShortDate(report.comparison.end_date)}</strong>
            </div>
            <div>
              <span>Sales</span>
              <strong className={Number(report.comparison.sales_change) >= 0 ? "comparison-positive" : "comparison-negative"}>
                {Number(report.comparison.sales_change) >= 0 ? "+" : "−"}{formatCurrency(Math.abs(Number(report.comparison.sales_change)))}
              </strong>
              <small>{report.comparison.sales_change_percent == null
                ? "No earlier sales to compare"
                : `${Number(report.comparison.sales_change_percent) >= 0 ? "+" : "−"}${Math.abs(Number(report.comparison.sales_change_percent)).toFixed(1)}%`}</small>
            </div>
            <div>
              <span>Estimated net profit</span>
              <strong className={report.cost_data_complete && report.comparison.cost_data_complete
                ? Number(report.comparison.profit_change) >= 0 ? "comparison-positive" : "comparison-negative"
                : "comparison-unavailable"}>
                {report.cost_data_complete && report.comparison.cost_data_complete
                  ? `${Number(report.comparison.profit_change) >= 0 ? "+" : "−"}${formatCurrency(Math.abs(Number(report.comparison.profit_change)))}`
                  : "Incomplete cost data"}
              </strong>
              {(!report.cost_data_complete || !report.comparison.cost_data_complete) && (
                <small>Both periods need recorded costs for comparison</small>
              )}
            </div>
          </section>

          {(report.low_stock_count > 0 || lossMakingProducts.length > 0) && (
            <section className="report-actions-panel" aria-label="Business actions">
              <strong>Items to review</strong>
              {report.low_stock_count > 0 && (
                <p>
                  {report.low_stock_count} item{report.low_stock_count === 1 ? " is" : "s are"} at or below reorder level.
                  <a href="/inventory"> Review inventory</a>
                </p>
              )}
              {lossMakingProducts.length > 0 && (
                <div>
                  <span>Sold below recorded cost:</span>
                  {lossMakingProducts.map((product) => (
                    <span className="loss-product-chip" key={product.variant_id}>
                      {product.variant_name} ({formatCurrency(Number(product.gross_profit))} gross loss)
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
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
                <span className="metric-caption">
                  {metric.key === "transaction_count" && report.transaction_count > 0
                    ? `Avg sale: ${formatCurrency(Number(report.total_sales || 0) / report.transaction_count)}`
                    : "For selected period"}
                </span>
              </article>
            ))}
          </section>

          <section className="reports-grid">
            <article className="report-section sales-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">DAILY CASH POSITION</span>
                  <h2>Sales less cash expenses</h2>
                  <p>Gross sales less cash expenses. Staff stock use is reported separately.</p>
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
                      <strong>{formatCurrency(Number(bestDay?.net_sales || 0))}</strong>
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
                  <div className="reports-daily-table-wrap">
                    <table className="reports-daily-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th className="cell-num">Sales Revenue</th>
                          <th className="cell-num">Cash Expenses</th>
                          <th className="cell-num">Staff Use</th>
                          <th className="cell-num">Net Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyBreakdown.map((day) => {
                          const gross = Number(day.total || 0);
                          const exp = Number(day.expense_total || 0);
                          const staff = Number(day.staff_consumption_total || 0);
                          const net = Number(day.net_sales || 0);
                          return (
                            <tr key={day.date}>
                              <td>{formatShortDate(day.date)}</td>
                              <td className="cell-num">{formatCurrency(gross)}</td>
                              <td className="cell-num">{formatCurrency(exp)}</td>
                              <td className="cell-num">{formatCurrency(staff)}</td>
                              <td className={`cell-num ${net < 0 ? "cell-negative" : "cell-positive"}`}>
                                {formatCurrency(net)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="reports-table-total-row">
                          <td><strong>Total ({dailyBreakdown.length} days)</strong></td>
                          <td className="cell-num"><strong>{formatCurrency(dailyBreakdown.reduce((s, d) => s + Number(d.total || 0), 0))}</strong></td>
                          <td className="cell-num"><strong>{formatCurrency(dailyBreakdown.reduce((s, d) => s + Number(d.expense_total || 0), 0))}</strong></td>
                          <td className="cell-num"><strong>{formatCurrency(dailyBreakdown.reduce((s, d) => s + Number(d.staff_consumption_total || 0), 0))}</strong></td>
                          <td className="cell-num"><strong>{formatCurrency(dailyBreakdown.reduce((s, d) => s + Number(d.net_sales || 0), 0))}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </article>

            <article className="report-section products-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">WHAT CUSTOMERS LOVE</span>
                  <h2>Top products</h2>
                  <p>Ranked by units sold, with revenue and gross profit.</p>
                </div>
                <span className="ranking-badge">{topProducts.length} products</span>
              </div>
              {topProducts.length === 0 ? (
                <p className="empty-hint">No product sales to show for this period yet.</p>
              ) : (
                <>
                  <div className="reports-products-table-wrap">
                    <table className="reports-products-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Product / Variant</th>
                          <th className="cell-num">Sold</th>
                          <th className="cell-num">Revenue</th>
                          <th className="cell-num">Gross Profit</th>
                          <th className="cell-num">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, index) => {
                          const quantity = Number(product.quantity_sold || 0);
                          const revenue = Number(product.revenue || 0);
                          const profit = Number(product.gross_profit || 0);
                          return (
                            <tr key={product.variant_id}>
                              <td>{index + 1}</td>
                              <td><strong>{product.variant_name}</strong></td>
                              <td className="cell-num">{quantity.toLocaleString()}</td>
                              <td className="cell-num">{formatCurrency(revenue)}</td>
                              <td className={`cell-num ${profit < 0 ? "cell-negative" : "cell-positive"}`}>
                                {formatCurrency(profit)}
                              </td>
                              <td className="cell-num">
                                {product.cost_data_complete && product.gross_margin_percent != null
                                  ? `${Number(product.gross_margin_percent).toFixed(1)}%`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                            <div className="product-profitline">
                              <span>Revenue {formatCurrency(Number(product.revenue || 0))}</span>
                              <span className={Number(product.gross_profit) < 0 ? "comparison-negative" : "comparison-positive"}>
                                {product.cost_data_complete
                                  ? `Gross profit ${formatCurrency(Number(product.gross_profit || 0))} · ${product.gross_margin_percent == null ? "Margin n/a" : `${Number(product.gross_margin_percent).toFixed(1)}% margin`}`
                                  : "Margin incomplete"}
                              </span>
                            </div>
                            <div className="product-progress" aria-hidden="true">
                              <span style={{ width: `${(quantity / maxProductQuantity) * 100}%` }} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </>
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

          <footer className="reports-print-footer" aria-hidden="true">
            <p>
              Confidential Business Summary · {shopProfile?.name || "Retail Shop"} · For Owner / Management Use Only
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

export default Reports;
