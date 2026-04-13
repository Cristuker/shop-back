/**
 * Patches generated/prisma/client.ts after `prisma generate`.
 *
 * Problem: Prisma 7's prisma-client generator emits `import.meta.url` to polyfill
 * __dirname for ESM environments. Node.js v22+ treats any file containing
 * `import.meta` as an ES module during its static detection phase. When TypeScript
 * compiles this file as CJS (no "type":"module" in package.json), the output has
 * both `exports` (CJS) and `import.meta` (ESM indicator), which causes:
 *   ReferenceError: exports is not defined in ES module scope
 *
 * Fix: remove the import.meta.url block. In CJS, __dirname is natively available.
 *
 * Usage: add "prisma:generate": "prisma generate && node scripts/patch-prisma.cjs"
 * to package.json scripts, and always use `npm run prisma:generate`.
 */

const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname, "../generated/prisma/client.ts");
let content = fs.readFileSync(clientPath, "utf8");

const IMPORT_META_BLOCK =
  "import * as process from 'node:process'\n" +
  "import * as path from 'node:path'\n" +
  "import { fileURLToPath } from 'node:url'\n" +
  "globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))\n";

const CJS_COMMENT =
  "// NOTE: Lines that set globalThis['__dirname'] via import.meta.url were removed.\n" +
  "// Node.js v22+ detects import.meta as ESM syntax, which breaks CJS compilation.\n" +
  "// In CommonJS, __dirname is already available natively — no polyfill needed.\n";

if (content.includes("import.meta.url")) {
  content = content.replace(IMPORT_META_BLOCK, CJS_COMMENT);
  fs.writeFileSync(clientPath, content);
  console.log("✔ Patched generated/prisma/client.ts for Node.js v22+ CJS compatibility.");
} else {
  console.log("✔ generated/prisma/client.ts already patched — nothing to do.");
}
