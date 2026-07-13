# piliangquaiwei 分支说明

## 分支目标

实现“多 Agent 批量去 AI 味”：支持多作品、多章节、作品级独立 Agent、默认并发 3（可设置 1–5）、FIFO 排队、失败隔离、持久化、重启后手动继续，以及逐章三栏审核。

## 基线与约束

- 分支：`piliangquaiwei`
- 基线：`d1d02d5`
- 工作区：`C:\QMAI_C\QMAI-main\.worktrees\piliangquaiwei`
- 保留现有单章 `runWholeChapterDeAi` 与 `DeAiPreviewDialog` 流程。
- 本分支只处理批量去 AI 味相关领域层、Store、任务面板、审核/开始弹窗、最小主布局与小说设置接入。
- 不打包、不提交、不合并。

## 已实现内容

1. 新增 `src/lib/novel/de-ai-batch/`：
   - `types.ts`：任务与章节状态、持久化记录类型。
   - `storage.ts`：任务、章节检查点、不可变原文副本原子持久化；重启时 `running` 转 `interrupted`，生成中的章节回到可继续状态。
   - `engine.ts`：逐章模型调用、候选持久化、章节失败隔离、当前章取消、重新生成保留旧候选、runId 防陈旧结果覆盖、dispose 阻止后续章节启动。
   - `scheduler.ts`：作品级独立 Agent、默认并发 3、范围 1–5、FIFO、槽位释放、失败隔离、指定任务取消与晚到结果忽略。
   - `catalog.ts`：从 `wiki/chapters` 一级子目录识别多作品并生成安全 ID；无子目录时使用当前项目作为作品。
   - `llm-runner.ts`：复用现有 `deAi` 模型解析、去 AI 味消息与 AbortSignal。
2. 新增 `src/stores/de-ai-batch-store.ts`：
   - 初始化只加载，不自动恢复。
   - 新批次、多作品入队、interrupted 手动继续。
   - 跳过 ready/confirmed 章节。
   - 指定章重新生成、取消、确认写回；整批取消；完成任务禁止整批继续。
   - 审核弹窗与任务面板 UI 状态。
3. 新增批量 UI：
   - `de-ai-batch-task-panel.tsx`：中文状态、章节计数、折叠、继续、审核、中文取消确认、独立滚动。
   - `de-ai-batch-start-dialog.tsx`：多作品/多章节选择，并发 1–5，视口约束与滚动。
   - `de-ai-batch-review-dialog.tsx`：宽屏左章节/中原文/右候选三栏；窄屏章节选择 + 原文/候选页签；独立滚动、固定头尾、逐章确认/重新生成/取消；关闭只隐藏弹窗。
   - `de-ai-batch-workspace.tsx`：主布局入口、任务面板、开始/审核弹窗与 Store 接线。
4. 最小接入：
   - `app-layout.tsx` 挂载批量工作区。
   - `NovelConfig` 新增 `deAiBatchConcurrency`，默认 3，持久化归一化到 1–5。
   - 小说设置新增中文并发项。

## TDD RED / GREEN 证据

- Storage：RED 为缺少 `./storage`；GREEN 4/4。
- Engine：RED 为缺少 `./engine`；GREEN 5/5；后续取消链路 RED 为 dispose 后继续启动下一章导致超时，修复后 Engine + Store 13/13。
- Scheduler：RED 为缺少 `./scheduler`；GREEN 5/5；指定任务取消 RED 为 `cancel is not a function`；晚到完成回调 RED 为收到 2 次完成回调，最终 Scheduler 7/7。
- Store：RED 为缺少 `./de-ai-batch-store`；GREEN 7/7。
- 任务面板：RED 为组件缺失；GREEN 5/5。
- 审核弹窗：RED 为组件缺失；GREEN 6/6。
- 入口/设置：Catalog、LLM runner、开始弹窗模块缺失且入口/设置断言失败；最终 4 文件 7/7。
- 最终专项：10 文件，42/42 通过。

## 验证结果

