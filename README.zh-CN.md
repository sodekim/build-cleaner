# Build Cleaner

一款跨平台桌面工具，用于清理构建产物目录，释放磁盘空间 —— 支持 Maven `target`、Gradle `build`、Cargo `target`、npm `node_modules`、.NET `bin`/`obj`、Python `__pycache__` 等。

[English](README.md)

<p align="center">
  <img src="screenshots/main.png" alt="扫描" width="49%" />
  <img src="screenshots/rule.png" alt="规则" width="49%" />
</p>

## 功能特性

- **智能扫描** — 选择根目录后递归扫描所有子目录，基于可配置规则自动识别构建产物
- **规则匹配** — 目录名匹配结合标记文件验证（如 Maven 的 `pom.xml`），避免误判
- **多生态支持** — 内置 Maven、Gradle、Cargo、npm、.NET、Python、CMake 等预设规则
- **可视化列表** — 一目了然地展示路径、生态类型、大小、文件数及匹配规则
- **批量操作** — 支持多选、全选/反选、按生态筛选，底部实时统计已选数量与释放空间
- **安全清理** — 二次确认后执行删除，扫描与清理过程实时显示进度
- **规则自定义** — 支持增删改规则、启用/禁用，持久化保存到本地
- **明暗主题** — 一键切换浅色/深色模式，重启后保留

## 安装

从 [GitHub Releases](https://github.com/sodekim/build-cleaner/releases) 页面下载最新版本：

| 平台 | 安装包 | 说明 |
| --- | --- | --- |
| Windows | `.msi` / `.exe` | `.msi` 为系统级安装，`.exe` 为便携版 |
| macOS | `.dmg` | 拖入 Applications 文件夹。Apple Silicon (M 系列) 选 `aarch64`，Intel 芯片选 `x64` |
| Linux | `.AppImage` / `.deb` | `.AppImage` 无需安装直接运行；`.deb` 适用于 Debian/Ubuntu 系发行版 |

## 使用说明

1. **选择目录** — 点击「选择目录」按钮，指定要扫描的根目录
2. **查看结果** — 构建产物目录以可排序表格呈现，包含大小、生态等信息
3. **筛选过滤** — 点击生态标签按构建系统类型筛选
4. **勾选清理** — 勾选需要删除的目录，底部状态栏显示已选数量及可释放空间
5. **执行清理** — 点击「立即清理选中」，确认后实时查看清理进度
6. **管理规则** — 切换到「扫描规则」标签页，自定义扫描行为

> [!TIP]
> 生态筛选支持叠加选择 —— 点击多个标签可同时选中不同生态的构建产物，合并后一次性清理。

## 内置规则

| 生态 | 目录 | 标记文件 | 默认启用 |
| --- | --- | --- | --- |
| Maven | `target` | `pom.xml` | 是 |
| Gradle | `build`、`.gradle` | `build.gradle(.kts)`、`settings.gradle(.kts)` | 是 |
| Cargo | `target` | `Cargo.toml` | 是 |
| npm | `node_modules` | `package.json` | 是 |
| JS | `dist`、`build` | `package.json` | 否 |
| .NET | `bin`、`obj` | `*.csproj`、`*.fsproj` | 是 |
| Python | `__pycache__`、`.pytest_cache`、`.mypy_cache` | — | 是 |
| CMake | `build` | `CMakeLists.txt` | 否 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | [Tauri 2](https://tauri.app/) |
| 前端 | React 18、TypeScript、[Tailwind CSS v4](https://tailwindcss.com/)、[daisyUI](https://daisyui.com/) |
| 后端 | Rust (edition 2021)、[tokio](https://tokio.rs/)、[rayon](https://github.com/rayon-rs/rayon)、[walkdir](https://crates.io/crates/walkdir) |
| 构建工具 | Vite 6、[release-it](https://github.com/release-it/release-it) |

## 开发指南

### 前置条件

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/) 11+
- [Rust](https://www.rust-lang.org/) 1.77+

### 安装依赖

```bash
pnpm install
```

### 开发模式运行

```bash
pnpm tauri:dev
```

启动 Vite 开发服务器并打开 Tauri 窗口，前端和 Rust 代码均支持热更新。

### 生产构建

```bash
pnpm tauri:build
```

安装包输出至 `src-tauri/target/release/bundle/`。

### 代码检查

```bash
pnpm lint
```

### 版本发布

本项目使用 [release-it](https://github.com/release-it/release-it) 配合 Conventional Commits 规范：

```bash
pnpm release          # 正式发布
pnpm release:dry      # 试运行
```

创建 GitHub Release 后，[Build Installers](.github/workflows/build-installers.yml) 工作流会自动构建并上传安装包。
