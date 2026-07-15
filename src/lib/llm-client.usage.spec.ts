import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LlmConfig } from "@/stores/wiki-store"
import { streamChat } from "./llm-client"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}))

vi.mock("./tauri-fetch", () => ({
  getHttpFetch: vi.fn(async () => mocks.fetch),
  isFetchNetworkError: vi.fn(() => false),
}))

vi.mock("./local-cli-config", () => ({
  resolveRuntimeLocalCliConfig: vi.fn(async (config: LlmConfig) => config),
}))

const config: LlmConfig = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-test",
  ollamaUrl: "",
  customEndpoint: "",
  maxContextSize: 128_000,
}

describe("streamChat usage", () => {
  beforeEach(() => {
    mocks.fetch.mockReset()
  })

  it("requests and emits OpenAI stream usage once", async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode([
          'data: {"choices":[{"delta":{"content":"完成"}}]}',
          'data: {"choices":[],"usage":{"prompt_tokens":1200,"completion_tokens":80,"total_tokens":1280,"prompt_tokens_details":{"cached_tokens":1024}}}',
          "data: [DONE]",
          "",
        ].join("\n")))
        controller.close()
      },
    })
    mocks.fetch.mockResolvedValue(new Response(body, { status: 200 }))
    const onUsage = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    await streamChat(config, [{ role: "user", content: "测试" }], {
      onToken: vi.fn(),
      onUsage,
      onDone,
      onError,
    })

    const request = mocks.fetch.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({
      stream: true,
      stream_options: { include_usage: true },
    })
    expect(onUsage).toHaveBeenCalledOnce()
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 1200,
      outputTokens: 80,
      totalTokens: 1280,
      cachedInputTokens: 1024,
    })
    expect(onDone).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })
})
