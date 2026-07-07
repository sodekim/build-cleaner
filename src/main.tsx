import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 全局禁用浏览器/Webview 原生右键菜单，避免桌面应用中出现「重新加载/检查元素」等开发期菜单
if (typeof window !== "undefined") {
  window.addEventListener("contextmenu", (e) => {
    // 允许 input/textarea 内的右键以便使用拼写检查等编辑功能（如需要可注释掉此判断）
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
