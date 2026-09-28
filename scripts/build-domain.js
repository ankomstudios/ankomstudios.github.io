// Regenerates domain/ from the real source of truth (root index.html,
// assets/, system/) so it's a literal, 1:1 mirror of the live URL space —
// domain/assets/css/*, domain/faq/index.html, domain/pages/wannasmile/...
// exactly matching what production serves at those paths.
//
// Never hand-edit anything under domain/ — it's fully regenerated (wiped,
// then rebuilt) every run, so edits made there are silently lost. Change
// the real files (root index.html, assets/, system/) and re-run this
// script instead:
//
//   node scripts/build-domain.js
//
// Run it after any edit under those paths, before previewing with Live
// Server (point it at domain/, not the repo root) and before pushing —
// domain/ is what wrangler.jsonc's assets.directory points at, so it's
// what actually gets deployed.
//
// Keeps the same short-URL split PAGE_NAMES/system/pages/ layout as
// worker.js's old rewrite table: short names get a top-level folder,
// everything else keeps "pages" in its path.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOMAIN = path.join(ROOT, 'domain');

const PAGE_NAMES = new Set([
  'contributors', 'docs', 'donate', 'faq', 'news', 'privacy',
  'quickref', 'roadmap', 'socials', 'support', 'terms', 'tutorial',
]);

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

// Empties a directory's contents without removing the directory itself —
// on Windows (this folder sits under Downloads, which OneDrive typically
// syncs) something can hold an open handle on the domain/ directory
// inode itself, which makes deleting-then-recreating it fail with EPERM
// even though every file inside it is perfectly deletable.
function clearDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) {
    rmrf(path.join(dir, name));
  }
}

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Rebuilding domain/ ...');
clearDir(DOMAIN);

// Root page
copy(path.join(ROOT, 'index.html'), path.join(DOMAIN, 'index.html'));

// Passthrough assets (images, webfonts — same path in both trees)
copy(path.join(ROOT, 'assets', 'images'), path.join(DOMAIN, 'assets', 'images'));
copy(path.join(ROOT, 'assets', 'webfonts'), path.join(DOMAIN, 'assets', 'webfonts'));

// system/css -> domain/assets/css, system/data -> domain/assets/data
copy(path.join(ROOT, 'system', 'css'), path.join(DOMAIN, 'assets', 'css'));
copy(path.join(ROOT, 'system', 'data'), path.join(DOMAIN, 'assets', 'data'));

// system/js -> domain/assets/js, excluding worker.js (that's the Worker's
// own source, not a public asset — same exclusion .assetsignore used to do)
const jsSrcDir = path.join(ROOT, 'system', 'js');
const jsDestDir = path.join(DOMAIN, 'assets', 'js');
fs.mkdirSync(jsDestDir, { recursive: true });
for (const name of fs.readdirSync(jsSrcDir)) {
  if (name === 'worker.js') continue;
  copy(path.join(jsSrcDir, name), path.join(jsDestDir, name));
}

// system/pages/<name> -> domain/<name>/ (short-URL pages) or
// domain/pages/<name>/ (everything else), matching worker.js's old table
const pagesDir = path.join(ROOT, 'system', 'pages');
for (const name of fs.readdirSync(pagesDir)) {
  const src = path.join(pagesDir, name);
  if (!fs.statSync(src).isDirectory()) continue;
  const dest = PAGE_NAMES.has(name)
    ? path.join(DOMAIN, name)
    : path.join(DOMAIN, 'pages', name);
  copy(src, dest);
}

// Belt-and-suspenders against stray OS junk files ending up in the
// asset upload — domain/ is fully controlled by this script, so nothing
// else should ever land in it, but this costs nothing to keep.
fs.writeFileSync(
  path.join(DOMAIN, '.assetsignore'),
  '.assetsignore\nThumbs.db\n.DS_Store\n'
);

console.log('domain/ rebuilt.');
