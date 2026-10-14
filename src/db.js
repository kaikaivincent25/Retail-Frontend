import Dexie from 'dexie'

export const db = new Dexie('dukaos')

db.version(1).stores({
  // first name is the primary key; the rest are indexed fields
  variants: 'id, name',          // add other fields you search by (e.g. barcode)
  outbox: 'id, status, createdAt'
})

// --- Catalog ---
export async function refreshCatalog(items) {
  const records = items.map((item) => ({
    ...item,
    id: item.variant_id,
    name: item.variant_name,
  }))
  await db.transaction('rw', db.variants, async () => {
    await db.variants.clear()
    await db.variants.bulkPut(records)
  })
}

export function clearCatalog() {
  return db.variants.clear()
}

export function searchVariants(term) {
  const t = term.trim().toLowerCase()
  if (!t) return db.variants.toArray()
  return db.variants.filter(v =>
    `${v.product_name} ${v.variant_name}`.toLowerCase().includes(t)
  ).toArray()
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