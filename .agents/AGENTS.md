# 项目基本逻辑

## 产品定位

QMAI 是**长篇小说记忆型 AI 写作桌面系统**（Tauri 2 + React 19 + TypeScript），不是普通聊天写作工具。目标场景：200 万～300 万字连载，解决 AI 遗忘前文、人设崩坏、时间线混乱、伏笔丢失。

核心理念：**写前自动提取上下文 → 写后自动沉淀章节记忆 → 图谱追踪关系变化 → 审查防崩坏 → 人工确认定稿**。

## 核心工作流（不可违背）

1. **写前**：`buildContextPack()` 组装上下文包，按优先级裁剪 token（`src/lib/novel/context-engine.ts`）
2. **生成**：LLM 输出默认为**草稿**，不写入正式记忆库
3. **写后**：用户确认正式保存 → `ingestChapter()` 章节摄取 → 生成快照 JSON + 更新向量索引 + 增量更新图谱
4. **审查**：六维审稿 + 连贯性 Lint + 角色一致性检查，草稿隔离直到人工确认

## 上下文包优先级

```
用户指定 > 章节细纲 > 上一章结尾 > Canon 正史 > 人物状态 > 伏笔 > 最近摘要 > 正文片段 > 图谱 > 向量/关键词检索
```

修改上下文逻辑时，保持 `SECTION_PRIORITY` 顺序，并考虑 token 预算二次裁剪。

## 代码分层

| 层级 | 路径 | 职责 |
|------|------|------|
| UI | `src/components/` | React 组件，不含核心业务 |
| 状态 | `src/stores/` | Zustand（wiki-store、review-store 等） |
| 小说引擎 | `src/lib/novel/` | 记忆、上下文、摄取、审查、图谱、拆书 |
| 通用工具 | `src/lib/` | LLM 客户端、搜索、嵌入、持久化 |
| 后端 | `src-tauri/` | 文件系统、向量存储、PDF、进程 |

小说相关逻辑优先放 `src/lib/novel/`，通过 `mod.ts` 导出；不要散落在 UI 组件里。

## 数据与隔离原则

- 本地存储：项目目录 = Markdown（章节正文）+ JSON（快照/状态）+ LanceDB（向量）
- **草稿 ≠ 正式章节**：未确认内容不得触发摄取、不得污染记忆库
- 角色认知（knows / does_not_know）必须在校验和上下文中保持一致
- 图谱节点/边来自章节摄取快照，增量更新而非全量重建

## 改动时的检查清单

- 是否破坏草稿隔离？
- 是否影响上下文包优先级或 token 预算？
- 正式章节保存路径是否仍触发摄取 pipeline？
- 新增 LLM 调用是否走 `resolveNovelModel()` / `resolveReviewModel()`？
- UI 改动是否只需调 store，而非复制业务逻辑？

## Cursor Cloud specific instructions

Scope: the primary product is the **QMAI Tauri 2 desktop app** at the repo root (React 19 frontend + Rust backend in `src-tauri/`). `analytics-worker/` (Cloudflare Worker) and `extension/` are independent optional sub-projects and are not part of the default dev setup. Standard dev/build commands live in `README.md` ("本地开发") and root `package.json` scripts.

- **Rust toolchain**: the crate uses `edition2024`, which needs Rust **stable ≥ 1.85**. The base image may ship an older default (1.83) that fails `cargo build` with an `edition2024 is required` error; `rustup default stable` fixes it (the startup update script runs this). Run `cargo build` from inside `src-tauri/`.
- **System deps** (already provisioned in the env snapshot): `libwebkit2gtk-4.1-dev`, `protobuf-compiler`, `librsvg2-dev`, `libayatana-appindicator3-dev`, `libxdo-dev`, `patchelf`. These are only needed to build/run the Rust side.
- **PDFium**: `src-tauri/pdfium/libpdfium.so` is a downloaded binary (not in git, provisioned in the snapshot) and is only needed at runtime for the PDF-import feature. If missing, download `pdfium-linux-x64.tgz` from `bblanchon/pdfium-binaries` or point `PDFIUM_DYNAMIC_LIB_PATH` at a `libpdfium.so`. It is not required for `cargo build`.
- **Running the desktop app**: a VNC desktop is available on `DISPLAY=:1`. Launch with `DISPLAY=:1 WEBKIT_DISABLE_COMPOSITING_MODE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri dev` so the WebKitGTK webview renders under VNC (the `libEGL … DRI3` software-rendering warnings are harmless). `npm run dev` alone serves the Vite shell on `:1420`, but most features call Tauri IPC and only work inside the actual Tauri window.
- **Lint/typecheck**: `npm run typecheck` currently fails on a **pre-existing** type error in `src/stores/import-progress-store.ts` (unrelated to the environment). CI verifies the build via `npx vite build` (no typecheck) — use that to confirm the frontend builds.
- **Tests**: `npm run test:mocks` runs the offline vitest suite (fast). `npm test` / `npm run test:llm` hit a real LLM API over the network and need `.env.test.local` credentials — skip them unless configured.
- **Project directory gotcha**: the stored `app-state.json` default new-project path is a Windows path (`D:/QM-BOOK/...`); on Linux the backend creates that literally under the process CWD. Always type a real Linux directory (e.g. under `$HOME`) when creating a project.
