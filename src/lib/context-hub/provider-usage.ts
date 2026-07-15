import type { LlmUsage } from "@/lib/llm-usage"
import type {
  ContextHub,
  ContextHubResult,
  ContextHubSnapshotRef,
  ContextHubStats,
} from "./types"

export function applyProviderUsageToStats(
  stats: ContextHubStats,
  usage: LlmUsage,
): ContextHubStats {
  return {
    ...stats,
    providerUsageReported: true,
    ...(usage.inputTokens !== undefined ? { providerInputTokens: usage.inputTokens } : {}),
    ...(usage.cachedInputTokens !== undefined ? { providerCachedTokens: usage.cachedInputTokens } : {}),
    ...(usage.cacheWriteInputTokens !== undefined
      ? { providerCacheWriteTokens: usage.cacheWriteInputTokens }
      : {}),
  }
}

export async function persistContextHubProviderUsage(
  contextHub: Pick<ContextHub, "saveSnapshot">,
  snapshotId: string,
  result: ContextHubResult,
  usage: LlmUsage | undefined,
): Promise<ContextHubSnapshotRef | null> {
  if (!usage) return null
  result.stats = applyProviderUsageToStats(result.stats, usage)
  return contextHub.saveSnapshot(snapshotId, result)
}
