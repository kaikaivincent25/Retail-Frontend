import Dexie from 'dexie'

export const db = new Dexie('dukaos')

db.version(1).stores({
  // first name is the primary key; the rest are indexed fields
  variants: 'id, name',          // add other fields you search by (e.g. barcode)
  outbox: 'id, status, createdAt'
})

db.version(2).stores({
  variants: 'id, name',
  outbox: 'id, status, createdAt'
}).upgrade(async (transaction) => {
  await transaction.table('outbox').toCollection().modify((item) => {
    if (item.status === 'syncing' || item.status === 'failed') {
      item.status = 'pending'
    }
  })
})

db.version(3).stores({
  variants: 'id, name',
  outbox: 'id, status, createdAt',
  settings: 'key'
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

export async function clearShopData() {
  await db.transaction('rw', db.variants, db.outbox, db.settings, async () => {
    await db.variants.clear()
    await db.outbox.clear()
    await db.settings.clear()
  })
}

export function searchVariants(term) {
  const t = term.trim().toLowerCase()
  if (!t) return db.variants.toArray()
  return db.variants.filter(v =>
    `${v.product_name} ${v.variant_name}`.toLowerCase().includes(t)
  ).toArray()
}

export async function getCachedSession() {
  const entry = await db.settings.get('active-session')
  return entry?.token === localStorage.getItem('token') ? entry.session : null
}

export async function cacheSession(session) {
  if (!session) {
    await db.settings.delete('active-session')
    return
  }
  await db.settings.put({
    key: 'active-session',
    token: localStorage.getItem('token'),
    session,
  })
}

// --- Outbox ---
export async function queueSale(payload, id = crypto.randomUUID()) {
  const record = {
    id,
    payload,                 // exactly what your POST /sales sends today
    status: 'pending',
    createdAt: Date.now(),
    attempts: 0,
  }
  await db.outbox.add(record)
  return record
}

export function unsyncedCount() {
  return db.outbox.where('status').anyOf('pending', 'rejected').count()
}
