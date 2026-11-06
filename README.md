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

## Production security

The deployment requires `OPENAI_API_KEY`, `ORACLE_PASSWORD`, a randomly generated
`ORACLE_SESSION_SECRET` (at least 43 characters), and Redis REST credentials
(`KV_REST_API_URL`/`KV_REST_API_TOKEN`, or the equivalent `UPSTASH_REDIS_REST_*`).
Keep them server-only. Authentication and paid operations fail closed if Redis
or the signing configuration is unavailable. Local development also needs Redis;
production never falls back to memory for quotas or revocation.

Sessions expire after two hours. Sign out revokes the session in Redis; changing
the shared password invalidates existing sessions. Every paid operation rechecks
authentication inside its API handler. Mutations require same-origin JSON.

Default atomic limits are five login attempts per IP per 15 minutes, 500 login
attempts globally per 15 minutes, and global daily limits of 100 readings,
300 question checks, 200 translations, and 500 narration segments. Each two-hour
session is additionally limited to 10 readings, 30 question checks, 20 translations,
and 40 narration segments. A shared weighted daily budget and per-IP hourly
budget provide additional bounds. These limits live in `src/lib/oracleSecurity.mjs`;
they cap request volume rather than guaranteeing a particular dollar spend.
OpenAI responses also have output-token caps and automatic retries are disabled.

Redis stores expiring counters, random session IDs, and HMACs of IPs/password
versions, not questions, readings, plaintext passwords, or API keys. Development,
preview and production namespaces are separate. Tests can choose an isolated
`ORACLE_SECURITY_NAMESPACE`; clients cannot change it.

Questions and readings stay in tab memory. They do not appear in navigation URLs
or persist in localStorage; refreshing deliberately restarts the private flow.
The app removes caches left by older versions. Production pages use a per-request
CSP nonce, no-store caching, anti-framing headers and a no-referrer policy.
