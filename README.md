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

Cash sales are saved in the browser's IndexedDB outbox when the device is
offline or a request loses its connection. The app sends them when the server
is reachable again and uses a stable client ID to avoid duplicate sales.
Offline checkout requires a previously cached active till and product catalog.
M-Pesa checkout and catalog or till changes still require a connection.

Product images are stored as an optional URL on each product and are shared by
its variants. Add or change an image from the Products page; use a stable,
publicly reachable HTTPS image URL.

To inspect the local database in Chrome, open the app from `npm run dev`, then
open DevTools > Application > IndexedDB > `dukaos`. The `variants` store is
populated after the Sales page loads while online. The `outbox` store holds
cash sales until sync succeeds. Reloading the page preserves IndexedDB data.
