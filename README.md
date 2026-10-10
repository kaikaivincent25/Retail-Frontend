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
