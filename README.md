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
its variants. From the Products page, upload a JPG, PNG, or WebP photo (up to
5 MB) directly to the configured Supabase Storage bucket using a signed URL,
or paste a public HTTPS image URL. The bucket must allow public reads for
uploaded images to appear on public shop pages. Never put the Supabase secret
or service-role key in frontend configuration.

The Sales page's **Recommended now** view prioritizes products assigned to the
Breakfast or Evening staples group and interleaves product groups during the
afternoon. Assign a group when creating or editing a product; Popular remains
based on recorded sales, and All Items remains searchable. Shop admins can
adjust the recommendation times in Profile > Manage shop settings. Times use
the cashier device's local clock. No barcode scanner is needed for this
feature.

To inspect the local database in Chrome, open the app from `npm run dev`, then
open DevTools > Application > IndexedDB > `dukaos`. The `variants` store is
populated after the Sales page loads while online. The `outbox` store holds
cash sales until sync succeeds. Reloading the page preserves IndexedDB data.
