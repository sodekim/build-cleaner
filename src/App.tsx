import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { BuildEntry, ScanRule } from "./types";
import {
  cleanDirectories,
  formatBytes,
  getRules,
  pickDirectory,
  saveRules,
  scanDirectory,
} from "./api";
import Header from "./components/Header";
import ScanList from "./components/ScanList";
import RuleEditor from "./components/RuleEditor";
import Footer from "./components/Footer";

type Tab = "scan" | "rules";

export default function App() {
  const [tab, setTab] = useState<Tab>("scan");
  const [rules, setRules] = useState<ScanRule[]>([]);
  const [root, setRoot] = useState<string>("");
  const [entries, setEntries] = useState<BuildEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeEcosystems, setActiveEcosystems] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [toast, setToast] = useState<{ kind: "info" | "error" | "success"; msg: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  useEffect(() => {
    getRules().then(setRules).catch(() => {});
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
    // Sync the OS-level window title bar theme with the app theme
    getCurrentWindow().setTheme(theme).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules]);

  const allEcosystems = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.ecosystem, (map.get(e.ecosystem) ?? 0) + 1);
    return [...map.entries()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (activeEcosystems.size === 0) return [];
    return entries.filter((e) => activeEcosystems.has(e.ecosystem));
  }, [entries, activeEcosystems]);

  async function handlePick() {
    const dir = await pickDirectory();
    if (dir) setRoot(dir);
  }

  function handleClear() {
    setEntries([]);
    setSelected(new Set());
    setActiveEcosystems(new Set());
    setProgressText("");
  }

  async function handleScan() {
    if (!root) return;
    setScanning(true);
    setEntries([]);
    setSelected(new Set());
    setActiveEcosystems(new Set());
    setProgressText("扫描中…");
    try {
      const result = await scanDirectory(root, enabledRules, (e) => {
        if (e.kind === "Entering") setProgressText(`扫描: ${e.dir}`);
        else if (e.kind === "Found") setProgressText(`发现: ${e.entry.path}`);
        else if (e.kind === "Done") setProgressText(`完成，共 ${e.total} 个目录，合计 ${formatBytes(e.total_size)}`);
      });
      setEntries(result);
      // 默认选中所有生态，显示全部扫描结果
      setActiveEcosystems(new Set(result.map((e) => e.ecosystem)));
    } catch (err: any) {
      setToast({ kind: "error", msg: String(err) });
    } finally {
      setScanning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === filteredEntries.length) return new Set();
      return new Set(filteredEntries.map((e) => e.id));
    });
  }

  // 点击生态按钮切换该生态的筛选状态，
// 取消筛选时移除该生态已勾选的条目，选中筛选时保留原有勾选
  function toggleEcosystem(eco: string) {
    setActiveEcosystems((prev) => {
      const next = new Set(prev);
      const removing = next.has(eco);
      if (removing) next.delete(eco);
      else next.add(eco);
      if (removing) {
        const ecoIds = new Set(entries.filter((e) => e.ecosystem === eco).map((e) => e.id));
        setSelected((sel) => {
          const ns = new Set(sel);
          for (const id of ecoIds) ns.delete(id);
          return ns;
        });
      }
      return next;
    });
  }

  const totalSelectedSize = useMemo(
    () => entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + e.size, 0),
    [entries, selected],
  );

  async function handleClean() {
    if (selected.size === 0) return;
    if (!confirm(`确认删除选中的 ${selected.size} 个构建目录？此操作不可恢复。`)) return;
    setCleaning(true);
    setProgressText("清理中…");
    try {
      const result = await cleanDirectories([...selected], (e) => {
        if (e.kind === "Item") setProgressText(`清理 (${e.index + 1}): ${e.path}`);
        else if (e.kind === "Done")
          setProgressText(`清理完成，释放 ${formatBytes(e.total_freed)}，失败 ${e.failed}`);
      });
      const failed = result.items.filter((i) => !i.success);
      // 从列表中移除成功的
      const successPaths = new Set(result.items.filter((i) => i.success).map((i) => i.path));
      setEntries((prev) => prev.filter((e) => !successPaths.has(e.path)));
      setSelected(new Set());
      if (failed.length === 0) {
        setToast({ kind: "success", msg: `已清理 ${result.items.length} 个目录，释放 ${formatBytes(result.total_freed)}` });
      } else {
        setToast({ kind: "error", msg: `${failed.length} 个目录清理失败：${failed[0].error ?? ""}` });
      }
    } catch (err: any) {
      setToast({ kind: "error", msg: String(err) });
    } finally {
      setCleaning(false);
    }
  }

  async function handleSaveRules(next: ScanRule[]) {
    setRules(next);
    try {
      await saveRules(next);
      setToast({ kind: "success", msg: "规则已保存" });
    } catch (e: any) {
      setToast({ kind: "error", msg: String(e) });
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-800 transition-colors duration-150 antialiased dark:bg-slate-950 dark:text-slate-200">
      <Header
        tab={tab}
        onTab={setTab}
        root={root}
        onPick={handlePick}
        onScan={handleScan}
        scanning={scanning}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      />

      <main className="flex-1 overflow-hidden">
        {tab === "scan" ? (
          <ScanList
            entries={filteredEntries}
            ecosystems={allEcosystems}
            activeEcosystems={activeEcosystems}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
            onToggleEcosystem={toggleEcosystem}
            scanning={scanning}
            progressText={progressText}
            onClear={handleClear}
            canClear={entries.length > 0 && !scanning}
          />
        ) : (
          <RuleEditor rules={rules} onSave={handleSaveRules} />
        )}
      </main>

      <Footer
        total={filteredEntries.length}
        selectedCount={selected.size}
        selectedSize={totalSelectedSize}
        onClean={handleClean}
        cleaning={cleaning}
        disabled={tab !== "scan"}
      />

      {/* 极简精致的自定义弹窗 Toast 通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-colors duration-150 ${
              toast.kind === "error"
                ? "border-rose-100 bg-rose-50/95 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/90 dark:text-rose-200"
                : toast.kind === "success"
                ? "border-emerald-100 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-200"
                : "border-indigo-100 bg-indigo-50/95 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/90 dark:text-indigo-200"
            }`}
          >
            {toast.kind === "success" && (
              <svg className="h-5 w-5 text-emerald-600 shrink-0 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.kind === "error" && (
              <svg className="h-5 w-5 text-rose-600 shrink-0 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.kind === "info" && (
              <svg className="h-5 w-5 text-indigo-600 shrink-0 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-xs font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
