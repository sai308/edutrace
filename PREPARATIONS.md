# EduTrace — Deployment Preparations

Target platform: **Cloudflare Pages** (SPA, static output in `dist/`).

Priority tiers: **P0** blocks deploy · **P1** must ship with first release · **P2** polish · **P3** nice-to-have

---

## P0 — Blocks Deployment

### ~~1. Add `public/_redirects` for SPA routing~~ ✅ DONE

`public/_redirects` exists with `/* /index.html 200`.

---

### ~~2. Fix failing tests~~ ✅ DONE

All 817 tests passing.

---

### ~~3. Fix broken lint~~ ✅ DONE

`pnpm lint` exits with 0 errors (5 warnings).

---

## P1 — Must Ship With First Release

### ~~4. Bump `package.json` version from `0.0.0`~~ ✅ DONE

Version is `1.0.0`.

---

### ~~5. Add `public/_headers` — security headers~~ ✅ DONE

`public/_headers` exists with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

---

### ~~6. Add `dev-dist/` to `.gitignore`~~ ✅ DONE

`dev-dist` and `artifacts` both in `.gitignore`, not tracked.

---

### ~~7. Replace README~~ ✅ DONE

README has project description, quick start, commands, architecture overview, and Cloudflare deploy config.

---

## P2 — Polish Before Going Live

### ~~8. Add Cloudflare Pages build config~~ ✅ DONE

`pages.toml` exists with correct build command, output dir, and Node 22.

---

### ~~9. Add OG / social meta tags to `index.html`~~ ✅ DONE

`og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` all present. Deploy URL: `https://trace.eduflow.solutions`.

---

### ~~10. Fix missing i18n keys~~ ✅ DONE

All three keys already present in both locale files.

---

### ~~11. Add build step to CI~~ ✅ DONE

`ci.yml` already has `pnpm build` step after tests.

---

### ~~12. Fix `@ts-ignore` suppressions~~ ✅ DONE

No `@ts-ignore` or unexlained suppressions remain. `locale.ts` and `workspace.repository.ts` fixed with proper typing and `eslint-disable` comments.

---

### ~~13. Fix hardcoded `lang="en"` on `<html>`~~ ✅ DONE

`App.vue` sets `document.documentElement.lang = locale.value` reactively.

---

## P3 — Nice to Have

### 14. Audit `vendor` chunk (403 KB raw / 136 KB gzip)

`manualChunks` routes all unmatched `node_modules` to a generic `vendor` chunk. At 403 KB it's the largest single chunk. Run `npx vite-bundle-visualizer` (or `rollup-plugin-visualizer`) to see what's inside and whether any large deps can be moved to a lazy-loaded chunk.

### ~~15. Remove dev-only scripts from repo root~~ ✅ DONE

`screenshot.mjs` and `screenshot-mobile.mjs` moved to `scripts/`.

### ~~16. Clean up committed artifacts~~ ✅ DONE

`artifacts/` in `.gitignore`, not tracked in git.

### ~~17. Type untyped components~~ ✅ DONE

`WorkspaceSelectionModal.vue`, `SettingsModal.vue`, `NumberInput.vue` all have `lang="ts"`. Type-check passes clean.

---

## Deployment Checklist

Before pushing to Cloudflare Pages for the first time:

- [x] `public/_redirects` exists with `/* /index.html 200`
- [x] `public/_headers` exists with security headers
- [x] `pnpm build` completes without errors locally
- [x] `pnpm test` passes (0 failures)
- [x] `pnpm lint` passes (0 errors)
- [x] `package.json` version is not `0.0.0`
- [x] `dev-dist/` removed from git tracking
- [ ] Cloudflare Pages project: build command `pnpm build`, output dir `dist`, Node 22
- [ ] Custom domain DNS configured (if applicable)
- [ ] PWA tested via `pnpm preview` before deploy (SW only active in production build)
