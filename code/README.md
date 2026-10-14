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
| Real-time | Socket.IO — delivery only; every write is an ordinary HTTP call |
| Auth      | JWT + college-email OTP verification (from Step 1)              |
| CI        | GitHub Actions — format, lint, typecheck, test, build           |

The repository is deliberately mixed-language: a TypeScript API and a JavaScript client. Code
shared between the two lives in `shared/` and is authored in plain JavaScript so the
client can import it directly; the API consumes the same files via `allowJs`.

## Layout

This folder is the npm workspace root. The repository around it holds the proposal, the docs
site and the team journals; everything executable lives here.

```
code/
├── frontend/     React client (plain JavaScript)
│   └── src/{api,components,pages,store,hooks,lib}
│              components/ui holds all presentation, pages hold only logic
├── backend/      Express + Prisma REST API (TypeScript)
│   ├── prisma/   schema.prisma — the executable class diagram
│   └── src/
│       ├── config/       validated environment
│       ├── db/           Prisma client singleton
│       ├── lib/          AppError, password (scrypt), otp, jwt
│       ├── middleware/   error handling, requireAuth
│       ├── serializers/  DTO layer — nothing else may return a User
│       ├── services/     mail (console and SMTP transports)
│       └── modules/      one folder per feature: route · controller · service
└── shared/       enums, constants and validation schemas used by both sides
```

`shared/` is a third workspace beside the two the course structure names, and it is not
optional: the Zod schemas that validate a signup or a new goal are imported by the React forms
_and_ by the Express handlers, so the inline error a student sees is produced by the very rule
the server will enforce. Copying those schemas into both sides instead would guarantee the two
drift apart, and the day they do, the client will accept something the API rejects.

## Getting started

Requires Node 20+ (developed on Node 24). No database installation needed — development runs on
a local SQLite file.

