import { formatBytes } from "../api";

interface FooterProps {
  total: number;
  selectedCount: number;
  selectedSize: number;
  onClean: () => void;
  cleaning: boolean;
  disabled: boolean;
}

export default function Footer({
  total,
  selectedCount,
  selectedSize,
  onClean,
  cleaning,
  disabled,
}: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-4 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        {/* 指标展示 */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {total}
            </span>
            <span>个可清理项</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              {selectedCount}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">已选择</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">预计可释放:</span>
            <span className="font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs select-text dark:bg-emerald-950/30 dark:text-emerald-400">
              {formatBytes(selectedSize)}
            </span>
          </div>
        </div>

        {/* 触发清理操作 */}
        <button
          type="button"
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 text-sm font-semibold text-white shadow-md shadow-rose-100 transition-all hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none dark:shadow-none dark:hover:shadow-rose-900/40"
          disabled={disabled || cleaning || selectedCount === 0}
          onClick={onClean}
        >
          {cleaning ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.001 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>正在彻底清理中…</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>立即清理选中 ({selectedCount})</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
