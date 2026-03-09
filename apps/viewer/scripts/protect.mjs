import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { glob } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import electronPath from 'electron';
import JavaScriptObfuscator from 'javascript-obfuscator';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

// ---------------------------------------------------------------------------
// Phase 1 — Bytecode compile dist-electron/ using Electron's V8
// ---------------------------------------------------------------------------
// Must run under Electron's Node runtime so .jsc files match Electron's V8.

console.info('[Protect] Phase 1: Launching bytecode compilation under Electron runtime...');

const bytecodeScript = join(ROOT, 'scripts', 'protect-bytecode.cjs');

try {
  execFileSync(String(electronPath), [bytecodeScript], {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
} catch (err) {
  console.error('[Protect] Phase 1 failed:', err.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Shared obfuscation config & helper
// ---------------------------------------------------------------------------

/** @type {import('javascript-obfuscator').ObfuscatorOptions} */
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.5,
  selfDefending: true,
  splitStrings: false,
  transformObjectKeys: false,
  target: 'browser',
  renameGlobals: false,
};

/**
 * Obfuscate all .js files in a directory.
 * @param {string} dir - Absolute path to the directory to obfuscate.
 * @param {string} label - Phase label for logging (e.g. "Phase 2").
 * @param {Set<string>} [skipFiles] - Set of filenames to skip (e.g. "embed.js").
 * @returns {Promise<{ obfuscated: number; skipped: number }>}
 */
async function obfuscateDirectory(dir, label, skipFiles = new Set()) {
  let obfuscated = 0;
  let skipped = 0;

  const pattern = join(dir, '**/*.js').replace(/\\/g, '/');

  for await (const filePath of glob(pattern)) {
    const rel = relative(ROOT, filePath);
    const fileName = filePath.split(/[\\/]/).pop();

    if (rel.includes('node_modules') || filePath.endsWith('.map') || skipFiles.has(fileName)) {
      skipped++;
      continue;
    }

    const source = readFileSync(filePath, 'utf-8');

    if (source.length < 50) {
      skipped++;
      continue;
    }

    try {
      const result = JavaScriptObfuscator.obfuscate(source, {
        ...obfuscatorOptions,
        inputFileName: rel,
      });
      writeFileSync(filePath, result.getObfuscatedCode());
      obfuscated++;
      process.stdout.write(`\r[Protect] ${label}: ${obfuscated} files obfuscated...`);
    } catch (err) {
      console.error(`\n[Protect] Failed to obfuscate ${rel}:`, err.message);
      skipped++;
    }
  }

  console.info(`\n[Protect] ${label} done. ${obfuscated} obfuscated, ${skipped} skipped.`);
  return { obfuscated, skipped };
}

// ---------------------------------------------------------------------------
// Phase 2 — Obfuscate dist/ (renderer code)
// ---------------------------------------------------------------------------

console.info('[Protect] Phase 2: Obfuscating dist/ (renderer)...');
await obfuscateDirectory(join(ROOT, 'dist'), 'Phase 2');

// ---------------------------------------------------------------------------
// Phase 3 — Obfuscate dist-mweb/ (mweb viewer exported bundle)
// ---------------------------------------------------------------------------

const mwebDir = join(ROOT, 'dist-mweb');

if (existsSync(mwebDir)) {
  console.info('[Protect] Phase 3: Obfuscating dist-mweb/ (mweb viewer)...');
  await obfuscateDirectory(mwebDir, 'Phase 3', new Set(['embed.js']));
} else {
  console.info('[Protect] Phase 3: dist-mweb/ not found, skipping mweb obfuscation.');
}

console.info('[Protect] Complete.');
