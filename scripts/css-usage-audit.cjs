// Read-only dead-CSS audit for the two largest stylesheets.
// A class is "used" if its literal token appears anywhere in JS/HTML markup
// (covers class="...", classList, and template strings). Candidates that are
// NOT found literally are further checked for a dynamic-construction prefix
// (e.g. `lab-ref-${tone}` -> prefix "lab-ref-") so we never flag those.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const TARGETS = process.argv.slice(2);
if (!TARGETS.length) { console.error('usage: node css-usage-audit.cjs <file.css> [...]'); process.exit(1); }

// Build the markup corpus: every .js + .html file (CSS-to-CSS refs don't count).
const corpusFiles = fs.readdirSync(root).filter(f => f.endsWith('.js') || f.endsWith('.html'));
const corpus = corpusFiles.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

// Collect every string/template literal in the corpus for prefix analysis.
const literals = [];
for (const m of corpus.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) literals.push(m[2]);
const literalBlob = literals.join('\0');

function classTokens(css) {
  // strip comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Set();
  // only look at selector portions (before each `{`)
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1];
    for (const c of sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) tokens.add(c[1]);
  }
  return tokens;
}

function usedLiteral(cls) {
  return corpus.includes(cls);
}

// Does a hyphenated prefix of cls appear as the *end* of some JS string literal,
// implying `'prefix-' + x` or `prefix-${x}` dynamic construction?
function dynamicPrefix(cls) {
  const parts = cls.split('-');
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('-') + '-';
    if (literalBlob.includes(prefix + '\0') || literalBlob.includes(prefix + ' ') ||
        corpus.includes('"' + prefix) || corpus.includes("'" + prefix) || corpus.includes('`' + prefix) ||
        corpus.includes(prefix + '${') || corpus.includes(prefix + '" +') || corpus.includes(prefix + "' +")) {
      return prefix;
    }
  }
  return null;
}

for (const target of TARGETS) {
  const css = fs.readFileSync(path.join(root, target), 'utf8');
  const tokens = [...classTokens(css)].sort();
  const used = [];
  const dynamic = [];
  const candidates = [];
  for (const cls of tokens) {
    if (usedLiteral(cls)) { used.push(cls); continue; }
    const pre = dynamicPrefix(cls);
    if (pre) dynamic.push(`${cls}  (prefix ${pre})`);
    else candidates.push(cls);
  }
  console.log(`\n=== ${target} ===`);
  console.log(`classes: ${tokens.length} | used-literal: ${used.length} | dynamic-prefix: ${dynamic.length} | UNUSED candidates: ${candidates.length}`);
  if (dynamic.length) console.log('\n-- dynamic (KEEP) --\n' + dynamic.join('\n'));
  console.log('\n-- UNUSED candidates --\n' + candidates.join('\n'));
}
