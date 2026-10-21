# Rabbit Trails: Progress

Status key: **Complete** · **In progress** · **Not started** · **Blocked** · **Needs verification**

_Last updated October 21, 2026_

## Checklist

| Item | Status | Notes |
| --- | --- | --- |
| Wireframe repaired | Complete | Kept outside this repository in `rabbit-tracks-wireframe/`. An earlier version is backed up in `archive/original-wireframe/`; all three files differ from the current wireframe. |
| React/Vite version archived | Complete | `archive/react-vite-version/`. The archived version is retained for reference. |
| Vanilla front end: all screens and actions | Complete | `index.html`, `css/`, `js/`, `images/` |
| Visual redesign ("modern curiosity journal") | Complete | See DESIGN.md |
| Validation, dialogs, empty/error states | Complete | See testing below |
| Responsive layout | Complete | Checked at 1280px and 390px |
| Manual testing in a regular browser | **Needs verification** | All testing so far has been automated, in headless Microsoft Edge |
| Starter API | Not started | Implement the planned CRUD endpoints using Express and MongoDB. |
| Connect front end to API | Not started | |
| Permanent data storage | Not started | Sample data resets on reload |
| Remove archived `node_modules/`, `dist/`, `wireframes-build/` | Not started | About 47 MB, all recreatable and ignored by Git |

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
- **Naming:** "Rabbit Trails" is used throughout, with no "Rabbit Hole", "prototype", or banner text
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
| `api.js` deferred | There are no API endpoints for it to call yet |
| No gamification | Outside the current scope |

## Assignment scope

The assignment is "Final Project (Design + Layout in HTML/CSS + Starter API)". The API's confirmed
requirements are Express, MongoDB, and CRUD operations.

## Planned starter API (not implemented)

Express, MongoDB, and CRUD operations are confirmed requirements. The structure below is a design
proposal: none of it has been built, and details may change once the open questions are answered.

- **Folder:** `server/`, with its own `package.json` (`express`, plus `mongoose` or the `mongodb`
  driver) and a `.env` holding `MONGODB_URI` and `PORT`. A `.env.example` would be committed; the
  real `.env` is already ignored by Git.
- **Data model:** one `trails` collection. Each trail has `title`, `question`, `description`,
  `created`, `updated`, and a `discoveries` array (`title`, `url`, `note`, `date`, each with its own
  id). Discoveries never exist outside a trail, so storing them inside it matches how the app uses
  them.
- **Endpoints:** the 8 listed in the README.
- **Validation:** the same rules `sample-data.js` already enforces:
  - trail `title` (80 characters max) and `question` (140) are required; `description` is limited
    to 300
  - discovery `title` (120) and `url` (2000) are required, and the URL must be `http(s)`; `note` is
    limited to 500
- **Errors:** `{ "error": "message" }` with status 400 (invalid input), 404 (unknown or malformed
  id), or 500 (server/database error, logged on the server).
- **Connecting it:** Express serves `index.html`, `css/`, `js/` and `images/` (not `archive/`) along
  with `/api`. Everything shares one address, so no extra cross-origin (CORS) setup is needed.
  Then: add `js/api.js` with the same functions as `sample-data.js`, change `trailData` in
  `app.js`, and retest every action through the UI.
- **Opening from disk** with `start index.html` would keep working with sample data. Using the API
  would need `npm start` in `server/`.

## Open questions

1. Should the API use `mongoose` or the plain `mongodb` driver, and a local MongoDB or Atlas?
2. Must the front end call the API for the starter milestone, or is a working API on its own
   enough?
3. `rabbit-tracks-wireframe/` is outside this repository and not tracked in Git. Should it move
   into this repository or into a repository of its own?
