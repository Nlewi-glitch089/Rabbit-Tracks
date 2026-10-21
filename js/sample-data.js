/* =========================================================
   Rabbit Trails — sample data

   The four example trails, and the functions app.js uses to read
   and change them. Everything is kept in memory, so the examples
   come back whenever the page is reloaded.

   Each function returns a Promise, the same way requests to the
   API will once it exists, so app.js can switch to the API later
   without being rewritten. Errors carry a `status` like an HTTP
   response: 400 = invalid input, 404 = not found.
   ========================================================= */

// A trail holds its discoveries in the order they were found.
const SAMPLE_TRAILS = [
  {
    id: 'game-dev',
    title: 'Exploring Game Development',
    question: 'How are video games made?',
    description: 'I play a lot of games and want to understand what actually goes into building one, and whether I could make a small one myself.',
    created: '2026-10-03',
    updated: '2026-10-12',
    discoveries: [
      {
        id: 'd1', date: '2026-10-03',
        title: 'Game engine — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Game_engine',
        note: 'Games are built on top of “engines” that handle graphics, physics, and sound so developers don’t start from zero. Unity and Unreal kept coming up as the big ones.',
      },
      {
        id: 'd2', date: '2026-10-04',
        title: 'Unity Real-Time Development Platform',
        url: 'https://unity.com',
        note: 'Unity is free for beginners and is used for a huge number of indie and mobile games. Its scripting language is C#, so that’s what I looked up next.',
      },
      {
        id: 'd3', date: '2026-10-06',
        title: 'A tour of the C# language',
        url: 'https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/',
        note: 'C# feels close to JavaScript in a lot of ways: classes, functions, and loops look familiar. The type system is stricter, though.',
      },
      {
        id: 'd4', date: '2026-10-09',
        title: 'Roll-a-Ball: Create your first game',
        url: 'https://learn.unity.com/project/roll-a-ball',
        note: 'A step-by-step beginner tutorial where you build a tiny game in an afternoon. Bookmarking this to actually do this weekend.',
      },
      {
        id: 'd5', date: '2026-10-12',
        title: 'Godot Engine — Free and open source',
        url: 'https://godotengine.org',
        note: 'Found while comparing engines. Godot is fully open source and lightweight, which might be easier for 2D projects. Worth trying after Roll-a-Ball.',
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Making the Web Accessible',
    question: 'How do people who are blind use websites?',
    description: 'Started after a classmate asked whether our project would work with a screen reader.',
    created: '2026-09-22',
    updated: '2026-10-08',
    discoveries: [
      {
        id: 'd1', date: '2026-09-22',
        title: 'Screen reader user survey results',
        url: 'https://webaim.org/projects/screenreadersurvey10/',
        note: 'Most screen reader users navigate a page by jumping between headings, which is why a clear heading structure matters so much.',
      },
      {
        id: 'd2', date: '2026-09-29',
        title: 'ARIA — MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA',
        note: 'ARIA attributes describe what an element is for. The first rule: use a real <button> or <label> before reaching for ARIA.',
      },
      {
        id: 'd3', date: '2026-10-08',
        title: 'WCAG 2 Overview',
        url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
        note: 'The official guidelines. Color contrast ratios (4.5:1 for normal text) are something I can check in every design.',
      },
    ],
  },
  {
    id: 'generative-art',
    title: 'Art Made with Code',
    question: 'Can code be used to make art?',
    description: '',
    created: '2026-09-10',
    updated: '2026-09-27',
    discoveries: [
      {
        id: 'd1', date: '2026-09-10',
        title: 'Vera Molnár — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Vera_Moln%C3%A1r',
        note: 'One of the first artists to make art with a computer, starting in 1968, before screens could even show images.',
      },
      {
        id: 'd2', date: '2026-09-14',
        title: 'p5.js',
        url: 'https://p5js.org',
        note: 'A JavaScript library for drawing in the browser. Made for artists and beginners, so the examples are short.',
      },
      {
        id: 'd3', date: '2026-09-18',
        title: 'The Coding Train',
        url: 'https://thecodingtrain.com',
        note: 'Video tutorials that use p5.js. The “coding challenges” are fun and very approachable.',
      },
      {
        id: 'd4', date: '2026-09-27',
        title: 'The Nature of Code',
        url: 'https://natureofcode.com',
        note: 'A free book about simulating nature (flocking birds, falling leaves) with code.',
      },
    ],
  },
  {
    id: 'learning',
    title: 'Learning How to Learn',
    question: 'Why do I forget what I study so quickly?',
    description: 'Hoping to find better study habits for bootcamp.',
    created: '2026-08-30',
    updated: '2026-09-02',
    discoveries: [
      {
        id: 'd1', date: '2026-08-30',
        title: 'Forgetting curve — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Forgetting_curve',
        note: 'Memory fades fast in the first few days unless you review. That explains a lot.',
      },
      {
        id: 'd2', date: '2026-09-02',
        title: 'Spaced repetition — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Spaced_repetition',
        note: 'Reviewing at growing intervals (1 day, 3 days, a week) beats cramming.',
      },
    ],
  },
];

// Longest allowed text for each field. The form inputs use the same limits.
const FIELD_LIMITS = {
  trail: { title: 80, question: 140, description: 300 },
  discovery: { title: 120, url: 2000, note: 500 },
};


const sampleData = (() => {
  // The working copy. Never hand this out directly: callers get copies,
  // so nothing outside this file can change the data by accident.
  let trails = copyOf(SAMPLE_TRAILS);
  let idCounter = 0;

  function copyOf(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // Unique ids. The counter keeps two items made in the same millisecond apart.
  function newId(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now()}-${idCounter}`;
  }

  function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  // Errors look like failed HTTP responses: a message plus a status code
  function fail(status, message) {
    return Object.assign(new Error(message), { status });
  }

  function findTrail(trailId) {
    const trail = trails.find((t) => t.id === trailId);
    if (!trail) throw fail(404, 'Trail not found.');
    return trail;
  }

  function findDiscovery(trail, discoveryId) {
    const discovery = trail.discoveries.find((d) => d.id === discoveryId);
    if (!discovery) throw fail(404, 'Discovery not found.');
    return discovery;
  }

  /* Checks the same rules the API will: required fields, length limits,
     and http(s) URLs. Returns clean, trimmed values. */
  function validate(kind, data, required) {
    const limits = FIELD_LIMITS[kind];
    const clean = {};
    for (const field of Object.keys(limits)) {
      clean[field] = String(data[field] ?? '').trim();
      if (required.includes(field) && !clean[field]) throw fail(400, `${field} is required.`);
      if (clean[field].length > limits[field]) throw fail(400, `${field} must be ${limits[field]} characters or fewer.`);
    }
    if (kind === 'discovery') {
      let protocol = '';
      try { protocol = new URL(clean.url).protocol; } catch { /* handled below */ }
      if (protocol !== 'http:' && protocol !== 'https:') throw fail(400, 'url must start with http:// or https://');
    }
    return clean;
  }

  return {
    // Trails

    async listTrails() {
      return copyOf(trails);
    },

    async getTrail(trailId) {
      return copyOf(findTrail(trailId));
    },

    async createTrail(data) {
      const fields = validate('trail', data, ['title', 'question']);
      const trail = { id: newId('trail'), ...fields, created: todayISO(), updated: todayISO(), discoveries: [] };
      trails.push(trail);
      return copyOf(trail);
    },

    async updateTrail(trailId, data) {
      const fields = validate('trail', data, ['title', 'question']);
      const trail = findTrail(trailId);
      Object.assign(trail, fields, { updated: todayISO() });
      return copyOf(trail);
    },

    async deleteTrail(trailId) {
      findTrail(trailId);
      trails = trails.filter((t) => t.id !== trailId);
    },

    // Discoveries (always inside a trail; new ones go at the end)

    async createDiscovery(trailId, data) {
      const fields = validate('discovery', data, ['title', 'url']);
      const trail = findTrail(trailId);
      const discovery = { id: newId('d'), date: todayISO(), ...fields };
      trail.discoveries.push(discovery);
      trail.updated = todayISO();
      return copyOf(discovery);
    },

    async updateDiscovery(trailId, discoveryId, data) {
      const fields = validate('discovery', data, ['title', 'url']);
      const trail = findTrail(trailId);
      const discovery = findDiscovery(trail, discoveryId);
      Object.assign(discovery, fields);
      trail.updated = todayISO();
      return copyOf(discovery);
    },

    async deleteDiscovery(trailId, discoveryId) {
      const trail = findTrail(trailId);
      findDiscovery(trail, discoveryId);
      trail.discoveries = trail.discoveries.filter((d) => d.id !== discoveryId);
      trail.updated = todayISO();
    },

    // Settings

    async reset() {
      trails = copyOf(SAMPLE_TRAILS);
    },

    async clear() {
      trails = [];
    },
  };
})();
