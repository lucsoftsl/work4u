# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

work4u is a Next.js 16 (App Router, React 19) frontend for a job/gig marketplace with an MMORPG-style gamification layer bolted on top (XP, levels, quests, achievements, gold). It talks to a separate Fastify backend (`work4u-api`, sibling repo) over REST + a WebSocket for chat. This repo has no local database and no server-side auth of its own — auth is Firebase client SDK, persisted profile data lives in the backend's MySQL.

## Commands

```bash
npm run dev                    # start dev server (localhost:3000)
npm run build                  # production build
npm run start                  # start production build
npm run lint                   # eslint
npm run test:landing-contract  # node --test tests/landing-contract.test.mjs (unit tests for the landing payload contract)
npm run check:landing-api      # scripts/verify-landing-api.mjs — hits GET /api/landing and fails if the response violates the contract in src/types/landing.ts
```

There is no general unit/component test suite — `landing-contract` is the only automated test target. `tsc` has no dedicated script; type-check via `next build` or your editor's TS server.

## Environment

Local env file is `.env` at the repo root (not `.env.example` — none exists despite README/SETUP.md references to one). Key vars:
- `NEXT_PUBLIC_API_URL` — backend base URL (defaults to `http://localhost:3001` throughout the code; note some docs say 4000, the code says 3001 — trust the code)
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config (`src/lib/firebase.ts`)
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — declared as dependencies (`next-auth`) but not wired into any route yet

## Architecture

### Backend split
This is the frontend only. Business logic, MySQL persistence, and Firebase Admin token verification all live in the sibling `work4u-api` repo. Two ways this repo reaches the backend:
1. **Direct browser → backend calls** (most API usage) — hits `NEXT_PUBLIC_API_URL` directly from client components.
2. **Next.js API route as a proxy** — only `src/app/api/landing/route.ts` does this today: it forwards `GET /api/landing` server-side to the backend and passes the response through unchanged (including status/content-type), returning 502 on upstream failure. This exists so the landing page can be server-rendered without exposing the backend URL requirement to the client bundle.

### Three parallel HTTP client patterns (not consolidated — expect to see all three)
- `src/api/index.ts` — an axios instance, used for chat/user calls (`fetchConversations`, `deleteUserAccount`, etc.)
- `src/lib/api.ts` — raw `fetch`, used for the jobs CRUD surface (`listJobs`, `createJob`, `boostJob`, ...)
- `src/lib/auth-service.ts` and other lib files — more raw `fetch` calls, duplicated base-URL resolution (`process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`) in each file rather than a shared constant
There is no single canonical API client — when adding a new backend call, match whichever pattern the neighboring code in that feature area already uses rather than inventing a fourth.

### Auth flow (Firebase client SDK, dual state)
1. `src/lib/firebase.ts` initializes the Firebase client app; `AuthContext` (`src/context/AuthContext.tsx`) subscribes to `onAuthStateChanged`.
2. On sign-in, it fetches the Firebase ID token, calls `getAuthUserFromFirebaseUser` (`src/lib/auth-service.ts`) to hydrate the full profile from the backend, and pushes the user into **both** React Context (`AuthContext`) and Redux (`authSlice`) — these are two parallel sources of truth for the same user, kept in sync manually in the context provider.
3. A plain `work4u_auth=1` cookie is set/cleared alongside auth state purely so `middleware.ts` (root) can redirect already-authenticated users away from `/signin` and `/signup`. This cookie is not used for any server-side authorization — it's UX-only routing.
4. Every authenticated backend request carries the Firebase ID token as a `Bearer` header, verified by the backend's Firebase Admin SDK.

### State management
- **Redux Toolkit** (`src/store`) — `authSlice` (mirrors AuthContext user) and `gamificationSlice` (player XP/level/gold/quests, fairly large reducer).
- **React Context** — `AuthContext` (source of truth for Firebase auth + token) and `ChatContext` (`src/context/ChatContext.tsx`).
- **`Providers`** (`src/app/providers.tsx`) nests them: `LocaleProvider` → Redux `Provider` → `AuthProvider` → `ChatProvider` → gamification initializer. Order matters — gamification init depends on auth being resolved.

### Gamification subsystem
A significant chunk of the app. See `GAMIFICATION.md` and `GAMIFICATION_QUICKSTART.md` for the full design (levels, quest types, rarity tiers derived from job budget, achievements, streaks). Code lives in `src/components/gamification/`, `src/store/slices/gamificationSlice.ts`, `src/lib/gamification-utils.ts`, `src/data/gamification.ts`, and is initialized via `useInitializeGamification` in `providers.tsx`. Admin authoring UI for quests/achievements is under `src/app/admin/` + `src/components/admin/`.

### Landing page — contract-first, not mock-first
Despite README wording, there is no mock data file anymore. The home page fetches through the `/api/landing` proxy route and validates the response at runtime against a Zod schema in `src/types/landing.ts`. If the shape doesn't match, rendering fails loudly rather than silently falling back — this is intentional (see `LANDING_API_SCHEMA.md`, `LANDING_BACKEND_TODO.md`). `LANDING_DB_MIGRATION.sql` / `LANDING_API_CONTRACT_MIGRATION.sql` at the repo root are copies of backend migrations kept here for reference; the source of truth for those lives in `work4u-api/src/db/migrations`. Use `http/landing.http` for manual endpoint testing.

### Chat / WebSocket
`useChatWebSocket` (`src/hooks/useChatWebSocket.ts`) connects to `ws://localhost:3001/api/messages/ws?token=<firebaseToken>` — **this URL is hardcoded**, unlike the REST calls elsewhere which respect `NEXT_PUBLIC_API_URL`. It will not work against a non-localhost backend until fixed. Falls back to HTTP POST `/api/messages` if the socket isn't open. Message envelope has a `type` discriminator (`ready`, `message`, `messageRead`, `error`).

### i18n
`src/locales/{en,fr,es}.json` + `getTranslator(locale)` in `src/lib/i18n.tsx`, exposed via `LocaleProvider`.

### Currency/category utilities
`src/lib/category-utils.ts` and `src/data/categories.ts`, `src/data/currencies.json`, `src/data/countries.json` back the job posting/filtering forms (`react-currency-input-field`, `currency-flags`).

## Known repo-wide gotchas
- Root `SETUP.md` describes a Prisma + PostgreSQL setup (`db:push`, `db:studio`) that does not exist in this codebase (no `prisma` dependency, no such scripts in `package.json`). Ignore it — the real backend is the separate Fastify/MySQL `work4u-api` repo reached over REST.
- `work4u-api/.env.example` (sibling repo) is committed to git with what appear to be live Firebase and TiDB credentials, not placeholders. If you're touching backend env/config, flag this rather than assuming it's safe to reference or extend as-is.
