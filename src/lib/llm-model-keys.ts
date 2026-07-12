import type { ProviderConfigs, ProviderOverride } from "@/stores/wiki-store"

function isProviderAvailable(providerId: string, config: ProviderOverride): boolean {
  return providerId.startsWith("custom-")
    ? config.enabled !== false
    : config.enabled === true
}

function getAvailableProviderEntries(
  providerConfigs: ProviderConfigs,
): Array<[string, ProviderOverride]> {
  const entries = Object.entries(providerConfigs)
  return [
    ...entries.filter(([providerId, config]) =>
      !providerId.startsWith("custom-") && isProviderAvailable(providerId, config)),
    ...entries.filter(([providerId, config]) =>
      providerId.startsWith("custom-") && isProviderAvailable(providerId, config)),
  ]
}

export function hasAvailableModels(providerConfigs: ProviderConfigs): boolean {
  return getAvailableProviderEntries(providerConfigs)
    .some(([, config]) => (config.savedModels?.length ?? 0) > 0)
}

export function getFirstAvailableModelKey(providerConfigs: ProviderConfigs): string {
  for (const [providerId, config] of getAvailableProviderEntries(providerConfigs)) {
    const first = config.savedModels?.[0]
    if (first) return `${providerId}/${first.model}`
  }
  return ""
}

export function getStableAvailableModelKey(
  targetModel: string,
  providerConfigs: ProviderConfigs,
): string {
  const trimmed = targetModel.trim()
  if (!trimmed) return ""

  let exactProviderId: string | null = null
  const slashIdx = trimmed.indexOf("/")
  if (slashIdx > 0) {
    const providerId = trimmed.slice(0, slashIdx)
    if (Object.prototype.hasOwnProperty.call(providerConfigs, providerId)) {
      exactProviderId = providerId
      const modelId = trimmed.slice(slashIdx + 1)
      const config = providerConfigs[providerId]
      if (
        isProviderAvailable(providerId, config)
        && config.savedModels?.some((model) => model.model === modelId)
      ) {
        return `${providerId}/${modelId}`
      }
    }
  }

  for (const [providerId, config] of getAvailableProviderEntries(providerConfigs)) {
    if (providerId === exactProviderId) continue
    if (config.savedModels?.some((model) => model.model === trimmed)) {
      return `${providerId}/${trimmed}`
    }
  }
  return ""
}
