# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep React components focused on fetching, rendering, and accessible state. The app should use a shared API client, show loading/empty/error states, and make route-driven requests without embedding business logic.
- Logic tier decision: Implement server-side validation and response shaping in Express. Every route should reject malformed input with 4xx responses, verify referenced user/team records, and keep JSON payloads aligned with the contract.
- Data tier decision: Use Mongoose schemas as the source of truth for required fields, defaults, and relationship integrity. The seed script should remain idempotent so repeated runs preserve prior records while adding the expected baseline dataset.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; validate both IDs; persist the submitted references plus computed `points` and `occurredAt`; and reject invalid or missing foreign keys without letting cast errors become 500 responses.
- Team management approach: Require a `name` and `mascot` for create operations, default `members` to an empty array, and return team records with the submitted member references intact.
- Leaderboard approach: Aggregate points by team, sort descending by total, and assign 1-based ranks so the leaderboard matches the API contract exactly.
- Workout suggestions approach: Match the email to a seeded user, inspect the user goal or recent activity pattern, and recommend the best workout with a descriptive `reason` while returning a deliberate 4xx for unknown emails.

Smallest safe implementation order
The safest order is:

1. Data contracts first
   - Complete the Mongoose validation for the user, team, activity, and workout models.
   - This is the root cause of the failing data-tier tests and establishes the contract the API must respect.

2. Logic/API layer second
   - Implement the activity, team, leaderboard, and workout endpoints in the backend so they reject invalid requests with 4xx responses, aggregate points correctly, and generate workout suggestions from seeded user activity patterns.
   - This is the next dependency, because the frontend cannot satisfy its contract without valid backend behavior.

3. Presentation layer last
   - Add the React screens and API client logic to render data, display empty/loading/error states, and request the correct endpoint for a specific user.
   - This is safest last because it depends on stable backend contracts and data shapes.

This is the smallest safe sequence because it follows the architecture’s tier dependency: data defines the contract, logic enforces it, and the UI simply consumes it.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Current state: fails in 4 validation tests because `User`, `Team`, `Activity`, and `Workout` schemas are not enforcing the required fields yet.
  - The seed test passes, which means the data setup is largely correct even though the schema contract has not been enforced.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Current state: fails in 4 endpoint tests because invalid input still returns 501 instead of a 4xx, leaderboard data is empty, and workout suggestions are missing the required `reason` text and matching focus.
  - This confirms the server-side logic layer is the main missing implementation.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Current state: fails because the UI still renders “Implementation pending” and does not expose the required loading, empty, and accessible alert states.
  - This confirms the presentation layer is still stubbed and not connected to the API contract.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Run after the data and API contracts are fixed to verify TypeScript compilation in the logic/data tiers.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Run after the UI contract is implemented to verify the Vite/React app compiles cleanly with the final API contract.

The test plan mirrors the implementation order: start with validation, then logic, then presentation, and use each failing suite as the boundary check for the next tier
