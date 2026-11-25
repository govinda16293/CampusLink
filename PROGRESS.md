# CampusLink — Progress Report

**UCS503 Software Engineering Lab · Thapar Institute of Engineering and Technology**

Status as of **28 October 2026**

| | |
|---|---|
| Working features | Signup & OTP · profiles · post a goal · campus feed · request to join · poster approval · lobby · live group chat · edit a goal · ratings & reliability · report / block · admin panel |
| Automated tests | **348 passing**, across 20 test files |
| Code written | approx. 3,900 lines backend · 5,800 lines frontend · 700 lines shared · **3,700 lines of tests** |
| API endpoints | 38 |
| Database tables | 9 |
| Commits | 31 |

---

## 1. What the app does today

A student can complete the **whole journey**, end to end, in the running application:

1. **Sign up** with a `@thapar.edu` email → receives a **real OTP email** → verifies → logs in.
2. **Fill a profile** — name, branch, year, gender, interests, photo.
3. **Post a goal** — "need 3 people for badminton at 6pm", optionally **anonymous**.
4. **Browse the campus feed** — Discover / My goals / Joined.
5. **Ask to join** someone's goal, with a short message.
6. **Poster accepts or rejects** — accepted people form the **lobby**.
7. **Group chat** opens for the lobby, in real time.
8. **Poster can edit** the goal; if the time changes the group is told automatically in chat.
9. **Poster closes the goal**, they meet, then **marks it complete**.
10. **Everyone rates** who actually turned up → this moves each person's **reliability score**.
11. Anyone can **report** or **block** another student; an admin reviews reports.

---

## 2. Work completed, step by step

Each step was built, tested and committed on its own — not in one sweep. This is what makes the history reviewable.

### Step 0 — Foundation
- Monorepo set up as three packages: `frontend`, `backend`, `shared`.
- Health-check endpoint, linting, formatting, continuous integration.

### Step 1 — Authentication
- Only `@thapar.edu` addresses may register. This is checked **on the server**, so it cannot be bypassed.
- Six-digit OTP, **actually emailed** over SMTP — not printed to a console.
- The OTP is **hashed before storage**, expires, and limits attempts.
- Passwords hashed with **scrypt**, with the cost parameters stored inside the hash so they can be raised later without invalidating existing accounts.
- JWT sessions.
- Rate limiting on every auth endpoint.

### Step 2 — Student profiles
- Branch, year, gender, interests, bio.
- Profile photo upload with client-side cropping.
- A **profile-completeness** calculation that nudges students to finish, written as pure logic and unit tested on its own.

### Step 3 — Post a goal, and the feed
- Eight categories; title, description, optional date and time, headcount.
- **Anonymous posting.**
- Gender preference, and an auto-accept option.
- Feed with filters, pagination and a live "spots left" count.

### Step 4 — Request to join
- A **request state machine**: `PENDING → ACCEPTED / REJECTED / WITHDRAWN`, written as pure logic with 43 tests of its own.
- Poster sees pending requests and accepts or rejects them.
- Seats cannot be oversubscribed. This is enforced by a **compare-and-set** database write, so two people accepting the last seat at the same instant cannot both succeed.

### Step 5 — Lobbies and the goal lifecycle
- `OPEN → FULL → CLOSED → COMPLETED`, plus `CANCELLED`.
- The lobby roster, visible **only** to the poster and accepted members.
- A "Joined" tab.

### Step 6 — Real-time group chat
- Live chat for each lobby over Socket.IO.
- Message history with paging.
- Membership is **re-checked against the database** every time somebody joins a chat room — a room name sent by a browser is never taken at its word.

### Step 9 — Ratings and reliability
- After a goal completes, members vote on who actually attended.
- A **majority verdict** decides each person — one annoyed member cannot mark somebody absent on their own.
- The reliability score uses a **Bayesian prior**, so a new student with one no-show is not treated the same as somebody with a long record of them.
- Scores are **recomputed from scratch**, never incremented, so the number can never drift away from the underlying facts.

### Step 8 — Trust and safety
- Report a student, with a reason and detail.
- Block a student — blocking hides both people from each other, in both directions.
- Admin panel to review reports.
- An admin can **unmask** an anonymous poster when a report is being investigated — and **every unmasking is written to an append-only audit log, before the identity is returned.**
- Admin rights are read from the **database**, not from the login token, so removing somebody's admin access takes effect immediately.

### Latest addition — Editing a goal
Found while using the app: a poster had no way to change the time after people had already joined. Their only option was to cancel and repost, which destroyed the lobby and the whole conversation.

