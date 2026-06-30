import { useMemo, useState } from "react"
import { BookOpen, ChevronDown, ChevronRight, Pencil, XCircle, Zap } from "lucide-react"
import type { AgentRunRecord } from "@/lib/agent/types"

export type ToolCallRecord = AgentRunRecord["toolCalls"][number]

interface AgentToolCallMessageProps {
  toolCalls: ToolCallRecord[] | undefined
}

const READ_TOOLS = new Set([
  "read_chapter",
  "read_outline",
  "read_memory",
  "read_deduction",
  "read_chat_history",
  "read_outline_history",
  "search_chapters",
  "list_chapters",
  "list_outlines",
  "list_memories",
  "list_deductions",
])

const WRITE_TOOLS = new Set([
  "write_chapter",
  "write_outline_node",
  "write_memory",
])

const ACTION_TOOLS = new Set([
  "apply_skill",
])

function getToolCategory(name: string): "read" | "write" | "action" {
  if (READ_TOOLS.has(name)) return "read"
  if (WRITE_TOOLS.has(name)) return "write"
  if (ACTION_TOOLS.has(name)) return "action"
  return "read"
}

function formatWordCount(content?: unknown): string {
  if (typeof content !== "string") return ""
  const count = content.length
  return count > 0 ? `(${count}字)` : ""
}

function formatDuration(startedAt: number, finishedAt: number): string {
  const ms = finishedAt - startedAt
  if (ms <= 0) return ""
  if (ms < 1000) return `（${ms}ms）`
  return `（${(ms / 1000).toFixed(1)}s）`
}

export function getToolCallDescription(name: string, params: Record<string, unknown>): string {
  switch (name) {
    case "read_chapter": {
      const target = params.name || params.path
      return `读取章节《${target}》`
    }
    case "read_outline": {
      const target = params.name || params.path
      return `读取大纲《${target}》`
    }
    case "read_memory":
      return `读取记忆「${params.name}」`
    case "read_deduction":
      return `读取推演结果「${params.name}」`
    case "read_chat_history": {
      const target = params.conversationId || params.conversationTitle
      return `读取会话历史「${target}」`
    }
    case "read_outline_history":
      return `读取大纲会话「${params.conversationId}」`
    case "search_chapters":
      return `搜索章节关键词「${params.keyword}」`
    case "list_chapters":
      return "列出所有章节"
    case "list_outlines":
      return "列出所有大纲"
    case "list_memories":
      return "列出所有记忆"
    case "list_deductions":
      return "列出所有推演结果"
    case "write_chapter":
      return `写入章节《${params.name}》${formatWordCount(params.content)}`
    case "write_outline_node":
      return `写入大纲节点「${params.nodeTitle}」到「${params.outlineName}」`
    case "write_memory":
      return `写入记忆「${params.name}」${formatWordCount(params.content)}`
    case "apply_skill": {
      const target = params.skillName || params.skillId
      return `应用技能「${target}」`
    }
    default:
      return name
  }
}

function ToolCallIcon({ category, hasError }: { category: "read" | "write" | "action"; hasError: boolean }) {
  if (hasError) {
    return <XCircle className="h-4 w-4 shrink-0 text-red-500" />
  }
  switch (category) {
    case "read":
      return <BookOpen className="h-4 w-4 shrink-0 text-blue-500" />
    case "write":
      return <Pencil className="h-4 w-4 shrink-0 text-amber-500" />
    case "action":
      return <Zap className="h-4 w-4 shrink-0 text-purple-500" />
  }
}

function ToolCallRow({ call }: { call: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false)
  const category = useMemo(() => getToolCategory(call.name), [call.name])
  const hasError = call.status === "error"
  const description = useMemo(
    () => getToolCallDescription(call.name, call.params),
    [call.name, call.params],
  )
  const duration = formatDuration(call.startedAt, call.finishedAt)

  const rowClass = hasError
    ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
    : "border-border/60 bg-background hover:bg-accent/40"

  return (
    <div className={`rounded-md border ${rowClass} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
        aria-expanded={expanded}
      >
        <ToolCallIcon category={category} hasError={hasError} />
        <span className="shrink-0 font-medium">{call.name}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {description}
          {duration && <span className="ml-1 text-[10px] opacity-70">{duration}</span>}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div
          className={`max-h-40 overflow-y-auto border-t px-2 py-1.5 text-[11px] whitespace-pre-wrap break-words leading-relaxed ${
            hasError
              ? "border-red-200/60 text-red-700 dark:border-red-900/30 dark:text-red-300/80"
              : "border-border/50 text-muted-foreground"
          }`}
        >
          {call.result}
        </div>
      )}
    </div>
  )
}

export function AgentToolCallMessage({ toolCalls }: AgentToolCallMessageProps) {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="mb-2 rounded-md border-l-4 border-blue-500 bg-blue-50/50 px-2.5 py-2 dark:bg-blue-950/20">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
        <Zap className="h-3.5 w-3.5" />
        <span>AI 工具调用</span>
        <span className="text-[10px] font-normal text-blue-600/70 dark:text-blue-400/70">
          ({toolCalls.length} 次)
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {toolCalls.map((call) => (
          <ToolCallRow key={call.id} call={call} />
        ))}
      </div>
    </div>
  )
}
