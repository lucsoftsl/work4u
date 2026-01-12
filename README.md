# work4u - Job & Gig Marketplace

A modern Next.js app for posting and finding jobs/gigs. Uses REST APIs via axios with mock data until the backend is ready.

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```
Visit http://localhost:3000.

## ⚙️ Environment

- `NEXT_PUBLIC_API_URL` — backend REST base URL (default http://localhost:4000)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — optional if/when auth is added

## 🛠️ Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- axios for REST calls (mocks by default)
- Radix UI primitives, CVA, clsx, tailwind-merge
- React Hook Form + Zod (for forms/validation)

## 📂 Structure
```
src/
	app/          # pages
	components/   # UI & feature components
	api/          # axios client + mocks
	lib/          # utilities & i18n
	locales/      # en/fr/es translations
	data/         # static data
	types/        # shared types
```

## 🌐 i18n
Translations live in `src/locales/{en,fr,es}.json` with a helper `getTranslator(locale)` in `src/lib/i18n.ts`.

## 🧭 Key Pages
- `/` Home (hero, categories, featured jobs)
- `/jobs` Listings with filters/sorting
- `/post-job` Multi-step job posting form (uses mocks/logging for now)
- `/how-it-works` Platform overview

## 📝 Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — start production build
- `npm run lint` — lint

## 🧪 Mock Data
See `src/api/mocks.ts` for editable in-memory seed data.
