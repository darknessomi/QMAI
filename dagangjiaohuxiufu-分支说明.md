# 大纲交互修复分支说明

## 分支目标

本分支用于执行“大纲交互修复”实施计划。当前任务仅建立分支基线、确认项目局部依赖状态并记录定向验证结果，不修改任何功能代码。

## 六项需求

1. 仅在 `C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu` 工作，不回退或覆盖其他工作者的改动。
2. 检查并记录 Git 工作区状态、HEAD 和当前分支，固定实施前基线。
3. 创建并维护本分支说明文档，使用中文记录需求、预计范围、验证清单和提交状态。
4. 检查 `node_modules` 是否可用；如需准备依赖，只采用项目局部、低风险方式，不修改全局环境。
5. 运行 `npm run typecheck`，并定向运行 `outline-chat-panel.spec.tsx`、`outline-multi-agent-panel.spec.tsx` 基线测试，准确记录结果。
6. 本任务不修改功能代码、不删除文件、不执行 `git commit`。

## 当前基线

- 当前分支：`dagangjiaohuxiufu`
- 当前 HEAD：`24b3a26e6bb1b3c4c7985423406300da49314436`
- 初始工作区状态：干净（`git status --short --branch` 仅显示 `## dagangjiaohuxiufu`）

## 预计范围

- 预计新增：`dagangjiaohuxiufu-分支说明.md`
- 预计检查：项目根目录 `node_modules`、`package.json` 及 npm 脚本可用性。
- 预计验证：TypeScript 类型检查和两个指定的大纲面板测试文件。
- 明确不在范围内：功能代码修改、文件删除、全局环境修改、Git 提交或合并。

## 验证清单

- [x] 已确认工作目录为指定 worktree。
- [x] 已检查 Git 状态、HEAD 和当前分支。
- [x] 已确认 `node_modules` 可用或完成项目局部依赖准备。
- [x] 已运行 `npm run typecheck` 并记录准确结果。
- [x] 已运行 `outline-chat-panel.spec.tsx` 定向基线测试并记录准确结果。
- [x] 已运行 `outline-multi-agent-panel.spec.tsx` 定向基线测试并记录准确结果。
- [x] 已复核最终 Git 状态，确认没有功能代码修改和文件删除。

## 验证结果

- 依赖检查：初始不存在 `node_modules`，本地 `tsc`、`vitest` 不可用。
- 局部依赖准备：`npm.cmd ci --no-audit --no-fund`，退出码 `0`，在当前 worktree 添加 `800` 个包；未执行全局安装。命令输出包含 `shamefully-hoist` 未知项目配置警告和 `@milkdown/plugin-math@7.5.9` 弃用警告。
- 类型检查：`npm.cmd run typecheck`，退出码 `0`；执行 `qmai@2.2.33` 的 `tsc --build --pretty`，无 TypeScript 错误。输出包含 `shamefully-hoist` 警告。
- 大纲会话面板基线：`npm.cmd exec -- vitest run src/components/sources/outline-chat-panel.spec.tsx`，退出码 `0`；`1` 个测试文件通过，`33` 个测试通过，耗时 `3.47s`。
- 大纲多 Agent 面板基线：`npm.cmd exec -- vitest run src/components/sources/outline-multi-agent-panel.spec.tsx`，退出码 `0`；`1` 个测试文件通过，`2` 个测试通过，耗时 `333ms`。
- 两次 Vitest 输出均包含 `shamefully-hoist` 警告。

## 提交状态

未提交。





## 任务 2-3：结构化小说生成需求包与消息原地展开/收起（2026-07-11）

### 目标与影响分析

- 将向导提交内容拆分为用户可见摘要、用户主动选择/填写的详情、模型实际请求三层。
- 用户消息默认只显示紧凑摘要，可在当前消息下原地展开/收起详情。
- 固定工作流、多 Agent、Skill、Agent 计划和回退规则仅保留在模型实际请求中，不进入用户正文或详情。
- 旧历史消息未携带结构化需求包时继续按原有 `content` 渲染和参与模型历史，不改变旧数据格式。
- 详情使用视口相关 `max-height`、纵向滚动、自动断词和 `max-width`，降低长内容及小窗口越界风险。
- 本次为局部新增类型和 focused 组件，并仅接入向导提交路径；未删除函数、未修改普通聊天消息行为。

### 修改文件

- 新增 `src/lib/novel/novel-generation-request-package.ts`
- 新增 `src/lib/novel/novel-generation-request-package.spec.ts`
- 新增 `src/components/sources/novel-generation-request-message.tsx`
- 新增 `src/components/sources/novel-generation-request-message.spec.tsx`
- 修改 `src/stores/outline-chat-store.ts`
- 修改 `src/components/sources/outline-chat-panel.tsx`
- 更新 `dagangjiaohuxiufu-分支说明.md`

### TDD 记录

- RED：先创建两个 focused spec，运行 `npm.cmd exec -- vitest run src/lib/novel/novel-generation-request-package.spec.ts src/components/sources/novel-generation-request-message.spec.tsx`；退出码 `1`，两个 suite 均因待实现模块不存在而失败，`0 test`，确认失败原因与新增功能缺失一致。
- GREEN：最小实现需求包类型/构造器、模型内容读取函数、原地展开组件及向导发送/历史消息接入后，重复同一命令；退出码 `0`，`2` 个文件、`2` 个测试全部通过。

### 最终验证

- 定向回归：`npm.cmd exec -- vitest run src/lib/novel/novel-generation-request-package.spec.ts src/components/sources/novel-generation-request-message.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx`；退出码 `0`，`4` 个文件、`37` 个测试全部通过。
- 类型检查：`npm.cmd run typecheck`；退出码 `0`，无 TypeScript 错误。
- 已知警告：npm 仍输出项目既有的 `shamefully-hoist` 未知配置警告，本次未修改该配置。
- 打包：本任务按用户要求仅运行定向测试与 typecheck，未执行打包。

### 提交状态

未提交。

## 任务 2-3 规格审查修复（2026-07-11）

### 审查缺口修复

1. 新增统一的 `getOutlineMessageModelContent`，结构化消息返回完整 `modelContent`，旧消息回退到原 `content`。
2. 普通后续发送历史、重新生成的最后用户请求与历史消息均通过统一函数取得模型内容。
3. 两处 `getOutlineConversations`（提供给 `read_outline_history`）均通过统一函数映射消息，避免工具只读取用户摘要。
4. 用户详情过滤系统默认值：篇幅/频道/题材为 `auto`、空卖点、空规模、自动叙事和 `none` 资料来源不再显示。
5. 持久化结构保持向后兼容：结构化需求包随消息保存和重载；旧消息仍按原正文展示和进入模型。

### 第二轮 TDD 记录

- RED：先补需求包默认值过滤、统一模型内容解析、跨面板链路断言和旧消息兼容测试。首次定向运行退出码 `1`：默认值仍出现在详情、`getOutlineMessageModelContent` 尚不存在、重新生成及历史工具链路尚未统一映射。修正测试文件字符编码后再次运行，得到 `3` 个测试中 `2` 个按预期失败，明确验证了功能缺口。
- GREEN：实现统一解析和默认值过滤，并接入后续历史、重新生成与两处 `read_outline_history` 后，focused 测试通过。
- 跨模块持久化测试：通过真实 store 保存/重载结构化消息，验证摘要保留、完整模型请求恢复、旧消息回退正文。

### 最终验证（第二轮）

- 命令：`npm.cmd exec -- vitest run src/stores/outline-chat-store.spec.ts src/lib/novel/novel-generation-request-package.spec.ts src/components/sources/novel-generation-request-message.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx`
- 结果：退出码 `0`，`5` 个测试文件、`54` 个测试全部通过。
- 类型检查：`npm.cmd run typecheck`，退出码 `0`，无 TypeScript 错误。
- 已知警告：npm 仍输出项目既有的 `shamefully-hoist` 未知配置警告。
- 打包：本轮按用户要求运行定向测试与 typecheck，未执行打包。
- Git：未提交。

## 任务 2-3 第三轮规格复审修复（2026-07-11）

### 修复内容

- 修复 `novel-generation-request-package.ts` 中真实问号乱码，恢复“生成任务：”“篇幅类型：”“频道方向：”“题材类型：”“故事灵感/处理要求：”“核心卖点：”“生成目标：”“作品规模：”“叙事要求：”“已有资料：”及中文顿号。
- `OutlineWizardRequest` 新增可选 `explicit` 字段，记录用户实际操作过的字段；真实默认请求初始化为 `explicit: {}`。
- 向导的任务、篇幅、频道、题材、自定义题材、灵感、卖点、目标、规模、叙事和资料来源交互会分别标记显式字段；频道切换带出的首个题材仍视为系统派生值，只有用户操作题材选择框才标记题材显式。
- 用户详情仅展示显式选择/填写内容。真实默认 `sellingPoints: ["AI 根据灵感推荐"]`、默认长篇/男频/默认题材/第三人称/默认目标/无资料不再自动进入详情；用户主动点击后，即使值与默认相同也可展示。
- 新增可导出的真实行为函数：`mapOutlineMessagesForModel`、`buildOutlineRegenerationInput`、`mapOutlineConversationsForModel`；普通模型历史、重新生成、两处 `read_outline_history` 均由这些函数实际组装，不再依赖源码字符串断言。

