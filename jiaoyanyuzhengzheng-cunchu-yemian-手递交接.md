# 手递交接文档：`jiaoyanyuzhengzheng-cunchu-yemian` → `jiaoyanjixu`

> 生成时间：2026-07-05
> 原始分支：`jiaoyanyuzhengzheng-cunchu-yemian`
> 新分支：`jiaoyanjixu`（已用 worktree 隔离，位于 `C:/QMAI_C/worktrees/jiaoyanjixu`）
> 交接原因：两个对话在同一个分支上操作导致冲突，现在用 worktree 隔离

---

## 一、分支定位

| 项目 | 内容 |
|------|------|
| 分支名 | `jiaoyanyuzhengzheng-cunchu-yemian` / `jiaoyanjixu`（新） |
| 基于 | `main`（`1fb1ce8`） |
| 当前 HEAD | `7d7702f` |
| 相对 main 领先 | 5 个 commit |
| 工作目录状态 | **干净**（已提交） |

---

## 二、已有提交历史（从旧到新）

```
674186b feat(skills): add draft-review-skill with loadReviewEvidence
0f7192a fix(校验): 修复测试 mock 方式 + 补充边界测试
23264e7 feat(校验): 角色认知偏差识别 identifyDeviations
5d696c6 feat(校验): Task1~5 完成 — 类型定义/偏差识别/状态承接伏笔检测/I3仲裁/编排主流程
7d7702f chore: 提交分支说明文档和设计文档 + 版本号更新 2.2.33
```

### 每个 commit 的内容

**1. `674186b` — feat(skills): add draft-review-skill with loadReviewEvidence**
- 创建 `src/lib/agent/skills/draft-review-skill.ts`（基础骨架）
- 创建 `src/lib/agent/skills/draft-review-skill.spec.ts`（测试骨架）
- 实现 `loadReviewEvidence()` 函数：从记忆中心读取角色认知、角色状态、伏笔追踪、上一章快照
- 错误处理：部分模块读取失败不阻断，标记 `rawLoadError=true`

**2. `0f7192a` — fix(校验): 修复测试 mock 方式 + 补充边界测试**
- 修复测试中 mock 的导入方式
- 补充边界测试：空记忆中心、全部失败等

**3. `23264e7` — feat(校验): 角色认知偏差识别 identifyDeviations**
- 实现 `identifyDeviations()` 函数
- 识别 4 类硬偏差：角色认知 / 角色状态 / 上一章承接 / 伏笔冲突
- 使用正则模式匹配检测"doesNotKnow"信息泄露
- 检查角色状态与记忆库的一致性
- 检查本章开头与上一章结尾钩子的承接
- 检查已埋未启伏笔是否被提前说破

**4. `5d696c6` — feat(校验): Task1~5 完成**
- 实现 `runDraftReviewSkill()` 主函数
- 实现修复 → 重校循环（最多 2 轮）
- 实现增量模式（incremental）：仅重校改动相关项
- 实现 LLM 调用的超时控制
- 实现截断机制：2 轮上限 + 剩余偏差高亮
- 实现边界处理：无记忆数据直接返回无偏差
- 完整测试覆盖：无偏差返回 / LLM修复并重校 / 2轮消解偏差

**5. `7d7702f` — chore: 提交分支说明文档和设计文档 + 版本号更新 2.2.33**
- 添加分支说明文档
- 添加设计文档
- Cargo.lock 版本号更新为 2.2.33

---

## 三、代码文件清单

### 新增文件

| 文件 | 说明 | 行数 |
|------|------|------|
| `src/lib/agent/skills/draft-review-skill.ts` | 校验 skill 核心逻辑 | ~608 行 |
| `src/lib/agent/skills/draft-review-skill.spec.ts` | 校验 skill 单元测试 | ~527 行 |

### 设计文档

| 文件 | 说明 |
|------|------|
| `jiaoyanyuzhengzheng-分支说明.md` | 分支用途、决策汇总、更新日志 |
| `juqingjiaoyan-设计文档.md` | 完整设计文档（组件/数据流/错误处理/测试策略/影响文件预估） |

---

## 四、当前功能范围（已实现 Task1~5）

已实现的功能等价于设计文档中的：
- **4.1 子 skill：`draft-review-skill`** → 已完成（含 4 类硬偏差识别 + 修复/重校循环）
- **4.2 校验状态 store** → **未实现**（需要 `useDraftReviewStore`）
- **4.3 主区域 Tab：`AIChatTabContainer`** → **未实现**（需要 Tab 容器）
- **4.4 校验 Tab 面板：`DraftReviewPanel`** → **未实现**（需要 UI 组件）
- **4.5 工作流接入点** → **未实现**（需要接入对话主流程）

