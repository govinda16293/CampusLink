# Frontend

React client, authored in **plain JavaScript** — no TypeScript in this workspace. Validation
schemas are imported from `../shared`, so a form reports the same errors the API enforces.

## Stack

- React 18 + Vite
- Tailwind CSS v4
- React Router 7
- Zustand for the auth session

## Layout

`src/components/ui/` holds all presentation and `src/pages/` holds only logic, so a restyle is a
contained change — the dark-and-amber theme was applied without touching a single page.

## Views

| View                    | Route                        | Status                              |
| ----------------------- | ---------------------------- | ----------------------------------- |
| Signup / login / verify | `/signup` `/login` `/verify` | Built                               |
| Goal feed               | `/`                          | Built — filterable, cursor-paged    |
| Create goal             | `/goals/new`                 | Built                               |
| Goal detail             | `/goals/:id`                 | Built; request management is Step 4 |
| Profile                 | `/profile` `/profile/:id`    | Built                               |
| Lobby chat              | —                            | Planned (Step 6)                    |
| Resource-request chat   | —                            | Planned (Step 7)                    |
| Reliability history     | —                            | Planned (Step 9)                    |