### 第三轮 TDD 证据

- RED：先增加 UTF-8 中文标签、真实默认请求显式状态、默认值显式/隐式过滤、普通历史、重新生成和大纲历史映射行为测试。首次运行退出码 `1`：中文标签断言收到真实 `????`、默认请求导出函数不存在、三个映射函数不存在；修正测试输入编码后仍有 `4` 个行为测试按预期失败。
- GREEN：恢复 UTF-8 中文、加入 `explicit` 状态、实现并接入三个纯行为函数后，相关 focused 测试通过。
- 渲染断言：实际渲染 `NovelGenerationRequestMessage` 并展开，验证“篇幅类型：长篇小说”“核心卖点：升级变强”可见且不含问号乱码。

### 最终验证（第三轮）

- 定向测试：`6` 个测试文件、`62` 个测试全部通过，退出码 `0`。
- TypeScript：`npm.cmd run typecheck` 退出码 `0`，无类型错误。
- `git diff --check`：清理新增文件尾空行后退出码 `0`。
- npm 仍提示项目既有 `shamefully-hoist` 未知配置警告，本轮未修改该配置。
- 未打包，未提交。

## 任务 2-3 第四轮代码质量审查修复（2026-07-11）

- `handleChannelChange` 现在保留频道显式状态，同时清除 `explicit.genre` 和 `explicit.customGenre`；行为测试覆盖先选自定义题材、切换频道后派生题材不进入详情、再次主动选题材后才进入详情。
- 新增 `isNovelGenerationRequestPackage` 最小运行时 v1 校验：必须是 `version: 1`、字符串 `summary`、字符串数组 `details`、字符串 `modelContent`。持久化加载遇到未知版本、缺少 `modelContent` 或 `details` 非数组时移除需求包，模型内容回退消息 `content`。
- 需求详情按钮使用 React `useId`，按钮设置 `aria-controls`，详情设置对应 `id`；测试验证收起/展开时 `aria-expanded` 及控件关联。
- 清理需求包测试中重复的“篇幅类型：长篇小说”断言。
- TDD RED：新增测试首次运行退出码 `1`，频道切换仍残留显式题材，三类非法持久化包未被忽略，ARIA 关联尚不存在。
- GREEN：定向测试 `6` 个文件、`66` 个测试全部通过；`npm.cmd run typecheck` 退出码 `0`；清理文件尾空行后 `git diff --check` 退出码 `0`。
- 未打包，未提交。

## 任务 2-3 第五轮低问题修复（2026-07-11）

- 删除消息渲染测试中重复的篇幅断言，替换为独立的“核心卖点：升级变强”断言。
- 详情节点改为常驻 DOM，并通过 `hidden={!expanded}` 控制显示，避免 `aria-controls` 在收起时指向不存在节点。
- 行为测试完整验证 `aria-expanded` 为 `false → true → false`、`aria-controls` 与详情 `id` 一致，以及 `hidden` 为 `true → false → true`。
- 频道切换测试执行两次真实提交：切换频道后未主动选题材时，断言 `explicit.genre/customGenre` 清除且详情不含派生题材；再次主动选题材后，断言 `explicit.genre=true` 且详情包含题材。
- TDD RED：常驻详情测试首先因收起状态详情节点不存在而失败；修复后 GREEN。
- 定向测试：6 个文件、67 个测试通过；typecheck 通过；清理文件尾空行后 diff-check 通过。
- 未提交。

## 任务 4：移除 AI 会话与 AI 大纲的可见生成提示长条（2026-07-11）

### 目标与影响范围

- AI 会话真实路径：`chat-panel.tsx` 的会话标签通过 `ConversationRunStatusIcon` 渲染运行状态；停止按钮继续由 `ReferenceInput` 渲染。
- AI 大纲真实路径：顶部标签和历史记录通过 `ConversationRunStatusIcon` 渲染；输入区原有独立的“正在生成...”状态长条；停止按钮继续由 `ReferenceInput` 渲染。
- 仅移除运行状态的可视 Tooltip，以及 AI 大纲输入区状态长条的文字、边框、背景、闪烁动画和底部间距。
- 保留旋转生成图标、`data-conversation-run-status` 状态标记、中文 `aria-label="正在生成"`、停止按钮和原有停止逻辑。
- 完成、失败、中断状态仍保留原有 Tooltip；未修改 `StreamingSpinner`、消息正文及其他业务中的正常生成提示。

### 修改文件

- `src/components/common/conversation-run-status-icon.tsx`
- `src/components/common/conversation-run-status-icon.spec.tsx`
- `src/components/chat/chat-panel.mount.spec.tsx`
- `src/components/sources/outline-chat-panel.tsx`
- `src/components/sources/outline-chat-panel.spec.tsx`
- `dagangjiaohuxiufu-分支说明.md`

### 严格 TDD 证据

- RED：先修改真实组件测试，再运行 `npm.cmd exec -- vitest run src/components/common/conversation-run-status-icon.spec.tsx src/components/chat/chat-panel.mount.spec.tsx src/components/sources/outline-chat-panel.spec.tsx`。
- RED 结果：退出码 `1`；3 个文件均按预期失败，分别证明运行图标仍是 Tooltip 触发器、AI 会话仍可触发可视 Tooltip、AI 大纲仍存在生成提示长条；其余 `47` 个测试通过，`6` 个 todo。
- GREEN：最小实现后同一命令退出码 `0`，`3` 个文件、`50` 个测试通过，`6` 个 todo。
- 同步修正一条旧源码断言：由要求存在“正在生成...”改为要求不存在，避免旧规格与任务 4 冲突。

### 验证结果

- 定向回归：`npm.cmd exec -- vitest run src/components/common/conversation-run-status-icon.spec.tsx src/components/reference/ReferenceInput.spec.tsx src/components/chat/chat-panel.mount.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-chat-multi-session.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx`；退出码 `0`，`6` 个测试文件、`71` 个测试通过，`6` 个 todo。
- TypeScript：`npm.cmd run typecheck`；退出码 `0`，无类型错误。
- npm 仍提示项目既有的 `shamefully-hoist` 未知配置警告，本任务未修改该配置。
- 源码运行：通过真实 ChatPanel、OutlineChatPanel 的 jsdom 挂载测试验证；未单独启动 Vite 开发服务器。
- 打包：本任务按指定范围执行定向测试、typecheck 和 diff-check，未执行打包。
- Git：未提交，未合并。
## 任务 4 质量审查：补齐 Tooltip 与停止行为测试（2026-07-11）

### 审查修复范围

- `ConversationRunStatusIcon` 对 `completed_unread`、`failed`、`interrupted` 使用真实鼠标事件序列触发 Tooltip，分别验证中文“已完成，点击查看”“生成失败：接口错误”“任务已中断，可重新发送”真实出现在 Portal 内容中。
- `running` 状态继续验证为纯图标：保留旋转图标和中文 `aria-label="正在生成"`，即使触发 focus/hover 事件也不存在 Tooltip 内容。
- AI 大纲停止测试改用真实 `assistant` 运行占位消息：
  - 有部分流内容时，停止后保留部分内容、设置 `isAgentRunning: false`、清空该会话 streaming、运行状态回到 `idle`。
  - 无部分流内容时，停止后删除运行中的助手占位消息，同时清空 streaming 并回到 `idle`。
- 增加稳定的运行守卫测试：停止后状态为 `idle` 时，`canApplyOutlineRunEffect` 拒绝晚到回调，避免覆盖最终停止状态。
- 本轮现有生产实现已满足全部新增行为测试，因此未修改任何生产代码，也未扩展功能。

### 本轮修改文件

- `src/components/common/conversation-run-status-icon.spec.tsx`
- `src/components/sources/outline-chat-panel.spec.tsx`
- `src/lib/novel/outline-chat-session-state.spec.ts`
- `dagangjiaohuxiufu-分支说明.md`

### 测试优先证据

- 先补 focus 行为、两种停止分支和晚到回调守卫测试，首次定向运行退出码 `0`，`3` 个文件、`49` 个测试通过，证明既有生产行为无需修正。
- 将 Tooltip 测试进一步收紧为真实 hover 后，首次仅发送 `mouseover` 时 3 个 Tooltip 用例按预期失败，证明测试确实依赖交互打开而非静态 DOM。
- 按 Base UI Tooltip 的真实交互机制补齐 `pointerover(mouse) → mouseenter → mousemove → delay` 测试事件序列后，Tooltip 测试通过；未修改生产组件。
- 最终 focused 测试：`3` 个文件、`49` 个测试全部通过。

### 最终验证