**总结：Skill 核心逻辑已全部完成，UI 和工作流接入尚未开始。**

---

## 五、文件结构依赖关系

```
draft-review-skill.ts
├── 依赖（只读）：
│   ├── @/lib/novel/character-cognition      → loadCognitionState
│   ├── @/lib/novel/character-state           → loadCharacterStates
│   ├── @/lib/novel/foreshadowing-tracker     → loadForeshadowingTracker
│   ├── @/lib/novel/chapter-ingest            → listSnapshots / loadSnapshot
│   ├── @/stores/use-wiki-store               → useWikiStore
│   ├── @/lib/agent/llm                      → streamChat / resolveNovelModel / hasUsableLlm
│   └── fs/path（@/lib/fs）                   → readFile / fileExists
│
├── 不依赖：
│   ├── ingestChapter（禁止写入记忆库）
│   ├── syncSnapshotToMemory（禁止写入）
│   └── 不写 wiki、不写伏笔追踪
│
└── 待接入口：
    └── 写后自检主流程 → 在正文生成完成后、保存确认前插入
```

---

## 六、待完成任务（下一步）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | **创建 `useDraftReviewStore`** | 校验状态 store，参考 `useChatStore` 风格 |
| P0 | **创建 `AIChatTabContainer`** | 把 chat-panel 包进 Tab 容器，新增[对话][校验]标签 |
| P0 | **创建 `DraftReviewPanel`** | 校验 Tab 面板 UI（状态条/偏差表格/修订对比/决策按钮） |
| P1 | **工作流接入** | 在正文生成完成后、保存确认前接入 `runDraftReviewSkill` |
| P1 | **旧功能回归测试** | 续写/深度生成/大纲生成/AI会话各意图运行验证 |
| P2 | **UI 边界审查** | 超多偏差行、超长正文对比不撑破主界面 |
| P2 | **Tab 锁定机制** | 校验进行中对话 Tab 置灰锁定 |

---

## 七、关键决策记录

| 决策 | 内容 |
|------|------|
| 校验范围 | 仅硬偏差4类：角色认知 / 角色状态 / 承接 / 伏笔冲突 |
| 校检查源 | 默认记忆中心派生数据；内部矛盾时读原始上一章正文 I3 仲裁 |
| 修复策略 | 先报告偏差点，再自动修（LLM） |
| 重校上限 | 最多 2 轮，仅校验改动相关项 |
| 记忆写入 | **禁止** — 校验阶段只读不写 |
| UI 文案 | 全部中文 |
| 失败处理 | 部分读取失败不阻断，标记 rawLoadError |

---

## 八、风险提醒

1. **UI 改动量较大**：Tab 容器 + 校验面板是中型 UI 改造，需严格做边界审查
2. **Token 成本**：每次校验/修复/重校走 LLM，2 轮上限作为成本护栏
3. **AI 误判**：记忆库可能过时 → "先报告后修 + 用户最终决策"双闸门
4. **多角色性能**：角色很多时 loadCognitionState 数据较大，先按现状直接用

---

## 九、新 worktree 使用说明

新分支 `jiaoyanjixu` 已通过 **git worktree** 隔离到独立目录：

```
工作目录：C:/QMAI_C/worktrees/jiaoyanjixu
```

**使用方式：**
- 另一个对话在这个目录打开：`C:/QMAI_C/worktrees/jiaoyanjixu`
- 当前对话继续在 `C:/QMAI_C/QMAI-main` 使用 `jiaoyanyuzhengzheng-cunchu-yemian`
- 两个目录是**完全独立的文件系统副本**，互不影响
- 修改各自的文件、各自 git 操作，互不干扰
- 共用一个 `.git` 对象库，但工作树和索引都是独立的

**注意事项：**
- 在两个 worktree 中，需要先 `cd` 到各自目录再操作
- 不要在一个 worktree 中删除另一个 worktree 中正打开的分支

---

## 十、下一步建议

1. 另一个对话打开 `C:/QMAI_C/worktrees/jiaoyanjixu` 目录
2. 检查代码、运行测试验证当前功能
3. 按优先级继续实现：Store → Tab容器 → 校验面板 → 工作流接入
4. 每完成一个阶段回归旧功能