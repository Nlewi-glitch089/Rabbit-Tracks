# Archive

Earlier versions of the front end, kept for reference. None of them are maintained, and nothing in the
current app loads files from here.

- `original-wireframe/` is the backup of the original clickable wireframe (CSS and JavaScript dated
  October 16, 2026; HTML last modified October 20, 2026). The repaired wireframe is kept outside this
  repository in `rabbit-tracks-wireframe/`.
- `plain-js-front-end/` is the first vanilla HTML/CSS/JS front end. Some of its logic (screen addresses,
  form helpers, error screens) was reused in the current app.
- `react-vite-version/` is the React + Vite version, which isn't the stack for this project. Kept for its
  code and history:
  - `src/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `public/`, `scripts/`:
    the React source and config
  - `docs/`: the README, DESIGN and PROGRESS files written for that version
  - `screenshots/`: screenshots of that design
  - `node_modules/`, `dist/`, `wireframes-build/`: installed packages and build output. These can all be
    recreated (`npm install`, `npm run build`) and are ignored by Git.