```bash
cd code
npm install

# API configuration
cp backend/.env.example backend/.env

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
fine.

### Sending real email

Set `MAIL_TRANSPORT=smtp` and fill in the `SMTP_*` variables in `code/backend/.env`. Any SMTP server
works — Gmail, Outlook, Brevo, SendGrid, Mailtrap — only the values differ.

For Gmail (including a `thapar.edu` Google account):

1. Turn on 2-Step Verification — App Passwords are not offered until it is on:
   <https://myaccount.google.com/signinoptions/two-step-verification>
2. Create an App Password named "CampusLink": <https://myaccount.google.com/apppasswords>
3. Paste the 16 characters into `SMTP_PASS` **without the spaces**, set `SMTP_USER` and
   `MAIL_FROM` to the same address, and set `MAIL_TRANSPORT=smtp`.

Your ordinary Google password will not work — it must be an App Password.

Two guards make a misconfiguration obvious instead of silent:

- The server **refuses to start** if `MAIL_TRANSPORT=smtp` and any of host/user/password is
  missing, naming the variable.
- On boot it connects to the SMTP server and logs `connection OK`, or logs the provider's actual
  error. A wrong password would otherwise only show up as a student who never gets a code.

If delivery fails during signup the passcode row is deleted and the API returns
`MAIL_DELIVERY_FAILED`, so nobody is left waiting for a code that was never sent.

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
- [x] **Step 2** — Profiles: branch, year, gender, interests, completeness score
- [x] **Step 3** — Post a goal + public feed (with the anonymity serializer)
- [x] **Step 4** — Request to join + poster approval (the core state machine)
- [x] **Step 5** — Lobbies: the member roster, a "Joined" list, and the goal lifecycle
- [x] **Step 6** — Real-time group chat for a lobby (Socket.IO)
- [x] **Step 9** — Ratings: who turned up, and the reliability score built from it
- [x] **Step 8** — Trust & safety: report, block, and audit-logged admin unmasking

Next is a UI pass, then deployment. Steps 7, 10 and 11 — notes sharing, matching and metrics —
are deferred by the team rather than dropped.

### Making somebody a moderator

There is no UI for it, deliberately — an endpoint that grants admin is an endpoint worth
attacking. Set the role directly against the database:

```bash
sqlite3 backend/prisma/dev.db "update User set role='ADMIN' where email='you_be24@thapar.edu';"
```

A "Moderation" link then appears in the header. `requireAdmin` reads the role from the database
on every request rather than from the session token, so granting and revoking both take effect
immediately.

## Design notes worth knowing

**The state machine is pure.** Goal, request and lobby transitions live in
`code/backend/src/domain/` as functions with no database or HTTP dependency, so they can be
unit-tested exhaustively against illegal transitions, not just the happy path.

**Anonymity is breakable, but never quietly.** A moderator's report queue does not show who is
behind an anonymous goal — moderation does not need the name, so doing the job never hands one
over as a side effect. Revealing it is a separate, deliberate press, and that press is what writes
an `AuditLog` row naming the moderator. The row is written _before_ the identity is returned, so a
failed write means no name: a log that can be skipped is not a log. Nothing in the codebase
updates or deletes an audit row, and no endpoint exposes one that could.

**Blocking is stored one way and enforced both ways.** Read only in the direction it was made, a
block would leave the blocked student still seeing the blocker's goals and still able to ask to
join them — the opposite of what it is for. It does not dissolve a lobby the two are already in:
quietly removing somebody from a group they committed to, and a chat others are relying on, is a
bigger act than the student asked for.

**Reliability is a majority verdict, not one person's word.** After a goal is marked done, each
member answers one question about each of the others: did they turn up. A student counts as absent
for a goal only when more of the group said absent than present, and a tie goes to the student —
so one annoyed person cannot mark somebody down on their own. The score itself carries a prior of
four imaginary good turnouts, which is what stops a single missed first goal reading as zero out
of a hundred and makes a new account distinguishable from a serial no-show.

**The trust counters are recomputed, never incremented.** A verdict can flip as the rest of a
group answers, so `recomputeReliability` derives all three numbers from the rating rows every
time rather than nudging a counter. That makes it idempotent and makes any drift self-correcting
on the next rating.

**The socket cannot write anything.** Chat messages are sent with an ordinary `POST`, and the
WebSocket only delivers what that endpoint already accepted. One write path means one place where
authorization happens — the same service, covered by the same tests. A socket that could also
write would be a second door into a room full of real names, and the weaker of two doors is the
one that gets forgotten. Room membership is re-checked against the database on every join, and
`evict` removes a person's live connections the moment they leave a group, because a check that
runs only at join time stops being true the moment somebody walks out.

**There is no Lobby table.** The class diagram names Lobby as an entity, but a lobby has no state
of its own — it is one goal plus the people whose requests were accepted. A second table would
mean two rows that must agree about whether the group is still forming, and no way to say which
is right the day they disagree. So the goal _is_ the lobby, and `lobbyStatusOf` in
`domain/goal.ts` maps one onto the other: OPEN/FULL → FORMING, CLOSED → CONFIRMED, COMPLETED →
COMPLETED, CANCELLED/ARCHIVED → CANCELLED.

**Two people cannot take the last spot.** Accepting a request claims a spot with a
compare-and-set: the update to `acceptedCount` only lands if the count is still the one that was
read. It is built from single statements rather than an interactive transaction, so it is correct
on PostgreSQL's default isolation and not merely on SQLite, which happens to serialise writes. The
guard is tested by reproducing the stale read directly, because two simultaneous HTTP requests
against SQLite run one after the other — a test built that way was shown, by deleting the guard,
to pass without it.

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

**Profiles cannot be self-promoted.** `PATCH /users/me` is guarded twice against mass assignment:
the Zod schema is `.strict()` and has no `role`, `isVerified` or `reliabilityScore` key, and the
service builds its write from an explicit field allow-list rather than spreading the input. The
trust layer is only worth something if a student cannot set their own reliability score, so it is
defended in two places and asserted by test.

**Known limitation — one mailbox, many accounts.** Alias addresses (`name+tag@thapar.edu`, or
extra dots in the local part) are accepted as separate accounts even though Google delivers them
all to one inbox, so a student could hold several verified accounts and shed a bad reliability
score by re-registering. The `@thapar.edu` domain check is the only identity guarantee. Accepted
deliberately for a 15–20 person pilot; the fix, if ever needed, is a canonical-email unique column
that strips the tag and dots.

**Descoped from the proposal.** Hostel block and hostel/proximity-based matching (§3.3, Matching
Intelligence) were cut as bulk that did not earn its place — with a pilot confined to one batch,
proximity had almost nothing to discriminate on. Step 10 keeps interest, branch and past-category
scoring.

**Enum columns are strings.** Prisma does not support native enums on SQLite, so enumerated
columns are `String` and their allowed values live in `code/shared/src/enums.js`, enforced by
Zod at the API boundary. This keeps one schema working on both SQLite and PostgreSQL.
