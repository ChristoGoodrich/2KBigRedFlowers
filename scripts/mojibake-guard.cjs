// Mojibake sentinel — fails if encoding-corruption signatures appear in source.
//
// Background: the Overview once shipped 23 separators where the middle dot `·`
// (U+00B7) had been mangled by an encoding round-trip into `路` and `璺?`.
// `路` is the SAME codepoint as the legitimate Chinese 路 (road/route), so we
// cannot ban it outright — instead we ban the never-legitimate signature chars
// and flag `路` only when it is isolated from CJK on both sides (i.e. used as a
// separator), which is exactly how the corruption manifested.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Chars that never legitimately appear in this app's source. `璺` (U+74BA) is an
// obscure character that only showed up as corruption; U+FFFD is the Unicode
// replacement char; the rest are classic UTF-8-misread-as-Latin1 lead bytes.
const ALWAYS_BAD = ['�', '璺' /* 璺 */, '锛', '鈥', '聙', '脗', '楗', '鈩'];

const CJK = /[㐀-鿿豈-﫿]/;

function listSourceFiles() {
  return fs.readdirSync(root)
    .filter(f => /\.(js|css|html)$/.test(f))
    .map(f => path.join(root, f));
}

const offenders = [];

for (const file of listSourceFiles()) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.basename(file);
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    for (const bad of ALWAYS_BAD) {
      if (line.includes(bad)) {
        offenders.push(`${rel}:${i + 1} contains banned mojibake char U+${bad.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} → ${line.trim().slice(0, 80)}`);
      }
    }
    // `路` used as a separator: not adjacent to CJK on EITHER side.
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== '路') continue;
      const prev = line[c - 1] || '';
      const next = line[c + 1] || '';
      if (!CJK.test(prev) && !CJK.test(next)) {
        offenders.push(`${rel}:${i + 1} has isolated 路 (likely a corrupted · separator) → ${line.trim().slice(0, 80)}`);
      }
    }
  });
}

if (offenders.length) {
  throw new Error(`mojibake guard FAILED — ${offenders.length} issue(s):\n` + offenders.join('\n'));
}

console.log('mojibake guard ok: no encoding-corruption signatures in js/css/html sources');
