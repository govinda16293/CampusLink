# CampusLink — Project Walkthrough & Viva Preparation

**UCS503 Software Engineering Lab · Thapar Institute of Engineering and Technology**

Prepared for the final evaluation

---

## Part 1 — The project in one minute

**The problem.** A student wants to do something that needs other people — play badminton, split a cab to the station, form a study group — and has no good way to find them. WhatsApp groups are noisy and full of strangers; nobody knows who actually turns up.

**The solution.** CampusLink is a campus-only platform built on one simple loop:

> **Post a goal → people request to join → the poster approves → a group forms and chats → they meet → everyone rates who turned up.**

That last step is the important one. Ratings feed a **reliability score**, so over time the platform knows who is dependable and who is not.

**What makes it campus-only.** Only `@thapar.edu` email addresses can register, and a real verification code is emailed to prove it.

---

## Part 2 — How the pieces fit together

### The three parts

```
   FRONTEND                 BACKEND                DATABASE
   (what the      ──HTTP──> (all the rules  ──────> (where it
    student sees)            and decisions)          is stored)
        │                         │
        └────── SOCKET ───────────┘
              (live chat)

              SHARED
       (the rules both sides use)
```

**Why `shared` exists.** Rules like "a title must be 5 to 80 characters" are written **once** and used by both the frontend and the backend. The browser checks them to show a friendly error; the server checks them again because a browser can be bypassed. Because both read the same file, **they can never disagree with each other.**

### What happens inside the backend — the college office analogy

Think of a request arriving at the backend like a student walking into a college office. Each counter has exactly one job:

| Counter | In the code | What it asks |
|---|---|---|
| Reception | **route** | Does this office handle this? Do you need an ID card? |
| Form check | **controller** | Is your form filled in correctly? |
| The clerk | **service** | Does the actual work — rules, records, informing people |
| The rulebook | **domain** | *Is this even allowed?* |
| File cabinet | **database** | Stores and retrieves the records |
| The window | **serializer** | Decides what gets shown back to **this particular person** |

The last two counters are where the interesting design decisions live.

### The two ideas worth remembering

**1. The rulebook (`domain/`) touches nothing.**

The goal lifecycle, the join-request states and the reliability formula are written as plain functions with **no database access at all**. They are simply: *given this situation, is this move legal?*

- This is literally the **state diagram from the report, written as code.**
- Because they touch nothing external, their **109 tests run in milliseconds.**

**2. Anonymity is enforced at the window (`serializer`), not in the browser.**

When somebody posts anonymously, their name and photo **never leave the server** for a viewer who hasn't earned the right to see them.

> The browser isn't hiding the name. **It was never sent the name.**
> A client cannot leak what it was never given.

This is the single best line to say in the viva, because it shows the difference between *hiding* something and *not sending* it.

### How the live chat works

Messages are **sent over HTTP**, like everything else. The socket only **delivers** them to the other people in the group.

**Why?** Because if messages could be written through the socket, there would be **two different doors** into the system, and both would need the same security checks. One door is safer than two.

Also: every time a browser asks to join a chat room, the server **re-checks membership against the database**. A room name sent by a browser is never believed on its own.

---

## Part 3 — The journey, end to end

This is the demo path. Each step is a real, working feature:

| # | Step | What is happening underneath |
|---|---|---|
| 1 | **Sign up** with a `@thapar.edu` email | Domain checked on the server; a 6-digit code is emailed |
| 2 | **Verify** the code | Code is stored **hashed**, valid 10 minutes, 5 attempts |
| 3 | **Log in** | Password checked, a session token issued (valid 7 days) |
| 4 | **Complete profile** | Branch, year, gender, interests, photo |
| 5 | **Post a goal** | Category, title, time, how many people — optionally anonymous |
| 6 | **Browse the feed** | Discover / My goals / Joined |
| 7 | **Ask to join** | A request is created in `PENDING` |
| 8 | **Poster accepts** | Seat count increases — safely, even if two people click at once |
| 9 | **Lobby forms** | Visible only to the poster and accepted members |
| 10 | **Group chat** | Live, over the socket |
| 11 | **Poster edits the time** | A message appears in the chat **automatically** |
| 12 | **Close → Complete** | The goal is locked as a record |
| 13 | **Everyone rates** | Majority decides who attended |
| 14 | **Reliability updates** | Recomputed from scratch, not incremented |

Safety runs alongside all of it: **report**, **block**, and an **admin panel** with an audit log.

---

## Part 4 — Questions the teacher may ask

Each answer starts with **a one-line version** you can lead with, then the detail if they push further.

### A. Basics

**Q1. Explain your project in two minutes.**

> *"Students can post a goal that needs other people, others request to join, the poster approves, a group forms with a chat, and afterwards everyone rates who actually turned up — which builds a reliability score."*

