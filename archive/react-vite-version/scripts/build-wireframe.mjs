/* Builds the app into wireframes/rabbit-tracks-wireframe.{html,css,js}:
   three plain files that open by double-clicking, no server or npm needed.

   A normal Vite build uses <script type="module">, which browsers refuse
   to load from file://. This builds the app as usual, then rewrites the
   output as a classic script so the HTML file works straight from disk.

   Run with: npm run build:wireframe */

import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const tempDir = path.join(rootDir, 'dist-wireframe');
const outDir = path.join(rootDir, 'wireframes');
const name = 'rabbit-tracks-wireframe';

await build({ root: rootDir, logLevel: 'warn', build: { outDir: tempDir, emptyOutDir: true } });

let html = fs.readFileSync(path.join(tempDir, 'index.html'), 'utf8');
const jsFile = html.match(/<script type="module" crossorigin src="\/(assets\/[^"]+\.js)"><\/script>/)?.[1];
const cssFile = html.match(/<link rel="stylesheet" crossorigin href="\/(assets\/[^"]+\.css)">/)?.[1];
if (!jsFile || !cssFile) throw new Error('Could not find the built JS/CSS in index.html. Did the Vite output format change?');

const js = fs.readFileSync(path.join(tempDir, jsFile), 'utf8');
// A classic script can't contain import/export, so stop if the bundle has any
if (/(^|[;}\s])(import|export)\s*[{*\w]/m.test(js.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""')) || js.includes('import.meta')) {
  throw new Error('The bundle uses import/export or import.meta, so it cannot run as a classic script.');
}

const favicon = fs.readFileSync(path.join(rootDir, 'public', 'favicon.svg'), 'utf8');

html = html
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, `<script src="${name}.js" defer></script>`)
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<link rel="stylesheet" href="${name}.css">`)
  .replace('href="/favicon.svg"', `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`)
  .replace('<head>', `<head>\n  <!-- Built from src/ by scripts/build-wireframe.mjs. Edit the React code, then run: npm run build:wireframe -->`);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${name}.html`), html);
fs.writeFileSync(path.join(outDir, `${name}.js`), `(function () {\n'use strict';\n${js}\n})();\n`);
fs.copyFileSync(path.join(tempDir, cssFile), path.join(outDir, `${name}.css`));
fs.rmSync(tempDir, { recursive: true, force: true });

console.log(`Wrote ${name}.html, .css and .js to ${outDir}`);
