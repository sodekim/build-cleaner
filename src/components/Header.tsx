import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface HeaderProps {
  tab: "scan" | "rules";
  onTab: (t: "scan" | "rules") => void;
  root: string;
  onPick: () => void;
  onScan: () => void;
  scanning: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({
  tab,
  onTab,
  root,
  onPick,
  onScan,
  scanning,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [appWindow]);

  return (
    <header
      data-tauri-drag-region
      className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 transition-colors duration-150 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* 左侧：Logo & 选项卡 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧹</span>
          <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-indigo-400 dark:to-violet-400">
            Build Cleaner
          </span>
        </div>

        {/* 分段选项卡 */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            className={`cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              tab === "scan"
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 dark:bg-slate-700 dark:text-indigo-400 dark:ring-white/10"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
            onClick={() => onTab("scan")}
          >
            扫描清理
          </button>
          <button
            type="button"
            className={`cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              tab === "rules"
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 dark:bg-slate-700 dark:text-indigo-400 dark:ring-white/10"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
            onClick={() => onTab("rules")}
          >
            扫描规则
          </button>
        </div>
      </div>

      {/* 右侧：扫描控制工具栏 & 主题切换 */}
      <div className="flex items-center gap-4">
        {tab === "scan" && (
          <div className="flex items-center gap-3">
            {/* 输入框组 */}
            <div className="relative flex items-center">
              <svg
                className="absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <input
                type="text"
                className="h-10 w-96 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-mono text-slate-600 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                placeholder="选择要清理的根目录…"
                value={root}
                readOnly
              />
            </div>

            {/* 选择目录按钮 */}
            <button
              type="button"
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              onClick={onPick}
              disabled={scanning}
            >
              <span>选择目录</span>
            </button>

            {/* 开始扫描按钮 */}
            <button
              type="button"
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 px-5 text-sm font-medium text-white shadow-md shadow-indigo-100 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:shadow-none dark:hover:shadow-indigo-900/40"
              onClick={onScan}
              disabled={scanning || !root}
            >
              {scanning ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.001 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>扫描中…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>开始扫描</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* 主题切换按钮 */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
        >
          {theme === "light" ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707"
              />
            </svg>
          )}
        </button>

        {/* 窗口控制按钮 */}
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={() => appWindow.minimize()}
            title="最小化"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={() => appWindow.toggleMaximize()}
            title={isMaximized ? "向下还原" : "最大化"}
          >
            {isMaximized ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9H5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-4M15 15h4a2 2 0 002-2V5a2 2 0 00-2-2h-8a2 2 0 00-2 2v4" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h14v14H5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500 hover:text-white dark:text-slate-500 dark:hover:bg-red-600"
            onClick={() => appWindow.close()}
            title="关闭"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
