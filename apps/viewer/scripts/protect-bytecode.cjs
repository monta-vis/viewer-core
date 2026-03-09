/**
 * Phase 1 — Compile dist-electron/ to V8 bytecode.
 *
 * IMPORTANT: This script MUST run under Electron's Node runtime so the
 * generated .jsc bytecode matches Electron's V8 version.
 *
 * Invoked via:  npx electron scripts/protect-bytecode.cjs
 */
'use strict';

const { readFileSync, writeFileSync } = require('node:fs');
const { join, relative, basename } = require('node:path');
const { glob } = require('node:fs/promises');
const bytenode = require('bytenode');

const ROOT = join(__dirname, '..');
const ELECTRON_DIR = join(ROOT, 'dist-electron');
const SKIP_FILES = new Set(['preload.mjs']);

async function main() {
  console.info(`[Protect] Phase 1: Compiling dist-electron/ to V8 bytecode (V8 ${process.versions.v8})...`);

  let compiled = 0;
  let skipped = 0;

  const patterns = [
    join(ELECTRON_DIR, '**/*.js').replace(/\\/g, '/'),
    join(ELECTRON_DIR, '**/*.cjs').replace(/\\/g, '/'),
  ];

  for (const pattern of patterns) {
    for await (const filePath of glob(pattern)) {
      const name = basename(filePath);
      const rel = relative(ROOT, filePath);

      if (SKIP_FILES.has(name) || rel.includes('node_modules') || filePath.endsWith('.map')) {
        skipped++;
        continue;
      }

      const source = readFileSync(filePath, 'utf-8');

      if (source.length < 50) {
        skipped++;
        continue;
      }

      try {
        const jscPath = filePath.replace(/\.(js|cjs)$/, '.jsc');
        await bytenode.compileFile(filePath, jscPath);

        const hasExports = /(?:module\.exports|exports\.\w)/m.test(source);
        const jscName = basename(jscPath);

        const stub = hasExports
          ? `"use strict";require("bytenode");module.exports=require("./${jscName}");`
          : `"use strict";require("bytenode");require("./${jscName}");`;

        writeFileSync(filePath, stub);
        compiled++;
        process.stdout.write(`\r[Protect] Phase 1: ${compiled} files compiled to bytecode...`);
      } catch (err) {
        console.error(`\n[Protect] Failed to compile ${rel}:`, err.message);
        skipped++;
      }
    }
  }

  console.info(`\n[Protect] Phase 1 done. ${compiled} compiled, ${skipped} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Protect] Phase 1 failed:', err);
    process.exit(1);
  });
