/**
 * Sync the release version into src-tauri/tauri.conf.json and src-tauri/Cargo.toml.
 *
 * Usage: node scripts/sync-tauri-version.mjs <version>
 */
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/sync-tauri-version.mjs <version>");
  process.exit(1);
}

// --- tauri.conf.json ---
const confFile = "src-tauri/tauri.conf.json";
const config = JSON.parse(readFileSync(confFile, "utf-8"));
config.version = version;
// Preserve the 2-space indentation and trailing newline of the original file.
writeFileSync(confFile, JSON.stringify(config, null, 2) + "\n");
console.log(`✔ Updated ${confFile} → v${version}`);

// --- Cargo.toml ---
const cargoFile = "src-tauri/Cargo.toml";
const cargoContent = readFileSync(cargoFile, "utf-8");
// Only replace the version under [package], leaving any other version fields
// (e.g. in [dependencies]) untouched.
const updatedCargo = cargoContent.replace(
  /^(\[package\]\n(?:.*\n)*?version\s*=\s*)"[^"]*"/m,
  `$1"${version}"`,
);
writeFileSync(cargoFile, updatedCargo);
console.log(`✔ Updated ${cargoFile} → v${version}`);

// --- Cargo.lock ---
// Cargo.lock records the package's own version under [[package]]. Update it to
// match Cargo.toml so the release commit stays self-consistent (otherwise Cargo
// rewrites Cargo.lock on the next build and leaves a stray dirty diff).
const lockFile = "src-tauri/Cargo.lock";
const lockContent = readFileSync(lockFile, "utf-8");
// Match the version line that appears right after `name = "build-cleaner"`.
const lockPattern = /(\[\[package\]\]\n(?:.*\n)*?name\s*=\s*"build-cleaner"\n(?:.*\n)*?version\s*=\s*)"[^"]*"/;
const lockUpdated = lockPattern.test(lockContent)
  ? lockContent.replace(lockPattern, `$1"${version}"`)
  : lockContent;
writeFileSync(lockFile, lockUpdated);
console.log(`✔ Updated ${lockFile} → v${version}`);