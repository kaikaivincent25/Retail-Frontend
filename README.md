# Retail frontend

This React/Vite application is the browser client for the Retail Shop
Information System. For full setup, backend configuration, PostgreSQL,
migrations, test, and deployment instructions, see the repository
[README](../README.md).

For local development, copy `.env.example` to `.env.local`, set `VITE_API_URL`
to the backend URL (normally `http://127.0.0.1:8000`), install dependencies
with `npm ci`, then run `npm run dev`.

Run `npm run lint` and `npm run build` to check the frontend. Do not place
credentials or other secrets in `VITE_*` variables; Vite includes them in the
browser bundle.

The sales outbox is experimental and disabled by default: cash sales continue
to POST to the server. To test local queuing, set `VITE_QUEUE_SALES=true` in
`.env.local` and restart the Vite dev server. Queued sales remain on this
browser and are not sent to the server until the sync engine is implemented;
do not enable this for the live shop.

To inspect the local database in Chrome, open the app from `npm run dev`, then
open DevTools > Application > IndexedDB > `dukaos`. The `variants` store is
populated after the Sales page loads while online. Enable the Network panel's
Offline option, use All Items to search, and queue a cash sale with
`VITE_QUEUE_SALES=true` to inspect a pending outbox record. Reloading the page
preserves IndexedDB data.
