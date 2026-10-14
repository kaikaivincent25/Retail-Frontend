import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../db";
import { syncOutbox } from "../sync";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { useOnline } from "../hooks/useOnline";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../services/errorHandling";

export default function SyncStatus() {
  const online = useOnline();
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const countPending = useCallback(
    () => db.outbox.where("status").equals("pending").count(),
    []
  );
  const countRejected = useCallback(
    () => db.outbox.where("status").equals("rejected").count(),
    []
  );
  const pending = useLiveQuery(countPending, 0);
  const rejected = useLiveQuery(countRejected, 0);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncOutbox();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  let cls = "sync-ok";
  let text = "All synced";
  let action = null;

  if (rejected > 0) {
    cls = "sync-bad";
    text = `${rejected} sale${rejected === 1 ? "" : "s"} need${rejected === 1 ? "s" : ""} attention`;
    action = <Link to="/sync-issues">Review</Link>;
  } else if (!online) {
    cls = "sync-off";
    text = pending > 0
      ? `Offline, ${pending} sale${pending === 1 ? "" : "s"} saved on this device`
      : "Offline. Sales are saved on this device";
  } else if (pending > 0) {
    cls = "sync-wait";
    text = `${pending} sale${pending === 1 ? "" : "s"} waiting to sync`;
    action = (
      <button type="button" onClick={handleSync} disabled={syncing}>
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    );
  }

  return (
    <div className={`sync-badge ${cls}`} role="status" aria-live="polite">
      <span>{text}</span>
      {action}
    </div>
  );
}