- The poster can now edit the title, description, time and number of spots.
- **When the time changes, a message appears in the group chat automatically.** Without this the feature would be worse than useless — members would arrive at the old time.
- Spots cannot be reduced below the number of people already accepted.
- A goal cannot be switched to anonymous once members have already seen the poster's name.
- Finished goals cannot be edited — they are a record.

---

## 3. Features removed from the proposal, and why

The proposal was a plan written before any code existed. These were cut **deliberately**, to keep the core journey genuinely finished rather than leaving ten features half-built.

| Feature | Why it was cut |
|---|---|
| **Notes & resource sharing** — i.e. *uploading files* | A second product in its own right — file storage, copyright, moderation. It shares almost nothing with goal-matching. Paused, not abandoned. Note that "Notes / resources" **does** exist as a goal category, so a student can already post *"need last year's DBMS notes"* and sort it out in chat — it is the file-hosting half that was cut. |
| **Sign in with Google** | College-email signup with a real OTP already proves the person is a Thapar student, which was the actual requirement. Google sign-in would be a second login path to secure for no extra guarantee. |
| **Push notifications** | Needs a mobile build and a notification service. In-app chat already carries anything urgent. |
| **A separate `Lobby` database table** | The data already exists — a goal plus its accepted requests *is* the lobby. A separate table would mean storing the same truth twice, and the two copies would eventually disagree. Lobby status is **derived** instead. Worth noting in the report, since the class diagram shows it as a class. |
| **Direct messaging between two students** | Group chat covers coordinating a plan. One-to-one messaging between strangers is the feature that most needs a safety system behind it, and it is not needed for the core journey. |
| **Reputation badges / leaderboards** | The reliability score already communicates trustworthiness. A leaderboard rewards posting volume, not reliability. |

---

## 4. How the code is organised

Every request follows the same path, and each layer has exactly one job:

```
  HTTP request
      │
  route        does this URL exist? is a login required?
  middleware   is the token valid?
  controller   is the request body the right shape?   (validated by a schema)
  service      the actual work — rules, database, notifying others
  domain       is this move even legal?               (pure logic, no database)
  database     Prisma / SQL
  serializer   what is THIS viewer allowed to see?
      │
   JSON response
```

Two parts of this are worth pointing out in a viva:

**The `domain/` folder holds pure rules with no database access at all.** The goal lifecycle, the join-request state machine and the reliability formula live there as plain functions. They are the state diagrams from the report, in code — and because they touch nothing external, their 109 tests run in milliseconds.

**Anonymity is enforced in one single place — the serializer.** For an anonymous goal, the poster's name, photo and id **never leave the server** for a viewer who has not earned them. The browser does not hide them; it is never sent them. A client cannot leak what it was never given.

---

## 5. Technology

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, plain JavaScript |
| Backend | Node.js, Express 5, TypeScript |
| Database | Prisma ORM — SQLite for development, PostgreSQL for deployment |
| Real time | Socket.IO |
| Validation | Zod schemas, **shared** between frontend and backend so both agree |
| Testing | Vitest — unit tests plus integration tests against a real database |
| Email | Nodemailer over SMTP |

---

## 6. On testing

348 tests is not padding. Roughly as much test code was written as application code, and the tests are there because they repeatedly caught real problems:

- **Tests were deliberately attacked to prove they work.** A safety check would be deleted on purpose to confirm that a test actually fails without it. Twice this exposed a test that passed either way — meaning it was proving nothing — and it was rewritten properly.
- Problems the tests and screenshots caught before any user saw them: a member could leave a goal *after* it had been completed, which would have corrupted everyone's reliability score; two people could in principle take the same last seat; a confirmed goal still displayed "requests appear here as they come in".
- A long-running intermittent test failure was tracked to its root cause — the test tool was opening a brand-new server for every single request — rather than being retried until it passed by luck. The suite has since run clean 15 times in a row.

---

## 7. What is next

1. **UI polish** — a consistent pass over spacing, empty states, loading states and error messages across all ten screens.
2. **Deployment** — move to PostgreSQL and host the app at a real URL.
3. **Update the report diagrams** — the class diagram needs `Message`, `Rating`, `Report`, `Block` and `AuditLog` added, and `Lobby` removed with a note explaining that it is derived.
4. **Notes sharing** — reconsider only once everything above is finished.

---

## 8. Team

| Name | Roll number |
|---|---|
| Govind | 1024030968 |
| Ashish Bajaj | 1024030096 |
| Divya | 1024030099 |
| Divyansh | 1024030064 |

Faculty advisor: **Ma'am Anushka**
