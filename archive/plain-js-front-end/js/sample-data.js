/* =========================================================
   Rabbit Hole Trails — TEMPORARY sample data store

   This is NOT the backend. It only exists so the front end can be
   used before the Express API is built. It saves trails in this
   browser's localStorage, so nothing ever reaches a server and
   other browsers/computers won't see the same data.

   It has the same functions as the real API client in api.js
   (listTrails, getTrail, createTrail, ...), so switching
   DATA_SOURCE to 'api' doesn't require any changes in app.js.
   ========================================================= */

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


const SampleStore = (() => {
  const STORAGE_KEY = 'rabbit-hole-trails:sample-data';

  // A short pause so the loading states can be seen, like a real network request
  const DELAY_MS = 150;

  // If localStorage is blocked (private window, etc.) the data lives in memory instead
  let memoryCopy = null;

  function copyOf(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fall through to the in-memory copy
    }
    return memoryCopy || copyOf(SAMPLE_TRAILS);
  }

  function save(trails) {
    memoryCopy = trails;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trails));
    } catch {
      // still works for this visit, just won't survive a refresh
    }
  }

  // Same error shape the real API client throws
  function fail(status, message) {
    return Object.assign(new Error(message), { status });
  }

  // Wraps each function so it behaves like an async network call
  function respond(work) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(copyOf(work()));
        } catch (error) {
          reject(error);
        }
      }, DELAY_MS);
    });
  }

  function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function findTrail(trails, trailId) {
    const trail = trails.find((t) => t.id === trailId);
    if (!trail) throw fail(404, 'Trail not found.');
    return trail;
  }

  function findDiscovery(trail, discoveryId) {
    const discovery = trail.discoveries.find((d) => d.id === discoveryId);
    if (!discovery) throw fail(404, 'Discovery not found.');
    return discovery;
  }

  function requireFields(data, fields) {
    const missing = fields.filter((field) => !String(data[field] || '').trim());
    if (missing.length) throw fail(400, `Missing required field: ${missing.join(', ')}.`);
  }

  return {
    listTrails: () => respond(() => load()),

    getTrail: (trailId) => respond(() => findTrail(load(), trailId)),

    createTrail: (data) => respond(() => {
      requireFields(data, ['title', 'question']);
      const trails = load();
      const trail = {
        id: newId('trail'),
        title: data.title,
        question: data.question,
        description: data.description || '',
        created: todayISO(),
        updated: todayISO(),
        discoveries: [],
      };
      trails.push(trail);
      save(trails);
      return trail;
    }),

    updateTrail: (trailId, data) => respond(() => {
      requireFields(data, ['title', 'question']);
      const trails = load();
      const trail = findTrail(trails, trailId);
      Object.assign(trail, {
        title: data.title,
        question: data.question,
        description: data.description || '',
        updated: todayISO(),
      });
      save(trails);
      return trail;
    }),

    deleteTrail: (trailId) => respond(() => {
      const trails = load();
      findTrail(trails, trailId);
      save(trails.filter((t) => t.id !== trailId));
      return null;
    }),

    createDiscovery: (trailId, data) => respond(() => {
      requireFields(data, ['title', 'url']);
      const trails = load();
      const trail = findTrail(trails, trailId);
      const discovery = { id: newId('d'), date: todayISO(), title: data.title, url: data.url, note: data.note || '' };
      trail.discoveries.push(discovery);
      trail.updated = todayISO();
      save(trails);
      return discovery;
    }),

    updateDiscovery: (trailId, discoveryId, data) => respond(() => {
      requireFields(data, ['title', 'url']);
      const trails = load();
      const trail = findTrail(trails, trailId);
      Object.assign(findDiscovery(trail, discoveryId), { title: data.title, url: data.url, note: data.note || '' });
      trail.updated = todayISO();
      save(trails);
      return findDiscovery(trail, discoveryId);
    }),

    deleteDiscovery: (trailId, discoveryId) => respond(() => {
      const trails = load();
      const trail = findTrail(trails, trailId);
      findDiscovery(trail, discoveryId);
      trail.discoveries = trail.discoveries.filter((d) => d.id !== discoveryId);
      trail.updated = todayISO();
      save(trails);
      return null;
    }),

    // Only used by the Settings dialog while DATA_SOURCE is 'sample'
    reset: () => respond(() => { save(copyOf(SAMPLE_TRAILS)); return null; }),
    clear: () => respond(() => { save([]); return null; }),
  };
})();