Add: it is campus-only through `@thapar.edu` verification, and there is a full trust-and-safety layer (anonymous posting, report, block, admin review).

**Q2. Who is the user and what problem is solved?**

> *"Any Thapar student who needs company for an activity. The problem is not finding the activity — it is finding people you can trust to actually show up."*

**Q3. What is each team member's contribution?**

Answer honestly with what you actually did. Mention the areas you can explain in depth, because that is what they will test next.

---

### B. Architecture and design

**Q4. Explain your architecture.**

> *"A three-tier layered architecture: a React client, an Express API, and a database accessed through an ORM — with a shared validation package used by both client and server."*

Then walk through the six counters from Part 2. Mention that each layer has exactly one responsibility, which is **separation of concerns**.

**Q5. Why separate the controller from the service?**

> *"So the business logic doesn't depend on HTTP."*

The controller only checks the shape of the request. The service holds the actual rules. This means the logic can be tested without pretending to be a web request, and the same service could later be called from somewhere else.

**Q6. Which design patterns did you use?**

- **Layered architecture** — route / controller / service / domain
- **Repository-style data access** — all database work goes through the ORM, never raw SQL scattered around
- **Strategy** — the mail sender has two interchangeable implementations (console for development, SMTP for real email) behind one interface
- **State machine** — the goal lifecycle and the join-request lifecycle
- **DTO / serializer** — database rows are never returned directly; they are converted into exactly what a given viewer may see

**Q7. Why is `domain/` separate from `services/`?**

> *"Because the rules of the system shouldn't need a database to be true."*

A join request moving from `PENDING` to `ACCEPTED` is a rule, not a database operation. Keeping it separate makes it directly testable and makes the state diagram and the code match one-to-one.

**Q8. Is this monolithic or microservices? Why?**

> *"Monolithic, deliberately."*

For a campus-scale application with one database, microservices would add network calls, deployment complexity and distributed-transaction problems to solve a scaling problem we do not have. The code is **modular** inside one deployable unit — which gives most of the organisational benefit without the operational cost.

---

### C. Database

**Q9. Explain your database design.**

Nine tables:

| Table | Holds |
|---|---|
| `User` | Students, including reliability counters |
| `OtpToken` | Verification codes (hashed) |
| `Goal` | A posted goal |
| `JoinRequest` | Somebody asking to join a goal |
| `Message` | Chat messages |
| `Rating` | Who said who attended |
| `Report` | Safety reports |
| `Block` | One student blocking another |
| `AuditLog` | Record of admin actions |

**Q10. Why is there no `Lobby` table, when the class diagram shows one?**

This is a likely question — answer it confidently:

> *"Because the lobby isn't separate data. A goal plus its accepted requests **is** the lobby."*

Storing it separately would mean keeping **the same truth in two places**, and the two copies would eventually disagree — a classic source of bugs. So the lobby status is **derived** from the goal's status instead. We identified this during implementation and consciously chose not to build the table.

**Q11. How do you handle two people accepting the last seat at the same time?**

> *"With a compare-and-set update — the seat is only taken if the count is still what we read."*

If two accepts arrive together, the database allows only one to succeed; the second is told the goal is full. This was **specifically tested** by calling the function directly to simulate the race.

**Q12. Why SQLite in development and PostgreSQL in production?**

SQLite needs no server, so anyone can clone the project and run it immediately. PostgreSQL handles real concurrent users. The ORM means the application code is the same for both — and the concurrency handling was written to be correct on PostgreSQL, not merely on SQLite.

---

### D. Security

**Q13. How are passwords stored?**

> *"Hashed with scrypt — never stored or logged in plain text."*

The cost parameters are stored **inside the hash string**, so the difficulty can be increased later without invalidating existing accounts.

**Q14. How does authentication work?**

Signup → a 6-digit OTP is emailed → verified → a **JWT** session token is issued, valid 7 days. Every protected endpoint checks that token.

**Q15. Is the OTP stored safely?**

> *"It is hashed with SHA-256, the same way a password is."*

It also **expires after 10 minutes** and allows only **5 attempts**, so it cannot be brute-forced. All the auth endpoints are **rate limited** (20 requests per 15 minutes).

**Q16. How do you stop someone reading a chat they're not part of?**

Membership is checked **on the server**, against the database, every time — both when fetching history and when joining the live room. And the error returned is **"not found", not "forbidden"** — because "forbidden" would confirm that the group exists.

**Q17. Can an admin see who posted anonymously?**

> *"Yes — but only when investigating a report, and every single unmasking is written to an audit log before the identity is returned."*

Also: admin rights are read from the **database**, not from the login token, so removing someone's admin access takes effect **immediately** rather than whenever their session expires.

**Q18. What if someone edits the request in the browser to bypass a check?**

It fails. Every rule is enforced on the server. The frontend checks are only there to give a faster, friendlier error — they are **convenience, not security**.

