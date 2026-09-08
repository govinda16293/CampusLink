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

- College email signup and verification.
- Goal posting with category, description, date/time, and required headcount.
- Public goal feed with category/date filters.
- Request-to-join flow with manual approval or auto-accept.
- Lobby chat for accepted users.
- Private chat flow for notes/resource requests.
- Profiles with branch, year, completed goals, and reliability score.
- Report/block controls, anonymous posting, gender-preference filters, no-show flagging, and feedback.

## Planned Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Zustand or Redux Toolkit.
- Backend: Node.js with Express or NestJS.
- Database: MongoDB or PostgreSQL.
- Real-time layer: Socket.IO.
- Authentication: JWT with college email OTP verification.
- Storage: Cloudinary or Firebase for notes and profile photos.
- Deployment: Vercel for frontend, Render/Railway for backend.

## Documentation

Install the documentation dependencies and serve the docs locally:

```bash
pip install -e .[docs]
make docs
```

## Team

- Govind, Roll No-1024030968, Email: gpodder_be24@thapar.edu
- Ashish, Roll No-1024030096 , Email: Kashish_be24@thapar.edu
- Divya, CSED - Roll No: TBD, Email: TBD