- 源码启动：Vite 8.1.3，302ms ready，`http://127.0.0.1:1420` 返回 HTTP 200；随后仅终止本次启动的进程。
- 专项测试：10 文件，42/42 通过。
- 现有去 AI 味/章节/设置回归（排除已确认基线失败文件）：49 文件，413 通过，6 todo。
- `npm run typecheck`：通过。
- `npm run build`：通过；仅有既有动态导入/大 chunk 警告。
- `npm run test:mocks`：296 文件中 291 通过、2067 测试通过、6 todo；5 个未改动基线文件共 39 项失败：
  - `src/lib/agent/tools/run-chapter-workflow.spec.ts`
  - `src/lib/novel/deep-chapter-generation.spec.ts`
  - `src/lib/novel/outline-generation.spec.ts`
  - `src/components/sources/outline-workbench-integration.spec.ts`
  - `src/components/layout/workspace-top-bars.spec.ts`
  Git 已确认这些失败测试及对应实现相对本分支基线无差异，本分支未擅自修复无关模块。
- 打包：按用户要求未执行。
- Git：未提交、未合并。

## 风险与限制

- 多作品目录按 `wiki/chapters` 下一级子目录识别；章节直接位于该目录时归为当前项目作品。
- 自动化测试使用注入 runner 验证并发、取消与持久化；真实模型质量和供应商限流仍取决于用户配置。
- 完整 mocks 仍有上述 5 个既有基线失败文件，未纳入本功能修改范围。

## 当前状态

功能实施与要求内验证已完成，未提交。

## 2026-07-13 规格复审修复

### 修复内容

1. **排队任务重启恢复**
   - Storage 初始化现在同时把持久化 `running` 和 `queued` 转为 `interrupted`。
   - `queued` 使用中文提示“软件上次关闭时任务尚未开始，可继续处理”。
   - 原文副本和 pending 章节检查点保持不变，用户可通过现有“继续”操作无需重导恢复。

2. **确认写回与编辑器安全同步**
   - 新增 `src/lib/novel/de-ai-batch/chapter-apply.ts`，统一通过 `replaceWholeChapterBody` 只替换正文，保留磁盘/编辑器中的 frontmatter、章节标题和文件结构。
   - 新增 `src/lib/editor-external-update-session.ts`，由 PreviewPanel 注册当前打开章节处理器。
   - 当前章节打开时：递增 `saveGenerationRef`、清除旧延迟保存、原子写盘，然后同步 `fileContentRef`、`fileContent`、`diskSyncEpoch` 和 `dataVersion`，避免旧自动保存覆盖确认结果。
   - 未打开章节时：读取当前磁盘内容、合并候选正文后原子写盘。

3. **任务模型真实绑定**
   - 创建任务按“去 AI 味专用模型 → 项目默认模型 → 聊天模型”解析稳定 `providerId/modelId` key，并写入 `task.modelKey`。
   - 不持久化 API key；执行和恢复时按 `task.modelKey` 从当前 provider 配置重新读取凭据。
   - Runner 不再使用当前 `deAi` 模型作为静默 fallback。
   - 恢复初始化和手动继续前校验绑定；模型被删除或不可用时，以中文错误标记任务失败：“任务绑定模型……已不可用，请重新配置该模型后再继续”。

4. **并发设置即时生效**
   - Workspace 增加依赖 `[novelConfig.deAiBatchConcurrency]` 的独立 effect。
   - 设置变化会立即调用当前 Store/Scheduler 的 `setConcurrency`，无需切换或重新打开项目。

### 本轮 TDD 证据

- queued 恢复：RED 为加载后仍是 `queued`；修复后 Storage + Store 12/12 GREEN。
- 安全写回：RED 为 `chapter-apply` 模块和 PreviewPanel 外部更新处理器不存在；修复后章节应用、入口与 Store 12/12 GREEN。
- 模型绑定：RED 包括 Runner 解析器未收到 task、稳定 key/绑定解析函数缺失、恢复任务未标记失败；修复后相关 3 文件 15/15 GREEN。
- 并发 effect：RED 为 Workspace 未依赖 `novelConfig.deAiBatchConcurrency`；修复后入口与 Store 11/11 GREEN。

