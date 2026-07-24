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