- 定向回归：`npm.cmd exec -- vitest run src/components/common/conversation-run-status-icon.spec.tsx src/components/reference/ReferenceInput.spec.tsx src/components/chat/chat-panel.mount.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/lib/novel/outline-chat-session-state.spec.ts src/components/sources/outline-chat-multi-session.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx src/stores/outline-chat-store.spec.ts`；退出码 `0`，`8` 个测试文件、`96` 个测试通过，`6` 个 todo。
- TypeScript：`npm.cmd run typecheck`；退出码 `0`，无类型错误。
- npm 仍提示项目既有的 `shamefully-hoist` 未知配置警告，本轮未修改该配置。
- 打包：本轮按指定范围执行测试、typecheck 和 diff-check，未执行打包。
- Git：未提交，未合并。
## 任务 5 首次实现记录（规格审查未通过，不作为完成结论）（20260711-2137）

> 状态更正：首次实现随后未通过规格审查，原“完成”结论撤销。主要缺口为全文 markdown 围栏在质量检查前被清空、完整性阈值可能放行内容丢失、接入测试仅检查源码字符串。以下内容仅作为首次实现历史记录。

### 目标与影响分析

- 新增 focused Markdown 纯函数模块，识别结构化资料并检查一级标题、成对加粗、全文代码围栏和表格分隔行。
- 结构化生成完成后采用固定线性流程：首次检查 → 确定性本地修复 → 复检 → 仍失败时最多一次 AI 纯格式修复 → 第三检；没有递归调用 handleSend。
- 仅 intentPhase === "generation" 或固定小说生成向导请求可启用管线，并再次执行结构化资料识别；普通问答保持原完成路径。
- AI 格式修复仅发送正文和四项简短 Markdown 规则，不携带会话历史、工具、项目资料或长系统提示；保存协议 JSON 保留在正文修复之外。
- 本地或 AI 候选若明显丢失内容则拒绝覆盖；第三检仍失败或 AI 请求失败时保留问题更少且内容完整的版本，并使用中文非阻塞提示。
- AI 大纲系统提示词新增简短 Markdown 格式约束，不改变既有生成工作流、保存协议和普通问答行为。

### 修改文件

- src/lib/novel/markdown-quality-pipeline.ts（新增）
- src/lib/novel/markdown-quality-pipeline.spec.ts（新增）
- src/components/sources/outline-chat-panel.tsx
- src/components/sources/outline-chat-panel.spec.tsx
- dagangjiaohuxiufu-分支说明.md

### 严格 TDD 证据

- RED 1：先创建纯函数 spec，首次运行因 markdown-quality-pipeline 模块不存在而失败，证明测试先于生产实现。
- GREEN 1：最小实现后 7 项纯函数测试通过。
- RED 2：先补 5 项面板接入契约，首次运行 5 项全部按缺少三检、短请求、完整性保护、普通问答旁路和提示词约束失败。
- GREEN 2：最小接入后纯函数与面板 47 项测试通过。
- RED 3：复审新增两项多行表格边界测试，首次均失败，分别复现已有分隔行被误报和重复插入分隔行。
- GREEN 3：按连续表格块首行判断后 49 项 focused 测试通过。

### 验证结果

- 定向回归：10 个测试文件，110 项通过，6 项既有 todo，无失败。
- TypeScript：npm.cmd run typecheck 通过，无类型错误。
- 前端构建：npm.cmd run build 成功；Vite 既有动态导入和大 chunk 警告仍存在，本任务未扩大处理范围。
- Windows 便携打包：npm.cmd run build:portable 成功。
- 产物：C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu\release-portable\QMaiWrite.exe。
- 版本：2.2.33；大小：149359616 字节。
- diff-check：git diff --check 无空白错误；未删除文件，未回退其他工作者改动。
- npm 仍提示既有 shamefully-hoist 未知项目配置警告，本任务未修改该配置。

### 提交状态

未提交，未合并。


## 任务 5 规格审查修复记录（后续质量审查未通过，不作为完成结论）（20260711-2233）

> 状态更正：该轮修复随后仍未通过质量审查，不能视为任务完成。后续发现代码区域加粗误判、单标题围栏旁路、协议分隔边界不足、完整性归一化过宽和 AI 无 Token 预算等问题。

### 审查问题与修复

- 修正真实完成路径：不再在质量管线前调用 `extractBodyContent`。新增可执行 finalizer，只拆分尾部合法的 `outlineSaveRequest` / `outlineSaveRequests` JSON 保存协议；全文 ` ```markdown ... ``` ` 会先进入首次检查，再由本地修复去除围栏并形成最终消息。
- 完整性比较改为严格模式：本地和 AI 候选始终与首次原始正文比较；归一化仅忽略 Markdown 标记、空白和表格分隔行，事实、段落文本、标点顺序或任一表格行变化都会拒绝覆盖，不再使用 0.8 长度或字符覆盖率阈值。
- 本地候选若未保持首次正文完整性，不会作为最佳候选，也不会发送给 AI；AI 改用首次原始正文。
- 质量编排保持线性：首次检查 → 本地修复 → 第二检 → 最多一次 AI 修复 → 第三检；没有递归。
- 删除任务 5 的源码 `toContain` 接入契约，改为执行真实 finalizer 和提示词构造函数的行为测试。
- 覆盖行为：全文围栏到最终消息、尾部保存协议保留、AI 最多一次、普通问答旁路、本地不完整时 AI 使用原文、第三检失败选择最佳完整候选、AI 丢失表格行拒绝覆盖、短事实丢失拒绝。

### 本轮文件

- 新增：`src/lib/novel/markdown-quality-finalizer.ts`
- 新增：`src/lib/novel/markdown-quality-finalizer.spec.ts`
- 修改：`src/lib/novel/markdown-quality-pipeline.ts`
- 修改：`src/lib/novel/markdown-quality-pipeline.spec.ts`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### TDD 与验证

- RED：finalizer 模块不存在；严格完整性 API 不存在，相关测试按预期失败。
- GREEN：纯函数严格完整性测试 11 项通过；finalizer 与面板 focused 测试合计 54 项通过。
- RED：面板提示词行为测试首次因 `buildOutlineAgentSystemPrompt` 不可执行导出而失败；导出真实构造函数后通过。
- 定向回归：11 个测试文件，115 项通过，6 项既有 todo，无失败。
- TypeScript：`npm.cmd run typecheck` 通过。
- diff-check：`git diff --check` 通过。
- 本轮按用户要求未重新打包、未修改外部更新日志、未删除既有产物。

### 提交状态

未提交，未合并。


## 任务 5 质量审查修复（未完成，待审查批准）（20260711-2341）

> 当前状态：实现与本轮自动验证已完成，但任务仍标记为“未完成”，必须等待下一轮质量审查明确批准后才能改为完成。

### 本轮修复

- 加粗检查和本地修复新增代码区域掩码：跳过 fenced code 与 inline code；`**/*.md` glob 双星号不再作为加粗标记，也不会被删除。
- 完整性比较对代码区域做精确保留，代码内 `**`、`|`、`---`、空白和其他字面内容变化都会拒绝覆盖；全文非 markdown 代码围栏也不会被当作 Markdown 外包装解包。
- 全文 `markdown` / `md` 围栏即使内部只有一个一级标题，也强制进入首次检查和本地去围栏，不再受一般结构化证据数量门控。
- 保存协议只识别尾部合法 ` ```json ` 围栏，兼容单换行、CRLF 和与正文紧邻；协议从不进入本地 Token 估算或 AI 请求，并按原始换行保留。
- 完整性归一化不再全局删除 `|`，也不再按外形删除任意 `---` 行；只有具备同列数表头、分隔行和数据行的真实表格分隔行允许忽略。
- 新增本地 Markdown AI Token 估算：总输入估算上限 3200 token（含 80 token 短规则预留）；超限直接旁路 AI。
- AI 输出 `max_tokens` 按正文估算动态设置为 256–4096，并通过独立可执行适配器传给 `streamChat` 第五参数。
- finalizer 的 AI 回调改为强制对象契约 `{ content, maxTokens }`，面板无法静默忽略预算。

### TDD 证据

- RED：fenced/inline code、glob、字面管道符、伪分隔行和单标题全文围栏共 5 项按预期失败；最小修复后 GREEN。
- RED：单换行、CRLF、紧邻保存协议 3 项均证明协议进入 AI；收紧尾部合法 JSON 围栏拆分后 GREEN。
- RED：Token 估算、输入上限、输出上下限、`max_tokens` 映射、超长旁路及强制回调对象契约按预期失败；实现后 GREEN。
- RED：代码内和 glob 双星号完整性测试、全文非 markdown 代码围栏标点测试按预期失败；代码感知归一化后 GREEN。
- AI 传输适配器使用模拟 `streamChat` 真实验证单条正文消息、动态 `max_tokens` 和流式输出聚合。

### 本轮文件

- 新增：`src/lib/novel/markdown-quality-ai-repair.ts`
- 新增：`src/lib/novel/markdown-quality-ai-repair.spec.ts`
- 修改：`src/lib/novel/markdown-quality-pipeline.ts`
- 修改：`src/lib/novel/markdown-quality-pipeline.spec.ts`
- 修改：`src/lib/novel/markdown-quality-finalizer.ts`
- 修改：`src/lib/novel/markdown-quality-finalizer.spec.ts`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 验证记录

- focused 测试：4 个文件，73 项通过。
- 定向回归：12 个测试文件，134 项通过，6 项既有 todo，无失败。
- TypeScript：`npm.cmd run typecheck` 通过。
- 本轮按要求未执行 build、未打包、未修改任何外部更新日志、未删除既有产物。

### 提交状态

未提交，未合并；状态保持未完成，等待质量审查批准。


## 任务 5 质量复审修复（仍未完成，待审查批准）（20260712-0022）

> 当前状态：本轮三项复审问题已实现并完成自动验证，但任务继续标记为“未完成”，等待质量审查明确批准。

### 本轮修复

- fenced code 关闭判定收紧：关闭行必须使用与 opening 相同字符，反引号/波浪线长度不少于 opening，且去除首尾空白后只能包含 fence 字符；` ```not-a-close ` 不会关闭代码块，后续 `**literal` 保持代码字面量且不参与加粗修复。
- 表格 cell 改为逐字符解析：转义 `\|` 和 inline code 内 `|` 不再拆列；支持不同长度 inline backtick marker 和转义 backtick。
- 复杂 cell 表格的缺失分隔行检查、本地确定性补行和完整性比较统一使用同一 cell 解析结果。
- 表格完整性只排除 fenced-code 行；数据 cell 含 inline code 时仍能识别真实表格分隔行。
- Token 估算改为按 Unicode 码点保守计数：CJK、emoji、罕见 Unicode、组合/特殊符号和密集标点每个非空白码点至少计 1 token；英文单词仍按每 5 字符至少 1 token。
- 4680 个 emoji 的输入估算超过 3200 token 上限，`shouldCallAi=false`，直接旁路 AI。

