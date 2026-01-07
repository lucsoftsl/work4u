# work4u - Development Setup Guide

## Quick Start

This is a Next.js job marketplace platform. Follow these steps to get started:

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
- Set `NEXT_PUBLIC_API_URL` to your backend REST base URL (or leave default)
- Toggle `NEXT_PUBLIC_API_USE_MOCKS` (defaults to mocks until backend is ready)
- Set a secure `NEXTAUTH_SECRET` if/when auth is added

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` 🚀

## Project Structure

```
work4u/
├── src/
│   ├── app/           # Next.js pages (App Router)
│   ├── components/    # React components
│   ├── lib/          # Utilities & helpers
│   ├── types/        # TypeScript definitions
│   └── data/         # Static data & constants
└── public/           # Static assets
```

## Key Features Implemented

✅ Home page with featured jobs
✅ Jobs listing page with filters
✅ Job posting wizard (4-step form)
✅ How it works page
✅ Responsive design
✅ API layer with axios mocks

## Next Steps

1. **REST Backend** - Point `NEXT_PUBLIC_API_URL` to your backend
2. **Authentication** - Implement NextAuth.js login/signup
3. **API Routes** - Create backend endpoints for jobs, applications
4. **Job Details** - Individual job page with applications
5. **User Profiles** - Profile pages and dashboards
6. **Messaging** - Direct messaging between users
7. **Payments** - Stripe integration for payments

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Design System

Built with:
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Radix UI** - Accessible components

## Planned API Resources

- **User** - Profiles with ratings
- **Job** - Job postings
- **Application** - Job applications
- **Review** - Ratings & feedback
- **Message** - Direct messaging
- **Conversation** - Message threads
- **Category** - Job categories

## Questions?

Refer to the [Full README](./README.md) for more detailed information.
