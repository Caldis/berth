export interface FeatureGuideDocLink {
  labelKey: string
  url: string
}

export interface FeatureGuideProviderMapping {
  provider: string
  config: string
  meaningKey: string
}

export interface FeatureGuideInsight {
  titleKey: string
  bodyKey: string
  agentView?: 'all' | 'claude' | 'codex'
}

export interface FeatureGuideDefinition {
  id: string
  titleKey: string
  summaryKey: string
  insightKeys?: FeatureGuideInsight[]
  pointKeys?: string[]
  docLinks?: FeatureGuideDocLink[]
  providerMappings?: FeatureGuideProviderMapping[]
}

export interface FeatureGuideEvidence {
  labelKey: string
  value: number | string
  tone?: 'default' | 'warning'
}