### TDD 证据

- RED：` ```not-a-close ` 被错误关闭并使后续 `**literal` 触发加粗错误；修正关闭条件后 GREEN。较短 fence 不关闭更长 opening 的测试同步通过。
- RED：含转义管道符和 inline-code 管道符的表格无法报告缺分隔行、无法本地补行、完整性误判，共 3 项失败；逐字符 cell 解析并区分 fenced/inline code 后 GREEN。
- RED：emoji 10 个只估算 7 token、密集标点 6 个只估算 2 token、4680 emoji 恰好估算 3200 并允许 AI；按 Unicode 码点保守估算后 GREEN。

### 本轮文件

- 修改：`src/lib/novel/markdown-quality-pipeline.ts`
- 修改：`src/lib/novel/markdown-quality-pipeline.spec.ts`
- 修改：`src/lib/novel/markdown-quality-finalizer.ts`
- 修改：`src/lib/novel/markdown-quality-finalizer.spec.ts`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 验证记录

- focused 测试：4 个文件，81 项通过。
- 定向回归：12 个测试文件，142 项通过，6 项既有 todo，无失败。
- TypeScript：`npm.cmd run typecheck` 通过。
- 本轮未执行 build、未打包、未修改外部更新日志、未删除既有产物。

### 提交状态

未提交，未合并；状态仍为未完成，等待质量审查批准。

## 任务 6：AI 大纲“下一步”推荐按钮交互修复（20260712-0047）

### 任务目标

- “下一步”卡片的两个推荐按钮点击后，将推荐 `label` 作为普通用户消息直接发送到当前大纲会话。
- 复用当前会话 ID、会话模型、历史上下文和输入区现有引用，不创建新会话。
- 发送期间防重复点击并显示 busy/disabled 状态；当前会话生成中按既有并发规则禁用，并提供中文原因。
- 发送失败后恢复按钮，并通过中文非阻塞提示告知用户可重试。
- 推荐文本按 React 普通文本安全渲染和传递，不解释为 HTML。

### TDD 记录

- RED：先新增真实 `NextStepCard` 组件交互测试；旧实现中连续点击触发两次回调，且生成中按钮未禁用，2 项按预期失败。
- GREEN：增加同步防重入锁、单项 busy、全卡片 disabled 和中文禁用原因后，组件行为测试通过。
- 补充行为覆盖：失败后按钮恢复并可再次点击；包含 Markdown/HTML 符号的 label 仅作为文本显示，且原样交给发送行为。
- 面板发送链路改为异步结果：推荐项不再映射固定模块或聚焦输入框，而是直接调用当前会话发送链路；发送链路继续按当前会话解析模型和历史上下文，并携带输入区现有引用。

### 本轮文件

- 修改：`src/components/sources/outline-next-step-card.tsx`
- 新增：`src/components/sources/outline-next-step-card.spec.tsx`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 影响分析

- 仅改变 AI 回复内“下一步”推荐卡片的点击行为；大纲生成菜单、意图选项卡、普通输入发送、停止生成和多会话逻辑保持原路径。
- 不删除或回退任务 1—5 的既有未提交改动。
- 未执行打包、未写外部更新日志、未提交、未合并。

### 提交状态

未提交。

## 任务 6 规格复审修正（20260712-0113）

> 本节取代上一节任务 6 的验证结论；上一实现因乱码、并发上限和发送结果误判问题未通过规格审查，本轮已按真实面板链路重新执行 RED/GREEN。

### 修正内容

- 修复任务 6 在 `outline-chat-panel.tsx` 中引入的所有问号乱码，恢复正常中文禁用原因和失败提示。
- “下一步”卡片禁用条件与输入区统一：当前会话正在运行时禁用；其他会话已占满全局 3 个并发名额时同样禁用。
- 当前会话运行原因：`当前会话正在生成，请等待生成完成后再选择下一步。`
- 全局并发原因：`大纲 AI 会话最多同时运行 3 个任务，请等待任一任务结束后再发送。`
- `handleSend` 改为明确返回 `{ started, sent }`；空文本、无项目、当前会话运行、模型不可用、模型不支持工具、无法取得运行名额等提前返回均为未开始/未发送。
- 已开始但运行失效、中止或异常时返回已开始但未发送成功；只有完整成功结束才返回 `sent: true`。
- 推荐发送只在 `sent: true` 时清理当前引用；失败和 Promise reject 均保留引用、恢复卡片状态并显示中文非阻塞提示。
- 推荐 label 继续作为普通 React 文本渲染和发送，HTML/Markdown 字符不会被解释为 DOM 或富文本。

### 真实 TDD 证据

- RED：新增真实 `OutlineChatPanel` 链路测试后共 4 项失败：两个推荐 label 未进入 Agent 链路、全局 3 并发未禁用、失败提示未触发。
- GREEN：通过真实 `AgentRunner` 方法替身验证两个推荐 label 均进入当前会话；会话数量不增加；当前模型、既有用户/助手历史、上下文发送规划和引用均进入真实面板发送链路。
- 成功链路验证第一次消息携带引用，成功后第二次推荐消息不再携带引用；失败链路验证引用保留、按钮恢复、中文非阻塞提示触发。
- 当前运行和全局 3 并发上限均通过真实面板按钮 disabled/title 行为验证。
- `NextStepCard` 继续覆盖同步防重复、busy、失败恢复和 HTML/Markdown label 安全处理。
- 修正测试环境的 `act` 配置及异步等待后，本轮定向测试输出无新增 act 警告。

### 本轮文件

- 修改：`src/components/sources/outline-chat-panel.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 修改：`src/components/sources/outline-next-step-card.tsx`
- 新增：`src/components/sources/outline-next-step-card.spec.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 限制与状态

- 未提交、未合并。
- 未打包、未写更新日志。
- 未回退或覆盖任务 1—5 及工作树内其他既有改动。

## 任务 6 测试证据复审修正（20260712-0719）

### 修正内容

- `outline-next-step-card.spec.tsx` 在 `beforeEach` 中显式设置 React `IS_REACT_ACT_ENVIRONMENT`，组件渲染、点击、Promise 完成和卸载产生的状态更新全部由 `act` 包裹。
- 新增真实安全文本测试，使用 `<script>alert(1)</script> **继续**` 作为推荐 label，验证不产生 `script` DOM、按钮文本原样展示、回调收到完全相同的 label。
- 真实 `OutlineChatPanel` 推荐链路增加同一 HTML/Markdown label 用例，验证页面不产生 `script` DOM，且该 label 原样进入当前会话用户消息和 Agent 用户输入。
- 面板链路不再只设置 `contextSummary`：`AgentRunner.run` 的真实入参断言必须包含 `{ role: "assistant", content: "当前会话摘要" }`，直接证明缓存摘要进入 `historyPlan.messages` 并随 Agent 消息发送。

### 验证证据

- 两个定向 spec：2 个测试文件、45 项测试全部通过。
- 定向测试标准输出和错误输出均无 React `act(...)` 警告。
- HTML/Markdown 安全 label 同时由独立卡片组件和真实面板发送链路覆盖。
- 本轮未新增源码字符串断言。

### 文件范围与状态

- 修改：`src/components/sources/outline-next-step-card.spec.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`
- 未提交、未合并、未打包、未写更新日志。

## 任务 6 跨会话引用清理修正（20260712-0732）

### 问题与修复

- 问题复现：A 会话点击“下一步”并携带 A 引用发送；请求未完成时切换到 B，并在 B 输入区加入新引用；A 成功回调会错误清空 B 的引用。
- 修复沿用现有 `shouldClearOutlineDraft` 跨会话副作用隔离模式，在同一会话状态辅助模块增加 `shouldClearOutlineReferences`。
- 推荐发送开始时固定捕获发起会话 ID 和发送引用集合。
- A 成功后仅在以下两个条件同时成立时清理引用：
  1. 当前活动会话仍是发起会话。
  2. 当前输入区引用 ID 集合仍与发送时捕获集合相同。
- 活动会话已切换，或当前引用被新增、删除、替换时，晚到成功回调不执行清理。

### TDD 证据

- RED：真实 `OutlineChatPanel` 测试挂起 A 的 `AgentRunner.run`，切换到 B 并加入 `B new reference` 后完成 A；修复前最终断言无法找到 B 引用，1 项按预期失败。
- GREEN：增加活动会话与引用集合双重校验后，同一真实面板测试通过；A 完成后活动会话保持 B，B 新引用仍显示。
- 两个定向 spec 共 46 项测试通过，测试输出无 act 警告。

### 本轮文件与状态

- 修改：`src/lib/novel/outline-chat-session-state.ts`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`
- 未提交、未合并、未打包、未写更新日志。

