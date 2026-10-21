# Rabbit Trails

Rabbit Trails is a research journal for following a question wherever it leads. You start a **trail**
with the question you want answered, then save each website you find along the way as a
**discovery**, with a note about what you learned. Each trail shows its discoveries as a timeline in
the order you found them, so you can retrace how you got from the question to what you know now.

This repository is `Rabbit-Tracks`. The app is called Rabbit Trails.

![The trail timeline](docs/screenshots/trail-desktop.png)

## Status

- **Front end:** built with plain HTML, CSS, and JavaScript. All screens and actions are
  implemented.
- **Data:** sample data kept in memory. Changes last until the page is reloaded, then the four
  example trails come back.
- **API and database:** not built yet (see [Planned backend](#planned-backend)).

## Opening it

No install or build step. Open `index.html` in a browser, either by double-clicking it or, on
Windows, from the repository folder:

```bash
start index.html
```

The fonts load from Google Fonts, so without an internet connection the page uses fallback fonts.

The front end is based on a clickable wireframe (`rabbit-tracks-wireframe/`), which is kept outside
this repository.

## What works

- **Dashboard:**
  - **"Continue where you left off":** the most recently updated trail, with its question and its
    latest three steps
  - **All trails:** each with its own monogram and accent color, its question, a row of dots for
    its progress, its latest discovery, and its number of discoveries
  - **Recent discoveries:** the five newest finds across every trail. Clicking one opens its
    trail, scrolled to that discovery.
- **Trails:** create, open, edit, and delete
- **Trail page:** the trail's title and stats (number of discoveries, start date, last update),
  the starting question, then each discovery in order on a timeline, with the time between steps
  ("Next day", "3 days later")
- **Discoveries:** add, edit, and delete. New ones go at the end and are dated today.
- **Validation:** required fields are checked, and URLs must start with `http://` or `https://`.
  Errors appear under the field, and focus moves to the first problem.
- **Confirmation dialogs:** before deleting a trail or discovery, resetting the sample data, or
  clearing all trails. Cancel and Esc both back out.
- **Settings:** reset the sample data, or clear all trails to see the empty dashboard
- **Addresses:** every screen has its own address (for example `#/trails/game-dev`), so the
  browser's Back and Forward buttons work, and so does opening a link straight to a screen.
- **Other states:** an empty dashboard, a trail with no discoveries, "not found" for missing
  trails and bad links, a loading screen, a load error with **Try again**, and a "Couldn't save"
  message that keeps what you typed
- **Phone and desktop layouts,** a skip link, and focus moving to each screen's heading

## Files

```
Rabbit-Tracks/
├── index.html            every screen; app.js shows one at a time
├── css/styles.css        all styles (based on the wireframe's CSS)
├── js/sample-data.js     the example trails and the functions that read/change them
├── js/app.js             navigation, screens, forms, dialogs, Settings
├── images/favicon.svg    browser tab icon
├── docs/screenshots/     screenshots of the current front end
├── archive/              earlier versions, kept for reference (see archive/README.md)
├── README.md
├── DESIGN.md             design decisions
└── PROGRESS.md           checklist, testing notes, open questions
```

`app.js` never touches the trail data directly. It calls functions like `trailData.createTrail()`,
which currently come from `sample-data.js`. Each one returns a Promise and fails the way an HTTP
request would (status `400` for invalid input, `404` for not found). When the API exists, an
`api.js` with the same functions can replace the sample data by changing one line at the top of
`app.js`.

## Built with

HTML, CSS, and JavaScript, with no framework, packages, or build step. Fonts are Playfair Display
and Inter from Google Fonts.

## Planned backend

> Not implemented. Nothing in this section exists in the repository yet.

The assignment includes a starter API. The plan is a separate `server/` folder using Express and
MongoDB. Express would serve this front end and a JSON API from the same address. The planned
endpoints cover the same actions `sample-data.js` handles now:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/trails` | List trails |
| GET | `/api/trails/:id` | One trail with its discoveries |
| POST | `/api/trails` | Create a trail |
| PUT | `/api/trails/:id` | Edit a trail |
| DELETE | `/api/trails/:id` | Delete a trail |
| POST | `/api/trails/:id/discoveries` | Add a discovery |
| PUT | `/api/trails/:id/discoveries/:discoveryId` | Edit a discovery |
| DELETE | `/api/trails/:id/discoveries/:discoveryId` | Delete a discovery |

The planned data model, validation, and open questions are in [PROGRESS.md](PROGRESS.md).

## Still to do

- Build the starter API (Express, MongoDB, CRUD) and connect the front end
- Save data permanently (it currently resets on reload)
- Test manually in Chrome, Firefox, and Safari, and on a real phone
