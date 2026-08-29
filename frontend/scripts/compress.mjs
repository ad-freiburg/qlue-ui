// ┌─────────────────────────────────┐ \\
// │ Copyright © 2026 Ioannis Nezis  │ \\
// ├─────────────────────────────────┤ \\
// │ Licensed under the MIT license. │ \\
// └─────────────────────────────────┘ \\

// Pre-compresses build output so the backend can serve static assets without
// re-compressing them on every request (qlue_ls_bg.wasm alone is ~5.7 MB).
// index.html is excluded: the backend rewrites <base href> and serves it from memory.

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const DIST = 'dist';
const EXTENSIONS = new Set(['.js', '.css', '.wasm', '.svg', '.json', '.map', '.ttf']);
const MIN_SIZE = 1024;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

for await (const path of walk(DIST)) {
  if (!EXTENSIONS.has(extname(path))) continue;
  const { size } = await stat(path);
  if (size < MIN_SIZE) continue;

  const source = await readFile(path);
  const [br, gzipped] = await Promise.all([
    brotli(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: size,
      },
    }),
    gz(source, { level: 9 }),
  ]);
  await Promise.all([writeFile(`${path}.br`, br), writeFile(`${path}.gz`, gzipped)]);

  if (size > 512 * 1024) {
    console.log(`  ${path}: ${mb(size)} -> ${mb(br.length)} (br), ${mb(gzipped.length)} (gzip)`);
  }
}