## 任务 7：AI 大纲模型全局记忆（20260712-0801）

### 目标与影响面

- AI 大纲模型选择改为应用级全局记忆，关闭面板后重进、重启应用及切换项目后继续恢复同一稳定 `providerId/modelId`。
- 使用专属持久化键 `aiOutlineModel`，不读写 `aiChatModel` 或 `defaultLlmModel`，不改变 AI 会话及其他任务模型选择。
- 保留现有大纲会话 `modelId` 字段作为兼容数据和活动会话同步目标，不删除旧字段、不回退任务 1—6 的发送链路。

### 实现内容

- 在既有 `wiki-store` 增加 `aiOutlineModel` 与 `setAiOutlineModel`，未新建重复 Zustand store。
- 在既有 `project-store` 增加 `saveAiOutlineModel` / `loadAiOutlineModel`，复用 Tauri `app-state.json` 持久化模式；`App` 启动初始化时恢复该值。
- 模型选择变化时先立即更新内存和活动大纲会话，再异步持久化；持久化失败不回滚、不阻断当前使用，并显示中文非阻塞提示。
- 统一把旧纯模型名迁移为稳定 `providerId/modelId`，迁移本身不误报“模型不可用”。
- 已存模型不存在、服务商停用或配置不可用时，按现有写作模型优先级回退到可用的 AI 会话模型/工作流默认模型，显示中文非阻塞提示并尝试保存自愈结果。
- 大纲发送与重新生成统一使用已解析的全局 AI 大纲模型，不再让其他项目的旧会话模型覆盖全局选择。

### 严格 TDD 证据

- RED 1：真实 `project-store` 测试首次因 `saveAiOutlineModel is not a function` 失败；增加专属键读写后转绿。
- RED 2：真实 `wiki-store` 测试首次因 `setAiOutlineModel is not a function` 失败；增加隔离状态后转绿，并验证 AI 会话模型和默认模型保持不变。
- RED 3：真实 `OutlineChatPanel` 的重进/切项目恢复、稳定 ID 立即保存、保存失败继续使用、失效回退四项测试首次全部失败；最小实现后转绿。
- RED 4：服务商停用且 AI 会话仍指向该服务商时，首次无法回退到工作流默认模型；补充可用稳定键解析后转绿。
- RED 5：旧纯模型名迁移首次错误显示不可用提示；区分“可用旧键迁移”和“真实失效回退”后转绿。

### 本轮文件

- 修改：`src/App.tsx`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 修改：`src/lib/llm-model-keys.ts`
- 修改：`src/lib/novel/model-resolver.ts`
- 修改：`src/lib/project-store.ts`
- 新增：`src/lib/project-store.spec.ts`
- 修改：`src/stores/wiki-store.ts`
- 新增：`src/stores/wiki-store.ai-outline-model.spec.ts`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 验证与状态

- 定向回归：5 个测试文件、67 项测试全部通过，无失败、无新增 React 警告。
- TypeScript：`npm.cmd run typecheck` 通过。
- diff-check：`git diff --check` 通过；无 tracked 文件删除。
- 本任务未单独启动桌面 UI；关闭/重进、切项目与重启持久化分别由真实面板重挂载测试、全局 store/persist 读写测试及 `App` 启动恢复接线覆盖。
- 未提交、未合并、未打包、未写更新日志。

## 任务 7 质量审查修复（20260712-0828）

> 状态更正：上一节任务 7 的完成结论已被本轮质量审查否决；以下交错初始化、latest-wins 持久化及旧模型 ID 兼容修复完成并通过新一轮验证后，才作为当前实现结论。

### 审查问题与根因

1. `App` 在异步读取 `aiOutlineModel` 后无条件写入 store；读取期间若用户手选新模型，旧持久值会覆盖新选择。
2. 自动回退保存与随后手选保存可以同时 pending；底层异步写入逆序完成时，旧回退值可能最后落盘。
3. 旧模型 ID 只要包含 `/` 就被直接视为 `provider/model`；当前缀不是实际 provider 时无法按完整模型 ID 匹配。同名模型也没有显式复用现有“内置 provider 优先、自定义 provider 其次”的可用 provider 顺序。

### 修复内容

- `wiki-store` 增加 `aiOutlineModelRevision`；所有运行时 `setAiOutlineModel` 都递增 revision。
- 新增 `initializeAiOutlineModelFromStorage` 初始化协调器：加载前捕获 revision，加载完成后仅在 revision 未变化时应用旧值。`App` 改为调用该协调器，避免初始化覆盖加载期间的新手选。
- `saveAiOutlineModel` 增加写入 revision 和最新值修复循环。多个保存可并发 pending；任一旧写入晚完成后都会重新写入当时最新 revision 的模型，且 revision 在修复期间再次变化时继续追到最新值。
- 模型键解析先判断 `/` 前缀是否真实存在于 `providerConfigs`：
  - 真实 provider 前缀：按稳定 `provider/model` 精确验证。
  - 非真实 provider 前缀：把包含 `/` 的完整字符串作为旧模型 ID，在全部可用 provider 中匹配。
- 可用 provider 顺序统一为现有顺序：内置 provider 按配置插入顺序优先，其后是自定义 provider 按配置插入顺序；多 provider 同名结果稳定可预测。

### 严格 TDD 证据

- RED 1：新增真实异步交错测试时，初始化协调模块不存在，测试套件按预期失败；实现后验证加载 pending 期间的手选 revision +1，旧值完成后不覆盖新选择。
- RED 2：自动回退值与手选值同时 pending，先完成手选、后完成回退；修复前最终落盘为旧回退值，断言按预期失败。版本化修复后会产生第三次最新值修复写入，最终稳定为手选值。
- RED 3：包含 `/` 且前缀不是 provider 的旧模型 ID 首次返回空值；多 provider 同名测试首次也返回空值，两项按预期失败。修复前缀验证和 provider 顺序后转绿。
- 额外覆盖：当前缀确实是 provider 时仍保持精确稳定键解析；初始化期间没有新选择时仍正常应用已存模型。

### 本轮文件

- 修改：`src/App.tsx`
- 新增：`src/lib/ai-outline-model-initialization.ts`
- 新增：`src/lib/ai-outline-model-initialization.spec.ts`
- 修改：`src/lib/project-store.ts`
- 修改：`src/lib/project-store.spec.ts`
- 修改：`src/lib/llm-model-keys.ts`
- 新增：`src/lib/llm-model-keys.spec.ts`
- 修改：`src/stores/wiki-store.ts`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 验证与状态

- 定向回归：7 个测试文件、73 项测试全部通过。
- TypeScript：`npm.cmd run typecheck` 通过。
- diff-check：`git diff --check` 通过；无 tracked 文件删除。
- npm 仅输出既有 `shamefully-hoist` 未知项目配置提示，本轮未修改该配置。
- 未提交、未合并、未打包、未写更新日志。

## 任务 7 质量复审剩余问题修复（20260712-0835）

### 剩余问题与根因

- 上一轮已能区分真实 provider 前缀和未知前缀，但真实 provider 精确匹配失败后仍会停止解析。
- 审查示例中 `anthropic` provider 存在但已停用，另一个可用 `openrouter` provider 保存的旧模型 ID 是完整字符串 `anthropic/claude-3-7-sonnet`；旧实现会返回空值，无法迁移到 `openrouter/anthropic/claude-3-7-sonnet`。

### 最小修复

- 真实 provider 精确匹配成功时仍立即返回稳定 `provider/model`。
- 精确匹配失败或原 provider 停用时，不再提前返回空值；改为将完整输入作为旧 model ID，在其他可用 provider 中继续匹配。
- 完整旧 ID 回退明确排除精确匹配失败的原 provider，避免在同一 provider 内产生歧义。
- 多个其他 provider 同时保存完整旧 ID 时，继续复用既有稳定顺序：内置 provider 按配置顺序优先，其后为自定义 provider。

