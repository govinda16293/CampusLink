# Frontend

React client, authored in **plain JavaScript** — no TypeScript in this workspace. Validation
schemas are imported from `../shared`, so a form reports the same errors the API enforces.

## Stack

- React 18 + Vite
- Tailwind CSS v4
- React Router 7
- Zustand for the auth session

## Layout

`src/components/ui/` holds the presentation and `src/pages/` holds the logic and copy. Every
colour and material lives in `src/index.css` as a token — the Liquid Glass theme's `.glass`,
`.glass-bar` and `.glass-control` surfaces, and semantic colours such as `text-label-secondary` and
`bg-accent` — so a restyle is a change to that file and the `ui/` components.

## Theme

Apple Liquid Glass (iOS 26) over a blurred campus photograph (`src/assets/backdrop.jpg`): light
translucent panels with a specular rim, capsule controls, a floating tab bar with a sliding
selection, and dark SF labels. Every text colour was measured on the rendered glass and holds at
least 4.5:1. Reduced-transparency and reduced-motion settings are honoured.

## Views

| View                    | Route                        | Status                                     |
| ----------------------- | ---------------------------- | ------------------------------------------ |
| Signup / login / verify | `/signup` `/login` `/verify` | Built                                      |
| Goal feed               | `/`                          | Built — filterable, cursor-paged           |
| Create goal             | `/goals/new`                 | Built                                      |
| Goal detail             | `/goals/:id`                 | Built — request, accept, decline, withdraw |
| Profile                 | `/profile` `/profile/:id`    | Built                                      |
| Lobby chat              | —                            | Planned (Step 6)                           |
| Resource-request chat   | —                            | Planned (Step 7)                           |
| Reliability history     | —                            | Planned (Step 9)                           |
