# ChaosDeck

MTG deckbuilder + goldfish-plus playtester. See `mtg-deckbuilder-playtester-spec.md` for the full design spec, and the `mtg-tester` project in ChaosPatch for tracked work.

Stack: Next.js (App Router) + TypeScript + Tailwind, Convex (data + real-time game state sync), Clerk (auth).

## First-time setup

1. `pnpm install`
2. `npx convex dev` — logs you into Convex and links a deployment; writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.
3. Create a Clerk app, add a JWT template named `convex` (Clerk's Convex integration guide covers this), and copy `.env.local.example` values into `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_JWT_ISSUER_DOMAIN`
4. `pnpm dev`

## Getting Started

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).