### 严格 TDD 证据

- RED 1：`anthropic` 存在但停用、`openrouter` 保存完整 `anthropic/claude-3-7-sonnet` 时，修复前返回空值，审查示例测试按预期失败。
- RED 2：`openrouter`、`groq` 和自定义 provider 同时保存完整旧 ID 时，修复前同样返回空值；稳定消歧测试按预期失败。
- GREEN：移除精确失败后的过早返回，并在其他 provider 列表中按稳定顺序完整匹配后，5 项模型键解析测试全部通过。

### 本轮文件与验证

- 修改：`src/lib/llm-model-keys.ts`
- 修改：`src/lib/llm-model-keys.spec.ts`
- 更新：`dagangjiaohuxiufu-分支说明.md`
- 定向回归：7 个测试文件、75 项测试全部通过。
- TypeScript：`npm.cmd run typecheck` 通过。
- diff-check：`git diff --check` 通过；无 tracked 文件删除。
- 未提交、未合并、未打包、未写更新日志。

## 任务 8：多 Agent 失败回退摘要与诊断折叠（20260712-0856）

### 目标与影响分析

- 多 Agent 失败并回退时，默认只显示简短中文摘要：`多 Agent 生成失败，已自动切换为普通生成。`
- 用户点击“查看详情”后，才在原地显示 Agent 状态、失败原因、任务摘要、Skill 和合并状态。
- 任务摘要只取第一个非标题行并限制长度，不展示完整系统提示词或默认铺开 Agent 处理内容。
- 详情容器使用 `max-height` 和内部纵向滚动，容器、文本和网格均允许收缩/换行，避免小窗口越界。
- 折叠按钮与详情区通过 `aria-expanded`、`aria-controls`、`role=region` 和唯一 ID 建立可访问性关联。
- 回退仍调用原 `runSingleAgentFallback` 闭包，不新增用户消息，沿用同一模型、会话、需求包和引用；固定向导提交时改为将当前引用交给原发送流程。
- 只清除回退初始时的旧长提示，普通生成结果继续通过原流式回调输出，保存和下一步按钮不受阻断。
- 影响边界：正常多 Agent 运行/完成态仍保留原详细面板；未修改编排器、保存器、模型解析或会话持久化结构。

### 本轮文件

- 修改：`src/components/sources/outline-multi-agent-panel.tsx`
- 修改：`src/components/sources/outline-multi-agent-panel.spec.tsx`
- 修改：`src/components/sources/outline-chat-panel.tsx`
- 修改：`src/components/sources/outline-chat-panel.spec.tsx`
- 更新：`dagangjiaohuxiufu-分支说明.md`

### 严格 TDD 证据

- RED 1：先增加真实组件交互测试，旧面板因回退态默认铺开 Agent、Skill、错误和任务内容而按预期失败。
- RED 2：先增加真实固定向导→多 Agent 全失败→普通生成流程测试，旧实现因回退摘要不符和固定向导未传递当前引用而失败。
- GREEN：实施最小回退态分支和引用传递后，组件折叠、诊断限制、同会话/模型/需求包/引用、单条用户消息、保存与下一步全部通过。

### 验证结果

- 定向回归：6 个测试文件、87 项测试全部通过。
- 可复现命令：`npm.cmd exec -- vitest run src/components/sources/outline-multi-agent-panel.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-wizard-dialog.spec.tsx src/components/sources/outline-next-step-card.spec.tsx src/lib/novel/outline-multi-agent-orchestrator.spec.ts src/stores/outline-chat-store.spec.ts --reporter=verbose --testTimeout=15000`。
- TypeScript：`npm.cmd run typecheck` 通过。
- diff-check：`git diff --check` 通过；无 tracked 文件删除，无调试输出残留。
- 仅有 npm 现存 `shamefully-hoist` 未知项目配置提示，本轮未修改该配置。
- 未提交、未合并、未打包、未写更新日志。


## 任务 8 规格复审修复（20260712-0916）

- 复审确认 `fallbackReason` 和 `failureDetails` 仍存在换行后内容直出风险，`merge.error` 也未进入统一诊断展示路径。
- `fallbackReason`、`failureDetails`、`agent.error`、`merge.error` 与任务摘要现在全部复用同一个诊断摘要函数：仅取首个非空行，单条最多 160 字符，超长以省略号结束。
- `failureDetails` 在摘要后去重，最多展示 5 条；换行后的系统提示词、请求体、Agent 完整内容和其他秘密不进入 DOM。
- 展开详情补充脱敏后的合并失败原因，同时保留原合并状态。
- 正常多 Agent 面板的兼容诊断渲染也统一使用同一摘要函数，避免持久化异常状态绕过脱敏。
- RED：在四类诊断字段的换行后放入不同秘密，并加入重复项和第六条诊断；修复前秘密、重复项和超额项均能进入展开详情，测试按预期失败。
- GREEN：统一摘要函数和去重/限量处理后，新增真实组件测试通过。
- 定向验证命令：`npm.cmd exec -- vitest run src/components/sources/outline-multi-agent-panel.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-wizard-dialog.spec.tsx src/components/sources/outline-next-step-card.spec.tsx src/lib/novel/outline-multi-agent-orchestrator.spec.ts src/stores/outline-chat-store.spec.ts --reporter=verbose --testTimeout=15000`。
- 验证结果：6 个测试文件、87 项测试全部通过；`npm.cmd run typecheck` 通过；`git diff --check` 通过；无 tracked 文件删除，无调试输出残留。
- 未提交、未合并、未打包、未写更新日志。

## 任务 8 第二轮质量审查修复（20260712-0944）

### 修复内容

- 诊断首行切分统一支持 `\r`、`\n`、`U+2028` 和 `U+2029`，再对首行执行凭据掩码和长度限制。
- 常见 `Authorization`、`Bearer`、`API key`、`token`、`password`、`passwd`、`secret` 值以 `***` 掩码，URL query 中同类凭据也不再原样展示。
- 合并 Agent 调用抛错时，先在消息状态中写入 `merge.status = error`、`merge.error` 和完成时间；回退回调和最终收敛更新遇到 merge error 时保留原状态，不再覆盖为 `skipped`。
- 折叠时不渲染诊断区，`aria-controls` 也不存在；展开后才同时渲染详情节点并建立 ID 关联，折叠期间敏感正文不进入 DOM。

### 严格 TDD 证据

- RED 1：单行凭据和四种换行分隔测试修复前失败，原凭据与 `U+2028/U+2029` 后正文可进入 DOM。
- RED 2：真实 OutlineChatPanel 流程中至少一个子 Agent 成功、合并 Agent 抛错后自动回退，修复前最终 `merge.status` 为 `skipped` 而不是 `error`。
- RED 3：折叠详情未挂载时，按钮 `aria-controls` 仍指向不存在节点，可访问性测试按预期失败。
- GREEN：三项最小修复后，凭据掩码、分隔符切分、合并错误保留、折叠 DOM/ARIA 关联全部转绿。

### 验证

- 定向命令：`npm.cmd exec -- vitest run src/components/sources/outline-multi-agent-panel.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-wizard-dialog.spec.tsx src/components/sources/outline-next-step-card.spec.tsx src/lib/novel/outline-multi-agent-orchestrator.spec.ts src/stores/outline-chat-store.spec.ts --reporter=verbose --testTimeout=15000`。
- 定向结果：6 个测试文件、87 项测试全部通过。
- `npm.cmd run typecheck` 通过。
- `git diff --check` 通过；无 tracked 文件删除，无调试输出残留。
- 未提交、未合并、未打包、未写更新日志。

## 任务 9：验证证据（20260712-1010）

### 验证范围与基线

- 仅在 `C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu` 执行验证；分支为 `dagangjiaohuxiufu`，验证起点 HEAD 为 `24b3a26e6bb1b3c4c7985423406300da49314436`，与当时 `main` 工作树 HEAD 相同。
- 本任务未修改功能代码、未删除文件、未提交、未合并、未打包、未写更新日志；仅向本分支说明追加本节验证证据。

### Git、删除与敏感信息检查

- 执行命令：`git status --short --branch`、`git diff --name-status`、`git diff --cached --name-status`、`git diff --stat`、`git diff --check`、`git diff --diff-filter=D --name-status`、`git diff --cached --diff-filter=D --name-status`、`git ls-files --deleted`。
- 结果：上述命令退出码均为 `0`；无 staged 变更；无 tracked 文件删除；`git diff --check` 无空白错误。
- 验证时工作区已有 `20` 个 tracked 修改和 `17` 个 untracked 文件；tracked diff 为 `1618 insertions(+), 210 deletions(-)`。本任务不修改、不清理这些功能改动。
- 使用 PowerShell 内嵌 Python 对 `20` 个 tracked 变更文件的新增 diff 行和 `17` 个 untracked 文件全文执行敏感信息粗扫，规则覆盖私钥块、OpenAI/GitHub/AWS/Slack 令牌及常见凭据赋值。共命中 `8` 处，全部位于 `src/components/sources/outline-chat-panel.spec.tsx` 的测试凭据样例；疑似真实凭据 `0`。
- Git 警告：`src/components/sources/outline-next-step-card.tsx` 当前为 LF，Git 提示下次触碰时可能转换为 CRLF；本任务未触碰该文件。

