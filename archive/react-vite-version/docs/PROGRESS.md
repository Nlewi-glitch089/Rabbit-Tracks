# Rabbit Trails: Progress

Status key: **Complete** · **In progress** · **Not started** · **Blocked** · **Needs verification**

_Last updated October 20, 2026_

## Checklist

| Item | Status | Evidence / notes |
| --- | --- | --- |
| Existing work inspected | Complete | Read every file. Node 24.21.0, npm 11.19.0, and Git 2.56.0 are installed, but this terminal didn't have them on its PATH yet |
| Original wireframe preserved | Complete | Backed up byte-for-byte (hash-checked) in `archive/original-wireframe/`. The earlier plain-JS front end is in `archive/plain-js-front-end/` |
| Wireframe replaced with new design | Complete | `wireframes/rabbit-tracks-wireframe.*` and `Demo/trails-wireframe/rabbit-tracks-wireframe.*` are now the new design, built by `npm run build:wireframe`. They open by double-click; 45/45 checks pass when opened from `file://` |
| New design direction established | Complete | See [DESIGN.md](DESIGN.md) |
| Dashboard redesigned | Complete | `pages/Dashboard.jsx`, `styles/dashboard.css` |
| Trail form redesigned | Complete | `pages/TrailFormPage.jsx` |
| Discovery path redesigned | Complete | `pages/TrailPage.jsx`, `styles/trail.css` |
| Discovery form redesigned | Complete | `pages/DiscoveryFormPage.jsx`, with placement control and "Where it goes" preview |
| Settings redesigned | Complete | `components/SettingsDialog.jsx` |
| Empty and error states | Complete | Empty dashboard, empty trail, loading, load error, not found, save error, validation |
| Responsive layouts | Complete | Screenshots at 1280px and 390px in `docs/screenshots/` |
| README updated | Complete | |
| Front-end interactions tested | Complete (automated) / **Needs verification** (manual) | 45/45 scripted checks pass in headless Edge. A manual click-through in a regular browser hasn't been done |
| API integration requirements documented | Complete | README → Planned API. `api.js` already implements the client |
| Git commit of current work | **Blocked** | Git has no `user.name`/`user.email` configured, so nothing has been committed. That needs to be set up first |
| Backend / database | Not started | Out of scope this week |

## What the automated test covers

Run against a production build in headless Microsoft Edge:

- **Reading:** dashboard order, trail page, milestones, time gaps
- **Creating:** a trail from the dashboard's question box, and a discovery added at the end and
  at step 1
- **Editing:** a trail, and a discovery including moving it
- **Deleting:** discoveries and trails, from the trail page and from dashboard cards, with
  Cancel and Esc
- **Validation:** required fields, bad URLs, focus moving to the first error
- **Persistence:** changes reach `localStorage`
- **Navigation:** Back button, not-found routes, skip link
- **Settings:** clear and reset
- No JavaScript errors throughout

In API mode with no server running, the dashboard shows an error panel ("Nothing answered at
/api/trails…") and a trail shows "not found". `npm run dev` was also started and confirmed to
serve the app.

## Decisions

| Date | Decision | Why |
| --- | --- | --- |
| Oct 20 | Name is **Rabbit Trails**, a standalone product. Removed "Rabbit Hole Trails" wording everywhere outside the archived original | Project identity |
| Oct 20 | React 19 + Vite 8, with 4 packages total | Approved by Leon, Node is installed, every screen was being rewritten anyway, and it fits the eventual full-stack app |
| Oct 20 | No router library; a small hash router instead | Six screens. Works on any static host or behind Express without fallback configuration |
| Oct 20 | React app lives at the project root (moved out of `client/`) | So `npm install` / `npm run dev` work directly in `Rabbit-Tracks`. A backend can go in `server/` later |
| Oct 20 | Doorway + dotted path as the visual language; playing cards only on milestones | See DESIGN.md |
| Oct 20 | Data notice is one footer line plus Settings, not a banner | Honest without being the centerpiece |
| Oct 20 | Discoveries have a placement option (`position`) | Lets you fix the order when something gets added late |

## Bug log

| Problem | Cause | Fix |
| --- | --- | --- |
| The new design couldn't be seen, and it wasn't clear where to run it | The React app was nested in a `client/` subfolder and the run steps weren't spelled out. | Moved the app to the project root and rewrote README → Running it step by step |
| The new design couldn't be seen by opening the wireframe | It only existed as a React app that needs `npm run dev`. Separately, after `trails-wireframe/` was renamed, its HTML still linked the old `rabbit-hole-trails-*` CSS/JS, so it opened blank | Added `npm run build:wireframe`, which writes the new design as plain files that open from disk, and replaced the wireframe files with them |
| If `/api` returned HTML (e.g. Vite's fallback page), the dashboard would crash on `null` | `api.js` treated a non-JSON 200 as empty data | Non-JSON responses now throw a clear error |
| In API mode, a missing API showed "This trail isn't here" on the dashboard | Every 404 was treated as "trail not found" | The dashboard now shows a load error for 404s |
| Expected 404s were logged with `console.error` | Over-eager logging | 404s now log as warnings; real failures still log as errors |
| From the previous session: the confirm dialog waited for a `close` event that headless Edge never fired | Relied on `close` | Dialog buttons now resolve the confirmation directly, and Esc is handled through `cancel` |

## Open questions

1. **Backend stack:** does Leon or the assignment require a specific database? Express plus
   MongoDB is the likely fit, but it isn't confirmed.
2. The original *Rabbit Hole* wireframe CSS that the old wireframe mentions isn't on this laptop.
   Rabbit Trails doesn't depend on it, so this only matters if you need it for something else.

## Next steps

1. Follow README → **Running it**: reopen VS Code on the `Rabbit-Tracks` folder, run `npm install`
   and then `npm run dev`, and click through every screen yourself.
2. Set your Git identity (`git config --global user.name "…"` and `user.email`), then make a first
   commit and push to GitHub.
3. Next phase: build the Express API to match the README contract, add the Vite `/api` proxy, set
   `VITE_DATA_SOURCE=api`, and retest every create/read/update/delete through the UI.
