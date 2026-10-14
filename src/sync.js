import { db } from './db'
import api from './services/api'

const MAX_BACKOFF = 5 * 60 * 1000

function classify(err) {
  if (!err.response) return 'retry'

  const status = err.response.status
  if (status === 401) return 'auth'
  if (status === 408 || status === 429 || status >= 500) return 'retry'
  if (status >= 400 && status < 500) return 'reject'
  return 'retry'
}

async function drain() {
  const queue = await db.outbox.where('status').equals('pending').sortBy('createdAt')

  for (const item of queue) {
    if (item.nextAttemptAt && item.nextAttemptAt > Date.now()) break

    try {
      await api.post(
        '/sales',
        { ...item.payload, client_id: item.id },
        { timeout: 60000 },
      )
      await db.outbox.delete(item.id)
    } catch (err) {
      const kind = classify(err)

      if (kind === 'auth') break

      if (kind === 'reject') {
        await db.outbox.update(item.id, {
          status: 'rejected',
          lastError: err.response?.data?.detail ?? `HTTP ${err.response?.status}`,
        })
        continue
      }

      const attempts = item.attempts + 1
      const delay = Math.min(2000 * 2 ** attempts, MAX_BACKOFF)
      await db.outbox.update(item.id, {
        attempts,
        nextAttemptAt: Date.now() + delay,
      })
      break
    }
  }
}

export async function syncOutbox() {
  if (!navigator.onLine) return

  if (!navigator.locks) {
    await drain()
    return
  }

  await navigator.locks.request('outbox-sync', { ifAvailable: true }, async (lock) => {
    if (!lock) return
    await drain()
  })
}

function triggerSync() {
  syncOutbox().catch((err) => {
    console.error('Failed to sync the offline sales outbox.', err)
  })
}

export function startSync() {
  window.addEventListener('online', triggerSync)
  window.setInterval(triggerSync, 30000)
  triggerSync()
}
