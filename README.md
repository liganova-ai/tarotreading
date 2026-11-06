This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Gate access and reading allowances

Register Oracle in Gate and configure server-only environment variables:

```ini
GATE_URL=https://credential-gate-jirby.vercel.app
GATE_APP_KEY=app_...
OPENAI_API_KEY=...
ORACLE_SESSION_SECRET=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Never prefix these with `NEXT_PUBLIC_`. Generate a random signing secret with at
least 43 characters. The old `ORACLE_PASSWORD` gate is no longer used. Local
development also requires Redis; security never falls back to process memory.

Users enter only the code issued by Gate. Gate identifies the administrator-assigned
person; Oracle never accepts a person ID from the browser. The Gate token stays
in an encrypted Redis session behind a Secure, HttpOnly, SameSite=Strict cookie.
The local session lasts at most two hours; re-entering the code never resets Gate's
shared expiry or usage. Gate revocation, expiry, invalid access, missing server
credentials and network failures block AI calls.

**One usage means one question attempt and its complete reading process.** After
cheap input checks, confirming a question consumes exactly one Gate usage. That
attempt includes question validation, one reading of three fixed cards, five speech
clips (welcome plus four sections), and translations of the three selected cards.
The last available usage can finish all of those steps even when remaining is zero.
A new question attempt requires another usage. Gate determines the allowance (3,
10, or any configured amount); Oracle has no separate ten-reading or daily limit.
Rejected AI question checks and AI failures count as attempts.

Each workflow has a browser UUID and a server-generated Gate request UUID, bound
to app, grant, question, personality choices and language. Write-once Redis records
and per-step locks prevent concurrent workers and retries from executing AI twice.
A retry returns a saved result, a pending response, or the saved failure. An uncertain
consumption never blindly calls AI again. Cards cannot be changed after generation;
speech and translation endpoints only operate on server-verified reading content.
Gate status is checked before operations, including cached responses. A small burst
limit protects endpoints without defining the user's reading allowance.

Workflow inputs, results, audio and Gate tokens are encrypted with AES-GCM and expire
with the grant. Redis keys use random grant/workflow identifiers, not questions or
codes. Reading content never enters browser URLs or persistent browser storage;
legacy local caches are removed. Keep the signing secret stable across deployments
so ongoing jobs and encrypted records can be resumed. Changing it signs everyone out.

Remaining readings and the shared expiry appear next to Sign out. Status polling
never consumes an allowance. Sign out deletes the local server session; it does not
refund usage, reset Gate's clock or revoke the code in other apps.

Production pages use per-request CSP nonces, no-store caching, anti-framing headers
and a no-referrer policy. Every paid handler rechecks access server-side. Mutations
require same-origin JSON. OpenAI output is bounded and automatic retries are disabled.

Validation:

```bash
npm test
npm run build
PLAYWRIGHT_PACKAGE_PATH=/path/to/playwright node tests/gate-flow.cjs
```

The integration test starts a production Next server with isolated HTTPS Gate,
Redis and OpenAI fixtures. It tests 3/10 complete readings, included speech and
translations, concurrency, input tampering, last-credit completion, failures,
revocation, outage blocking, browser code entry, secure cookies and logout. It makes
no real AI requests and does not use production codes or databases.
