import type { ChatMessage } from "@/lib/llm-client"
import { streamChat } from "@/lib/llm-client"
import type { LlmConfig } from "@/stores/wiki-store"
import { buildAgentContext } from "@/lib/novel/story-simulation/agent-profile-builder"
import type {
  AgentAction,
  ExtractionResult,
  NovelAgent,
  SimulationEvent,
  SimulationInput,
} from "@/lib/novel/story-simulation/types"
import { calcMaxRoundsPerNode } from "@/lib/novel/story-simulation/types"

// ── 对外接口 ──

export interface SimulationCallbacks {
  onEvent: (event: SimulationEvent) => void
  onProgress: (progress: number, label: string) => void
  onComplete: (events: SimulationEvent[]) => void
  onError: (error: Error) => void
}

// ── 内部辅助：将 streamChat 的流式回调收拢为一个完整字符串 ──

async function collectStream(
  config: LlmConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  let result = ""
  let streamError: Error | null = null

  await streamChat(
    config,
    messages,
    {
      onToken: (token) => {
        result += token
      },
      onDone: () => {},
      onError: (err) => {
        streamError = err
      },
    },
    signal,
  )

  if (streamError) throw streamError
  return result
}

// ── 内部辅助：Agent 快照（避免事件间共享可变状态） ──

function snapshotAgent(agent: NovelAgent): NovelAgent {
  return {
    ...agent,
    knownFacts: new Set(agent.knownFacts),
    relationships: new Map(
      Array.from(agent.relationships.entries()).map(([k, v]) => [
        k,
        { ...v },
      ]),
    ),
  }
}

// ── 内部辅助：构建 Agent 系统提示词 ──

function buildSystemPrompt(agent: NovelAgent): string {
  return [
    `你正在扮演小说角色「${agent.name}」。`,
    "",
    "请严格遵循以下要求：",
    "1. 以该角色的视角思考、感受和行动，不要跳出角色。",
    "2. 严格遵循角色的性格特征、心智模型和决策方式。",
    "3. 遵守认知边界：角色不知道的信息绝对不能使用，不能表现出全知视角。",
    "4. 你的回复必须是一个 JSON 对象，格式如下：",
    '   { "type": "行为类型", "target": "目标角色名（可选）", "content": "行为内容", "motivation": "动机说明" }',
    "",
    "行为类型（type）只能是以下之一：",
    "- speak：对他人说话（target 为对话对象，可省略表示自言自语）",
    "- act：执行一个行动",
    "- react：对某人的行为做出反应（target 为反应对象）",
    "- decide：做出一个决定",
    "- investigate：调查或探索某事",
    "- conflict：与某人发生冲突（target 为冲突对象）",
    "- cooperate：与某人合作（target 为合作对象）",
    "- withhold：隐瞒或保留信息",
    "",
    "只输出 JSON 对象，不要输出任何其他文字。",
  ].join("\n")
}

// ── 内部辅助：构建用户消息（上下文 + 指令） ──

function buildUserMessage(context: string, injectionEvent?: string): string {
  const parts: string[] = [context]
  if (injectionEvent) {
    parts.push("")
    parts.push("【突发事件】")
    parts.push(injectionEvent)
  }
  parts.push("")
  parts.push("请根据以上信息，以角色视角决定你接下来要做的一个行为，并输出 JSON。")
  return parts.join("\n")
}

// ── 内部辅助：从 LLM 文本中提取 JSON ──

function extractJson(text: string): string | null {
  const trimmed = text.trim()

  // 直接解析
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    // 继续
  }

  // 从 markdown 代码块中提取
  const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  if (codeBlockMatch) {
    const candidate = codeBlockMatch[1].trim()
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // 继续
    }
  }

  // 从文本中查找第一个 JSON 对象
  const objMatch = /\{[\s\S]*\}/.exec(trimmed)
  if (objMatch) {
    const candidate = objMatch[0]
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // 继续
    }
  }

  return null
}

// ── 内部辅助：根据解析出的字段构建 AgentAction ──

