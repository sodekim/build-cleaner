/**
 * Sync the version in src-tauri/tauri.conf.json with the new release version.
 *
 * Usage: node scripts/sync-tauri-version.mjs <version>
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = "src-tauri/tauri.conf.json";
const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/sync-tauri-version.mjs <version>");
  process.exit(1);
}

const config = JSON.parse(readFileSync(file, "utf-8"));
config.version = version;

// Preserve the 2-space indentation and trailing newline of the original file.
writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
console.log(`✔ Updated ${file} → v${version}`);