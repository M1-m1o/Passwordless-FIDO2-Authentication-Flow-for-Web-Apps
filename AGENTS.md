# AGENTS.md — context for AI coding assistants

Read this before helping in this repo. It explains the project, the current
state, and how the student wants help.

## How to help (course AI policy — read first)

This is a graded university project (CS4389 Data and Application Security).
The course policy says students must **write and understand their own code**.
Allowed AI use: explaining concepts, brainstorming approaches, giving feedback
on code the student wrote, and debugging the student's code.

So, by default:
- **Explain, don't implement.** When asked how to do a TODO, explain the
  approach, the relevant API (better-sqlite3, Express, SimpleWebAuthn), and the
  pitfalls. Short illustrative snippets of library usage are fine; do not write
  the finished function bodies for the TODOs.
- **Review and debug freely** once the student has written code.
- If the student explicitly asks for generated code, remind them it must be
  disclosed (prompt + 2–3 sentence reflection) in the root README's
  "AI Use Disclosure" section.

## The project

A sample web app with **no passwords**. Users sign in three ways:
1. **Passkey** (FIDO2 / WebAuthn, via `@simplewebauthn/server` + `/browser`)
2. **Push approval** — Duo-style, approved on a second device with number matching
3. **TOTP code** — fallback, analyzed in the report as the weakest method

Plus: rate limiting/lockout, hashed recovery codes, device list/revoke,
and an audit log feeding the security analysis.

## Layout

```
README.md                 project summary + AI disclosure (keep it updated)
fido2-skeleton/
  API_CONTRACT.md         every endpoint + JSON shape; frontend codes against it
  backend/                Node + Express (ESM), port 3000, SQLite via better-sqlite3
    src/server.js         starts app, imports db/index.js (creates tables)
    src/app.js            CORS (credentials), JSON body, cookies, mounts routes
    src/config/index.js   reads .env: PORT, RP_ID, RP_NAME, ORIGIN, SESSION_SECRET
    src/db/index.js       schema (users, credentials, sessions, audit_log, recovery_codes)
    src/middleware/       validate.js, session.js, rateLimit.js
    src/routes/           auth.js, push.js, code.js, recovery.js, devices.js, session.js
    src/services/         webauthn.js, totp.js
  frontend/               Vite, vanilla JS, port 5173; js/api.js calls the backend
```

Request flow: browser → app.js → middleware (validate, requireSession) →
route → service → DB → JSON response. The server makes every trust decision;
browser-side validation is UX only.

## Backend team split (look for `TODO (backend N)` and `// OWNER:` headers)

| # | Area | Files |
|---|------|-------|
| 1 | Passkeys | services/webauthn.js, routes/auth.js |
| 2 | Push approval | routes/push.js |
| 3 | Codes + recovery + rate limits | routes/code.js, services/totp.js, routes/recovery.js, middleware/rateLimit.js |
| **4** | **DB + sessions (this student)** | **db/index.js, middleware/session.js, routes/session.js** |
| 5 | Devices, audit, integration tests | routes/devices.js |

## Backend 4 — current focus

Everyone else depends on this work, so it comes first.

1. **DB helper functions in `src/db/index.js`** so routes never write raw SQL:
   `getUserByUsername`, `createUser`, `saveCredential`, `getCredentialsForUser`,
   `updateCounter`, `logAttempt` (backend 5 calls it), plus whatever backend 3
   needs (`totp_secret`, `last_totp_step`, `recovery_codes`).
   Agree the function names/signatures with backends 1, 3 and 5 before coding.
2. **Persist sessions** in the `sessions` table instead of the in-memory Map in
   `middleware/session.js`, with `expires_at` enforced in `requireSession`
   and rows removed on logout. (`node --watch` restarts on every save, which
   currently logs everyone out.)
3. **Cookie flags**: keep `httpOnly` + `sameSite`; add `secure` when on HTTPS;
   consider `maxAge` matching `expires_at`.
4. **`GET /session`** should also return the username (look it up from userId).

Notes that matter for this work:
- better-sqlite3 is **synchronous** — no `await` needed; use prepared
  statements with `?` placeholders (never string-concatenate SQL).
- `credentials.public_key` is a BLOB; SimpleWebAuthn expects a `Uint8Array`
  (a Node `Buffer` from better-sqlite3 qualifies). `credential_id` is a
  base64url string.
- The signature `counter` must only increase — it is the replay defense.
- Tables use `CREATE TABLE IF NOT EXISTS`, so after a schema change delete
  `backend/fido2.db` (and `-wal`/`-shm`) and restart.

## Environment

- The student is on **Windows PowerShell 5**: chain commands one per line
  (`&&` doesn't work); `copy` instead of `cp`.
- Run: `cd fido2-skeleton/backend`, `copy .env.example .env`, `npm install`,
  `npm run dev`. Health check: `http://localhost:3000/health`.
  `Cannot GET /` on port 3000 is expected (API only).
- Passkeys are bound to the origin: use `localhost`, not `127.0.0.1`;
  `.env` ORIGIN must equal the frontend URL (http://localhost:5173).
- Never `git push --force` to `main`; teammates push there. Pull with
  `git pull --rebase` first.