function buildAction(
  type: string,
  content: string,
  target?: string,
): AgentAction {
  switch (type) {
    case "speak":
      return target !== undefined
        ? { type: "speak" as const, target, content }
        : { type: "speak" as const, content }
    case "react":
      return { type: "react" as const, target: target ?? "", content }
    case "decide":
      return { type: "decide" as const, content }
    case "investigate":
      return { type: "investigate" as const, content }
    case "conflict":
      return { type: "conflict" as const, target: target ?? "", content }
    case "cooperate":
      return { type: "cooperate" as const, target: target ?? "", content }
    case "withhold":
      return { type: "withhold" as const, content }
    case "act":
    default:
      return { type: "act" as const, content }
  }
}

interface ParsedAction {
  action: AgentAction
  motivation: string
}

// ── 内部辅助：解析 LLM 输出为行为（健壮：失败时作为 act 处理） ──

function parseAgentAction(raw: string): ParsedAction {
  const jsonText = extractJson(raw)
  if (!jsonText) {
    return { action: { type: "act", content: raw.trim() }, motivation: "" }
  }

  try {
    const data = JSON.parse(jsonText) as Record<string, unknown>
    const type = String(data.type ?? "act").toLowerCase()
    const content = String(data.content ?? "")
    const target = data.target !== undefined ? String(data.target) : undefined
    const motivation = String(data.motivation ?? "")

    return { action: buildAction(type, content, target), motivation }
  } catch {
    return { action: { type: "act", content: raw.trim() }, motivation: "" }
  }
}

// ── 内部辅助：根据名字或 ID 查找目标 Agent ──

function resolveTarget(
  targetName: string,
  agents: NovelAgent[],
): NovelAgent | undefined {
  return agents.find(
    (a) => a.name === targetName || a.characterId === targetName,
  )
}

// ── 内部辅助：应用行为效果，返回状态变更描述 ──

function applyAction(
  agent: NovelAgent,
  parsed: ParsedAction,
  allAgents: NovelAgent[],
): string[] {
  const changes: string[] = []
  const { action, motivation } = parsed

  if (motivation) {
    changes.push(`动机：${motivation}`)
  }

  switch (action.type) {
    case "speak":
    case "investigate": {
      agent.knownFacts.add(action.content)
      changes.push(`${agent.name} 获知新信息`)
      break
    }
    case "conflict": {
      const targetAgent = resolveTarget(action.target, allAgents)
      if (targetAgent) {
        const relation = agent.relationships.get(targetAgent.characterId)
        if (relation) {
          relation.sentiment = Math.max(-100, relation.sentiment - 20)
          relation.relationType = "hostile"
          changes.push(
            `${agent.name} 对 ${action.target} 的好感度下降 20，关系变为敌对`,
          )
        }
      }
      agent.emotionalState = "tense"
      changes.push(`${agent.name} 情绪变为紧张`)
      break
    }
    case "cooperate": {
      const targetAgent = resolveTarget(action.target, allAgents)
      if (targetAgent) {
        const relation = agent.relationships.get(targetAgent.characterId)
        if (relation) {
          relation.sentiment = Math.min(100, relation.sentiment + 15)
          relation.relationType = "ally"
          changes.push(
            `${agent.name} 对 ${action.target} 的好感度上升 15，关系变为盟友`,
          )
        }
      }
      agent.emotionalState = "hopeful"
      changes.push(`${agent.name} 情绪变为充满希望`)
      break
    }
    case "decide": {
      agent.emotionalState = "determined"
      changes.push(`${agent.name} 情绪变为坚定`)
      break
    }
    // act / react / withhold：无特殊状态变更
    default:
      break
  }

  return changes
}

// ── 内部辅助：将事件格式化为简短描述（供 recentEvents 使用） ──

