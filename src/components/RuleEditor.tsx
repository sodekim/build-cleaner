import { useState } from "react";
import type { ScanRule } from "../types";

interface RuleEditorProps {
  rules: ScanRule[];
  onSave: (rules: ScanRule[]) => void;
}

function newRule(): ScanRule {
  return {
    id: `custom-${Date.now()}`,
    name: "新扫描规则",
    ecosystem: "custom",
    build_dirs: [],
    markers: [],
    enabled: true,
    builtin: false,
  };
}

export default function RuleEditor({ rules, onSave }: RuleEditorProps) {
  const [local, setLocal] = useState<ScanRule[]>(rules);
  const [dirty, setDirty] = useState(false);

  // 当外部 rules 变化（首次加载）时同步
  if (!dirty && local !== rules && local.length === 0 && rules.length > 0) {
    setLocal(rules);
  }

  function update(id: string, patch: Partial<ScanRule>) {
    setLocal((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function add() {
    setLocal((prev) => [...prev, newRule()]);
    setDirty(true);
  }

  function remove(id: string) {
    setLocal((prev) => prev.filter((r) => r.id !== id || r.builtin));
    setDirty(true);
  }

  function parseList(value: string): string[] {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <div className="h-full overflow-auto bg-slate-50/50 p-6 transition-colors duration-150 dark:bg-slate-950/50">
      <div className="mx-auto max-w-4xl">
        {/* 头部摘要配配置 */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight dark:text-slate-200">扫描规则引擎</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-2xl dark:text-slate-500">
              定义如何识别冗余构建产物目录。规则匹配条件：目录名称命中 <code>build_dirs</code> 之一，
              且父目录存在 <code>markers</code> 中定义的标记文件（若 markers 留空则无条件匹配目录名）。
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              type="button"
              className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              onClick={add}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>新增规则</span>
            </button>
            <button
              type="button"
              className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none dark:shadow-none dark:hover:shadow-indigo-900/40"
              disabled={!dirty}
              onClick={() => {
                onSave(local);
                setDirty(false);
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>保存配置</span>
            </button>
          </div>
        </div>

        {/* 规则卡片网格列表 */}
        <div className="space-y-4">
          {local.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex flex-col gap-4">
                {/* 顶栏元信息 */}
                <div className="flex items-center gap-4">
                  {/* 自定义开关 */}
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.enabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                    onClick={() => update(rule.id, { enabled: !rule.enabled })}
                    title={rule.enabled ? "已启用" : "已禁用"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        rule.enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>

                  {/* 规则名输入 */}
                  <input
                    type="text"
                    className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-750 transition-colors focus:border-indigo-500 focus:bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                    placeholder="请输入规则名称"
                    value={rule.name}
                    onChange={(e) => update(rule.id, { name: e.target.value })}
                  />

                  {/* 标识标识 */}
                  <input
                    type="text"
                    className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-indigo-400"
                    placeholder="分类生态(如 npm)"
                    value={rule.ecosystem}
                    onChange={(e) => update(rule.id, { ecosystem: e.target.value })}
                  />

                  {/* 内置卡片微标 */}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                      rule.builtin
                        ? "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50"
                    }`}
                  >
                    {rule.builtin ? "内置" : "自定义"}
                  </span>

                  {/* 删除按钮 */}
                  {!rule.builtin && (
                    <button
                      type="button"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 dark:text-slate-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
                      onClick={() => remove(rule.id)}
                      title="删除此规则"
                    >
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* 规则构建详情输入 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                      目标构建目录 (例如: node_modules, target 换行/逗号分隔)
                    </span>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-indigo-400"
                      rows={2}
                      value={rule.build_dirs.join(", ")}
                      onChange={(e) => update(rule.id, { build_dirs: parseList(e.target.value) })}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                      项目特征依赖标记 (例如: package.json, pom.xml 换行/逗号分隔)
                    </span>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-indigo-400"
                      rows={2}
                      placeholder="留空则仅根据上述构建目录名直接检索"
                      value={rule.markers.join(", ")}
                      onChange={(e) => update(rule.id, { markers: parseList(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
