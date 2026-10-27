/* =========================================================
   Rabbit Tracks — milestones

   What counts as a milestone on a trail, and how far along a trail is.
   This file only works with numbers: it has no HTML and never touches
   the page, so the dashboard, the trail page, and any future visuals
   can all share it. Everything is calculated from a trail's number of
   discoveries, so there's nothing extra to save or keep in sync.

   To add a milestone, add an entry below (keep them in count order).
   ========================================================= */

const TRAIL_MILESTONES = [
  { id: 'first-find',  count: 1,  name: 'First find',          message: 'The trail has its first discovery.' },
  { id: 'on-the-scent', count: 3, name: 'On the scent',        message: 'Three discoveries in. The trail is taking shape.' },
  { id: 'deep-dive',   count: 5,  name: 'Deep dive',           message: 'Five discoveries. You’re really digging in.' },
  { id: 'rabbit-hole', count: 10, name: 'Down the rabbit hole', message: 'Ten discoveries. This trail goes deep.' },
];

const milestones = {
  all: TRAIL_MILESTONES,

  /* Where a trail with `count` discoveries stands:
       reached   milestones already reached, in order
       current   the latest one reached (or null)
       next      the next one to reach (or null when all are done)
       toNext    discoveries still needed for `next`
       fraction  0–1, progress from `current` to `next` (1 when all are done) */
  progress(count) {
    const reached = TRAIL_MILESTONES.filter((m) => count >= m.count);
    const current = reached[reached.length - 1] || null;
    const next = TRAIL_MILESTONES.find((m) => count < m.count) || null;
    const from = current ? current.count : 0;
    return {
      count,
      reached,
      current,
      next,
      toNext: next ? next.count - count : 0,
      fraction: next ? (count - from) / (next.count - from) : 1,
    };
  },

  // The milestone that sits exactly at this step, if any (step 1 = first discovery)
  atStep(step) {
    return TRAIL_MILESTONES.find((m) => m.count === step) || null;
  },

  /* The milestone newly reached when a trail goes from `before` to
     `after` discoveries, or null. If a jump crosses several, the
     biggest one is returned. */
  reachedBetween(before, after) {
    const crossed = TRAIL_MILESTONES.filter((m) => before < m.count && after >= m.count);
    return crossed[crossed.length - 1] || null;
  },

  /* Totals across several trails, given each trail's number of
     discoveries:
       earned   one entry per milestone: { milestone, trails } where
                `trails` is how many trails have reached it
       total    every milestone reached, counted once per trail */
  tally(counts) {
    const earned = TRAIL_MILESTONES.map((milestone) => ({
      milestone,
      trails: counts.filter((count) => count >= milestone.count).length,
    }));
    return { earned, total: earned.reduce((sum, entry) => sum + entry.trails, 0) };
  },
};
