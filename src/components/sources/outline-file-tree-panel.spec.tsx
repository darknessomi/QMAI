// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FileNode } from "@/types/wiki"
import { useWikiStore } from "@/stores/wiki-store"
import { useOutlineChatStore } from "@/stores/outline-chat-store"
import { OutlineFileTreePanel } from "./outline-file-tree-panel"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const { copyFileMock, createDirectoryMock, deleteFileMock, fileExistsMock, listDirectoryMock } = vi.hoisted(() => ({
  copyFileMock: vi.fn(async () => undefined),
  createDirectoryMock: vi.fn(async () => undefined),
  deleteFileMock: vi.fn(async () => undefined),
  fileExistsMock: vi.fn(async () => false),
  listDirectoryMock: vi.fn(),
}))

vi.mock("@/commands/fs", () => ({
  createDirectory: createDirectoryMock,
  listDirectory: listDirectoryMock,
  copyFile: copyFileMock,
  deleteFile: deleteFileMock,
  fileExists: fileExistsMock,
}))

const outlineNodes: FileNode[] = [
  {
    name: "章纲文件夹",
    path: "C:/Book/wiki/outlines/章纲文件夹",
    is_dir: true,
    children: [
      {
        name: "1.md",
        path: "C:/Book/wiki/outlines/章纲文件夹/1.md",
        is_dir: false,
      },
    ],
  },
  {
    name: "大纲文件夹",
    path: "C:/Book/wiki/outlines/大纲文件夹",
    is_dir: true,
    children: [],
  },
]

describe("OutlineFileTreePanel", () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    copyFileMock.mockClear()
    createDirectoryMock.mockClear()
    deleteFileMock.mockClear()
    fileExistsMock.mockClear()
    listDirectoryMock.mockClear()
    fileExistsMock.mockResolvedValue(false)
    listDirectoryMock.mockResolvedValue(outlineNodes)
    useWikiStore.setState({
      project: { id: "p1", name: "测试书", path: "C:/Book" },
      fileTree: [],
      selectedFile: null,
      fileContent: "",
      dataVersion: 0,
    })
    useOutlineChatStore.setState({
      conversations: [],
      activeConversationId: null,
      streamingContent: "",
      isStreaming: false,
      loaded: false,
      pendingReferenceTokens: [],
    })
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it("项目数据版本变化后刷新左侧大纲文件树", async () => {
    await act(async () => {
      root.render(<OutlineFileTreePanel showHeader={false} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    listDirectoryMock.mockClear()

    await act(async () => {
      useWikiStore.getState().bumpDataVersion()
      await Promise.resolve()
    })

    expect(listDirectoryMock).toHaveBeenCalledWith("C:/Book/wiki/outlines")
  })

  it("重命名大纲文件后刷新左侧树并更新选中文件", async () => {
    useWikiStore.setState({
      selectedFile: "C:/Book/wiki/outlines/章纲文件夹/1.md",
    })

    await act(async () => {
      root.render(<OutlineFileTreePanel showHeader={false} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const fileButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("1.md"),
    ) as HTMLButtonElement

    await act(async () => {
      fileButton.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
    })

    const renameButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("重命名"),
    ) as HTMLButtonElement

    await act(async () => {
      renameButton.click()
    })

    const input = host.querySelector("[data-testid='outline-rename-input']") as HTMLInputElement
    await act(async () => {
      input.value = "新文件.md"
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
      await Promise.resolve()
    })

    expect(copyFileMock).toHaveBeenCalledWith(
      "C:/Book/wiki/outlines/章纲文件夹/1.md",
      "C:/Book/wiki/outlines/章纲文件夹/新文件.md",
    )
    expect(deleteFileMock).toHaveBeenCalledWith("C:/Book/wiki/outlines/章纲文件夹/1.md")
    expect(useWikiStore.getState().selectedFile).toBe("C:/Book/wiki/outlines/章纲文件夹/新文件.md")
  })

  it("发送到 AI 大纲会话时只加入大纲文件引用", async () => {
    await act(async () => {
      root.render(<OutlineFileTreePanel showHeader={false} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const fileButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("1.md"),
    ) as HTMLButtonElement

    await act(async () => {
      fileButton.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
    })

    const sendButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("发送到AI大纲会话"),
    ) as HTMLButtonElement

    await act(async () => {
      sendButton.click()
    })

    expect(useOutlineChatStore.getState().pendingReferenceTokens).toEqual([
      {
        id: "outline:C:/Book/wiki/outlines/章纲文件夹/1.md",
        category: "outline",
        title: "1.md",
        path: "C:/Book/wiki/outlines/章纲文件夹/1.md",
        displayTitle: "1.md",
      },
    ])
  })
})