### 新增与相关定向测试

- 测试集合由 `17` 个新增/修改 spec 与分支说明明确引用的 `3` 个关联回归 spec 合并而成，共 `20` 个文件，均存在。
- 执行命令：`npm.cmd exec -- vitest run src/components/chat/chat-panel.mount.spec.tsx src/components/common/conversation-run-status-icon.spec.tsx src/components/reference/ReferenceInput.spec.tsx src/components/sources/novel-generation-request-message.spec.tsx src/components/sources/outline-chat-multi-session.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx src/components/sources/outline-next-step-card.spec.tsx src/components/sources/outline-wizard-dialog.spec.tsx src/lib/ai-outline-model-initialization.spec.ts src/lib/llm-model-keys.spec.ts src/lib/novel/markdown-quality-ai-repair.spec.ts src/lib/novel/markdown-quality-finalizer.spec.ts src/lib/novel/markdown-quality-pipeline.spec.ts src/lib/novel/novel-generation-request-package.spec.ts src/lib/novel/outline-chat-session-state.spec.ts src/lib/novel/outline-multi-agent-orchestrator.spec.ts src/lib/project-store.spec.ts src/stores/outline-chat-store.spec.ts src/stores/wiki-store.ai-outline-model.spec.ts --reporter=default --testTimeout=15000`。
- 结果：退出码 `0`；`20/20` 个测试文件通过；`195` 项通过、`6` 项 todo，共 `201` 项。
- 警告：npm 输出项目配置 `shamefully-hoist` 未知；`ReferenceInput` 和 `NovelGenerationRequestMessage` 的部分用例输出“testing environment is not configured to support act(...)”，但测试未失败。

### TypeScript 与完整 mocks 基线

- `npm.cmd run typecheck`：退出码 `0`，通过。
- `npm.cmd run test:mocks`：退出码 `1`；角色灵魂内容校验通过；Vitest 为 `5 failed | 274 passed` 个文件，`39 failed | 1836 passed | 6 todo` 项测试，共 `279` 个文件、`1881` 项。
- 与已知主线基线“5 文件、39 失败”完全一致，无新增失败数量或失败文件差异，因此未进入差异定位分支。
- 失败文件集合与数量：`src/components/layout/workspace-top-bars.spec.ts`（2）、`src/lib/agent/tools/run-chapter-workflow.spec.ts`（9）、`src/components/sources/outline-workbench-integration.spec.ts`（2）、`src/lib/novel/outline-generation.spec.ts`（1）、`src/lib/novel/deep-chapter-generation.spec.ts`（25），合计 `39`。

### 构建与源码服务

- `npm.cmd run build`：退出码 `0`；命令内 typecheck 通过；Vite `8.1.3` 转换 `5053` 个模块并完成生产构建，用时约 `2.19s`。这是前端 build 验证，不是 Tauri 打包。
- 构建警告：npm 的 `shamefully-hoist` project/env 配置提示；若干模块同时静态与动态导入导致动态导入不能拆包；存在压缩后大于 `700 kB` 的 chunk，最大输出 `book-analysis-vendor` 约 `1738.87 kB`。本任务不处理这些既有构建警告。
- 源码服务实际命令：`npm.cmd run dev -- --host 127.0.0.1 --port 41739 --strictPort`。最终验证返回 HTTP `200`，入口 HTML 含 `id="root"`，确认 Vite 源码服务可访问。
- 进程安全证据：启动前目标工作树/端口匹配进程为 `0`；最终以根 PID `8940` 精确终止进程树，`taskkill` 退出码 `0`；停止后端口 `41739` 监听数为 `0`，目标工作树/端口相关 Node/CMD/npm 进程数为 `0`。
- 过程说明：前两次控制脚本分别在进程创建前因 `.NET ArgumentList` 兼容性和 PowerShell 引号解析失败；第三次重定向流方案超时并留下本次启动的根 PID `40976` 进程树，随后已用 `taskkill /PID 40976 /T /F` 精确清理，复查监听与相关进程均为 `0`。改用无重定向的隐藏进程方案后取得上述最终成功证据，当前无残留进程。

### 折叠组件样式与 ARIA 边界

- 静态核对命令：`rg -n -C 8 "aria-expanded|aria-controls|detailsId|overflow|break-|whitespace|max-h|展开|收起|Chevron" src/components/sources/novel-generation-request-message.tsx src/components/sources/novel-generation-request-message.spec.tsx`，以及对 `outline-multi-agent-panel.tsx/.spec.tsx` 的同类检索。
- 结构化需求消息：切换控件为 `type="button"`；`aria-expanded` 随状态切换；`aria-controls` 始终关联稳定且实际存在的 `useId()` 详情节点；折叠时节点带 `hidden`；详情高度限制为 `min(40vh,20rem)`，使用 `overflow-y-auto`、`overscroll-contain`、`max-w-full` 和 `break-words`，未发现弹出软件边界或长文本横向撑开问题。
- 多 Agent 回退诊断：折叠时详情 region 不挂载，按钮不输出悬空 `aria-controls`；展开时同步输出 `aria-expanded=true`、详情 ID、`role="region"` 与中文 `aria-label`。详情高度限制为 `min(24rem,55vh)`，支持纵向滚动和任意断词，外层限制最大宽度并隐藏横向溢出；折叠时诊断秘密正文不进入 DOM。
- 上述交互与样式断言已包含在通过的定向测试中。未发现折叠样式/ARIA 阻断问题。限制：按任务要求采用测试与静态核对，未进行真实浏览器截图或人工视觉走查。

### 最终状态

- 定向测试、typecheck、build、Vite 短时源码服务通过。
- 完整 `test:mocks` 仍为已知主线基线 `5` 文件、`39` 失败，命令退出码为 `1`；不能表述为全量测试通过。
- 未提交、未合并、未打包、未写更新日志。
## 任务 9：React act 测试警告修复验证（20260712-1020）

### 目标与影响分析

- 目标：消除 `ReferenceInput.spec.tsx` 与 `NovelGenerationRequestMessage.spec.tsx` 在任务 9 的 20 文件定向测试中输出的 React `act(...)` 环境警告。
- 影响范围严格限制为两份测试文件；不修改生产组件、共享测试配置或运行时行为。
- 本轮不提交、不合并、不打包、不写更新日志。

### RED 与根因

- 复现命令：`npm.cmd exec -- vitest run src/components/reference/ReferenceInput.spec.tsx src/components/sources/novel-generation-request-message.spec.tsx --reporter=default`。
- 修复前结果：2 个文件、17 项测试均通过，但 stderr 稳定输出多条 `The current testing environment is not configured to support act(...)`。
- 两份 spec 的渲染、交互和卸载已基本使用 React `act` 包装。与仓库内无此警告的 jsdom spec 对比后确认，根因是目标测试文件未声明 `globalThis.IS_REACT_ACT_ENVIRONMENT = true`，不是生产组件行为问题。

### 最小测试修复

- `src/components/reference/ReferenceInput.spec.tsx`：仅在 import 后增加 `IS_REACT_ACT_ENVIRONMENT = true`。
- `src/components/sources/novel-generation-request-message.spec.tsx`：仅在 import 后增加同一测试环境标志。
- 未修改测试断言和生产代码；未引入共享配置变化。

### GREEN 与完整定向验证

- 两文件复验命令：`npm.cmd exec -- vitest run src/components/reference/ReferenceInput.spec.tsx src/components/sources/novel-generation-request-message.spec.tsx --reporter=default`。
- 两文件结果：退出码 `0`；2/2 文件、17/17 项通过；对完整 stdout/stderr 程序化扫描，act 环境警告及 `not wrapped in act(...)` 警告行均为 `0`。
- 20 文件命令：`npm.cmd exec -- vitest run src/components/chat/chat-panel.mount.spec.tsx src/components/common/conversation-run-status-icon.spec.tsx src/components/reference/ReferenceInput.spec.tsx src/components/sources/novel-generation-request-message.spec.tsx src/components/sources/outline-chat-multi-session.spec.tsx src/components/sources/outline-chat-panel.spec.tsx src/components/sources/outline-multi-agent-panel.spec.tsx src/components/sources/outline-next-step-card.spec.tsx src/components/sources/outline-wizard-dialog.spec.tsx src/lib/ai-outline-model-initialization.spec.ts src/lib/llm-model-keys.spec.ts src/lib/novel/markdown-quality-ai-repair.spec.ts src/lib/novel/markdown-quality-finalizer.spec.ts src/lib/novel/markdown-quality-pipeline.spec.ts src/lib/novel/novel-generation-request-package.spec.ts src/lib/novel/outline-chat-session-state.spec.ts src/lib/novel/outline-multi-agent-orchestrator.spec.ts src/lib/project-store.spec.ts src/stores/outline-chat-store.spec.ts src/stores/wiki-store.ai-outline-model.spec.ts --reporter=default --testTimeout=15000`。
- 20 文件结果：退出码 `0`；20/20 文件通过；195 项通过、6 项 todo，共 201 项；完整输出中的 act 环境警告和 `not wrapped in act(...)` 警告行均为 `0`。
- 仍有 npm 既有 `Unknown project config "shamefully-hoist"` 提示；它不是 React act 警告，也不是本轮新增。

