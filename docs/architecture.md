# Architecture

CampusLink is planned as a standard 3-tier web application.

## Frontend

- React with Vite.
- Tailwind CSS.
- React Router.
- Zustand or Redux Toolkit for client state.

## Backend

- Node.js with Express or NestJS.
- REST APIs for authentication, goals, requests, lobbies, feedback, and reports.
- Socket.IO for live lobby updates and chat.

## Data Layer

MongoDB or PostgreSQL will be selected after finalizing the schema. Goal, lobby, request, and feedback relationships may be cleaner in a relational model.

## Deployment

- Frontend on Vercel.
- Backend on Render or Railway.
- Managed database service.

