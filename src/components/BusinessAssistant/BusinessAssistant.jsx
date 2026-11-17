import { useState } from "react";
import { createPortal } from "react-dom";
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
    <>
      <aside className="business-assistant" aria-label="AI business assistant">
        <button
          className="business-assistant-toggle"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          aria-expanded={open}
          aria-controls={open ? "business-assistant-panel" : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
            <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
          </svg>
          <span>Ask AI</span>
        </button>
      </aside>
      {open && createPortal(
        <div className="business-assistant-panel" id="business-assistant-panel">
          <div className="business-assistant-heading">
            <div>
              <span className="business-assistant-kicker">SHOP INTELLIGENCE</span>
              <h2>How can I help?</h2>
              <p>Ask about using the system or your shop's performance.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close AI assistant">×</button>
          </div>
          <div className="business-assistant-prompts">
            {QUICK_QUESTIONS.map((item) => (
              <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>
            ))}
          </div>
          {answer && (
            <div className="business-assistant-answer" aria-live="polite">
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
        </div>,
        document.body,
      )}
    </>
  );
}

export default BusinessAssistant;