---

### E. Testing and process

**Q19. How did you test?**

> *"348 automated tests — unit tests for the rules, integration tests that run against a real database."*

Roughly as much test code was written as application code.

**Q20. How do you know your tests are actually useful?**

This is the strongest answer in the whole project:

> *"We deliberately broke the code to check that the tests would catch it."*

A safety check would be deleted on purpose; if no test failed, the test was proving nothing. **Twice this exposed a useless test**, and it was rewritten properly.

**Q21. Give an example of a bug your testing caught.**

> *"A member could leave a goal **after** it had been completed — which would have corrupted everyone's reliability score."*

Others: two people could in principle take the same last seat; a confirmed goal still showed "requests appear here as they come in".

**Q22. Which SDLC model did you follow?**

**Incremental / iterative.** Each feature was built, tested and committed as its own step — the commit history shows Step 0 through Step 9 — rather than building everything at once and integrating at the end. This meant every stage had something working and demonstrable.

**Q23. Did you use version control properly?**

Yes — 31 commits, each one a complete, working step with a descriptive message, not a dump of files.

---

### F. Scope decisions

**Q24. The proposal mentioned notes sharing. Where is it?**

> *"The category still exists — a student can post 'need last year's DBMS notes' and sort it out in chat. What we cut was **file hosting**."*

File uploads bring storage, copyright and moderation — effectively a second project. We chose to **finish the core journey properly rather than leave ten features half-built.**

**Q25. Why no Google login?**

College-email signup with a real OTP already proves the person is a Thapar student, which was the actual requirement. Google sign-in would add a second login path to secure **for no extra guarantee.**

**Q26. Isn't cutting features a weakness?**

> *"Scoping is part of software engineering. A plan written before any code exists is an estimate, not a contract."*

We cut deliberately, documented why, and delivered a complete working journey instead of a broader broken one.

---

### G. Harder follow-up questions

**Q27. Explain your reliability score formula.**

```
score = 100 × (attended + 4) / (total commitments + 4)
```

The `+4` is a **Bayesian prior**. Without it, a new student who misses their very first goal would drop to 0 — which is unfair and useless. With it, early results move the score gently and it sharpens as evidence builds.

**Q28. Why "recompute from scratch" instead of adding 1 each time?**

> *"Because an incremented number can drift away from the facts, and once it does you can never tell."*

Recomputing from the underlying records means the score is **always exactly what the data says**.

**Q29. What stops someone from marking another person absent out of spite?**

> *"A majority vote decides, not one person."*

Somebody is marked absent only if **more people said absent than present.**

**Q30. What was the hardest problem you solved?**

Good honest answer — a test that failed roughly once in every five runs:

> *"We refused to just re-run it until it passed. We traced it to the root cause — the testing tool was opening a brand-new server for every single request. After the fix, the suite ran clean 15 times in a row."*

**Q31. What would you do next / how would you scale it?**

1. UI polish pass
2. Deploy on PostgreSQL at a real URL
3. Then: push notifications, and reconsidering file sharing

For scale: PostgreSQL with connection pooling, and the socket layer moved to a shared adapter so multiple servers can run behind one address.

**Q32. What did you learn?**

Pick one and be specific. A strong answer:

> *"That writing a test is not the same as having a test. Until you break the code on purpose, you don't know whether your test does anything."*

---

## Part 5 — Numbers worth memorising

| | |
|---|---|
| Automated tests | **348**, across 20 files |
| API endpoints | **38** |
| Database tables | **9** |
| Commits | **31** |
| Rules tests (`domain/`) | 109, running in milliseconds |
| OTP | 6 digits · 10 minutes · 5 attempts |
| Session token | valid 7 days |
| Code | approx. 3,900 lines backend · 5,800 frontend · **3,700 lines of tests** |

**Tech stack in one line:**
React + Vite + Tailwind on the front, Node + Express + TypeScript on the back, Prisma ORM over SQLite/PostgreSQL, Socket.IO for live chat, Zod for shared validation, Vitest for testing.

---

## Part 6 — If you get stuck

**Never invent an answer.** A teacher can always tell, and one invented answer makes them doubt everything else you said.

Use these instead:

> *"I haven't implemented that — here's what I'd do."*

> *"That's handled in the service layer; let me open the file and show you."*

> *"We considered it and chose not to, because…"*

**The strongest move in any viva is to show the code.** The project runs, the tests pass, and the commit history tells the story step by step. If a question gets difficult, open the file and talk through it — that is far more convincing than reciting from memory.

**Three sentences to have ready, whatever they ask:**

1. *"Anonymity is enforced by not sending the data, not by hiding it in the browser."*
2. *"There's no Lobby table because that would store the same truth twice."*
3. *"We deleted our own safety checks on purpose to prove the tests would catch it."*
