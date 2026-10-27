/* Start-up: `npm run preview` needs no MongoDB settings, while the full
   app (`npm start`) refuses to start without MONGODB_URI instead of
   falling back to sample data. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The environment with every MongoDB setting removed
function envWithoutMongo(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const key of Object.keys(env)) {
    if (key.startsWith('MONGODB_')) delete env[key];
  }
  return env;
}

function run(script, env) {
  const child = spawn(process.execPath, [script], { cwd: SERVER_DIR, env });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  return { child, output: () => output };
}

test('preview starts and serves the page with no MongoDB settings', async () => {
  const { child, output } = run('preview.js', envWithoutMongo({ PORT: '0' }));
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on('data', () => { if (output().includes('Running at')) resolve(); });
      child.once('exit', (code) => reject(new Error(`preview exited (${code}): ${output()}`)));
    });
    assert.doesNotMatch(output(), /MONGODB_URI is not set|Couldn't connect/);
  } finally {
    child.kill();
  }
});

test('full app exits with an error when MONGODB_URI is not set', async () => {
  const { child, output } = run('server.js', envWithoutMongo());
  const code = await new Promise((resolve) => child.once('exit', resolve));
  assert.equal(code, 1);
  assert.match(output(), /MONGODB_URI is not set/);
});
