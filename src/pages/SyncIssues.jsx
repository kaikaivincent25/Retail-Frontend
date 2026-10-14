import { useCallback } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db";
import { syncOutbox } from "../sync";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../services/errorHandling";
import "./SyncIssues.css";

export default function SyncIssues() {
  const getRejectedItems = useCallback(
    () => db.outbox.where("status").equals("rejected").sortBy("createdAt"),
    []
  );
  const items = useLiveQuery(getRejectedItems, []);
  const { showToast } = useToast();

  async function retry(id) {
    try {
      await db.outbox.update(id, {
        status: "pending",
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
      });
      await syncOutbox();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    }
  }

  async function discard(id) {
    if (!window.confirm("Discard this sale? It will NOT be recorded on the server.")) {
      return;
    }
    try {
      await db.outbox.delete(id);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    }
  }

  if (!items.length) return <p className="sync-issues-empty">Nothing needs attention.</p>;

  return (
    <section className="sync-issues-page">
      <h2>Sales that could not sync</h2>
      <p className="sync-issues-intro">
        These sales were rejected by the server. Review each reason before retrying or discarding.
      </p>
      <div className="sync-issues-list">
        {items.map((item) => (
          <article key={item.id} className="issue-card">
            <p><strong>{new Date(item.createdAt).toLocaleString()}</strong></p>
            <p>Reason: {item.lastError || "The server rejected this sale without a reason."}</p>
            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
            <div className="issue-actions">
              <button type="button" className="issue-retry" onClick={() => retry(item.id)}>
                Retry
              </button>
              <button type="button" className="issue-discard" onClick={() => discard(item.id)}>
                Discard
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