### TypeScript、diff 与状态

- `npm.cmd run typecheck`：退出码 `0`，通过。
- `git diff --check`：退出码 `0`，通过。
- Git 仍提示 `src/components/sources/outline-next-step-card.tsx` 下次触碰时可能由 LF 转为 CRLF；该文件不是本轮修改目标，本轮未触碰。
- 本轮仅修改两份指定 spec 和本分支说明；未修改生产行为。
- 未提交、未合并、未打包、未写更新日志。
## 任务 10：最终复核、便携版打包与日志（20260712-1030）

### 执行边界

- 仅在指定工作树执行项目命令；未修改功能代码，未删除文件，未提交、未合并，未执行 GitHub Release。
- 应用版本保持 2.2.33，没有升级。package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml 均为 2.2.33；既有 package-lock.json 根版本仍为 2.2.32，本任务不修改版本文件。

### 前置验证证据

- 20 个定向测试文件全部通过：195 项通过、6 项 todo，React ct(...) 相关警告为 0。
- 
pm.cmd run typecheck、
pm.cmd run build 通过；Vite 短时源码服务返回 HTTP 200。
- 完整 	est:mocks 与主线基线一致：5 个测试文件、39 项失败，退出码 1；不能表述为全量测试通过，本任务未重复修复这些既有基线问题。

### 便携版构建证据

- 命令：
pm.cmd run build:portable。
- 结果：退出码  ；开始 2026-07-12 10:24:18 +08:00，结束 2026-07-12 10:27:35 +08:00，耗时 196.591 秒。
- 主产物：C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu\release-portable\QMaiWrite.exe。
- 产物版本：2.2.33；大小：149359616 字节（142.440 MiB）；文件时间：2026-07-12 10:27:33 +08:00。
- SHA-256：2CA17135F58063539E8ABD95B32B137D3DFCE3E08A3442104BF160ABA5B160CB。
- 版本信息：C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu\release-portable\version-info.json，文件时间 2026-07-12 10:27:35 +08:00。
- 便携目录：586 个文件、308495345 字节（294.204 MiB）。

### 构建警告

- npm 既有 shamefully-hoist 未知配置提示：project 3 次、env 2 次。
- Vite/Rolldown：6 条 INEFFECTIVE_DYNAMIC_IMPORT；涉及 outline-generation.ts、Tauri dialog、ingest-queue.ts、wiki-store.ts、commands/fs.ts、six-dimension-engine.ts。
- Vite：1 条压缩后 chunk 大于 700 kB 提示。
- 上述均为非阻断警告，构建退出码仍为 0；本任务未修改相关配置或功能代码。

### 日志与提交状态

- 已追加工作树 GenxinLOG/更新日志.md（该目录由 .gitignore 排除）。
- 已追加 E:\QMAI\GenxinLOG\更新日志.md，未覆盖早先内容。
- 未提交、未合并。

### 任务 10 日志格式更正（20260712-1033）

- 20260712-1030 任务10条目中的 Markdown 反引号被 PowerShell 解释为转义符，导致 act、npm、test:mocks 和退出码等字样出现控制字符。
- 遵守“只追加、不删除、不覆盖早先内容”，未删除或覆盖该条目；已向工作树与 E 盘更新日志追加“任务10最终准确条目”，其准确数据取代 20260712-1030 条目的表述。
- 最终准确结论：版本 2.2.33 未升级；build:portable 退出码 0；QMaiWrite.exe 为 149359616 字节；test:mocks 仍为与主线一致的 5 文件、39 项基线失败。

### 任务 10 最终 Git 与安全检查

- git diff --check 与 git diff --cached --check 均为退出码 0。
- tracked 删除 0，暂存文件 0；未执行提交或合并。
- GenxinLOG/更新日志.md、release-portable/QMaiWrite.exe、src-tauri/target/release/qmai.exe 均由 .gitignore 规则排除，不进入提交范围。
- 对 38 个已修改或未跟踪文件执行高置信度密钥模式扫描，命中 0；未发现真实私钥、常见云密钥、GitHub token、OpenAI 风格长 token 或长 Bearer token。
- Git 仅保留本分支既有功能/测试改动与分支说明；构建过程对 src-tauri/Cargo.toml 仅产生时间戳/stat 变化，工作树 blob 与索引 blob 哈希一致，刷新索引后该文件不再显示修改。
- Git 仍报告 src/components/sources/outline-next-step-card.tsx 下次触碰时可能由 LF 转为 CRLF；该文件不是任务10修改目标，本任务未触碰或修复该既有换行提示。


## 2026-07-12 最终审查中等问题修复

- 主发送、重新生成和明确生成型下一步统一经过 Markdown 最终收尾。
- 重新生成根据原用户的结构化需求包或明确生成内容决定是否启用收尾。
- 下一步仅在推荐 label 同时包含明确生成动作和结构化目标时触发，普通问答不触发。
- 修复 next_step 清理误删普通 Markdown 全文围栏结束标记的问题，保留保存协议与 next_step 推荐。
- 严格 TDD：先补真实入口失败测试，再最小修复。
- 未打包，未写更新日志，未提交 Git。


### 2026-07-12 复审追加修复

- 下一步生成识别改为结合当前消息推荐来源和会话结构化生成上下文，不再固定传 false。
- 覆盖继续完善人物关系、继续补充世界观、细化当前大纲、继续完善当前模块；解释、分析、回答类普通追问不触发。
- 结构化下一步向 handleSend 传入当前 outlineReferenceTokens，不重复发送。
- 发送成功后按既有会话与引用快照竞态保护清理，失败时保留引用。
- 已补真实入口 TDD 测试；未打包、未写更新日志、未提交。

## 最终复审后新鲜验证与重包（20260712-1122）

### 纳入重包的最终修复

- 主发送、重新生成和明确生成型下一步统一经过 Markdown 最终收尾；普通解释、分析、回答类追问不触发。
- 下一步生成识别结合推荐来源与会话结构化生成上下文，覆盖继续完善人物关系、继续补充世界观、细化当前大纲和继续完善当前模块。
- 结构化下一步沿用当前 outlineReferenceTokens，不重复发送；成功后按既有会话和引用快照竞态保护清理，失败时保留引用。
- next_step 清理不再误删普通 Markdown 全文围栏结束标记，并保留保存协议和 next_step 推荐。

### 新鲜验证

- 20文件定向测试：退出码0；20/20文件通过；204项通过、6项todo，共210项；React act环境警告0，not wrapped in act警告0。测试时间2026-07-12 11:14:18至11:14:27 +08:00。
- npm.cmd run typecheck：退出码0；时间2026-07-12 11:14:35至11:14:57 +08:00。
- npm.cmd run build：退出码0；时间2026-07-12 11:15:16至11:15:40 +08:00，耗时24.824秒。
- npm.cmd run build:portable：退出码0；时间2026-07-12 11:16:21至11:19:27 +08:00，耗时186.581秒。
- 完整test:mocks本轮未重跑；此前证据仍为与主线一致的5文件、39项基线失败，不能表述为全量测试通过。

### 最终新产物

- 路径：C:\QMAI_C\QMAI-main\.worktrees\dagangjiaohuxiufu\release-portable\QMaiWrite.exe。
- 版本：2.2.33，未升级。
- 大小：149363712字节（142.444 MiB）。
- 文件时间：2026-07-12 11:19:24 +08:00。
- SHA-256：389EFE5E2CCCF330A240301E25D9BE6BEC7580A21B71266E76ABE7977FEDCE2A。
- version-info.json时间：2026-07-12 11:19:27 +08:00；builtAt为2026-07-12T03:19:27.837Z。
- 便携目录：586个文件、308499441字节（294.208 MiB）。该新包取代10:27:33旧包作为最终产物。

### 警告与边界

- npm既有shamefully-hoist未知配置提示。
- Vite/Rolldown仍报告6条INEFFECTIVE_DYNAMIC_IMPORT和1条大于700 kB的chunk提示；均未阻断构建。
- 本轮只执行验证、重包、追加日志与更新分支说明；未修改功能代码，未删除，未提交、未合并，未执行GitHub Release。

### 最终重包后的 Git 与安全检查

- git diff --check和git diff --cached --check退出码均为0。
- tracked删除0，暂存文件0；GenxinLOG、release-portable和src-tauri/target均由.gitignore排除。
- 对39个已修改或未跟踪文件执行高置信度密钥模式扫描，命中0。
- 两处日志均恰好包含1条20260712-1122“最终复审后重包”记录。
- 最终产物复核：版本2.2.33，149363712字节，文件时间2026-07-12 11:19:24 +08:00，SHA-256为389EFE5E2CCCF330A240301E25D9BE6BEC7580A21B71266E76ABE7977FEDCE2A。
- 未提交、未合并、未执行GitHub Release。
