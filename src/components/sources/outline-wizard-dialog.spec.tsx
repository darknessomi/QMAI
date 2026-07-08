// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OutlineWizardDialog } from "./outline-wizard-dialog"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

function findButton(host: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(host.querySelectorAll("button")) as HTMLButtonElement[]
  const button = buttons.find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === text,
  )
  if (!button) throw new Error(`未找到按钮：${text}`)
  return button
}

describe("OutlineWizardDialog", () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it("关闭时不渲染弹窗内容", async () => {
    await act(async () => {
      root.render(
        <OutlineWizardDialog open={false} onOpenChange={() => {}} onSubmit={() => {}} />,
      )
    })

    expect(host.textContent).toBe("")
  })

  it("渲染固定字段且不出现男女频融合", async () => {
    await act(async () => {
      root.render(<OutlineWizardDialog open onOpenChange={() => {}} onSubmit={() => {}} />)
    })

    expect(document.body.textContent).toContain("选择生成你想要的小说")
    expect(document.body.textContent).toContain("生成任务")
    expect(document.body.textContent).toContain("篇幅类型")
    expect(document.body.textContent).toContain("频道方向")
    expect(document.body.textContent).toContain("故事灵感")
    expect(document.body.textContent).not.toContain("男女频融合")
  })

  it("故事灵感为空时阻止提交", async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      root.render(<OutlineWizardDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)
    })

    await act(async () => {
      findButton(document.body, "确定生成").click()
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain("请先填写故事灵感或处理要求。")
  })

  it("填写故事灵感后提交结构化请求", async () => {
    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()
    await act(async () => {
      root.render(<OutlineWizardDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    })

    const textarea = document.body.querySelector("textarea") as HTMLTextAreaElement
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set
      valueSetter?.call(textarea, "一个穿越者靠军宣短视频改变国运")
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      findButton(document.body, "确定生成").click()
    })

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      task: "newBook",
      length: "long",
      channel: "male",
      inspiration: "一个穿越者靠军宣短视频改变国运",
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
