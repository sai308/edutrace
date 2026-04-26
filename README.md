# EduTrace

Offline-first educational management app for tracking attendance, grades, and student/group records.

**Stack:** Vue 3 · TypeScript · Vite · IndexedDB (idb) · Tailwind CSS v4 · Reka UI · Vue I18n  
**Deployment:** Cloudflare Pages (SPA)

All data lives client-side in IndexedDB — no backend, no accounts, works fully offline as a PWA.

---

## Quick start

```bash
pnpm install
pnpm dev          # dev server at http://localhost:5173
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check + production build → `dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm check` | TypeScript type-check only |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm test:coverage` | Tests with coverage report |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm pwa:icons` | Regenerate PWA icons from `public/logo.svg` |

## Architecture

- **No backend.** All persistence is IndexedDB via `idb`, wrapped by `src/shared/services/DatabaseService.ts` (schema v17).
- **Access pattern:** Page → Service → Repository → DatabaseService
- **Workers:** Heavy CSV parsing and grade aggregation run in Web Workers via Comlink.
- **PWA:** Service worker precaches all static assets; navigateFallback for offline SPA routing.
- **Locales:** English (`en-US`) and Ukrainian (`uk-UA`) — `src/locales/`.
- **Workspaces:** Multiple isolated IndexedDB databases per device, metadata in `localStorage`.

See `CLAUDE.md` for full architecture documentation.

## Deployment (Cloudflare Pages)

Build command: `pnpm install --frozen-lockfile && pnpm build`  
Output directory: `dist`  
Node version: 22

`wrangler.jsonc` handles SPA routing (`not_found_handling`). `public/_headers` sets security headers.
