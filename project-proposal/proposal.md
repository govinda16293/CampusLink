# CampusLink

### A Goal-Matching & Resource-Sharing Platform for College Campuses

**Project Proposal for UCS503**

Submitted to: Lab Instructor  
Thapar Institute of Engineering and Technology

Team:

- Govind, CSED - Roll No: TBD, Email: TBD
- Teammate 1, CSED - Roll No: TBD, Email: TBD
- Teammate 2, CSED - Roll No: TBD, Email: TBD

August 2026

## 1. Higher-Order Goal

The broader aim of this project is to make it easier for students on a large campus to find people to do things with, whether it is a spontaneous plan, a recurring need like a gym partner, or sharing class notes. Most campuses already solve this informally through WhatsApp groups and friend circles, but that only works if a student already knows the right people. CampusLink tries to close that gap by surfacing students who want the same thing at the same time and giving the interaction enough structure to feel safe.

## 2. Problem Statement

On a residential campus with thousands of students, everyday coordination still happens through fragmented informal channels such as batch WhatsApp groups, hostel groups, and word of mouth.

Recurring pain points include:

- Limited reach when students do not personally know someone available for the same plan.
- No structured trust layer for interacting with strangers.
- Inefficient notes/resource sharing across scattered groups.
- No accountability for repeated no-shows or unreliable participation.

## 3. Proposed Solution

CampusLink is a companion-matching platform built around a simple loop: a student posts a goal, the goal appears on the public campus feed, interested students request to join, and once enough people are accepted, a lobby forms.

The same post, request, and fulfilment loop also supports academic resource sharing. A student can post that they need notes for a subject, and responders can contact them through private chat.

## 4. Core Workflow

1. Post: create a goal with category, description, date/time, and headcount.
2. Discover: browse and filter goals by category and date.
3. Request: request to join, with poster approval or auto-accept.
4. Coordinate and close: chat in-app, meet, confirm completion, and leave feedback.

## 5. Key Features

### MVP

- College email verification.
- Post goals with category, description, date/time, and headcount.
- Public feed with filters.
- Request-to-join flow.
- Basic profiles.
- In-app lobby chat.
- Notes/resource request category with private chat.

### Trust and Safety

- Report and block controls.
- Gender-preference filters for specific goals.
- Anonymous posting on public feed before acceptance.
- Visible reliability score.
- No-show flagging.

### Matching Intelligence

- Rule-based suggestions from interests, branch, and previous categories.
- Hostel-block or proximity-based matching.
- Priority queueing based on reliability and profile completeness.

### Post-Match Lifecycle

- Completion confirmation.
- Ratings and feedback.
- Auto-archiving of completed or expired goals.

## 6. Solution Approach

CampusLink will be implemented as a standard 3-tier web application. The matching logic will remain rule-based so the project stays focused on software engineering, workflow correctness, and user safety rather than machine-learning research.

## 7. Architecture

- Frontend: React, Vite, Tailwind CSS, React Router, Zustand or Redux Toolkit.
- Backend: Node.js with Express or NestJS.
- Database: MongoDB or PostgreSQL.
- Real-time layer: Socket.IO.
- Authentication: JWT with college email OTP verification.
- File storage: Cloudinary or Firebase.
- Deployment: Vercel for frontend and Render/Railway for backend.

## 8. Evaluation Criteria

Primary metric:

- Lobby fulfilment rate.

Secondary metrics:

- Time-to-first-request.
- No-show rate.
- Resource-request response rate.
- User-reported clarity and safety.

## 9. Project Scope and Deliverables

### Iteration 1 - Core MVP

- Signup/login.
- Profile pages.
- Goal posting and feed.
- Request-to-join and lobby state management.
- Basic CI.

### Iteration 2 - Trust, Safety, and Real-Time

- Socket.IO chat.
- Report/block controls.
- Gender-preference filter.
- Anonymous posting.
- No-show flagging.
- Match suggestions.
- Ratings and feedback.

### Iteration 3 - Polish and Deploy

- Responsive UI.
- Unit and integration tests.
- Deployment.
- README and demo video.

## 10. Risks and Mitigations

- Stranger meetup safety: partially mitigated through reliability scores, report/block, and gender filters.
- Cold-start problem: seeded pilot goals will be used during testing.
- Anonymity misuse: admins can unmask identity for moderation after reports.
- Low adoption during the course timeline: pilot will be limited to a small test group.

## 11. Summary

CampusLink aims to solve an everyday campus problem: finding reliable people for shared goals beyond existing friend circles. The project focuses on the core workflow and trust layer needed to make stranger-to-stranger campus interaction practical within the UCS503P timeline.

