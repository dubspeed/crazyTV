// Bündelt das Spiel (inkl. Three.js und GLB-Assets) in EINE HTML-Datei: dist/crazytv.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  loader: { '.glb': 'binary' },
  write: false,
  legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('index.html', 'utf8').replace('/*__GAME__*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/crazytv.html', html);
// Vorschau-Variante mit vollständigem HTML-Gerüst (für lokales Öffnen im Browser)
writeFileSync('dist/preview.html', `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">${html}</body></html>`);
console.log(`dist/crazytv.html ${(html.length / 1024).toFixed(0)} KB`);
