# Rabbit Trails

Rabbit Trails is for keeping track of where your curiosity takes you. You start a **trail** with a
question you want answered. As you research, you save each website you find as a **discovery**,
with a note about what you learned. The trail page lays those discoveries out as a path, in the
order you found them, so you can come back later and see how you got from the question to the
answer.

The look borrows from vintage storybooks and *Alice in Wonderland*: a doorway where each trail
begins, a hand-drawn path between discoveries, and a few small details along the way. It stays
restrained so the app is still easy to use.

This is my Demo Day project. The repository is named `Rabbit-Tracks`.

![The trail page](docs/screenshots/trail-desktop.png)

## Running it

You need [Node.js](https://nodejs.org/) installed. I used v24.21.0, which comes with npm 11.19.0.

1. **Open the project folder.** In VS Code, use **File → Open Folder…** and choose `Rabbit-Tracks`.
   (If VS Code was already open when you installed Node, close it completely and reopen it first,
   or the terminal won't find `npm`.)
2. **Open a terminal** with **Terminal → New Terminal**. It should start inside `Rabbit-Tracks`.
   Check by typing `node -v`; you should see a version number.
3. **Install the dependencies.** You only need to do this once, or again if `package.json` changes:
   ```bash
   npm install
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```
5. **Open it.** Vite prints an address, usually http://localhost:5173. Ctrl+click it or paste it into
   your browser. Leave the terminal running while you use the app. Changes you save in `src/` show up
   in the browser right away.
6. **Stop it** with **Ctrl+C** in the terminal.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Makes a production build in `dist/` |
| `npm run preview` | Serves that build so you can check it |
| `npm run build:wireframe` | Updates `wireframes/rabbit-tracks-wireframe.html`, a copy of the app that opens by double-clicking with no server |

## Where it stands

_Last updated October 20, 2026_

- **Front end:** built in React and working. Every screen, form, and create/edit/delete action
  works.
- **Data:** temporary. Trails are saved in the browser's `localStorage`, not on a server
  (details below).
- **API and database:** not started. The front end already contains the code to call the API
  once it exists.

## What you can do

- See your trails on the dashboard. The one you worked on most recently is shown first, with
  a small map of its path.
- Start a trail by typing a question on the dashboard, or with **New trail**.
- Open a trail to see its discovery path: the question at the top, each discovery in order, how
  much time passed between them, and milestones at the 1st, 5th, 10th and 20th discoveries.
- Add, edit, and delete discoveries. When adding or editing, you can choose where on the trail
  it goes, and a side panel shows where it will land.
- Edit and delete trails. Deleting anything asks for confirmation first.
- Use **Settings** to reset the sample data or clear all trails.

Forms check required fields and URLs, and show the error next to the field. There are loading,
error, empty, and "not found" screens. Every screen has its own address (`#/trails/game-dev`),
so refresh and the Back button work. Layouts are designed separately for desktop and phone
widths.

## How it's built

- [React](https://react.dev/) 19 for the interface
- [Vite](https://vite.dev/) 8 for the dev server and production build
- Plain CSS in `src/styles/`, with no CSS framework or component library
- Google Fonts: Fraunces for headings, Instrument Sans for everything else

Those four npm packages are the only dependencies: `react`, `react-dom`, `vite`, and
`@vitejs/plugin-react`. There's no router library; `src/lib/router.js` is a short hash router.

## About the data (temporary)

Until the API exists, the app uses a **sample data store** (`src/data/sampleData.js`):

- It starts with four example trails.
- Changes are saved to `localStorage` under `rabbit-trails:sample-data`, so they **do survive a
  refresh**.
- They only exist in that one browser. Another browser or computer won't see them, and clearing
  site data erases them.
- **Settings → Reset sample data** brings back the examples. **Clear all trails** empties the
  list.

The footer says "Your trails are saved in this browser" so this isn't hidden from users.

### Switching to the real API

`src/data/api.js` decides where data comes from. Components only ever import `api`, so they don't
need to change.

```js
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'sample';
```

Set `VITE_DATA_SOURCE=api` (for example in a `.env` file in this folder) to use the API at `/api`.
In that mode the storage note and the Settings data buttons are hidden. Right now no API exists,
so API mode shows an error screen that says nothing answered at `/api`.

When the backend runs on a different port during development, Vite will need a `server.proxy`
entry for `/api` in `vite.config.js`. That hasn't been added yet.

## Planned API

> **Not built yet.** This is the contract `api.js` already calls, and it may change once
> backend work starts.

A trail stores its discoveries in order:

```json
{
  "id": "game-dev",
  "title": "Exploring Game Development",
  "question": "How are video games made?",
  "description": "",
  "created": "2026-10-03",
  "updated": "2026-10-12",
  "discoveries": [
    { "id": "d1", "title": "Game engine — Wikipedia", "url": "https://…", "note": "…", "date": "2026-10-03" }
  ]
}
```

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/trails` | none | `200` list of trails |
| POST | `/api/trails` | `{ title, question, description? }` | `201` the trail |
| GET | `/api/trails/:id` | none | `200` the trail with its discoveries |
| PUT | `/api/trails/:id` | `{ title, question, description? }` | `200` the trail |
| DELETE | `/api/trails/:id` | none | `204` |
| POST | `/api/trails/:id/discoveries` | `{ title, url, note?, position? }` | `201` the discovery |
| PUT | `/api/trails/:id/discoveries/:discoveryId` | `{ title, url, note?, position? }` | `200` the discovery |
| DELETE | `/api/trails/:id/discoveries/:discoveryId` | none | `204` |

- `position` is 1-based. If it's missing, the discovery goes at the end.
- The server sets `id`, `created`, `updated`, and each discovery's `date`, and updates the
  trail's `updated` whenever the trail or one of its discoveries changes.
- Dates can be `YYYY-MM-DD` or full ISO timestamps.
- Errors should come back as `{ "error": "message" }` with status `400`, `404`, or `500`. The
  front end shows the message to the user.

## Project structure

```
Rabbit-Tracks/
├── index.html                 the page Vite serves
├── package.json               scripts and the 4 dependencies
├── vite.config.js
├── public/                    favicon
├── src/
│   ├── main.jsx               starts React
│   ├── App.jsx                header, footer, which screen to show
│   ├── pages/                 Dashboard, TrailPage, TrailFormPage, DiscoveryFormPage
│   ├── components/            dialogs, toasts, form fields, trail map, illustrations
│   ├── data/                  api.js (data source switch) + sampleData.js (temporary)
│   ├── hooks/useLoad.js       loading / error state for each screen
│   ├── lib/                   router + formatting helpers
│   └── styles/                CSS, one file per area
├── scripts/build-wireframe.mjs   builds the double-clickable copy in wireframes/
├── wireframes/                the current design as 3 files you can double-click
├── docs/screenshots/          screenshots of each screen and state
├── archive/                   older versions: the original wireframe and the first plain-JS front end
├── DESIGN.md                  design decisions
└── PROGRESS.md                checklist and status
```

## Still to do

- Build the API and database, then switch `DATA_SOURCE` to `'api'` and test each operation
  through the app
- Click through the app by hand in Chrome, Firefox, and Safari. Automated testing so far has
  used headless Microsoft Edge only.
- The open questions listed in [PROGRESS.md](PROGRESS.md)