### 本轮验证

- 专项：11 文件，51/51 通过。
- 相关旧去 AI 味/章节/设置/PreviewPanel 回归：50 文件，419 通过，6 todo。
- `npm run typecheck`：通过。
- `npm run build`：通过，5073 模块转换完成；仅保留既有动态导入和大 chunk 警告。
- 源码启动：Vite 8.1.3，242ms ready，`http://127.0.0.1:1420` 返回 HTTP 200。
- 完整 mocks：297 文件中 292 通过；2076 测试通过，6 todo；仍为同一 5 个未改动基线文件共 39 项失败，没有新增失败文件。
- 打包：未执行。
- Git：未提交、未合并。

## 2026-07-13 确认写回竞态复审修复

### 问题

开始确认写回章节 A 时 A 仍在编辑器中打开；`await writeFileAtomic(A)` 期间用户切换到章节 B。旧实现写盘完成后仍无条件执行 `commitEditor(A)`，会把 A 的内容提交到 B 的编辑器内存。

### 修复

- `applyOpenChapterBodyUpdate` 不再使用调用开始时的静态 `openPath`。
- 改为传入 `currentOpenPath()` 动态读取当前编辑器路径。
- 开始时确认目标章节仍打开；在写盘完成后再次读取并校验当前路径。
- 只有目标 A 仍为当前打开章节时才调用 `commitEditor(A)`。
- 如果已切换到 B：
  - A 的原子磁盘写入正常完成；
  - `dataVersion` 正常更新；
  - 不调用 `commitEditor`；
  - 不修改 B 的 `fileContent`、ref 或编辑器内存。
- `invalidatePendingSave` 仍在 `await writeFileAtomic` 之前执行，因此旧自动保存 generation 继续失效，不能把 A 的旧正文重新写回。

### TDD 证据

- 新增时序测试：写 A 时用 Promise gate 暂停磁盘写入，期间把当前 openPath 切换到 B，再释放写入。
- RED：旧实现把 A 合并结果写入模拟的 B 编辑器。
- GREEN：A 磁盘包含候选正文，B 内存保持原值，`commitEditor` 调用 0 次，`dataVersion` 更新 1 次，旧保存 generation 从 11 变为 12 且无法覆盖 A。

### 验证

- 专项：11 文件，52/52 通过。
- 相关旧测试：50 文件，419 通过，6 todo。
- `npm run typecheck`：通过。
- `npm run build`：通过，5073 模块转换完成。
- 源码启动：Vite 8.1.3，261ms ready，HTTP 200。
- 完整 mocks：297 文件中 292 通过；2077 测试通过，6 todo；仍为同一 5 个未改动基线文件共 39 项失败，没有新增失败文件。
- `git diff --check`：通过。
- Git：未提交、未合并。
- 打包：未执行。

## 2026-07-13 flush-before-leave 竞态复审修复

### 问题

外部确认 A 等待原子写盘期间，真实 `selectedFile` 切换到 B 会触发 `flushChapterBeforeLeave(A, previousContent)`。该 flush 使用切换前捕获的旧 A 内容，可能在外部候选写入之后再次写盘，导致 A 候选被旧内容覆盖。

### 修复

新增 `src/lib/chapter-external-update-coordinator.ts`，为每个章节路径维护：

- 外部更新版本号；
- 当前编辑器会话版本号；
- 活动外部更新 token；
- 每路径串行写入队列。

完整规则：

1. 外部确认开始时同步提升 A 的路径版本，再进入 A 的串行写队列。
2. PreviewPanel 每次从磁盘加载/提交编辑器内容时记录该路径当前编辑器会话版本。
3. `flushChapterBeforeLeave` 捕获调用时的编辑器会话版本，并通过同一 A 路径写队列执行。
4. 轮到 flush 时再次检查：
   - 仍有外部更新活动则跳过；
   - 路径当前版本与旧编辑器会话版本不一致则跳过。
