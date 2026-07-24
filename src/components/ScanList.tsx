import { useMemo, useState } from "react";
import type { BuildEntry } from "../types";
import { formatBytes } from "../api";

type SortKey = "path" | "ecosystem" | "size" | "file_count" | "rule_name";
type SortDir = "asc" | "desc";

interface ScanListProps {
  entries: BuildEntry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onToggleEcosystem: (eco: string) => void;
  scanning: boolean;
  progressText: string;
}

const ECO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  maven: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  gradle: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cargo: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  npm: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  js: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  dotnet: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  python: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  cmake: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
};

export default function ScanList({
  entries,
  selected,
  onToggle,
  onToggleAll,
  onToggleEcosystem,
  scanning,
  progressText,
}: ScanListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "path" || key === "ecosystem" || key === "rule_name" ? "asc" : "desc");
    }
  };

  const ecosystems = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.ecosystem, (map.get(e.ecosystem) ?? 0) + 1);
    return [...map.entries()];
  }, [entries]);

  const sortedEntries = useMemo(() => {
    const copy = [...entries];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "path":
          return dir * a.path.localeCompare(b.path);
        case "ecosystem":
          return dir * a.ecosystem.localeCompare(b.ecosystem);
        case "size":
          return dir * (a.size - b.size);
        case "file_count":
          return dir * (a.file_count - b.file_count);
        case "rule_name":
          return dir * a.rule_name.localeCompare(b.rule_name);
        default:
          return 0;
      }
    });
    return copy;
  }, [entries, sortKey, sortDir]);

  const allChecked = entries.length > 0 && selected.size === entries.length;
  const indeterminate = selected.size > 0 && selected.size < entries.length;

  // 判断某个生态是否已全部选中（用于多选叠加按钮的高亮态）
  const isEcosystemActive = (eco: string) => {
    const ecoEntries = entries.filter((e) => e.ecosystem === eco);
    return (
      ecoEntries.length > 0 &&
      ecoEntries.every((e) => selected.has(e.id))
    );
  };

  /** Render a clickable sort-indicator arrow. */
  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span className="ml-1 text-slate-300 dark:text-slate-700">⇅</span>;
    return (
      <span className="ml-1 text-indigo-500 dark:text-indigo-400">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const thClass = (_: SortKey, extra?: string) =>
    `cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 ${extra ?? ""}`;

  return (
    <div className="flex h-full flex-col bg-white transition-colors duration-150 dark:bg-slate-950">
      {/* 筛选面板和状态指示器 */}
      <div className="flex items-center gap-3 bg-slate-50/80 px-6 py-3.5 border-b border-slate-100 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          筛选生态:
        </span>
        
        {ecosystems.length === 0 && !scanning && (
          <span className="text-xs text-slate-400 dark:text-slate-600">暂无数据，请选择根目录并启动扫描</span>
        )}

        {ecosystems.map(([eco, count]) => {
          const color = ECO_COLORS[eco] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
          const active = isEcosystemActive(eco);
          return (
            <button
              key={eco}
              type="button"
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all hover:-translate-y-px active:translate-y-0 ${
                active
                  ? `${color.bg} ${color.text} ${color.border} ring-1 ring-current/30`
                  : "border-slate-200/80 bg-white text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-600 dark:hover:text-indigo-400"
              }`}
              onClick={() => onToggleEcosystem(eco)}
              aria-pressed={active}
              title={active ? `点击取消选中全部 ${eco} 生态` : `点击叠加选中全部 ${eco} 生态`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
                  active
                    ? `${color.bg} ${color.text} border-transparent`
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
                }`}
              >
                {active && (
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold border ${color.bg} ${color.text} ${color.border} dark:opacity-90`}>
                {eco}
              </span>
              <span className={`font-mono font-semibold ${active ? color.text : "text-slate-400"}`}>{count}</span>
            </button>
          );
        })}

        <div className="flex-1" />

        {/* 扫描中动画 */}
        {scanning && (
          <div className="flex items-center gap-2.5 text-xs font-medium text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-full border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.001 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="max-w-xs truncate font-mono">{progressText}</span>
          </div>
        )}
      </div>

      {/* 核心列表容器 */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 && !scanning ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl shadow-inner text-slate-400 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
              🗂️
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">没有发现可清理的构建目录</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-sm dark:text-slate-500">
              请在上方区域选择一个正确的项目根目录，然后点击「开始扫描」按钮。
            </p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
                <tr>
                  <th scope="col" className="p-4 w-12 text-center">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 dark:border-slate-700 dark:bg-slate-800"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = indeterminate;
                        }}
                        onChange={onToggleAll}
                      />
                    </div>
                  </th>
                  <th scope="col" className={thClass("path")} onClick={() => toggleSort("path")}>
                    构建目录路径{sortArrow("path")}
                  </th>
                  <th scope="col" className={thClass("ecosystem", "w-28")} onClick={() => toggleSort("ecosystem")}>
                    归属生态{sortArrow("ecosystem")}
                  </th>
                  <th scope="col" className={thClass("size", "text-right w-28")} onClick={() => toggleSort("size")}>
                    占用空间{sortArrow("size")}
                  </th>
                  <th scope="col" className={thClass("file_count", "text-right w-28")} onClick={() => toggleSort("file_count")}>
                    文件总数{sortArrow("file_count")}
                  </th>
                  <th scope="col" className={thClass("rule_name", "w-44")} onClick={() => toggleSort("rule_name")}>
                    对应扫描规则{sortArrow("rule_name")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {sortedEntries.map((e) => {
                  const isSelected = selected.has(e.id);
                  const color = ECO_COLORS[e.ecosystem] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                  return (
                    <tr
                      key={e.id}
                      className={`group hover:bg-indigo-50/30 transition-[background-color] duration-150 cursor-pointer dark:hover:bg-indigo-900/10 ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                      }`}
                      onClick={() => onToggle(e.id)}
                    >
                      <td className="p-4 w-12 text-center" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 dark:border-slate-700 dark:bg-slate-800"
                            checked={isSelected}
                            onChange={() => onToggle(e.id)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="font-mono text-xs font-medium text-slate-700 break-all select-text selection:bg-indigo-200 dark:text-slate-300 dark:selection:bg-indigo-900"
                            title={e.path}
                          >
                            {e.path}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${color.bg} ${color.text} border ${color.border} dark:opacity-80`}>
                          {e.ecosystem}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatBytes(e.size)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs text-slate-400 font-medium dark:text-slate-500 w-28">
                        {e.file_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 truncate max-w-36 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors dark:text-slate-600 dark:group-hover:text-slate-400">
                        {e.rule_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 底部详细进度条 */}
      {!scanning && progressText && entries.length > 0 && (
        <div className="flex h-9 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 font-mono select-text truncate">
            <span className="text-emerald-500">✔</span>
            <span>{progressText}</span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-slate-400/80 dark:text-slate-600">操作就绪</span>
        </div>
      )}
    </div>
  );
}
