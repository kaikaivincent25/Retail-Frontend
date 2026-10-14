import Dexie from 'dexie'

export const db = new Dexie('dukaos')

db.version(1).stores({
  // first name is the primary key; the rest are indexed fields
  variants: 'id, name',          // add other fields you search by (e.g. barcode)
  outbox: 'id, status, createdAt'
})

// --- Catalog ---
export async function refreshCatalog(items) {
  await db.transaction('rw', db.variants, async () => {
    await db.variants.clear()
    await db.variants.bulkPut(items)
  })
}

export function searchVariants(term) {
  const t = term.trim().toLowerCase()
  if (!t) return db.variants.toArray()
  return db.variants.filter(v => v.name.toLowerCase().includes(t)).toArray()
}

// --- Outbox ---
export async function queueSale(payload) {
  const record = {
    id: crypto.randomUUID(),
    payload,                 // exactly what your POST /sales sends today
    status: 'pending',       // pending -> syncing -> (deleted on success) or failed
    createdAt: Date.now(),
    attempts: 0,
  }
  await db.outbox.add(record)
  return record
}

export function unsyncedCount() {
  return db.outbox.where('status').anyOf('pending', 'syncing', 'failed').count()
}