# API Routes

Backend REST API will be proxied here when ready. Currently the frontend uses axios with in-memory mocks (`src/api`).

Planned routes:
- GET `/api/jobs`
- GET `/api/jobs/:id`
- POST `/api/jobs`
- POST `/api/jobs/:id/apply`
- GET `/api/applications`

To switch from mocks to a real backend, set `NEXT_PUBLIC_API_URL` to your API base URL and `NEXT_PUBLIC_API_USE_MOCKS=false`.
