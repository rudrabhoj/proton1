// Subset MapleMono-NF-Regular.ttf to only the codepoints we actually use,
// re-encode as woff2. The original TTF is ~2.2 MB because it carries the
// entire Maple Mono set + the Nerd Font glyph patch (thousands of icons);
// we use ~30 named glyphs plus ASCII for combat-log text.
//
// Codepoint sources:
//   1. Every \u{XXXX} literal in src/Core/Game/Theme.ts (the named icons).
//   2. ASCII printable 0x20..0x7E (digits, letters, punctuation for any
//      runtime-generated text — combat-log lines, cooldown timers, etc).
//   3. A few Latin-1 / common punctuation glyphs we use directly in source
//      strings (×, →, ◀, etc.) — extracted with a separate regex.
//
// Requires `pyftsubset` (fonttools) on PATH. Install: `pip install fonttools brotli`.

import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const themeSrc = readFileSync(resolve(root, 'src/Core/Game/Theme.ts'), 'utf8');

const codepoints = new Set();

// 1. \u{...} escape sequences.
for (const m of themeSrc.matchAll(/\\u\{([0-9a-fA-F]+)\}/g)) {
  codepoints.add(parseInt(m[1], 16));
}

// 2. ASCII printable.
for (let c = 0x20; c <= 0x7e; c++) codepoints.add(c);

// 3. Direct non-ASCII chars in Theme.ts string literals (e.g. ✓, ✗, ←, →).
//    Catches anything > 0x7F so we don't have to track them by hand.
for (const ch of themeSrc) {
  const cp = ch.codePointAt(0);
  if (cp !== undefined && cp > 0x7f) codepoints.add(cp);
}

// 4. A small set of game-runtime characters that may not be visible in the
//    source verbatim (e.g. via template literals computing labels). Conservative
//    additions only — anything beyond ASCII + named glyphs has to be added
//    here explicitly so the font stays small.
const extra = [
  0x00a0, // non-breaking space
];
for (const cp of extra) codepoints.add(cp);

const sorted = [...codepoints].sort((a, b) => a - b);
const unicodeList = sorted
  .map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`)
  .join(',');

// Source ttf lives outside public/ so Vite doesn't auto-copy the 2.2 MB
// original into dist/. Output woff2 lives inside public/ so it ships.
const inFile = resolve(root, 'fonts-src/MapleMono-NF-Regular.ttf');
const outFile = resolve(root, 'public/assets/fonts/MapleMono-NF-Subset.woff2');

const cmd = [
  'pyftsubset',
  `"${inFile}"`,
  `--unicodes=${unicodeList}`,
  '--flavor=woff2',
  // Keep ligatures + features that affect rendering of the codepoints we keep.
  // Drop everything else (kerning tables for absent glyphs, GSUB lookups for
  // dropped scripts, etc.) which is what gives us the size win.
  '--layout-features=*',
  '--no-hinting',
  '--desubroutinize',
  `--output-file="${outFile}"`,
].join(' ');

console.log(`[font] subsetting ${sorted.length} codepoints`);
execSync(cmd, { stdio: 'inherit' });

const inSize = statSync(inFile).size;
const outSize = statSync(outFile).size;
const pct = ((1 - outSize / inSize) * 100).toFixed(1);
console.log(
  `[font] ${inFile.split('/').pop()} ${(inSize / 1024).toFixed(0)} KB ` +
  `-> ${outFile.split('/').pop()} ${(outSize / 1024).toFixed(0)} KB ` +
  `(${pct}% reduction)`,
);
