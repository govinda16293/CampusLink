# CampusLink

A goal-matching and resource-sharing platform for college campuses.

Students post a **goal** (an activity that needs another person), it appears on a public campus
feed, interested students **request** to join, and once enough people are in, a **lobby** forms
and the group takes it from there. A trust & safety layer — reliability scores, anonymous
posting, gender-preference filters, report/block and no-show flagging — sits around that loop so
it feels safe to do with someone you don't know.

> UCS503 Software Engineering Lab · Thapar Institute of Engineering and Technology
> Team: Govind (1024030968), Ashish (1024030096)

---

## Stack

| Layer     | Choice                                                          |
| --------- | --------------------------------------------------------------- |
| Frontend  | React 18 + Vite + Tailwind CSS v4 — **plain JavaScript**, no TS |
| Backend   | Node.js + Express + TypeScript                                  |
| Database  | Prisma ORM — SQLite in development, PostgreSQL in production    |
| Real-time | Socket.IO (from Step 6)                                         |
| Auth      | JWT + college-email OTP verification (from Step 1)              |
| CI        | GitHub Actions — format, lint, typecheck, test, build           |

The repository is deliberately mixed-language: a TypeScript API and a JavaScript client. Code
shared between the two lives in `packages/shared` and is authored in plain JavaScript so the
client can import it directly; the API consumes the same files via `allowJs`.

## Layout

```
campuslink/
├── apps/
│   ├── api/          Express + Prisma REST API (TypeScript)
│   │   ├── prisma/   schema.prisma — the executable class diagram
│   │   └── src/
│   │       ├── config/       validated environment
│   │       ├── db/           Prisma client singleton
│   │       ├── lib/          AppError, password (scrypt), otp, jwt
│   │       ├── middleware/   error handling, requireAuth
│   │       ├── serializers/  DTO layer — nothing else may return a User
│   │       ├── services/     mail (console transport, pluggable)
│   │       └── modules/      one folder per feature: route · controller · service · schema
│   └── web/          React client (plain JavaScript)
│       └── src/{api,components,pages,store,hooks}
│                  components/ui holds all presentation, pages hold only logic
└── packages/
    └── shared/       enums, constants and validation schemas used by both sides
```

## Getting started

Requires Node 20+ (developed on Node 24). No database installation needed — development runs on
a local SQLite file.

```bash
npm install

# API configuration
cp apps/api/.env.example apps/api/.env

# create the local database and generate the Prisma client
npm run db:push -w @campuslink/api

# run the API (:4000) and the web client (:5173) together
npm run dev
```

Open http://localhost:5173 — you should land on the sign-in screen.

Vite proxies `/api` to the Express server in development, so the browser only ever talks to one
origin and CORS never gets in the way locally.

### Signing up locally

No mail provider is needed. `MAIL_TRANSPORT=console` prints the passcode into the terminal
running `npm run dev`, in a boxed block that is easy to spot among the request logs:

```
┌────────────────────────────────────────────────────────────────┐
│ EMAIL (console transport — not actually sent)
│ To:      yourname@thapar.edu
│ Subject: Your CampusLink verification code: 930548
└────────────────────────────────────────────────────────────────┘
```

Signup only accepts `@thapar.edu` addresses, but any local-part works — `test1@thapar.edu` is
fine. Swapping in a real provider for the demo means adding one class next to
`ConsoleMailSender` and one value to `MAIL_TRANSPORT`; nothing in the auth service changes.

## Scripts

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | API and web client together, both watching   |
| `npm run lint`       | ESLint across the whole monorepo             |
| `npm run typecheck`  | `tsc --noEmit` on the API                    |
| `npm test`           | Vitest, once                                 |
| `npm run test:watch` | Vitest in watch mode                         |
| `npm run build`      | Production build of both apps                |
| `npm run db:studio`  | Prisma Studio — browse the database in a GUI |
| `npm run format`     | Prettier write                               |

## Build order

The project is built in vertical slices — each step is one feature end-to-end (schema → API →
UI → test) and is left runnable and demoable.

- [x] **Step 0** — Scaffold, tooling, health check, CI
- [x] **Step 1** — Auth: college-email signup, OTP verification, login, JWT
- [ ] **Step 2** — Profiles
- [ ] **Step 3** — Post a goal + public feed (with the anonymity serializer)
- [ ] **Step 4** — Request to join + poster approval (the core state machine)

Steps 5–12 (lobbies, real-time chat, notes sharing, trust & safety, ratings, matching,
metrics, deployment) are planned but not yet in scope.

## Design notes worth knowing

**The state machine is pure.** Goal, request and lobby transitions live in
`apps/api/src/domain/` as functions with no database or HTTP dependency, so they can be
unit-tested exhaustively against illegal transitions, not just the happy path.

**Anonymity is enforced server-side, in one place.** The serializer layer decides whether a
poster's identity is included in a response, based on whether the viewer has an accepted request
on that goal. Identity is stripped before it leaves the server — the UI is never trusted to hide
it. Reliability score stays visible even while anonymous.

**Passwords use Node's built-in scrypt.** argon2 and bcrypt both need a native build step, and
npm now blocks install scripts by default — a dependency the team cannot install on a fresh clone
is worse than a slightly older KDF. The cost parameters are stored inside each hash, so they can
be raised later without locking anyone out.

**Auth endpoints do not leak who has an account.** A wrong password and an unknown email return
the identical 401; resending a passcode returns the same message whether or not the address
exists. Otherwise either endpoint becomes a way to test which students have signed up.

**Enum columns are strings.** Prisma does not support native enums on SQLite, so enumerated
columns are `String` and their allowed values live in `packages/shared/src/enums.js`, enforced by
Zod at the API boundary. This keeps one schema working on both SQLite and PostgreSQL.
