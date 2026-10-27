# Rabbit Tracks: Design

## Direction

**A research journal for curiosity.** You start with a question, follow it through websites, and
the app keeps the tracks you left: where you went, in what order, and how far the question has
taken you. Every screen is built around that journey. The question is always the most prominent
text, the discoveries form a route, and milestones mark how far along it you are.

Two experiences, one app: **exploring Wonderland** (the dashboard and each trail's winding path)
and **keeping a journal** (recording what you found).

Screenshots of every screen and state are in [docs/screenshots](docs/screenshots).

## Onboarding, the cabinet, and Settings (October 26, 2026, latest)

The Wonderland redesign looked finished but left people guessing: what a trail is, what to do
first, where things go. This round is about using the app, not decoration.

### Why the dashboard felt unbalanced
Full-page captures showed the real cause: the cabinet sat **inside the main column**, under the
chapters, so the main column ran about 400px past the side column and left an empty strip of
parchment on the right at every desktop width. Adding art would have hidden it, not fixed it.

- The dashboard grid now has named areas. The chapters and side column share the first row, so
  the side column ends roughly where the chapters do (within 120px with the examples). The cabinet
  takes its own full-width row underneath.
- With **one or two trails** the chapters are short, so the grid switches to a compact layout
  (`.dash-grid--compact`): the cabinet moves up beside the side column into the space under the
  chapters. More trails go back to the full-width cabinet.
- Below 1080px everything is one column: chapters, the side panels (in columns), then the cabinet.

### The curiosity cabinet
A **glass-fronted display case**: a plum panel with a thin gold inner frame (the same plum as the
welcome, so the page is weighted at both ends), with discoveries standing on gold-lit shelves as
small, equal-height **curiosity cards**. Unlike the chapters, they're objects rather than pages:

- **Window:** a tinted pane (in the trail's accent) with the site's first letter in a gold ring,
  the trail's suit, and the step it was on the trail. Decorative, hidden from screen readers.
- **Label:** the site, the title (two lines at most, with the full title in its tooltip and the
  link's text), what caught your attention in italic (or the start of the note), and the trail
  and date.
- **Fallbacks:** no note → "Saved as a quick find. Add what you learned" (links to editing it);
  no valid link → "No source link" and no Visit button; an empty or small collection ends with a
  dashed **open slot** saying what goes there, with one button to add the next discovery. Nothing
  invented, nothing fetched from the sites.
- **Interactions:** the title opens the trail at that stop; **Look closer** opens a dialog with
  everything saved (question, highlight, full note, step, milestone reached), plus Edit, Visit
  source (new tab, `noopener noreferrer`), and Open on its trail; **Show more** adds four at a time
  and moves focus to the first new card.

### Onboarding
- **Welcome dialog** on the first visit to the dashboard: the line *Follow a question. Collect
  discoveries. See where your curiosity takes you.*, a small night scene (question → finds →
  hole), five numbered steps, and a note that the first trails are examples. **Begin exploring**
  starts the tour; **Skip the introduction** (or Esc) closes it.
- **Guided tour:** one card that visits real elements marked `data-tour="…"` (never text or
  generated class names): My trails → a trail card → the cabinet → Achievements → Quick find and
  Journal entry (on the most recent trail, which it opens) → Settings. A gold-ringed spotlight dims
  everything else. "Stop 3 of 7" and a row of dots show progress. Next, Back, Skip, the close
  button, Esc, and ←/→ work. While it's open the page behind is `inert`, so Tab stays in the card
  and nothing behind can be clicked by accident; closing restores the page and focus. The card sits
  below, above, or beside its target, always inside the viewport; on phones it's a bottom sheet and
  the spotlight stays above it. Stops whose element isn't there (no trails yet) are skipped; an
  empty journal gets a three-stop tour that points at "Every trail starts with a question".
- **Examples are labelled.** Chapters from the example set carry an **Example** tag, and a
  dismissible note explains them. The examples themselves are unchanged.

### The White Rabbit (the one interactive extra)
The rabbit already in the welcome scene is now a button. Ask him, and he hops and offers a
question worth following, from a fixed list of 20; **Follow this question** fills in the New
trail form's question and puts focus on the title, so nothing is created without the user saving.
On the fifth ask he remembers he's late (his watch spins), once per visit. This is the dashboard's
interactive feature *and* its easter egg, so there isn't a separate one. Pointing at him pricks
his ears; with reduced motion nothing moves. The mushroom and nudge already cover "revisit a
trail", so the other options (Follow the Tracks, the Watch) weren't built.

### Settings
A larger panel with a fixed header and scrolling sections on a paper background:
**Experience** (tour, welcome, Reduce motion), **Your research data** (a plain statement of where
trails live and what a reload does; the API connection check), **Example trails**, **Manage your
research** (set apart in red), and **About**. Only working controls are shown: Restore and Clear
all appear with sample data only, because the API has no bulk endpoints; with the API, Settings
explains how to delete instead. Reduce motion is a real switch (`data-motion="reduce"` on `<html>`
applies the same rules as the device setting; when the device asks for reduced motion the switch
shows on and is locked).

Destructive actions name their consequences with real counts ("This deletes all 4 trails and 14
discoveries in this tab…"), use specific confirm buttons ("Clear all trails", "Replace with
examples"), warn when the page behind has unsaved writing, keep an unsaved **new** trail (and stay
on it), and, if the change fails, leave everything as it was and say so inside Settings.

### Screenshots
`dashboard-desktop`, `dashboard-mobile`, `dashboard-one-trail-desktop`, `cabinet-desktop`,
`curio-desktop`, `welcome-desktop`, `welcome-mobile`, `tour-desktop`, `tour-mobile`,
`rabbit-desktop`, `settings-desktop`, `settings-mobile`, `confirm-desktop`, `confirm-mobile`,
and `empty-desktop` in [docs/screenshots](docs/screenshots).

## Wonderland redesign (October 26, 2026)

### Motifs, each with a job

| Motif | Where | What it says |
| --- | --- | --- |
| Rabbit tracks | The logo, the path between stops, the *On the scent* emblem, the welcome scene | Where you've been |
| The rabbit hole | The end of every path, the welcome scene, the *Down the rabbit hole* emblem | Where it leads next |
| The White Rabbit and his pocket watch | The welcome scene; the watch marks time between finds | Time, and curiosity running ahead |
| Playing cards | Each trail has a suit; chapters and discovery cards carry it in the corner with a number (discoveries held, or the step) | Which trail something belongs to |
| The golden key | The *Deep dive* emblem, and the next milestone on the welcome route | What's still to unlock |
| A newly found star | The *First find* emblem | The first discovery |
| Mushrooms | The welcome scene and the curiosity nudge | "Curiouser": a prompt to look again |

The four milestone emblems (star, tracks, key, hole) are one set: drawn at the same weight inside
the same gold seal, faint and dashed until reached. They replace the identical stars used before,
so each milestone is recognisable on its own.

### The dashboard
- **Welcome:** a still night scene (moon, stars, hills, the path of tracks to the rabbit hole, the
  White Rabbit with his watch, mushrooms). Beside it, one sentence about where your research stands
  and a quiet line of totals in place of stat cards. Along the bottom, the trail to continue, drawn
  as its route. Nothing in the scene moves, so it never competes with the page.
- **Your trails** are chapters, numbered in the order they were started. Each shows its suit, the
  question, its tracks (with milestone emblems at steps 1, 3, 5, 10), the last stop, and the next
  milestone. "Continue the trail" is the main action; Edit and Delete are small icon tools.
- **The unused space** under the chapters was the **Curiosity cabinet**: the four newest finds,
  each with a luggage tag (its site), its title, and what caught your attention (or the start of
  its note). (Since replaced: see "Onboarding, the cabinet, and Settings" above.)
- **The side column:** **Next destination** (the trail closest to a milestone, with a button to add
  to it), **Achievements** (the four emblems, each reached, in progress, or ahead, with details on
  selection), and a **Curiosity nudge**: the least recently explored trail's question and last stop.
  The nudge only repeats what the trail holds; nothing is generated or guessed.

### The journey
The question, the discoveries, and the milestones reached are stops on alternating sides of a
winding path. The path is an SVG drawn by `app.js` through the stop markers, so it always fits the
content. It draws itself in once when a trail is opened, carries rabbit tracks on each leg, and
deepens in colour as the trail reaches milestones (lavender, purple, then gold from *Deep dive*).
Milestone stops grow grander: *Deep dive* glows, and *Down the rabbit hole* is a dark destination.
On phones it becomes one column with the path down the left.

### The journal
Two ways to save: **Quick find** at the end of the path (title and link, saved without leaving the
trail), and the **journal** page, an open book with the trail on the left page and four prompts on
the right: *What did you find? Where did you find it? What caught your attention? What did you
learn?* The third is a new optional field, `highlight` (200 characters), shown on the trail as a line
copied into the margin; the fourth is the existing note, on ruled lines. A switch hides the two
reflection prompts for a quick save without clearing them. "Write a journal entry instead" carries
whatever was typed in Quick find across.

### Feedback
After a save (never before): the new stop pops onto the path and slides in with a fading wash, the
count nudges, and the gold progress line grows. A milestone adds a golden ripple on its stop and the
achievement card, now with the milestone's emblem and the trail's set of four. Editing never
celebrates. With reduced motion, all of it is still shown, just without movement.

## Redesign (October 26, 2026)

### Why the previous version felt unfinished

- **Everything had the same weight.** A heading, one plum box, then a plain list. Nothing told you
  what mattered most.
- **Progress was hard to read.** A row of tiny dots for discoveries and small gold chips for
  milestones, so you had to work out how far a trail had come.
- **Gold meant nothing in particular.** It was on eyebrows, buttons, the newest step, and badges at
  the same time.
- **The trail list read like a table**, and the trail page header was a title with stats beside it.

### What changed

- **Name:** Rabbit Trails became **Rabbit Tracks**, matching the repository. The logo is now
  footprints (rabbit tracks) leading into the hole.
- **Colour has jobs.** Plum and purple carry structure, reading, and actions. Cream is every surface
  and the main action on plum. **Gold now means achievement only:** milestone seals, the next
  milestone on a route, and the "Tracks" wordmark. When you see gold, you've earned something.
- **Depth.** Hero panels use a plum gradient with light from the top left; cards sit on a parchment
  page with soft shadows; the trail page's progress panel overlaps the hero's lower edge.
- **Trail accents** are four tones of the plum family (plum, purple, mulberry, indigo) so they tell
  trails apart without competing with gold.

## Visual system

All values are CSS variables at the top of `css/styles.css`.

- **Colour:** parchment page (`#f5ede0`), cream surfaces (`#fffcf7`), plum (`#2a1442`) panels,
  purple (`#6b3fa0`) actions and links, lavender for quiet fills and tracks, gold (`#d6a84f`) for
  achievements only.
- **Type:** Playfair Display for headings, questions (always italic), and numbers (full-height
  lining digits). Inter for everything else. The question is set larger than the trail's title on
  the trail page, because it's what the trail is about.
- **Seal:** the one milestone mark, used everywhere: a gold coin with a star once reached, a dashed
  outline with the number of discoveries needed before. State never depends on colour alone.
- **Step track:** a trail's first ten steps as a row, a dot per discovery, with seals at the
  milestone steps (1, 3, 5, 10). It's on every trail card and the journal entry form, so progress
  and achievements read as one thing.
- **Controls:** primary (purple) on light backgrounds, light (cream) on plum, secondary, on-dark,
  danger. 50px inputs with a lavender focus ring; one dialog style.
- **Motion:** short and only where it explains something. Screens fade up; cards lift slightly and
  their spine widens on hover; a newly added discovery slides in with a fading wash; the discovery
  count nudges; the gold milestone line grows from its old length; a newly reached seal pops once;
  the achievement card slides in; dialogs fade out when closed. Nothing loops. With reduced motion,
  all animation and hover lifting is off (colour and outline changes stay).

## Interactions (October 26, 2026)

- **One "New trail" button,** in the header. The "All trails" heading shows "4 trails · most
  recently updated first" in its place.
- **Milestones are buttons.** In the dashboard's Milestones panel and on a trail's milestone track,
  selecting one opens its details (a disclosure panel with `aria-expanded`): the rule, and either
  when and with which discovery it was reached (the date of that discovery) or how close the nearest
  trail is, with a bar. One is open at a time; the close button, Esc, a click elsewhere, or selecting
  it again closes it, and Esc returns focus to the milestone. Works with touch, mouse, and keyboard.
- **The next milestone** (the one the closest trail is working toward) is outlined and tagged "Next
  up" in the panel; unreached milestones show the best progress so far.
- **Route stops** on the "Continue" panel are links to that discovery, with its title and date on
  hover or keyboard focus. The question, next-milestone, and hole stops are pictures only.
- **Step tracks** on trail cards show the discovery (or how far off a milestone is) when pointed at.
  They're not tab stops (ten per card would bury the real controls); the same facts are in the text
  beside them and on the trail page.
- **Trail cards** are no longer one big link: the title and "Open →" open the trail, so Edit and
  Delete can never open it by accident.

## Screens

- **Dashboard.**
  1. **Overview:** the night scene with the White Rabbit, the page title, one sentence about where
     the research stands ("You're following 4 questions… Your latest find was …"), and a line of
     totals: trails, discoveries, milestones reached.
  2. **Continue where you left off:** the most recently updated trail on the same plum panel, with
     its question, current milestone, how far to the next one, and Add discovery / Open trail.
     Below, its **route**: the question, the latest discoveries (dated), milestone flags where they
     were reached, the next milestone still ahead, and the hole.
  3. **Examples note:** while example trails are shown, a dismissible note says what they are.
  4. **Your trails:** chapter cards with the suit, the question in italic, the step track, the last
     stop, and the next milestone.
  5. **Side column:** Next destination, Achievements, and the Curiosity nudge.
  6. **Curiosity cabinet:** every discovery, newest first, four at a time (see above).

  Everything shown is calculated from the trails themselves. There are no invented metrics.
- **Trail page.**
  - A plum hero: the trail's suit card and title, the question as the largest text, the description,
    Quick find / Journal entry / Edit trail / Delete trail, and stats (discoveries, days exploring,
    last find).
  - A progress panel on the hero's lower edge: the current milestone as a large seal, how far to the
    next, and the four milestones as stations on a line that fills in gold.
  - **The journey:** the question, then each discovery joined by a winding line of tracks, with
    "Same day / Next day / N days later" between them. After the discovery that reached a milestone,
    the trail has a gold milestone stop of its own. The trail ends at the hole with "Where did you go
    next?" and how many discoveries to the next milestone.
- **Forms.** A form card with a side panel. New trail: "How a trail grows" (question → discoveries
  → milestones) and the four milestones. Journal entry: the trail it's going on, its step track, and
  what saving will do ("Saving this discovery reaches Deep dive").
- **Settings.** The Rabbit Tracks mark and name, then sections: Experience, Your research data,
  Example trails, Manage your research, About (see the latest section above).
- **Empty and status screens.** A small drawing of tracks leading into the hole, one message, one or
  two actions.
- **Phones.** The header drops "My trails" and the Settings label; cards, side panels, and the
  cabinet stack; the route keeps its milestone stars but drops their names and dates; the hero
  actions go full width; the timeline tightens.

## Milestones

- **Rules** (`js/milestones.js`, numbers only, no HTML): *First find* (1), *On the scent* (3),
  *Deep dive* (5), *Down the rabbit hole* (10). `progress()` says where a trail stands,
  `reachedBetween()` says whether a save crossed a threshold, and `tally()` adds them up across
  trails for the dashboard.
- **Nothing stored:** everything comes from `discoveries.length`. Deleting discoveries moves a trail
  back.
- **Feedback:** saving the discovery that reaches a milestone fires a `rabbittracks:milestone` event
  on `document`. Its listener shows the **achievement card**: bottom corner, gold seal, the
  milestone's name and message, and what's next. It stays about 7 seconds (longer while pointed at
  or focused), can be dismissed, and never blocks the page. Screen readers hear it through a hidden
  live region. The new milestone stop on the timeline is highlighted once. A save that doesn't reach
  a milestone shows the plain "Discovery added" toast instead.
- **Room to grow:** new milestones are one line in `milestones.js`; richer celebrations can be added
  as more event listeners without touching the save code.

## Wireframe vs. front end

The wireframe (`rabbit-tracks-wireframe/`, kept outside this repository) established the layout,
flow, and identity. The front end keeps its screens, interactions, palette, typefaces, the hole,
and the dotted trail, and goes further:

| | Wireframe | Front end |
| --- | --- | --- |
| Look | Flat, outlined, deliberately plain | Layered plum panels and cream cards, gold reserved for achievements |
| Dashboard | Heading + one plain list | Night-scene overview, route of the latest trail, chapter cards, achievements, the curiosity cabinet |
| Trail page | Sidebar summary + timeline | Question-led hero, progress panel, timeline with milestone stops |
| Screens | Switched in place, no addresses | Each screen has a `#/…` address; Back/Forward work |
| Data | Changed directly in one variable | Goes through `sample-data.js` or the API |
| Failure states | None | Loading, load error with Try again, not found, "Couldn't save" |

## Not included

- Points, streaks, leaderboards, or multiplayer. Deliberately left out.
- Accounts or logins. Not part of the current requirements.
