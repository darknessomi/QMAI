// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AgentToolCallMessage, getToolCallDescription } from "./agent-tool-call-message"
import type { AgentRunRecord } from "@/lib/agent/types"

type ToolCallRecord = AgentRunRecord["toolCalls"][number]

let host: HTMLDivElement
let root: Root

const sampleCalls: ToolCallRecord[] = [
  {
    id: "call-1",
    name: "read_chapter",
    params: { name: "第1章-开篇" },
    result: "第一章内容",
    status: "done",
    startedAt: 0,
    finishedAt: 120,
  },
  {
    id: "call-2",
    name: "write_memory",
    params: { name: "人物设定", content: "主角名为李明。" },
    result: "已写入记忆「人物设定」",
    status: "done",
    startedAt: 200,
    finishedAt: 350,
  },
  {
    id: "call-3",
    name: "apply_skill",
    params: { skillName: "去AI味" },
    result: "技能模板内容",
    status: "done",
    startedAt: 400,
    finishedAt: 500,
  },
  {
    id: "call-4",
    name: "search_chapters",
    params: { keyword: "李明" },
    result: "错误：搜索失败",
    status: "error",
    startedAt: 600,
    finishedAt: 650,
  },
]

beforeEach(() => {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  host.remove()
})

describe("AgentToolCallMessage", () => {
  it("renders tool names and descriptions", async () => {
    await act(async () => {
      root.render(<AgentToolCallMessage toolCalls={sampleCalls} />)
    })

    expect(host.textContent).toContain("AI 工具调用")
    expect(host.textContent).toContain("read_chapter")
    expect(host.textContent).toContain("读取章节《第1章-开篇》")
    expect(host.textContent).toContain("write_memory")
    expect(host.textContent).toContain("写入记忆「人物设定」")
    expect(host.textContent).toContain("apply_skill")
    expect(host.textContent).toContain("应用技能「去AI味」")
  })

  it("shows error style and icon for failed tool calls", async () => {
    await act(async () => {
      root.render(<AgentToolCallMessage toolCalls={[sampleCalls[3]]} />)
    })

    const errorRow = host.querySelector("[class*='bg-red-50']")
    expect(errorRow).not.toBeNull()
    const html = host.innerHTML
    expect(html).toContain("text-red-500")
  })

  it("returns null when toolCalls is empty or undefined", async () => {
    await act(async () => {
      root.render(<AgentToolCallMessage toolCalls={[]} />)
    })
    expect(host.textContent).toBe("")

    host.innerHTML = ""
    await act(async () => {
      root.render(<AgentToolCallMessage toolCalls={undefined} />)
    })
    expect(host.textContent).toBe("")
  })

  it("expands and collapses result on row click", async () => {
    await act(async () => {
      root.render(<AgentToolCallMessage toolCalls={[sampleCalls[0]]} />)
    })

    const button = host.querySelector("button")
    expect(button).not.toBeNull()
    expect(button?.getAttribute("aria-expanded")).toBe("false")
    expect(host.textContent).not.toContain("第一章内容")

    await act(async () => {
      button?.click()
    })

    expect(button?.getAttribute("aria-expanded")).toBe("true")
    expect(host.textContent).toContain("第一章内容")

    await act(async () => {
      button?.click()
    })

    expect(button?.getAttribute("aria-expanded")).toBe("false")
    expect(host.textContent).not.toContain("第一章内容")
  })
})

describe("getToolCallDescription", () => {
  it("covers all registered built-in tool names", () => {
    const names = [
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
      "write_chapter",
      "write_outline_node",
      "write_memory",
      "apply_skill",
    ] as const

    for (const name of names) {
      const desc = getToolCallDescription(name, { name: "测试", keyword: "测试", skillName: "测试" })
      expect(desc).not.toBe(name)
      expect(desc.length).toBeGreaterThan(0)
    }
  })

  it("falls back to tool name for unknown tools", () => {
    expect(getToolCallDescription("unknown_tool", {})).toBe("unknown_tool")
  })
})
