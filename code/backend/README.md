# Backend

Express + TypeScript REST API. Enumerated columns are stored as `String` and validated by Zod at
the boundary, because Prisma does not support native enums on SQLite — that keeps one schema
working on both the development database and PostgreSQL in production.

## Stack

- Node.js + Express 5, TypeScript
- Prisma ORM — SQLite in development, PostgreSQL in production
- JWT sessions; college-email OTP verification over SMTP
- scrypt password hashing (`node:crypto`) — argon2 and bcrypt both need a native build step
- Socket.IO for chat and lobby updates — planned, Step 6

## Modules

Each is one folder under `src/modules/`: route · controller · service.

| Module                 | Status           |
| ---------------------- | ---------------- |
| Auth                   | Built            |
| Users and profiles     | Built            |
| Goals                  | Built            |
| Join requests          | Next — Step 4    |
| Lobbies                | Planned — Step 5 |
| Chat                   | Planned — Step 6 |
| Reports and blocks     | Planned — Step 8 |
| Feedback / reliability | Planned — Step 9 |

## Configuration

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored and must stay that way: it
carries the SMTP credentials that send verification codes to students. The server refuses to
start if `MAIL_TRANSPORT=smtp` and any of host, user or password is missing, and it verifies the
connection on boot rather than discovering the problem when a student never receives a code.