function formatEventDescription(event: SimulationEvent): string {
  const { agent, action } = event
  if (!agent || !action) return ""
  const name = agent.name
  switch (action.type) {
    case "speak":
      return action.target
        ? `${name} 对 ${action.target} 说：「${action.content}」`
        : `${name} 自言自语：「${action.content}」`
    case "act":
      return `${name} 行动：${action.content}`
    case "react":
      return `${name} 对 ${action.target} 做出反应：${action.content}`
    case "decide":
      return `${name} 做出决定：${action.content}`
    case "investigate":
      return `${name} 调查：${action.content}`
    case "conflict":
      return `${name} 与 ${action.target} 发生冲突：${action.content}`
    case "cooperate":
      return `${name} 与 ${action.target} 合作：${action.content}`
    case "withhold":
      return `${name} 隐瞒信息：${action.content}`
  }
  return `${name} 行为`
}

// ── 主入口：运行仿真 ──

export async function runSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  const events: SimulationEvent[] = []
  const { agents, framework, wordBudget, llmConfig, injectionEvent } = input
  const totalNodes = framework.nodes.length
  const maxRounds = calcMaxRoundsPerNode(wordBudget)
  let aborted = false

  try {
    for (let ni = 0; ni < totalNodes; ni++) {
      if (signal?.aborted) {
        aborted = true
        break
      }

      const node = framework.nodes[ni]

      // 确定参与角色：从 involvedCharacters（角色名）过滤 agents
      let nodeAgents = agents.filter((a) =>
        node.involvedCharacters.includes(a.name),
      )
      // 防御：若过滤结果为空，使用全部 agents 避免空仿真
      if (nodeAgents.length === 0) {
        nodeAgents = agents
      }

      // 产出 node-start 事件
      const startEvent: SimulationEvent = {
        type: "node-start",
        node,
        timestamp: new Date().toISOString(),
      }
      events.push(startEvent)
      callbacks.onEvent(startEvent)

      callbacks.onProgress(
        Math.round((ni / totalNodes) * 100),
        `开始节点 ${ni + 1}/${totalNodes}：${node.title}`,
      )

      // 当前节点内的事件描述（供 recentEvents 使用）
      const recentEventDescs: string[] = []
      let nodeActionCount = 0

      // 节点内多轮交互
      for (let round = 0; round < maxRounds; round++) {
        if (signal?.aborted) {
          aborted = true
          break
        }

        for (const agent of nodeAgents) {
          if (signal?.aborted) {
            aborted = true
            break
          }

          // 构建上下文
          const recentSlice = recentEventDescs.slice(-8)
          const context = buildAgentContext(
            agent,
            node,
            recentSlice,
            extraction.worldRules,
          )

          // 构建 LLM 消息
          const messages: ChatMessage[] = [
            { role: "system", content: buildSystemPrompt(agent) },
            {
              role: "user",
              content: buildUserMessage(context, injectionEvent),
            },
          ]

          // 调用 LLM 生成行为决策
          const rawResponse = await collectStream(llmConfig, messages, signal)
          if (signal?.aborted) {
            aborted = true
            break
          }

          // 解析行为
          const parsed = parseAgentAction(rawResponse)

          // 应用行为效果
          const stateChanges = applyAction(agent, parsed, agents)

          // 产出 SimulationEvent
          const event: SimulationEvent = {
            type: "agent-action",
            agent: snapshotAgent(agent),
            action: parsed.action,
            round,
            node,
            stateChanges,
            timestamp: new Date().toISOString(),
          }
          events.push(event)
          callbacks.onEvent(event)

          recentEventDescs.push(formatEventDescription(event))
          nodeActionCount++
        }

        if (aborted) break

        // 检查节点目标是否达成（简单启发式：事件数 >= 4 则完成）
        if (nodeActionCount >= 4) {
          break
        }
      }

      if (aborted) break

      // 产出 node-complete 事件
      const completeEvent: SimulationEvent = {
        type: "node-complete",
        node,
        timestamp: new Date().toISOString(),
      }
      events.push(completeEvent)
      callbacks.onEvent(completeEvent)

      callbacks.onProgress(
        Math.round(((ni + 1) / totalNodes) * 100),
        `完成节点 ${ni + 1}/${totalNodes}：${node.title}`,
      )
    }

    if (!aborted && !signal?.aborted) {
      callbacks.onComplete(events)
    }

    return events
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    callbacks.onError(error)
    throw error
  }
}
