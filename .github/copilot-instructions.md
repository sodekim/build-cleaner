# Build Cleaner — Copilot Instructions

## Build, Test & Lint Commands

```bash
pnpm install          # Install frontend dependencies
pnpm tauri:dev        # Run the full app in dev mode (Vite + Tauri, hot-reload for both frontend and Rust)
pnpm tauri:build      # Build production installers (outputs to src-tauri/target/release/bundle/)
pnpm build            # Build frontend only (tsc -b && vite build)
pnpm lint             # Type-check frontend (tsc --noEmit) — the only lint step
pnpm release          # Full release via release-it (conventional commits)
pnpm release:dry      # Dry-run the release process
```

**Prerequisites:** Node.js 24+, pnpm 11+, Rust 1.77+.

There is no test framework in this project — no unit tests or integration tests exist.

For Rust-only checks, run `cargo check` or `cargo clippy` inside `src-tauri/`.

### Rust build without full Tauri build

```bash
cd src-tauri && cargo check      # Quick compile check
cd src-tauri && cargo clippy     # Lint Rust code
```

## Architecture

This is a **Tauri 2** desktop app: a React/TypeScript frontend communicating with a Rust backend via Tauri's IPC system.

### Frontend (`src/`)

- `App.tsx` — Root component holding all app state (tab navigation, rules, scan results, selection, theme). Orchestrates scan → filter → select → clean flow.
- `api.ts` — Single source of truth for all Tauri IPC calls. Every `invoke()` and `Channel` is wrapped here. Also exports `formatBytes()`.
- `types.ts` — TypeScript interfaces that **must** mirror the Rust structs in `src-tauri/src/` (`ScanRule`, `BuildEntry`, `ScanEvent`, `CleanEvent`, `CleanResult`).
- `components/Header.tsx` — Custom titlebar (window decorations are disabled in `tauri.conf.json`). Implements minimize/maximize/close via `getCurrentWindow()`. Uses `data-tauri-drag-region` for window dragging.
- `components/ScanList.tsx` — Sortable results table with ecosystem filter tags. All entries are filtered through `activeEcosystems` set before display.
- `components/RuleEditor.tsx` — CRUD UI for scan rules. Local edit state with dirty tracking; only saves on explicit button click.
- `components/Footer.tsx` — Status bar showing counts, selected size, and the clean action button.

### Backend (`src-tauri/src/`)

- `lib.rs` — Module wiring and all `#[tauri::command]` functions: `get_rules`, `save_rules_cmd`, `pick_directory`, `scan_directory`, `clean_directories`. Registers `AppState` (holds `app_data_dir`) via `app.manage()`.
- `rules.rs` — `ScanRule` struct, `builtin_rules()` (8 presets for Maven, Gradle, Cargo, npm, JS, .NET, Python, CMake), and `merge_rules()` which merges user-saved rules with builtins. Includes a minimal glob matcher for marker file patterns (`*` only).
- `scanner.rs` — Recursive directory walker. Recurses into directories, matches against active rules, collects hits in a mutex, then uses **rayon** to parallelize size calculation. Skips `.git`, `.hg`, `.svn`, `.idea`, `.vscode`. Does not recurse into matched build directories. Emits `ScanEvent` stream via Tauri Channel.
- `store.rs` — Rules persistence: reads/writes `rules.json` in the OS app data directory.
- `main.rs` — Minimal entry point, calls `build_cleaner_lib::run()`.

### IPC & Event Flow

Scan and clean operations use Tauri `Channel<T>` for streaming progress. Events are tagged unions serialised with `#[serde(tag = "kind")]` in Rust, discriminated by the `kind` string field on the TypeScript side:

- `ScanEvent`: `Entering` → (multiple `Found`) → `Done`
- `CleanEvent`: `Start` → (multiple `Item`) → `Done`

## Key Conventions

### Type Mirroring

Rust structs and TypeScript interfaces must stay in sync. Rust uses snake_case field names (e.g., `build_dirs`, `file_count`); the TS types in `src/types.ts` match these exactly. The `serde(rename_all)` convention is **not** used — field names are identical on both sides. When changing a struct, update both `src-tauri/src/*.rs` and `src/types.ts`.

### Rule System

- **Builtin rules** have stable IDs (e.g., `maven-target`, `gradle-build`) and `builtin: true`. They cannot be deleted, only disabled or edited.
- **Custom rules** get IDs like `custom-{Date.now()}` and `builtin: false`.
- `merge_rules()` in `rules.rs` preserves user overrides (enabled, markers, build_dirs, name) for builtins while appending new custom rules. This is how rule state survives app upgrades.
- A rule matches a directory when: the directory name matches one of `build_dirs` **AND** the parent directory satisfies `markers` (any marker file exists; empty `markers` = unconditional match). Markers support `*` glob for file extension matching (e.g., `*.csproj`).

### Version Sync

Version is maintained in **three places**: `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` (plus `Cargo.lock`). The `scripts/sync-tauri-version.mjs` script syncs all three and runs automatically via the release-it `after:bump` hook. Never bump version manually in just one file.

### Conventional Commits

Uses [conventional commits](https://www.conventionalcommits.org/) format. Commit messages should follow this pattern. The release-it config maps types to CHANGELOG sections: `feat`→✨, `fix`→🐛, `perf`→⚡, `refactor`→♻️, `docs`→📝. Style/chore/ci/test types are hidden from the changelog.

### UI Language

All user-facing UI strings and most code comments are in **Chinese** (Simplified). Match this convention when adding UI text or comments. Commit messages follow conventional commit format in **English**.

### Styling

- **Tailwind CSS v4** with class-based dark mode (not the default media-query strategy). The `@custom-variant dark` directive in `src/index.css` enables `.dark` class toggling.
- **daisyUI** is installed as a devDependency but is not actively used for styling — Tailwind utility classes dominate all components.
- Theme state lives in `App.tsx`, persists to `localStorage`, and syncs the OS-level window theme via `getCurrentWindow().setTheme()`.

### Desktop Window

Native window decorations are disabled (`decorations: false` in `tauri.conf.json`). The custom titlebar in `Header.tsx` handles window controls. The native context menu is disabled in `main.tsx` (except for input/textarea fields). The app is a single window with no routing — navigation is tab-based (`scan` ↔ `rules`).

### Permissions

Tauri capabilities are defined in `src-tauri/capabilities/default.json`. Window control, dialog, and specific fs permissions are explicitly listed. New Tauri plugin commands or window operations need corresponding permissions added here.