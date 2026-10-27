# Rabbit Tracks: Progress

Status key: **Complete** · **In progress** · **Not started** · **Blocked** · **Needs verification**

_Last updated October 27, 2026_

## Checklist

| Item | Status | Notes |
| --- | --- | --- |
| Wireframe repaired | Complete | Kept outside this repository in `rabbit-tracks-wireframe/`. An earlier version is backed up in `archive/original-wireframe/`; all three files differ from the current wireframe. |
| React/Vite version archived | Complete | `archive/react-vite-version/`. The archived version is retained for reference. |
| Vanilla front end: all screens and actions | Complete | `index.html`, `css/`, `js/`, `images/` |
| Visual redesign ("modern curiosity journal") | Complete | October 20; replaced by the October 26 redesign |
| Renamed to Rabbit Tracks | Complete | Oct 26. Wordmark, title, metadata, Settings, footer, logs, docs, favicon, screenshots. The MongoDB database name `rabbit_trails` is unchanged so existing data still loads. |
| Product redesign (dashboard, trail page, forms, Settings) | Complete | Oct 26. See DESIGN.md |
| Interaction and gamification polish | Complete | Oct 26. Milestone details, route and step tips, discovery and progress animations, one "New trail" button. See DESIGN.md → Interactions |
| Wonderland redesign | Complete | Oct 26. Illustrated welcome, chapters, curiosity cabinet, nudge, winding journey, milestone emblems, Quick find + journal, optional `highlight` field. See DESIGN.md → Wonderland redesign |
| Onboarding, cabinet, Settings, White Rabbit | Complete | Oct 26. Welcome, guided tour, example labels, dashboard grid rebalanced, cabinet redesigned with detail view, sectioned Settings with Reduce motion and safer Clear/Restore. See DESIGN.md → Onboarding, the cabinet, and Settings |
| Manual review in a regular browser | **Needs verification** | Especially the path draw-in, the welcome illustration, and the journal on a real phone |
| Validation, dialogs, empty/error states | Complete | See testing below |
| Responsive layout | Complete | Checked at 1280px, 390px, and 375px |
| Manual testing in a regular browser | **Needs verification** | All testing so far has been automated, in headless Microsoft Edge and Chrome |
| Milestones (light gamification) | Complete | `js/milestones.js`; progress on every card, milestone stops on the timeline, achievement card. See DESIGN.md |
| Starter API | Complete | `server/`: Express 5 + MongoDB driver, 8 CRUD endpoints + `/api/health`. 17 API tests pass (Oct 27). |
| Connect front end to API | Complete | `js/api.js`, used automatically when the page is served over http(s) |
| Permanent data storage | Complete (API mode) | MongoDB. Opening `index.html` from disk still uses sample data that resets on reload. |
| Tested against a real MongoDB Atlas or installed MongoDB | **Needs verification** | Tested against MongoDB 8.2.6 started by `mongodb-memory-server` and as a standalone `mongod` from the same binary. Not yet tested with Atlas. |
| Deployment | Not started | Runs locally only |
| Preview mode without MongoDB | Complete | `npm run preview` in `server/`: real front end, sample data, no API calls, no preview banner or label in the interface (removed Oct 26). 11 preview/start-up tests + 124 browser checks pass (Oct 27). |
| Remove archived `node_modules/`, `dist/`, `wireframes-build/` | Not started | About 47 MB, all recreatable and ignored by Git |

## Pre-push audit (October 27, 2026)

- **Automated tests** (`cd server && npm test`): **32 of 32 pass.**
- **Preview, in a browser** (headless Chrome against `npm run preview`; script not in this
  repository): **124 of 124 pass.** That's the 119 below plus 5 checks that typed HTML stays text
  (cabinet, Look closer, chapters) and that `javascript:` links are refused. Two of those checks
  first failed because they read the first cabinet card, which was another discovery saved the
  same day; the app was correct (no elements created), and the checks now find the card by its text.
- **Full app, in a browser** (headless Chrome against `server.js` and a throwaway, seeded
  `mongodb-memory-server` database): **21 of 21 pass.**
- **Security:** no credentials, keys, or connection strings with passwords in the working tree or
  Git history; `server/.env` is ignored and only has the local default; `npm audit` finds 0
  vulnerabilities in `server/` and in the archived React lockfile. User text reaches the page only
  through `escapeHtml` or `textContent`, and saved links must be `http(s)`.
