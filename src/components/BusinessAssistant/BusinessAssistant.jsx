import { useState } from "react";
import { askBusinessAssistant } from "../../services/catalogApi";
import { extractErrorMessage } from "../../services/errorHandling";
import "./BusinessAssistant.css";

const QUICK_QUESTIONS = [
  "What should I restock first?",
  "What sold best in the last 30 days?",
  "How are my online orders doing?",
  "Give me a simple shop performance summary.",
];

function BusinessAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitQuestion(event) {
    event?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;
    setLoading(true);
    setError("");
    try {
      setAnswer(await askBusinessAssistant(cleanQuestion));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className={`business-assistant${open ? " is-open" : ""}`} aria-label="AI business assistant">
      {open && (
        <div className="business-assistant-panel">
          <div className="business-assistant-heading">
            <div>
              <span className="business-assistant-kicker">SHOP INTELLIGENCE</span>
              <h2>Ask your shop</h2>
              <p>Answers use your sales, stock, credit, and order data.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close AI assistant">×</button>
          </div>
          <div className="business-assistant-prompts">
            {QUICK_QUESTIONS.map((item) => (
              <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>
            ))}
          </div>
          {answer && (
            <div className="business-assistant-answer">
              <p>{answer.answer}</p>
              {answer.actions?.length > 0 && (
                <ul>{answer.actions.map((action) => <li key={action}>{action}</li>)}</ul>
              )}
            </div>
          )}
          {error && <div className="business-assistant-error" role="alert">{error}</div>}
          <form onSubmit={submitQuestion} className="business-assistant-form">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about sales, stock, orders, or credit..."
              rows={2}
              maxLength={1000}
            />
            <button type="submit" disabled={loading || !question.trim()}>{loading ? "Thinking..." : "Ask assistant"}</button>
          </form>
          <small className="business-assistant-note">AI suggestions are advisory. Confirm important decisions in the relevant page.</small>
        </div>
      )}
      <button className="business-assistant-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span aria-hidden="true">✦</span> {open ? "Close assistant" : "Ask your shop"}
      </button>
    </aside>
  );
}

export default BusinessAssistant;
