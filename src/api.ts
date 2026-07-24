import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  BuildEntry,
  CleanEvent,
  CleanResult,
  ScanEvent,
  ScanRule,
} from "./types";

export async function getRules(): Promise<ScanRule[]> {
  return invoke<ScanRule[]>("get_rules");
}

export async function saveRules(rules: ScanRule[]): Promise<void> {
  await invoke("save_rules_cmd", { rules });
}

export async function pickDirectory(): Promise<string | null> {
  return invoke<string | null>("pick_directory");
}

export async function scanDirectory(
  root: string,
  rules: ScanRule[],
  onEvent: (e: ScanEvent) => void,
): Promise<BuildEntry[]> {
  const channel = new Channel<ScanEvent>();
  channel.onmessage = onEvent;
  return invoke<BuildEntry[]>("scan_directory", {
    root,
    rules,
    onEvent: channel,
  });
}

export async function cleanDirectories(
  paths: string[],
  onEvent: (e: CleanEvent) => void,
): Promise<CleanResult> {
  const channel = new Channel<CleanEvent>();
  channel.onmessage = onEvent;
  return invoke<CleanResult>("clean_directories", { paths, onEvent: channel });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}