- **Screenshots:** all 22 regenerated from preview mode and compared. They already matched the
  current app (14 byte-for-byte; the rest differ only in date-relative text), so the committed
  copies were kept.
- **Docs:** DESIGN.md's "Screens" summary updated from the pre-Wonderland dashboard.

## Testing done (October 26, 2026): onboarding, cabinet, and Settings

- **Automated tests** (`cd server && npm test`): **32 of 32 pass** (17 API, 4 milestone, 11 preview
  and start-up). New: every guided-tour stop names a `data-tour` element that exists; every button
  and switch in Settings has a handler (so no control is decorative).
- **Preview, in a browser** (headless Chrome against `npm run preview`; script not in this
  repository): **119 of 119 pass**, on four consecutive runs at the end.
  - Welcome: opens once for a new visitor with focus on its title; Skip and Esc close it and are
    remembered; a reload doesn't bring it back; Settings → Show the welcome reopens it
  - Tour: Begin exploring starts it; "Stop N of 7"; the page behind is inert and Tab stays in the
    card; each of the 7 stops highlights its real element with the card inside the viewport; the
    Quick find stop opens the most recent trail and Back returns to the dashboard; Finish, Esc, →,
    Settings → Take the tour again; the page is usable again afterwards; an empty journal gets a
    three-stop tour
  - Examples: 4 Example tags; the note dismisses and stays dismissed; still exactly one "New
    trail" link (plus the empty state's)
  - Layout: the cabinet spans the grid under both columns; chapters and side column end within
    120px with 4 trails; one trail switches to the compact layout with the cabinet beside the side
    column
  - Cabinet: the 4 newest in order, counts, source/trail/date on every card, the highlight, safe
    new-tab links, full titles kept, decorative windows hidden; Show more (4 → 8 → 14) with focus on
    the first new card, Show fewer; Look closer (full note, Esc returns focus), Open on its trail,
    title link; a quick find shows the "Add what you learned" fallback; the empty-shelf and
    open-slot cards
  - White Rabbit: question shown, `aria-expanded`, accessible name, a different question each ask,
    the late message on the fifth ask only, Esc returns focus, works with Enter; Follow this
    question prefills the form, focuses the title, and creates nothing
  - Settings: storage text; sample tools shown, API notes hidden; Restore names "4 trails and 15
    discoveries" and keeps an unsaved new trail form; Clear all names what it deletes, warns about
    unsaved Quick find text, Cancel clears nothing, **a forced failure shows "Nothing was changed",
    keeps Settings open, and keeps every trail**; then Clear all shows the empty dashboard and is
    disabled with nothing to clear
  - Reduce motion: the switch sets and remembers it and turns animations off; with the device
    setting on, the switch shows on and is locked
  - Regressions: Quick find 3 → 4, journal entry 4 → 5 fires Deep dive exactly once, editing doesn't
    duplicate or celebrate
  - 375px: welcome, every tour stop (bottom sheet, highlight above it), the dashboard, the rabbit's
    question, the detail dialog, Settings, a trail, both forms: no horizontal scrolling. 820px
    (2-column cabinet) and 1600px (4-column) too
  - No `/api` requests; no page errors other than the one the forced failure logs on purpose
