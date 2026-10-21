# Rabbit Trails: Design

## Direction

**A modern curiosity journal with a subtle Wonderland atmosphere.** Rabbit Trails is about
following a question until you learn something. The Wonderland influence shows up in only two
places: a winding trail of dots, and the rabbit hole it leads into. Everything else is a clean,
readable interface.

Screenshots of the main screens and states are in [docs/screenshots](docs/screenshots).

## Visual system

All values are CSS variables at the top of `css/styles.css`.

- **Color:**
  - warm parchment page (`#f7efe2`) and cream surfaces (`#fffcf7`)
  - deep plum (`#2a1442`) for the header, the "Continue" panel, and each trail's starting question
  - purple (`#6b3fa0`) for actions and links
  - lavender for quiet highlights and the dotted path
  - gold (`#d6a84f`) only as an accent: the logo, the newest step, primary buttons on dark
    backgrounds
- **Type:** Playfair Display for headings, questions (always italic), and numbers. Numbers use
  full-height lining digits. Inter for everything else. Headings have a wide size range, so the
  page title, section headings, and card titles are clearly different.
- **Surfaces:** soft shadows instead of outlines. Hairlines only separate list rows and card
  footers.
- **Trail identity:** every trail gets a monogram (the first letter of its title) on one of four
  accent colors: plum, purple, gold, or lavender. The accent is picked from the trail's id, so the
  same trail has the same color on the dashboard, in Recent discoveries, and on its own page.
- **Controls:** one button system (primary, gold, secondary, danger, on-dark), 50px inputs with a
  lavender focus ring, and the same dialog style for Settings and confirmations.
- **Motion:** screens fade up, dialogs slide in, and rows and cards respond on hover. Everything is
  turned off for anyone who prefers reduced motion. Dialogs only slide (no fade), so they can never
  get stuck invisible.

## Layout decisions

- **Dashboard.** A compact heading (no welcome banner), then:
  1. **Continue where you left off:** the most recently updated trail on a plum panel. It shows
     the question, Add discovery and Open trail buttons, and the latest three steps.
  2. **All trails:** one list on a single surface, not a grid of cards. Each row shows the
     monogram, title, question, progress dots, latest discovery, discovery count, last update, and
     Edit/Delete.
  3. **Recent discoveries:** the five newest finds across all trails, as a small dotted trail
     beside the list (below it on narrower screens).

  Everything shown is calculated from the trails themselves. There are no invented metrics.
- **Trail page.**
  - A breadcrumb, then a header with the monogram, title, description, stats, and actions.
  - Below that, the journey in a centered column: the question as a plum panel, then each
    discovery joined by the winding dotted line, with "Same day / Next day / N days later" between
    steps.
  - The newest discovery has a gold edge.
  - The path ends at the hole with "Where did you go next?"
- **Forms.** One card, with a small label, a large heading, and a short intro. The starting
  question is typed in italic serif, like it's displayed. Errors appear under the field; save
  failures appear above the form.
- **Empty and status screens.** A small drawing of the dotted trail leading into the hole, one
  message, and one or two actions.
- **Phones.** The header drops "My trails" (the logo goes home), the dashboard stacks, trail rows
  move their count and actions under the text, the trail header actions go full width, and the
  timeline tightens.

## Wireframe vs. front end

The wireframe (`rabbit-tracks-wireframe/`, kept outside this repository) established the layout,
flow, and identity. The front end keeps its screens, interactions, palette, typefaces, the hole,
and the dotted trail, and goes further:

| | Wireframe | Front end |
| --- | --- | --- |
| Look | Flat, outlined, deliberately plain | Layered surfaces, wider type scale, motion, accent colors |
| Dashboard | Heading + one plain list | Continue panel, trail list with monograms, Recent discoveries |
| Trail page | Sidebar summary + timeline | Header with stats; plum question panel; time between steps |
| Screens | Switched in place, no addresses | Each screen has a `#/…` address; Back/Forward work |
| Data | Changed directly in one variable | Goes through `sample-data.js`, shaped like future API calls |
| Failure states | None | Loading, load error with Try again, not found, "Couldn't save" |

## Not included yet

- Gamification (milestones, badges, points). Not part of the current scope.
- Accounts or logins. Not part of the current requirements.
