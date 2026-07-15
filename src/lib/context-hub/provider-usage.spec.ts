import { describe, expect, it, vi } from "vitest"
import type { ContextHubResult, ContextHubSnapshotRef, ContextHubStats } from "./types"
import { applyProviderUsageToStats, persistContextHubProviderUsage } from "./provider-usage"

const baseStats: ContextHubStats = {
  hits: 2,
  refreshed: 1,
  failures: 0,
  stableTokens: 1000,
  summaryTokens: 100,
  dynamicTokens: 300,
  candidateTokens: 2000,
  estimatedSavedTokens: 600,
  estimatedSavedPercent: 30,
  expanded: false,
  providerCacheEnabled: true,
}

describe("context hub provider usage", () => {
  it("stores confirmed cache usage without changing local cache counters", () => {
    expect(applyProviderUsageToStats(baseStats, {
      inputTokens: 1600,
      outputTokens: 200,
      cachedInputTokens: 800,
      cacheWriteInputTokens: 300,
    })).toEqual({
      ...baseStats,
      providerUsageReported: true,
      providerInputTokens: 1600,
      providerCachedTokens: 800,
      providerCacheWriteTokens: 300,
    })
  })

  it("updates the persisted snapshot after the model response", async () => {
    const reference: ContextHubSnapshotRef = {
      id: "assistant:1",
      surface: "ai-chat",
      createdAt: 20,
      stats: baseStats,
    }
    const saveSnapshot = vi.fn(async () => reference)
    const result = { stats: { ...baseStats } } as ContextHubResult

    await expect(persistContextHubProviderUsage(
      { saveSnapshot },
      "assistant:1",
      result,
      { inputTokens: 1600, cachedInputTokens: 800 },
    )).resolves.toBe(reference)

    expect(result.stats).toMatchObject({
      providerUsageReported: true,
      providerInputTokens: 1600,
      providerCachedTokens: 800,
    })
    expect(saveSnapshot).toHaveBeenCalledWith("assistant:1", result)
  })
})