- **Full app, in a browser** (headless Chrome against `server.js` and a throwaway, seeded
  `mongodb-memory-server` database; your `.env` and database weren't used): **21 of 21 pass.** Seeded
  trails tagged Example, welcome and tour (opening a real trail by its ObjectId), Settings says
  "Saved on the server" and "Connected" and offers no Restore/Clear all, the rabbit's question
  prefills only, the trail and a quick find are saved and still there after a reload (and not
  tagged Example), no duplicates in the database, no page errors.
- **Found and fixed while testing:** after Clear all, the cabinet's open slot read the first
  trail of an empty list and the dashboard failed to load; the slot now only appears when there's a
  trail to add to. The tour's spotlight could be measured while a newly opened screen was still
  sliding in; it now follows its target until the screen settles.
- **Not tested:** Firefox and Safari, real phones, screen readers (the tour's dialog semantics and
  the cabinet's reading order in particular), and a real Atlas or installed MongoDB. Animations were
  only checked as on or off.

## Testing done (October 26, 2026): Wonderland redesign

- **Automated tests** (`cd server && npm test`): **30 of 30 pass** (17 API, 4 milestone, 9 preview
  and start-up). New: the optional `highlight` is saved, edited in place without duplicating, and
  limited to 200 characters; the journal's field limits match the API's.
- **Preview, in a browser** (headless Chrome, `npm run preview` with every `MONGODB_*` variable
  removed; script not in this repository): **66 of 66 pass.**
  - Welcome tally, decorative scene (hidden from screen readers, not focusable), one "New trail"
  - Chapters (suit, question, 10-step track, last stop, next milestone, numbering), icon tools with
    names, card body not a link, step tips on hover
  - Next destination, achievements (3 reached, 1 in progress, with details by click, Enter, Esc,
    click-outside, and touch), the nudge's real last stop, the cabinet with highlights
  - Journey: 10 stops alternating sides, path drawn with tracks and drawing in on open, colour stage,
    decorative markers, milestone details
  - Quick find: header button focuses it; empty and bad-URL errors save nothing; **a forced save
    failure shows the message, keeps the text, and adds nothing, with no toast or celebration**;
    5 → 6 saves with the plain toast and no event
  - "Write a journal entry instead" carries the text; Cancel saves nothing; Quick/Journal switch;
    counters; 4 → 5 journal entry fires Deep dive once, with the ripple and the card's set of four;
    editing fills every field, saves in place, and doesn't celebrate
  - Delete discovery, edit/create trail, first quick find reaches First find, delete trail from its
    chapter, Settings Esc, Clear all (empty dashboard still invites a question), Reset
  - Reduced motion: no path draw-in, no new-stop or line animation, saving still works
  - 375px: one-column journey, no horizontal scrolling on any screen
  - No `/api` requests; no page errors other than the one the forced failure logs on purpose
- **Full app, in a browser** (headless Chrome against `server.js` and a throwaway, seeded
  `mongodb-memory-server` database): **14 of 14 pass**, including a journal entry with a highlight
  and a quick find, both still there after a full reload.
- **Found and fixed while testing:** the path's draw-in was being cancelled by the redraw that runs
  when the trail screen first lays out; the path is now reshaped in place instead of rebuilt.
- **Not tested:** a real MongoDB Atlas or installed MongoDB, Firefox and Safari, real phones, and
  screen readers. The animations have only been checked as on or off, not watched.

## Testing done (October 26, 2026): interaction polish

- **Automated tests** (`cd server && npm test`): **28 of 28 pass** (16 API, 4 milestone, 8 preview
  and start-up).
- **Preview, in a browser** (headless Chrome, `npm run preview` with every `MONGODB_*` variable
  removed; script not in this repository): **56 of 56 pass**, run once on a fresh preview and once
  against the preview on port 3000.
  - One visible "New trail" link (the header), which opens the form
  - Milestones panel: "Next up" on Deep dive, progress on unreached milestones; details open by
    click, Enter, and touch; close by Esc (focus returns), Space, a click elsewhere, the close button
  - Route links with accessible names and a tooltip on keyboard focus; step tips on hover; clicking a
    card's body doesn't navigate; "Open" does
  - Trail page details: "Reached on Oct 3, 2026, with step 1"; only one open at a time
  - Adding 5 → 6: count 6, new discovery highlighted, the line grows 0 → 0.2, plain toast, no event.
    Adding 4 → 5: achievement card, exactly one `rabbittracks:milestone` event, no extra toast, Deep
    dive reached and highlighted; re-opening the trail doesn't repeat it
  - Delete discovery, edit and create trail, Settings Esc, Clear all, Reset
  - Reduced motion: no discovery or line animation, no hover lift
  - 375px: no horizontal scrolling on any screen, including with milestone details open
  - No `/api` requests, no page errors
- **Full app, in a browser** (headless Chrome against `server.js` with a throwaway
  `mongodb-memory-server` database, seeded; your `.env` and database weren't used): **13 of 13
  pass.** API mode, seeded data, milestone details, adding the discovery that reaches Deep dive
  (POST to the API, achievement card, one event), still there after a full reload, Settings says
  "Connected", no page errors.
- **Not tested:** a real MongoDB Atlas or installed MongoDB, Firefox and Safari, real phones, and
  screen readers.

## Testing done (October 26, 2026): Rabbit Tracks redesign

- **Automated tests** (`cd server && npm test`): **26 of 26 pass** (16 API, 4 milestone, 6 preview
  and start-up).
- **Browser checks** (headless Chrome against `npm run preview` with no MongoDB settings; script not
  included in this repository): **36 of 36 pass.**
  - Name: title, wordmark, footer, Settings, and the preview's terminal output say Rabbit Tracks; no
    "Rabbit Trails" or "Preview mode" text on the page
  - Dashboard: ledger totals (4 trails, 14 discoveries, 8 milestones), the route with four milestone
    flags, four cards each with a 10-step track, the milestones panel, the closest-milestone nudge,
    five recent discoveries
  - Trail page: the question, the current milestone, three reached stations, five discoveries and
    three milestone stops on the timeline
  - A save that reaches no milestone shows the "Discovery added" toast and no achievement card; a
    save that reaches *Deep dive* shows the achievement card, tells screen readers, highlights the
    new stop, and can be dismissed
  - Delete a discovery, create a trail (an empty form focuses the first error), Settings → Reset
  - Keyboard: focus moves to each screen's heading; Tab reaches the next link with a visible ring
  - No horizontal scrolling at 375px on the dashboard, a trail, or either form
  - No requests to `/api`, no page errors
- **Screenshots** in `docs/screenshots/` were all retaken. The load-error and save-error states
  can't happen with sample data, so they were shown by calling the app's own error functions.

## Testing done (October 26, 2026): API, milestones, polish (as Rabbit Trails)

- **API tests** (`cd server && npm test`): **16 of 16 pass** against MongoDB 8.2.6 (mongodb-memory-server).
- **Start-up** against a standalone `mongod` (temporary data folder): `npm run seed` adds 4 trails and
  refuses to run twice without `--reset`; `npm start` serves the app and API; a missing
  `MONGODB_URI` and an unreachable database both stop with a clear message, and the password in
  the URI is not printed.
- **Browser checks** (headless Microsoft Edge, script not included in this repository): **41 of 41 pass.**
  - API mode: seeded dashboard and order, milestone chips, Settings "Connected" and hidden sample
    tools, trail validation, typed HTML shown as text, create/edit/delete trail, add/edit/delete
    discovery (with Cancel), discoveries in order found, data still there after reload, not found,
    milestone toasts at 1 and 3 discoveries (not at 2), progress track values, no console errors
  - Failures: server unreachable (error screen, console diagnostic, Try again recovers), a non-JSON
    answer (explains the API isn't at that address), a 500 on save (message shown, typed text kept),
    Settings showing "Not connected"
  - Phone width (390px): no horizontal scrolling on the dashboard or a trail
  - From disk: sample data, sample tools in Settings, "Deep dive" at 5 discoveries, Clear all, Reset,
    no console errors
- Screenshots of the dashboard and trail page were retaken at the time (since replaced by the
  redesign's screenshots).

## Testing done (October 20, 2026)

After the redesign, an automated script (not included in this repository) drove `index.html`
opened from disk (`file://`) in headless Microsoft Edge. **70 of 70 checks passed:** the original
52, plus 18 for the redesign:

- **Continue panel:** shows the right trail and its latest steps, and its links work
- **Recent discoveries:** the five newest, in order, each naming its trail. Clicking one opens
  the trail scrolled to it.
- **Accents:** each sample trail has a different accent, and it matches on the trail's own page
- **Time labels:** "Same day / Next day / N days later" are correct
- **After changes:** a trail that gets a new discovery moves to the top of Continue and Recent
- **Empty dashboard:** hides Continue and Recent
- **Contrast:** sampled text meets 4.5:1
- **Dialogs:** an open confirm dialog is fully visible

The original 52 checks:

- **Loading:** CSS, both JS files, and the favicon load
- **Naming:** "Rabbit Trails" (the name at the time) is used throughout, with no "Rabbit Hole",
  "prototype", or banner text
- **Dashboard:** order, counts, and the current-page marker
- **Navigation:** opening trails, the browser's Back and Forward buttons, and opening a screen
  directly from its address
- **Trails:** create (including validation, focus moving to the first error, and typed HTML shown
  as plain text), edit, cancel, and delete (from the trail page and from the dashboard)
- **Discoveries:** add (a `javascript:` URL is rejected), edit, and delete with Cancel, Esc, and
  confirm. Two discoveries added in the same instant get different IDs.
- **Failures:** a forced save failure shows the alert and keeps the typed text; a forced load
  failure shows the error screen, and **Try again** recovers
- **Not found:** a missing trail, a missing discovery, and an unknown address
- **Settings:** cancel, clear all (empty state), reset, and close
- **Other:** the skip link; nothing written to browser storage; no page errors or unexpected
  console errors

Screenshots at desktop and phone width are in `docs/screenshots/`.

**Not tested yet:** Chrome, Firefox, and Safari; real phones; screen readers; keyboard-only use.
The motion (screen fades, dialog slide, hover states) can only be judged in a regular browser.

**Test-harness note:** in headless browsers, a script calling `history.back()` can skip history
entries the page created without a real click. The redesign's checks navigate directly instead.
The original Back/Forward check still passes. This does not affect real users.

## Bugs found and fixed

| Bug | Fix |
| --- | --- |
| New items got IDs from `Date.now()`, so two items made in the same millisecond shared an ID, and deleting one deleted both (from the original wireframe) | IDs now include a counter (wireframe and front end) |
| On phones, the header's "My trails" link stayed visible and pushed Settings off-screen. A new CSS rule was more specific than the wireframe's phone rule. | Moved the rule into the base `.site-nav__link` style |
| Redesign: the confirm dialog's fade-in left it at opacity 0 in the test browser, where animations inside dialogs didn't advance. A normal browser would likely finish the fade, but a delete confirmation must never risk being invisible. | The dialog animation now only slides; opacity is always 1. Added a check for it. |
| Redesign: Playfair's default numbers looked small and shifted down in counts and stats | Lining digits (`font-variant-numeric: lining-nums`) for numbers |

## Decisions

| Decision | Why |
| --- | --- |
| Vanilla HTML/CSS/JS, no build step | Opens directly from disk with no install |
| Same CSS as the wireframe as the starting point | Keeps the wireframe's look; new styles are in their own section |
| Hash addresses (`#/trails/ID`) | Back/Forward and links to screens work without a server |
| All data access goes through `trailData` | The API can replace the sample data by changing one line |
| Sample data kept in memory | Sufficient for the front-end stage; the UI does not claim changes are saved |
| Data source picked from the address (`file:` → sample data, `http(s)` → API) | Opening from disk keeps working with no install; Settings says which mode is on |
| Gold only for achievements | It had been on buttons, labels, and badges at once, so it meant nothing; now it marks what you've earned |
| Database name stays `rabbit_trails` after the rename | Renaming it would point existing installs at an empty database |
| Official `mongodb` driver, not mongoose | One collection with simple validation that already existed in `sample-data.js`; fewer dependencies |
| Seed data read from `sample-data.js` | One copy of the examples for both modes |
| Onboarding and interface preferences in `localStorage` | The simplest store that fits: no accounts, no new API fields. They're browser preferences, not research data, so they're kept even with sample data (otherwise the welcome would return on every reload). This replaces the October 20 check that nothing was written to browser storage; trails and discoveries still never are. |
| One interactive extra: the White Rabbit | It reuses the existing art, turns curiosity into a trail (only when the user saves), and doubles as the easter egg, so nothing else competes for attention |
| Small milestone system, calculated from discovery counts | Adds encouragement without points, streaks, or stored state; room to grow (see DESIGN.md) |

## Assignment scope

The assignment is "Final Project (Design + Layout in HTML/CSS + Starter API)". The API's confirmed
requirements are Express, MongoDB, and CRUD operations.

## Starter API

Built in `server/`. Endpoints, environment variables, and error format are in the README.

## Open questions

1. ~~mongoose or the `mongodb` driver?~~ Decided: the `mongodb` driver. Local MongoDB or Atlas both work through `MONGODB_URI`.
2. ~~Must the front end call the API?~~ It does now, when served by `npm start`.
3. `rabbit-tracks-wireframe/` is outside this repository and not tracked in Git. Should it move
   into this repository or into a repository of its own?
