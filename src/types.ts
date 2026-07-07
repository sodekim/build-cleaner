export interface ScanRule {
  id: string;
  name: string;
  ecosystem: string;
  build_dirs: string[];
  markers: string[];
  enabled: boolean;
  builtin: boolean;
}

export interface BuildEntry {
  id: string;
  path: string;
  name: string;
  ecosystem: string;
  rule_name: string;
  size: number;
  file_count: number;
}

export interface CleanResultItem {
  path: string;
  success: boolean;
  error: string | null;
  freed: number;
}

export interface CleanResult {
  items: CleanResultItem[];
  total_freed: number;
  failed: number;
}

export type ScanEvent =
  | { kind: "Entering"; dir: string }
  | { kind: "Found"; entry: BuildEntry }
  | { kind: "Done"; total: number; total_size: number };

export type CleanEvent =
  | { kind: "Start"; total: number }
  | { kind: "Item"; path: string; index: number; success: boolean }
  | { kind: "Done"; total_freed: number; failed: number };
