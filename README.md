# CampusLink

### A Goal-Matching & Resource-Sharing Platform for College Campuses

CampusLink is a UCS503P course project that helps students on a college campus find people with matching goals, such as gym partners, cab shares, study groups, sports plans, or notes/resource requests. The platform is built around a simple workflow: students post goals, others request to join, accepted users coordinate in a lobby or private chat, and completed goals contribute to visible reliability.

## Repository Structure

This repository follows the UCS503P project template structure:

- `project-proposal/` - LaTeX and Markdown versions of the project proposal.
- `project-report-prototype-stage/` - prototype-stage report workspace.
- `project-report-final/` - final report workspace.
- `journals/` - weekly progress journals for each team member.
- `docs/` - Markdown documentation served through MkDocs.
- `code/` - application source code, divided into frontend and backend.
- `assets/` - diagrams, screenshots, mockups, and other media.
- `.github/workflows/` - GitHub Actions workflow for documentation deployment.

## Project Idea

Most campus coordination still happens through fragmented WhatsApp groups, friend circles, and word of mouth. This limits reach, makes stranger interaction feel unsafe, and makes resource sharing inefficient. CampusLink addresses this by offering a structured goal-posting and matching platform restricted to verified college students.

## Core Features

- College email (`@thapar.edu`) signup with OTP verification.
- Goal posting with category, description, date/time, and required headcount.
- Public goal feed with category filters and Discover / My goals / Joined views.
- Request-to-join flow with manual approval or auto-accept.
- Real-time lobby chat for accepted members.
- Editing a goal, with an automatic chat message when the time changes.
- Profiles with branch, year, interests, photo, completed goals, and reliability score.
- Anonymous posting, gender-preference filters, report/block controls, and attendance-based reliability.
- Admin review of reports, with every unmasking recorded in an audit log.

Notes/resource requests are supported as a goal category; file-based notes sharing and private one-to-one chat were not built (see the final report).

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS, React Router, Zustand.
- Backend: Node.js with Express 5 (TypeScript).
- Database: Prisma ORM with SQLite in development and PostgreSQL for deployment.
- Real-time layer: Socket.IO.
- Authentication: JWT sessions, scrypt password hashing, college email OTP over SMTP.
- Validation: Zod schemas shared by frontend and backend.
- Testing: Vitest and Supertest, run on every push by GitHub Actions.

## Documentation

Install the documentation dependencies and serve the docs locally:

```bash
pip install -e .[docs]
make docs
```

## Team

- Govind, Roll No-1024030968, Email: gpodder_be24@thapar.edu
- Ashish, Roll No-1024030096 , Email: Kashish_be24@thapar.edu
- Divya, CSED - Roll No: 1024030099, Email: ddivya_be24@thapar.edu
- Divyansh, Roll No-1024030064, Email:dprashar_be24@thapar.edu

