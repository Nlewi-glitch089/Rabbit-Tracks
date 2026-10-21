# Rabbit Trails: Design Notes

These are the decisions behind the current design, so I don't have to argue them again.
Screenshots of every screen are in [docs/screenshots](docs/screenshots).

## What the design needs to say

A trail is a record of following a question until you learn something. The interface should
feel like following clues: you start somewhere specific, take steps in order, and can always see
where you could go next. Each trail should feel like the user's own.

## Visual language

| Element | Where it's used | Why |
| --- | --- | --- |
| **Doorway** (arched top) | Logo, the question at the top of a trail, the "next clue" at the bottom, the new-trail form, empty and error illustrations | Every trail starts at one door and leads toward another. It's a rabbit-hole idea without drawing rabbits. |
| **Hand-drawn dotted path** | Down the trail page, the small trail maps on the dashboard, the "Where it goes" preview | Shows that discoveries are connected and in order |
| **Depth** | The trail page background gets more lavender toward the bottom | The further down the trail, the deeper you've gone |
| **Playing-card suits** | Only on milestone seals (♠ ♥ ♦ ♣) | A small nod, deliberately not on every card |
| **Small surprises** | The logo door opens on hover. The 5th discovery's milestone says "Curiouser and curiouser". | Rewards curiosity without getting in the way |

**Palette:** warm ivory (`#fbf7ee`) and paper (`#fffdf8`) surfaces; rich purple (`#5b2e91`) for
actions and headings; lavender for depth and quiet surfaces; gold as an accent. Deep plum
(`#2a1640`) is used for one thing: the question each trail starts from. Gold text uses a darker
shade (`#80601d`) so it's readable. All tokens are in `src/styles/base.css`.

**Type:** Fraunces, a soft editorial serif, for headings, questions, and step numbers. Questions
are always in italic serif, so they read as the voice of the trail. Instrument Sans is used for
everything else.

## Screens

**Dashboard.** The page title, your trail and discovery counts, and a "Start a new trail" box,
because every trail begins with a question. Under that is "Pick up where you left off": the most
recently updated trail with its latest discovery and a larger trail map. The other trails follow
as cards, each with a small map whose dots grow along a path toward a door. There is no
welcome banner. The empty state shows the doorway illustration and one action.

**New / edit trail.** An arched card, like a doorway into the trail. The question comes first and
is written large. Then the name, then an optional description. If you started from the
dashboard box, the question is already filled in and focus goes straight to the name.

**Trail page.** The title, description, and stats (discoveries, days spanned, last updated),
with Add discovery as the main action. Below that is the path:
- The question sits in a plum doorway at the top.
- Discoveries alternate left and right of a winding dotted line, each tied to a numbered node.
- Small labels on the line show the time between steps ("Next day", "3 days later").
- Milestone seals appear at 1, 5, 10, and 20 discoveries.
- The newest discovery has a gold node and border.
- The path ends at a dashed "Next clue" doorway with Add discovery.

On phones the line moves to the left edge and every card sits to its right. After you save a
discovery, the page scrolls to it and it glows briefly, so you can see where it landed.

**Add / edit discovery.** Address, page title, what you learned, and where to place it on the
trail (only shown once the trail has another discovery). A "Where it goes" panel on the side, or
above the form on phones, shows the question, the steps around the new one, and the new
discovery itself, updating as you type and as you change its place.

**Settings.** A small dialog with one line about where data is stored, plus Reset sample data
and Clear all trails. Both ask for confirmation, and Clear all uses red styling. No account or
profile settings.

**Other states.** Loading (a door with a pulsing light, only shown if loading takes more than
a quarter of a second), "We couldn't load this" with Try again, "This trail isn't here" for
missing trails, discoveries, and addresses, an empty trail, field-level validation errors, a
"Couldn't save" alert that keeps what you typed, and toasts for successful saves and deletes.

## Changes from the original wireframe

The original wireframe (now in `archive/original-wireframe/`) had a hero banner that took up half the dashboard, a
dark purple header, and every card styled as a tilted playing card. The redesign:

- Replaced the hero with the question starter and "Pick up where you left off"
- Made the header light and compact, with a doorway logo
- Replaced playing-card trail cards with notebook-style cards that each carry a trail map
- Turned the plain vertical timeline into a winding two-sided path with time gaps, milestones,
  and doorways at both ends
- Added "Where it goes" and placement controls to the discovery form
- Removed the "Wireframe prototype" banner. The only data note is one line in the footer and one
  in Settings.

Kept from the original: the four screens, their fields, the sample trails, Settings with
reset/clear, confirmation before deleting, and the purple, lavender, parchment and gold palette.

## Accessibility notes

- Each screen's `<h1>` takes focus when the screen changes. The skip link moves focus to the main
  content.
- Labels, hints, and errors are connected to their inputs with `aria-describedby` and
  `aria-invalid`. On a failed submit, focus moves to the first problem.
- The path is an ordered list, and each card's heading includes its step number for screen
  readers. Decorative drawings are hidden from them.
- Dialogs use the native `<dialog>` element: focus stays inside, Esc cancels, and Cancel is the
  default button in delete confirmations.
- Every icon-only button has a label. Animations are turned off for anyone who prefers reduced
  motion.