5. 如果 flush 已经先开始，外部确认会排在同一路径队列之后，因此最终仍由候选结果落盘。
6. 外部写失败时版本回滚，原有未保存编辑的 flush 可以继续，不会丢失正常编辑。
7. 没有外部更新时，编辑器会话版本与路径版本一致，正常离开章节仍执行 flush。

### TDD 证据

- 新增真实时序测试：外部确认 A 的写盘用 Promise gate 暂停，期间切换到 B，并调用 `flushBeforeLeave(A, oldA)`。
- RED：协调器不存在，无法保护独立 flush 写链。
- GREEN：
  - A 最终磁盘内容包含候选正文；
  - 旧 A flush 回调调用 0 次；
  - B 编辑器内容保持不变；
  - `commitEditor(A)` 调用 0 次。
- 新增正常编辑保护测试：无外部更新时 `flushBeforeLeave` 返回 true 且写回调用 1 次。

### 验证

- 专项：11 文件，54/54 通过。
- 相关旧测试：50 文件，419 通过，6 todo。
- `npm run typecheck`：通过。
- `npm run build`：通过，5074 模块转换完成。
- 源码启动：Vite 8.1.3，228ms ready，HTTP 200。
- 完整 mocks：297 文件中 292 通过；2079 测试通过，6 todo；仍为同一 5 个未改动基线文件共 39 项失败，没有新增失败文件。
- Git：未提交、未合并。
- 打包：未执行。

## 2026-07-13 代码质量复审修复

### 修复内容

1. `sourcePath` 安全边界：新增跨平台绝对路径解析与真实 `wiki/chapters` 后代校验，在任务创建、checkpoint 加载、最终确认写回三处执行；拒绝 `..`、目录前缀伪装、跨盘、非同源 UNC、扩展设备路径与大小写前缀绕过。
2. Scheduler 取消语义：活动任务取消只标记并 abort，不提前释放并发槽；等待原 `run` settle 后清理，并使用 `active.get(id) === entry` 身份检查防旧实例清除新实例。
3. 章节操作并发：确认、重新生成、取消增加每章同步互斥锁与 generation/candidate CAS；重复确认只写回一次，操作期间拒绝同章冲突动作，避免已确认状态被陈旧结果回滚。
4. 批次启动防重：Workspace 与开始弹窗均使用同步 ref 锁；`starting` 时禁用作品/章节选择、并发输入、提交、取消和弹窗关闭；补双击回归测试。
5. Workspace 异步安全：统一异步 action pending key、中文错误 toast 和 catch；任务及章节 pending 时禁用对应按钮；并发设置持久化也进入统一捕获，避免未处理 Promise rejection。
6. `continueTask` 仅允许 `interrupted`、`failed`、`partial` 状态。
7. 编辑器外部更新注册返回身份 disposer，旧组件清理不会注销后注册的新 handler。
8. 移动端审核 tabs 增加 `id`、`aria-controls`、`aria-labelledby`、`tabpanel`、roving `tabIndex` 和左右键切换/焦点移动；弹窗在极小高度下允许外层滚动，操作区仍可到达。

### TDD 与验证

- RED：新增测试分别复现 sourcePath 越界/篡改、取消提前释放槽、非白名单继续、重复确认与同章冲突、旧 disposer 清新 handler、开始按钮双击、pending 未禁用、tabs ARIA/键盘缺失和极小高度不可达。
- GREEN 专项：12 文件，75/75 通过。
- 相关旧测试：PreviewPanel、去 AI 味技能选择器、去 AI 味技能库 3 文件，59/59 通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，5075 模块转换完成；仅保留既有动态导入和大 chunk 警告。
- 源码启动：Vite 8.1.3，237ms ready，`http://127.0.0.1:1420` 返回 HTTP 200，随后停止本次启动任务。
- 完整 mocks：298 文件中 293 通过；2100 测试通过、6 todo；仍为同一 5 个未改动基线文件共 39 项失败，没有新增失败文件。
- `git diff --check`：通过。
- 打包：按用户要求未执行。
- Git：未提交、未合并。